<?php

namespace App\Services;

use App\Models\AppSetting;
use App\Models\Course;
use App\Models\Driver;
use App\Models\DriverWallet;
use App\Models\Payment;
use App\Models\WalletTransaction;
use Illuminate\Support\Facades\DB;

/**
 * Toute mutation d'un DriverWallet DOIT passer par ce service.
 *
 * Garanties :
 *  - balance >= 0 à tout moment (CHECK Postgres + gardes ici)
 *  - balance == SUM(wallet_transactions.amount_fcfa WHERE driver_id) en permanence
 *  - chaque mutation = 1 ligne dans wallet_transactions (audit immuable)
 *  - opérations concurrentes sur un même wallet sérialisées via lockForUpdate()
 */
class DriverWalletService
{
    /**
     * Crédite la caution d'un driver après un top-up Fedapay réussi.
     *
     * @throws \InvalidArgumentException si $amount <= 0
     */
    public function deposit(Driver $driver, int $amount, Payment $payment): WalletTransaction
    {
        if ($amount <= 0) {
            throw new \InvalidArgumentException("Deposit amount must be > 0, got {$amount}.");
        }

        $transaction = DB::transaction(function () use ($driver, $amount, $payment) {
            $wallet = DriverWallet::where('driver_id', $driver->id)
                ->lockForUpdate()
                ->firstOrFail();

            $wallet->balance         += $amount;
            $wallet->total_deposited += $amount;
            $wallet->save();

            return WalletTransaction::create([
                'driver_id'     => $driver->id,
                'type'          => WalletTransaction::TYPE_DEPOSIT,
                'amount_fcfa'   => $amount,
                'balance_after' => $wallet->balance,
                'payment_id'    => $payment->id,
            ]);
        });

        return $this->recordAccounting($transaction);
    }

    /**
     * Vérifie qu'un retrait peut être RÉSERVÉ (pas débité) sur la caution. Appelé
     * juste avant de passer une demande en approved :
     *  - AdminController à la validation admin (mode admin_approval)
     *  - DriverController en self-service (driver_payout_mode=instant)
     *
     * DOIT être appelé dans une DB::transaction englobant le passage en approved :
     * le lockForUpdate sérialise les réservations concurrentes sur un même wallet.
     * Le débit réel n'a lieu qu'à la confirmation du virement (settleWithdraw).
     *
     * @throws \InvalidArgumentException si $amount <= 0 (bug d'appelant)
     * @throws \DomainException          si règle métier violée (disponible, busy, min)
     */
    public function assertCanReserveWithdraw(Driver $driver, int $amount): void
    {
        if ($amount <= 0) {
            throw new \InvalidArgumentException("Withdraw amount must be > 0, got {$amount}.");
        }

        $minWithdraw = (int) AppSetting::get('driver_min_withdraw_fcfa', 500);
        if ($amount < $minWithdraw) {
            throw new \DomainException("Retrait minimum: {$minWithdraw} FCFA.");
        }

        if ($driver->availability_status === 'busy') {
            throw new \DomainException('Retrait impossible : ce livreur a une course en cours.');
        }

        $wallet = DriverWallet::where('driver_id', $driver->id)
            ->lockForUpdate()
            ->firstOrFail();

        // Disponible = balance − retraits déjà en vol (vérifié SOUS le lock)
        $available = $wallet->available();
        if ($amount > $available) {
            throw new \DomainException("Solde insuffisant : disponible={$available}, demandé={$amount}.");
        }
    }

    /**
     * Débite la caution UNE FOIS le virement confirmé (webhook FedaPay `sent`
     * ou « Marquer comme viré » admin). L'argent a déjà quitté AirMess : pas de
     * contrôle busy/min ici, seulement le plancher balance >= 0.
     *
     * Idempotent : si un débit existe déjà pour ce retrait (y compris un débit
     * historique posé à l'approbation avant ce modèle), il est retourné tel quel.
     *
     * @throws \DomainException si la balance ne couvre plus le montant (anomalie)
     */
    public function settleWithdraw(\App\Models\WalletWithdrawRequest $withdraw): WalletTransaction
    {
        $existing = $this->findWithdrawDebit($withdraw);
        if ($existing) {
            return $existing;
        }

        $amount = (int) $withdraw->amount_fcfa;

        $transaction = DB::transaction(function () use ($withdraw, $amount) {
            $wallet = DriverWallet::where('driver_id', $withdraw->driver_id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($amount > $wallet->balance) {
                throw new \DomainException("Débit du retrait #{$withdraw->id} impossible : balance={$wallet->balance}, montant={$amount}.");
            }

            $wallet->balance         -= $amount;
            $wallet->total_withdrawn += $amount;
            $wallet->save();

            return WalletTransaction::create([
                'driver_id'     => $withdraw->driver_id,
                'type'          => WalletTransaction::TYPE_WITHDRAW,
                'amount_fcfa'   => -$amount, // signe négatif (CHECK Postgres)
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
     * Débit déjà posé pour ce retrait. Couvre le nouveau format (metadata.withdraw_id)
     * et les débits historiques posés à l'approbation (raison libellée avec l'id).
     */
    public function findWithdrawDebit(\App\Models\WalletWithdrawRequest $withdraw): ?WalletTransaction
    {
        return WalletTransaction::where('driver_id', $withdraw->driver_id)
            ->where('type', WalletTransaction::TYPE_WITHDRAW)
            ->where(function ($q) use ($withdraw) {
                $q->whereJsonContains('metadata->withdraw_id', $withdraw->id)
                  ->orWhereIn('metadata->reason', [
                      "Approval of withdraw request #{$withdraw->id}",
                      "Instant self-service withdraw #{$withdraw->id}",
                  ]);
            })
            ->first();
    }

    /**
     * Débit de la caution au moment où le livreur récupère effectivement
     * le colis chez le marchand (transition course → picked_up).
     *
     * Idempotent : si une transaction pickup_debit existe déjà pour cette
     * course, on la retourne sans rien refaire.
     *
     * @throws \DomainException si la course n'a pas d'encaissement, ou solde insuffisant
     */
    public function debitForPickup(Driver $driver, Course $course): WalletTransaction
    {
        if (! $course->has_collection || (int) $course->collection_amount <= 0) {
            throw new \DomainException("Course #{$course->id} n'a pas d'encaissement, rien à débiter.");
        }

        // (b) check applicatif d'idempotence — réponse propre sans toucher au wallet
        $existing = WalletTransaction::where('course_id', $course->id)
            ->where('type', WalletTransaction::TYPE_PICKUP_DEBIT)
            ->first();
        if ($existing) {
            return $existing;
        }

        $amount = (int) $course->collection_amount;

        $transaction = DB::transaction(function () use ($driver, $course, $amount) {
            $wallet = DriverWallet::where('driver_id', $driver->id)
                ->lockForUpdate()
                ->firstOrFail();

            // Métier sous lock : solde toujours suffisant ?
            // En théorie oui (filtré au matching + driver busy donc pas de retrait possible),
            // mais defense in depth.
            if ($amount > $wallet->balance) {
                throw new \DomainException(
                    "Caution insuffisante pour le pickup : balance={$wallet->balance}, besoin={$amount}."
                );
            }

            $wallet->balance -= $amount;
            $wallet->save();

            // (c) Le UNIQUE (course_id, type) garantit qu'on ne peut pas insérer 2x
            return WalletTransaction::create([
                'driver_id'     => $driver->id,
                'type'          => WalletTransaction::TYPE_PICKUP_DEBIT,
                'amount_fcfa'   => -$amount,
                'balance_after' => $wallet->balance,
                'course_id'     => $course->id,
            ]);
        });

        return $this->recordAccounting($transaction);
    }

    /**
     * Crédit du wallet à la livraison d'une course : les gains du driver s'ajoutent
     * directement à sa caution. Plus il livre, plus il peut accepter de grosses courses.
     *
     * Idempotent : si une transaction earning existe déjà pour cette course, retournée.
     *
     * @throws \InvalidArgumentException si $amount <= 0
     */
    public function creditEarning(Driver $driver, Course $course, int $amount): WalletTransaction
    {
        if ($amount <= 0) {
            throw new \InvalidArgumentException("Earning amount must be > 0, got {$amount}.");
        }

        // (b) Idempotence applicative
        $existing = WalletTransaction::where('course_id', $course->id)
            ->where('type', WalletTransaction::TYPE_EARNING)
            ->first();
        if ($existing) {
            return $existing;
        }

        $transaction = DB::transaction(function () use ($driver, $course, $amount) {
            $wallet = DriverWallet::where('driver_id', $driver->id)
                ->lockForUpdate()
                ->firstOrFail();

            $wallet->balance += $amount;
            $wallet->save();

            // (c) Le UNIQUE (course_id, type) garantit l'idempotence ultime
            return WalletTransaction::create([
                'driver_id'     => $driver->id,
                'type'          => WalletTransaction::TYPE_EARNING,
                'amount_fcfa'   => $amount,
                'balance_after' => $wallet->balance,
                'course_id'     => $course->id,
            ]);
        });

        return $this->recordAccounting($transaction);
    }

    /**
     * Débit de la part AirMess (commission) quand un livreur INDÉPENDANT livre une
     * course "payée à la livraison" (delivery_fee_paid_by=recipient).
     *
     * Le livreur a déjà encaissé 100% du delivery_fee en cash/mobile money chez le
     * destinataire — pas de crédit gains ici (il tient déjà sa part), on débite
     * uniquement la différence (delivery_fee - driver_earnings) qui revient à
     * AirMess. Le driver n'est proposé ce type de course que si son wallet peut
     * déjà couvrir ce montant (cf. filtre offeredCourses/showCourse) : l'échec ici
     * ne devrait survenir qu'en cas de variation de solde entre l'offre et la
     * livraison (defense in depth, comme debitForPickup).
     *
     * Idempotent : si une transaction platform_commission existe déjà pour cette
     * course, on la retourne sans rien refaire.
     *
     * @throws \InvalidArgumentException si $amount <= 0
     * @throws \DomainException          si solde insuffisant
     */
    public function debitPlatformCommission(Driver $driver, Course $course, int $amount): WalletTransaction
    {
        if ($amount <= 0) {
            throw new \InvalidArgumentException("Platform commission amount must be > 0, got {$amount}.");
        }

        $existing = WalletTransaction::where('course_id', $course->id)
            ->where('type', WalletTransaction::TYPE_PLATFORM_COMMISSION)
            ->first();
        if ($existing) {
            return $existing;
        }

        $transaction = DB::transaction(function () use ($driver, $course, $amount) {
            $wallet = DriverWallet::where('driver_id', $driver->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($amount > $wallet->balance) {
                throw new \DomainException(
                    "Commission plateforme impossible : balance={$wallet->balance}, besoin={$amount}."
                );
            }

            $wallet->balance -= $amount;
            $wallet->save();

            return WalletTransaction::create([
                'driver_id'     => $driver->id,
                'type'          => WalletTransaction::TYPE_PLATFORM_COMMISSION,
                'amount_fcfa'   => -$amount,
                'balance_after' => $wallet->balance,
                'course_id'     => $course->id,
            ]);
        });

        return $this->recordAccounting($transaction);
    }

    /**
     * Rémunération partielle — Cas 3 (client injoignable), 4 (client refuse), 6 (marchand annule).
     *
     * Le driver a fait le trajet (ou une partie), la course finit en `failed`
     * sans passer par `delivered`. L'ops décide de créditer une part des
     * gains initialement prévus (paramétré par
     * conflicts_no_show_driver_earnings_percent ou similaire).
     *
     * On utilise `TYPE_EARNING` (comptablement c'est un gain de course), avec
     * metadata.partial = true pour distinguer d'un earning normal.
     * Le UNIQUE (course_id, type=earning) garantit qu'on ne peut pas cumuler
     * avec un earning complet ultérieur.
     *
     * @throws \InvalidArgumentException si $amount <= 0
     */
    public function earnPartial(Driver $driver, Course $course, int $amount, string $reason): WalletTransaction
    {
        if ($amount <= 0) {
            throw new \InvalidArgumentException("Partial earning amount must be > 0, got {$amount}.");
        }

        $existing = WalletTransaction::where('course_id', $course->id)
            ->where('type', WalletTransaction::TYPE_EARNING)
            ->first();
        if ($existing) {
            return $existing;
        }

        $transaction = DB::transaction(function () use ($driver, $course, $amount, $reason) {
            $wallet = DriverWallet::where('driver_id', $driver->id)
                ->lockForUpdate()
                ->firstOrFail();

            $wallet->balance += $amount;
            $wallet->save();

            return WalletTransaction::create([
                'driver_id'     => $driver->id,
                'type'          => WalletTransaction::TYPE_EARNING,
                'amount_fcfa'   => $amount,
                'balance_after' => $wallet->balance,
                'course_id'     => $course->id,
                'metadata'      => [
                    'partial'          => true,
                    'reason'           => $reason,
                    'full_earnings'    => (int) $course->driver_earnings,
                    'partial_earnings' => $amount,
                ],
            ]);
        });

        return $this->recordAccounting($transaction);
    }

    /**
     * Ajustement admin : crédit manuel hors flow Fedapay.
     * Cas d'usage : top-up MoMo direct, geste commercial, correctif de bug, test/dev.
     *
     * @throws \InvalidArgumentException si $amount <= 0
     */
    public function adjustCredit(Driver $driver, int $amount, int $adminId, string $reason): WalletTransaction
    {
        if ($amount <= 0) {
            throw new \InvalidArgumentException("Adjustment credit must be > 0, got {$amount}.");
        }

        $transaction = DB::transaction(function () use ($driver, $amount, $adminId, $reason) {
            $wallet = DriverWallet::where('driver_id', $driver->id)
                ->lockForUpdate()
                ->firstOrFail();

            $wallet->balance += $amount;
            $wallet->save();

            return WalletTransaction::create([
                'driver_id'     => $driver->id,
                'type'          => WalletTransaction::TYPE_ADJUSTMENT_CREDIT,
                'amount_fcfa'   => $amount,
                'balance_after' => $wallet->balance,
                'metadata'      => ['admin_id' => $adminId, 'reason' => $reason],
            ]);
        });

        return $this->recordAccounting($transaction);
    }

    /**
     * Ajustement admin : débit manuel hors flow normal.
     * Cas d'usage : rattrapage d'un débit raté (bug), erreur comptable à corriger.
     *
     * @throws \InvalidArgumentException si $amount <= 0
     * @throws \DomainException          si balance insuffisante (vérifié sous lock)
     */
    public function adjustDebit(Driver $driver, int $amount, int $adminId, string $reason): WalletTransaction
    {
        if ($amount <= 0) {
            throw new \InvalidArgumentException("Adjustment debit must be > 0, got {$amount}.");
        }

        $transaction = DB::transaction(function () use ($driver, $amount, $adminId, $reason) {
            $wallet = DriverWallet::where('driver_id', $driver->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($amount > $wallet->balance) {
                throw new \DomainException(
                    "Ajustement impossible : balance actuelle = {$wallet->balance} FCFA, demandé = {$amount} FCFA."
                );
            }

            $wallet->balance -= $amount;
            $wallet->save();

            return WalletTransaction::create([
                'driver_id'     => $driver->id,
                'type'          => WalletTransaction::TYPE_ADJUSTMENT_DEBIT,
                'amount_fcfa'   => -$amount,
                'balance_after' => $wallet->balance,
                'metadata'      => ['admin_id' => $adminId, 'reason' => $reason],
            ]);
        });

        return $this->recordAccounting($transaction);
    }

    /**
     * Payout FedaPay définitivement échoué : restitue la caution SEULEMENT si un
     * débit a réellement été posé (demandes historiques débitées à l'approbation).
     * Avec le modèle actuel (débit à la confirmation), rien n'a été débité : no-op,
     * la réservation est libérée par le simple marquage payout_failed_at.
     *
     * Idempotent : si un refund existe déjà pour ce withdraw (metadata match),
     * la méthode est no-op — le webhook Fedapay peut être renvoyé plusieurs fois.
     *
     * Utilise TYPE_ADJUSTMENT_CREDIT avec un metadata dédié (withdraw_refund_for)
     * plutôt qu'un nouveau type — évite une migration CHECK et la trace metadata
     * suffit pour les besoins compta actuels.
     */
    public function refundFailedWithdraw(Driver $driver, \App\Models\WalletWithdrawRequest $withdraw): ?WalletTransaction
    {
        $existing = WalletTransaction::where('driver_id', $driver->id)
            ->where('type', WalletTransaction::TYPE_ADJUSTMENT_CREDIT)
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

        $transaction = DB::transaction(function () use ($driver, $withdraw, $amount) {
            $wallet = DriverWallet::where('driver_id', $driver->id)
                ->lockForUpdate()
                ->firstOrFail();

            $wallet->balance         += $amount;
            $wallet->total_withdrawn  = max(0, ((int) $wallet->total_withdrawn) - $amount);
            $wallet->save();

            return WalletTransaction::create([
                'driver_id'     => $driver->id,
                'type'          => WalletTransaction::TYPE_ADJUSTMENT_CREDIT,
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
     * Remboursement de la caution si la course est marquée failed APRÈS le pickup.
     * Le driver rend le colis au marchand → sa caution doit revenir.
     *
     * Idempotent : si un refund existe déjà pour cette course, retourné tel quel.
     *
     * @throws \DomainException si pas d'encaissement, ou pas de pickup_debit préalable
     */
    public function refundFailedCourse(Driver $driver, Course $course): WalletTransaction
    {
        if (! $course->has_collection || (int) $course->collection_amount <= 0) {
            throw new \DomainException("Course #{$course->id} n'a pas d'encaissement, rien à rembourser.");
        }

        // (b) Idempotence : déjà remboursé ?
        $existing = WalletTransaction::where('course_id', $course->id)
            ->where('type', WalletTransaction::TYPE_REFUND)
            ->first();
        if ($existing) {
            return $existing;
        }

        // Sanity : on ne peut rembourser que si on a effectivement débité
        $pickupDebit = WalletTransaction::where('course_id', $course->id)
            ->where('type', WalletTransaction::TYPE_PICKUP_DEBIT)
            ->first();
        if (! $pickupDebit) {
            throw new \DomainException(
                "Course #{$course->id} n'a pas été débitée au pickup, rien à rembourser."
            );
        }

        $amount = (int) $course->collection_amount;

        $transaction = DB::transaction(function () use ($driver, $course, $amount) {
            $wallet = DriverWallet::where('driver_id', $driver->id)
                ->lockForUpdate()
                ->firstOrFail();

            $wallet->balance += $amount;
            $wallet->save();

            return WalletTransaction::create([
                'driver_id'     => $driver->id,
                'type'          => WalletTransaction::TYPE_REFUND,
                'amount_fcfa'   => $amount, // signe positif
                'balance_after' => $wallet->balance,
                'course_id'     => $course->id,
            ]);
        });

        return $this->recordAccounting($transaction);
    }

    private function recordAccounting(WalletTransaction $transaction): WalletTransaction
    {
        app(AccountingLedgerService::class)->recordDriverWalletTransaction($transaction);

        return $transaction;
    }
}
