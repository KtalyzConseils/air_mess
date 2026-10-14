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

        $transaction = DB::transaction(function () use ($user, $amount, $payment) {
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

        return $this->recordAccounting($transaction);
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

            // Capacité disponible = balance - holds existants - retraits en vol.
            $available = $wallet->available();
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

        $transaction = DB::transaction(function () use ($user, $course, $amount) {
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

        return $this->recordAccounting($transaction);
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

        $transaction = DB::transaction(function () use ($user, $course, $capturedAmount, $holdAmount) {
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

        return $this->recordAccounting($transaction);
    }

    /**
     * Crédite le wallet du marchand quand une course avec encaissement est livrée.
     *
     * Modèle : au pickup, le driver a été débité de collection_amount sur sa
     * caution (via DriverWalletService::debitForPickup). Il a ensuite collecté
     * physiquement ce cash chez le destinataire. À la livraison, on transfère
     * cet argent au marchand via son wallet — le driver reste équilibré
     * (caution −X compensée par le cash physique +X).
     *
     * Idempotent via UNIQUE partielle (course_id, type=collection_credit).
     *
     * @throws \InvalidArgumentException si $amount <= 0
     */
    public function creditForDelivery(User $marchand, Course $course, int $amount): UserWalletTransaction
    {
        if ($amount <= 0) {
            throw new \InvalidArgumentException("Collection credit must be > 0, got {$amount}.");
        }

        // Idempotence applicative : déjà crédité ?
        $existing = UserWalletTransaction::where('course_id', $course->id)
            ->where('type', UserWalletTransaction::TYPE_COLLECTION_CREDIT)
            ->first();
        if ($existing) {
            return $existing;
        }

        $transaction = DB::transaction(function () use ($marchand, $course, $amount) {
            $wallet = UserWallet::where('user_id', $marchand->id)
                ->lockForUpdate()
                ->firstOrFail();

            $wallet->balance += $amount;
            $wallet->save();

            return UserWalletTransaction::create([
                'user_id'       => $marchand->id,
                'type'          => UserWalletTransaction::TYPE_COLLECTION_CREDIT,
                'amount_fcfa'   => $amount,
                'balance_after' => $wallet->balance,
                'course_id'     => $course->id,
                'metadata'      => [
                    'source' => 'driver_collection',
                    'note'   => 'Encaissement livré — cash collecté par le driver chez le destinataire',
                ],
            ]);
        });

        return $this->recordAccounting($transaction);
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
     * Rembourse dans le wallet un paiement direct d'une course annulée avant pickup.
     * Idempotent via la transaction refund liée à la course.
     */
    public function refundDirectPayment(User $user, Course $course, int $amount): ?UserWalletTransaction
    {
        if ($amount <= 0) {
            throw new \InvalidArgumentException("Refund amount must be > 0, got {$amount}.");
        }

        return DB::transaction(function () use ($user, $course, $amount) {
            $payment = Payment::where('user_id', $user->id)
                ->where('type', Payment::TYPE_DELIVERY_FEE)
                ->where('status', Payment::STATUS_PAID)
                ->whereJsonContains('metadata->course_id', $course->id)
                ->lockForUpdate()
                ->first();

            if (! $payment) {
                return null;
            }

            $existing = UserWalletTransaction::where('course_id', $course->id)
                ->where('type', UserWalletTransaction::TYPE_REFUND)
                ->first();
            if ($existing) {
                $payment->update(['status' => Payment::STATUS_REFUNDED]);
                return $existing;
            }

            $wallet = UserWallet::where('user_id', $user->id)
                ->lockForUpdate()
                ->firstOrFail();

            $wallet->balance += $amount;
            $wallet->save();

            $refund = UserWalletTransaction::create([
                'user_id'       => $user->id,
                'type'          => UserWalletTransaction::TYPE_REFUND,
                'amount_fcfa'   => $amount,
                'balance_after' => $wallet->balance,
                'course_id'     => $course->id,
                'payment_id'    => $payment->id,
                'metadata'      => [
                    'reason'  => 'course_cancelled_before_pickup',
                    'channel' => 'user_wallet',
                ],
            ]);

            $payment->update([
                'status'   => Payment::STATUS_REFUNDED,
                'metadata' => array_merge($payment->metadata ?? [], [
                    'refunded_at'     => now()->toIso8601String(),
                    'refund_channel'  => 'user_wallet',
                    'refund_course_id'=> $course->id,
                ]),
            ]);

            return $refund;
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

        $transaction = DB::transaction(function () use ($user, $course, $amount, $reason) {
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

        return $this->recordAccounting($transaction);
    }

    /**
     * Ajustement admin : crédit hors Fedapay (geste commercial, correction d'erreur).
     */
    public function adjustCredit(User $user, int $amount, int $adminId, string $reason): UserWalletTransaction
    {
        if ($amount <= 0) {
            throw new \InvalidArgumentException("Adjustment credit must be > 0, got {$amount}.");
        }

        $transaction = DB::transaction(function () use ($user, $amount, $adminId, $reason) {
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

        return $this->recordAccounting($transaction);
    }

    /**
     * Vérifie qu'un retrait peut être RÉSERVÉ (pas débité) sur le wallet, juste
     * avant de passer la demande en approved (validation admin ou mode instant).
     *
     * DOIT être appelé dans une DB::transaction englobant le passage en approved
     * (lockForUpdate = sérialise les réservations concurrentes). Le débit réel
     * n'a lieu qu'à la confirmation du virement (settleWithdraw).
     *
     * @throws \DomainException si le disponible ne couvre pas le retrait
     */
    public function assertCanReserveWithdraw(User $user, int $amount): void
    {
        if ($amount <= 0) {
            throw new \InvalidArgumentException("Withdraw amount must be > 0, got {$amount}.");
        }

        $wallet = UserWallet::where('user_id', $user->id)
            ->lockForUpdate()
            ->firstOrFail();

        // Disponible = balance − holds courses − retraits déjà en vol.
        $available = $wallet->available();
        if ($amount > $available) {
            throw new \DomainException(
                "Retrait impossible : disponible={$available} FCFA, demandé={$amount} FCFA."
            );
        }
    }

    /**
     * Débite le wallet UNE FOIS le virement confirmé (webhook FedaPay `sent` ou
     * « Marquer comme viré » admin). Le retrait est un *paiement sortant* : il
     * ampute la balance réelle et compte dans total_spent.
     *
     * Idempotent : un débit déjà posé pour ce retrait (y compris un débit
     * historique posé à l'approbation) est retourné tel quel.
     *
     * @throws \DomainException si la balance ne couvre plus le montant (anomalie)
     */
    public function settleWithdraw(\App\Models\WalletWithdrawRequest $withdraw): UserWalletTransaction
    {
        $existing = $this->findWithdrawDebit($withdraw);
        if ($existing) {
            return $existing;
        }

        $amount = (int) $withdraw->amount_fcfa;

        $transaction = DB::transaction(function () use ($withdraw, $amount) {
            $wallet = UserWallet::where('user_id', $withdraw->user_id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($amount > $wallet->balance) {
                throw new \DomainException(
                    "Débit du retrait #{$withdraw->id} impossible : balance={$wallet->balance}, montant={$amount}."
                );
            }

            $wallet->balance -= $amount;
            $wallet->total_spent = ((int) $wallet->total_spent) + $amount;
            $wallet->save();

            return UserWalletTransaction::create([
                'user_id'       => $withdraw->user_id,
                'type'          => UserWalletTransaction::TYPE_WITHDRAW,
                'amount_fcfa'   => -$amount,
                'balance_after' => $wallet->balance,
                'metadata'      => [
                    'admin_id'    => $withdraw->paid_by_admin_id ?? $withdraw->decided_by_admin_id,
                    'withdraw_id' => $withdraw->id,
                    'reason'      => "Payout confirmed for withdraw request #{$withdraw->id}",
                ],
            ]);
        });

        return $this->recordAccounting($transaction);
    }

    /**
     * Débit déjà posé pour ce retrait (nouveau format metadata.withdraw_id ou
     * débit historique posé à l'approbation, raison libellée avec l'id).
     */
    public function findWithdrawDebit(\App\Models\WalletWithdrawRequest $withdraw): ?UserWalletTransaction
    {
        return UserWalletTransaction::where('user_id', $withdraw->user_id)
            ->where('type', UserWalletTransaction::TYPE_WITHDRAW)
            ->where(function ($q) use ($withdraw) {
                $q->whereJsonContains('metadata->withdraw_id', $withdraw->id)
                  ->orWhereIn('metadata->reason', [
                      "Approval of withdraw request #{$withdraw->id}",
                      "Retrait wallet instant #{$withdraw->id}",
                  ]);
            })
            ->first();
    }

    /**
     * Payout FedaPay définitivement échoué : restitue le wallet SEULEMENT si un
     * débit a réellement été posé (demandes historiques). Avec le modèle actuel,
     * rien n'a été débité : no-op. Symétrique de DriverWalletService.
     *
     * Idempotent : refund déjà émis pour ce withdraw → no-op (metadata match).
     */
    public function refundFailedWithdraw(User $user, \App\Models\WalletWithdrawRequest $withdraw): ?UserWalletTransaction
    {
        $existing = UserWalletTransaction::where('user_id', $user->id)
            ->where('type', UserWalletTransaction::TYPE_ADJUSTMENT_CREDIT)
            ->whereJsonContains('metadata->withdraw_refund_for', $withdraw->id)
            ->first();
        if ($existing) {
            return $existing;
        }
        if (! $this->findWithdrawDebit($withdraw)) {
            return null; // jamais débité → rien à restituer
        }

        $amount = (int) $withdraw->amount_fcfa;
        if ($amount <= 0) {
            return null;
        }

        $transaction = DB::transaction(function () use ($user, $withdraw, $amount) {
            $wallet = UserWallet::where('user_id', $user->id)
                ->lockForUpdate()
                ->firstOrFail();

            $wallet->balance    += $amount;
            $wallet->total_spent = max(0, ((int) $wallet->total_spent) - $amount);
            $wallet->save();

            return UserWalletTransaction::create([
                'user_id'       => $user->id,
                'type'          => UserWalletTransaction::TYPE_ADJUSTMENT_CREDIT,
                'amount_fcfa'   => $amount,
                'balance_after' => $wallet->balance,
                'metadata'      => [
                    'system'                => true,
                    'withdraw_refund_for'   => $withdraw->id,
                    'reason'                => 'Fedapay payout failed — automatic refund',
                    'payout_failure_reason' => $withdraw->payout_failure_reason,
                ],
            ]);
        });

        return $this->recordAccounting($transaction);
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

        $transaction = DB::transaction(function () use ($user, $amount, $adminId, $reason) {
            $wallet = UserWallet::where('user_id', $user->id)
                ->lockForUpdate()
                ->firstOrFail();

            $available = $wallet->available();
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

        return $this->recordAccounting($transaction);
    }

    private function recordAccounting(UserWalletTransaction $transaction): UserWalletTransaction
    {
        app(AccountingLedgerService::class)->recordUserWalletTransaction($transaction);

        return $transaction;
    }
}
