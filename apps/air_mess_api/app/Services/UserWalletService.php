<?php

namespace App\Services;

use App\Models\Course;
use App\Models\Payment;
use App\Models\User;
use App\Models\UserWallet;
use App\Models\UserWalletTransaction;
use Illuminate\Support\Facades\DB;

/**
 * Toute mutation d'un UserWallet DOIT passer par ce service.
 *
 * Modèle "réservation (hold) → capture (débit)" :
 *  - reserveForCourse()   : incrémente pending_reserved + marque course.paid_from_wallet=true
 *  - chargeForCourse()    : à la livraison, débite balance ET décrémente pending_reserved
 *  - releaseReservation() : à l'annulation/échec avant livraison, libère le hold sans débit
 *
 * Garanties :
 *  - balance >= 0 et pending_reserved <= balance à tout moment (CHECK Postgres)
 *  - opérations concurrentes sur un même wallet sérialisées via lockForUpdate()
 *  - idempotence sur (course_id, type) pour course_charge et refund (UNIQUE partielle)
 */
class UserWalletService
{
    /**
     * Crédite le wallet après un top-up Fedapay réussi.
     *
     * @throws \InvalidArgumentException si $amount <= 0
     */
    public function deposit(User $user, int $amount, Payment $payment): UserWalletTransaction
    {
        if ($amount <= 0) {
            throw new \InvalidArgumentException("Deposit amount must be > 0, got {$amount}.");
        }

        return DB::transaction(function () use ($user, $amount, $payment) {
            $wallet = UserWallet::where('user_id', $user->id)
                ->lockForUpdate()
                ->firstOrFail();

            $wallet->balance         += $amount;
            $wallet->total_deposited += $amount;
            $wallet->save();

            return UserWalletTransaction::create([
                'user_id'       => $user->id,
                'type'          => UserWalletTransaction::TYPE_DEPOSIT,
                'amount_fcfa'   => $amount,
                'balance_after' => $wallet->balance,
                'payment_id'    => $payment->id,
            ]);
        });
    }

    /**
     * Tente de réserver le delivery_fee d'une course sur le wallet.
     * Renvoie true si la réservation a été posée (course payable depuis wallet),
     * false si le disponible est insuffisant (fallback pay-as-you-go côté appelant).
     *
     * Pas de transaction wallet créée ici — un hold n'est pas une mutation comptable.
     * Le débit réel a lieu dans chargeForCourse() à la livraison.
     */
    public function reserveForCourse(User $user, Course $course, int $amount): bool
    {
        if ($amount <= 0) {
            throw new \InvalidArgumentException("Reservation amount must be > 0, got {$amount}.");
        }

        return DB::transaction(function () use ($user, $course, $amount) {
            $wallet = UserWallet::where('user_id', $user->id)
                ->lockForUpdate()
                ->first();

            // Pas de wallet (admin/driver) → impossible de payer via wallet.
            if (! $wallet) {
                return false;
            }

            // Capacité disponible = balance - holds existants.
            $available = (int) $wallet->balance - (int) $wallet->pending_reserved;
            if ($available < $amount) {
                return false;
            }

            $wallet->pending_reserved += $amount;
            $wallet->save();

            // Tag la course pour le débit ultérieur.
            $course->paid_from_wallet = true;
            $course->save();

            return true;
        });
    }

    /**
     * À la livraison d'une course `paid_from_wallet=true` : débite balance et
     * relâche la réservation. Idempotent via UNIQUE partielle (course_id, type).
     *
     * @throws \DomainException si la course n'est pas tagged wallet (bug d'appelant)
     */
    public function chargeForCourse(User $user, Course $course, int $amount): UserWalletTransaction
    {
        if ($amount <= 0) {
            throw new \InvalidArgumentException("Charge amount must be > 0, got {$amount}.");
        }
        if (! $course->paid_from_wallet) {
            throw new \DomainException("Course #{$course->id} n'est pas marquée paid_from_wallet.");
        }

        // (b) Idempotence applicative : déjà chargée ?
        $existing = UserWalletTransaction::where('course_id', $course->id)
            ->where('type', UserWalletTransaction::TYPE_COURSE_CHARGE)
            ->first();
        if ($existing) {
            return $existing;
        }

        return DB::transaction(function () use ($user, $course, $amount) {
            $wallet = UserWallet::where('user_id', $user->id)
                ->lockForUpdate()
                ->firstOrFail();

            // Defense in depth : la réservation devrait toujours couvrir le débit
            // (puisqu'on l'a posée à la création). Mais on vérifie quand même.
            if ($amount > $wallet->balance) {
                throw new \DomainException(
                    "Solde insuffisant à la capture : balance={$wallet->balance}, besoin={$amount}."
                );
            }

            $wallet->balance         -= $amount;
            $wallet->total_spent     += $amount;
            $wallet->pending_reserved = max(0, $wallet->pending_reserved - $amount);
            $wallet->save();

            return UserWalletTransaction::create([
                'user_id'       => $user->id,
                'type'          => UserWalletTransaction::TYPE_COURSE_CHARGE,
                'amount_fcfa'   => -$amount,
                'balance_after' => $wallet->balance,
                'course_id'     => $course->id,
            ]);
        });
    }

    /**
     * Capture partielle — Cas 3 (client injoignable), 4 (client refuse), 6 (marchand annule).
     *
     * La course est en `at_dropoff` ou similaire : le hold couvre encore
     * le delivery_fee entier. L'ops décide de facturer $capturedAmount et
     * de rembourser le reste. Ici on :
     *   - débite $capturedAmount du wallet (charge réel comptable)
     *   - relâche le hold entier (course.delivery_fee) donc les
     *     (delivery_fee − capturedAmount) redeviennent disponibles côté marchand
     *   - détague la course (paid_from_wallet = false) pour bloquer tout
     *     re-charge ultérieur si la course transitionne vers un état terminal
     *   - trace 1 seul course_charge avec metadata.partial = true
     *
     * Idempotent via UNIQUE partielle (course_id, type=course_charge).
     *
     * @throws \DomainException si course non tagged wallet, ou solde insuffisant
     */
    public function chargePartial(User $user, Course $course, int $capturedAmount): UserWalletTransaction
    {
        if ($capturedAmount <= 0) {
            throw new \InvalidArgumentException("Captured amount must be > 0, got {$capturedAmount}.");
        }
        if (! $course->paid_from_wallet) {
            throw new \DomainException("Course #{$course->id} n'est pas marquée paid_from_wallet.");
        }

        $existing = UserWalletTransaction::where('course_id', $course->id)
            ->where('type', UserWalletTransaction::TYPE_COURSE_CHARGE)
            ->first();
        if ($existing) {
            return $existing;
        }

        $holdAmount = (int) $course->delivery_fee;
        if ($capturedAmount > $holdAmount) {
            throw new \DomainException(
                "Capture partielle > hold : demandé={$capturedAmount}, hold={$holdAmount}."
            );
        }

        return DB::transaction(function () use ($user, $course, $capturedAmount, $holdAmount) {
            $wallet = UserWallet::where('user_id', $user->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($capturedAmount > $wallet->balance) {
                throw new \DomainException(
                    "Solde insuffisant à la capture partielle : balance={$wallet->balance}, capture={$capturedAmount}."
                );
            }

            $wallet->balance         -= $capturedAmount;
            $wallet->total_spent     += $capturedAmount;
            // On relâche le hold entier — les (hold − captured) redeviennent dispo.
            $wallet->pending_reserved = max(0, $wallet->pending_reserved - $holdAmount);
            $wallet->save();

            $course->paid_from_wallet = false;
            $course->save();

            return UserWalletTransaction::create([
                'user_id'       => $user->id,
                'type'          => UserWalletTransaction::TYPE_COURSE_CHARGE,
                'amount_fcfa'   => -$capturedAmount,
                'balance_after' => $wallet->balance,
                'course_id'     => $course->id,
                'metadata'      => [
                    'partial'         => true,
                    'hold_amount'     => $holdAmount,
                    'captured_amount' => $capturedAmount,
                    'released_amount' => $holdAmount - $capturedAmount,
                ],
            ]);
        });
    }

    /**
     * Course annulée/échouée AVANT livraison : libère la réservation sans débit.
     * Idempotent : si la course n'est pas paid_from_wallet, no-op.
     */
    public function releaseReservation(User $user, Course $course, int $amount): void
    {
        if (! $course->paid_from_wallet) {
            return;
        }
        if ($amount <= 0) {
            throw new \InvalidArgumentException("Release amount must be > 0, got {$amount}.");
        }

        // Si la course a déjà été chargée, c'est trop tard pour release — c'est un refund.
        $alreadyCharged = UserWalletTransaction::where('course_id', $course->id)
            ->where('type', UserWalletTransaction::TYPE_COURSE_CHARGE)
            ->exists();
        if ($alreadyCharged) {
            return;
        }

        DB::transaction(function () use ($user, $course, $amount) {
            $wallet = UserWallet::where('user_id', $user->id)
                ->lockForUpdate()
                ->first();
            if (! $wallet) {
                return;
            }

            $wallet->pending_reserved = max(0, $wallet->pending_reserved - $amount);
            $wallet->save();

            // On détag la course pour qu'un retry de transition delivered ne re-débite pas.
            $course->paid_from_wallet = false;
            $course->save();
        });
    }

    /**
     * Refund APRÈS débit (cas exceptionnel : litige, geste commercial post-livraison).
     * Idempotent via UNIQUE partielle (course_id, type=refund).
     *
     * @throws \DomainException si aucun débit préalable pour cette course
     */
    public function refundCourse(User $user, Course $course, int $amount, ?string $reason = null): UserWalletTransaction
    {
        if ($amount <= 0) {
            throw new \InvalidArgumentException("Refund amount must be > 0, got {$amount}.");
        }

        $existing = UserWalletTransaction::where('course_id', $course->id)
            ->where('type', UserWalletTransaction::TYPE_REFUND)
            ->first();
        if ($existing) {
            return $existing;
        }

        $charge = UserWalletTransaction::where('course_id', $course->id)
            ->where('type', UserWalletTransaction::TYPE_COURSE_CHARGE)
            ->first();
        if (! $charge) {
            throw new \DomainException("Course #{$course->id} n'a pas été chargée, rien à rembourser.");
        }

        return DB::transaction(function () use ($user, $course, $amount, $reason) {
            $wallet = UserWallet::where('user_id', $user->id)
                ->lockForUpdate()
                ->firstOrFail();

            $wallet->balance += $amount;
            $wallet->save();

            return UserWalletTransaction::create([
                'user_id'       => $user->id,
                'type'          => UserWalletTransaction::TYPE_REFUND,
                'amount_fcfa'   => $amount,
                'balance_after' => $wallet->balance,
                'course_id'     => $course->id,
                'metadata'      => $reason ? ['reason' => $reason] : null,
            ]);
        });
    }

    /**
     * Ajustement admin : crédit hors Fedapay (geste commercial, correction d'erreur).
     */
    public function adjustCredit(User $user, int $amount, int $adminId, string $reason): UserWalletTransaction
    {
        if ($amount <= 0) {
            throw new \InvalidArgumentException("Adjustment credit must be > 0, got {$amount}.");
        }

        return DB::transaction(function () use ($user, $amount, $adminId, $reason) {
            $wallet = UserWallet::where('user_id', $user->id)
                ->lockForUpdate()
                ->firstOrFail();

            $wallet->balance += $amount;
            $wallet->save();

            return UserWalletTransaction::create([
                'user_id'       => $user->id,
                'type'          => UserWalletTransaction::TYPE_ADJUSTMENT_CREDIT,
                'amount_fcfa'   => $amount,
                'balance_after' => $wallet->balance,
                'metadata'      => ['admin_id' => $adminId, 'reason' => $reason],
            ]);
        });
    }

    /**
     * Retrait approuvé par un admin : débite le wallet et journalise.
     *
     * On considère le retrait comme un *paiement sortant* — il ampute la balance
     * réelle et **compte le total_spent** (comme un course_charge) : c'est de
     * l'argent qui quitte définitivement notre garde.
     *
     * Comme le driver equivalent (DriverWalletService::withdraw), cette méthode
     * est appelée UNIQUEMENT depuis l'action admin "approuver" — pas au moment
     * de la demande. Une demande pending ne bloque pas de solde (mais le
     * contrôleur vérifie `existingPending` pour empêcher les demandes concurrentes).
     *
     * @throws \DomainException si le disponible ne couvre pas le retrait
     */
    public function withdraw(User $user, int $amount, int $adminId, string $reason): UserWalletTransaction
    {
        if ($amount <= 0) {
            throw new \InvalidArgumentException("Withdraw amount must be > 0, got {$amount}.");
        }

        return DB::transaction(function () use ($user, $amount, $adminId, $reason) {
            $wallet = UserWallet::where('user_id', $user->id)
                ->lockForUpdate()
                ->firstOrFail();

            // Disponible = balance − holds courses. On refuse si ça dépasse.
            $available = (int) $wallet->balance - (int) $wallet->pending_reserved;
            if ($amount > $available) {
                throw new \DomainException(
                    "Retrait impossible : disponible={$available} FCFA, demandé={$amount} FCFA."
                );
            }

            $wallet->balance -= $amount;
            $wallet->total_spent = ((int) $wallet->total_spent) + $amount;
            $wallet->save();

            return UserWalletTransaction::create([
                'user_id'       => $user->id,
                'type'          => UserWalletTransaction::TYPE_WITHDRAW,
                'amount_fcfa'   => -$amount,
                'balance_after' => $wallet->balance,
                'metadata'      => ['admin_id' => $adminId, 'reason' => $reason],
            ]);
        });
    }

    /**
     * Ajustement admin : débit hors course (correction d'erreur).
     *
     * @throws \DomainException si solde disponible insuffisant
     */
    public function adjustDebit(User $user, int $amount, int $adminId, string $reason): UserWalletTransaction
    {
        if ($amount <= 0) {
            throw new \InvalidArgumentException("Adjustment debit must be > 0, got {$amount}.");
        }

        return DB::transaction(function () use ($user, $amount, $adminId, $reason) {
            $wallet = UserWallet::where('user_id', $user->id)
                ->lockForUpdate()
                ->firstOrFail();

            $available = (int) $wallet->balance - (int) $wallet->pending_reserved;
            if ($amount > $available) {
                throw new \DomainException(
                    "Ajustement impossible : disponible={$available}, demandé={$amount}."
                );
            }

            $wallet->balance -= $amount;
            $wallet->save();

            return UserWalletTransaction::create([
                'user_id'       => $user->id,
                'type'          => UserWalletTransaction::TYPE_ADJUSTMENT_DEBIT,
                'amount_fcfa'   => -$amount,
                'balance_after' => $wallet->balance,
                'metadata'      => ['admin_id' => $adminId, 'reason' => $reason],
            ]);
        });
    }
}
