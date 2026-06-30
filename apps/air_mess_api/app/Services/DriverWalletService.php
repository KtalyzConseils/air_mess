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

        return DB::transaction(function () use ($driver, $amount, $payment) {
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
    }

    /**
     * Retire une partie de la caution du driver. Appelé après validation admin
     * d'une demande de retrait (le virement réel MoMo/banque se fait hors système).
     *
     * @throws \InvalidArgumentException si $amount <= 0 (bug d'appelant)
     * @throws \DomainException          si règle métier violée (solde, busy, min)
     */
    public function withdraw(Driver $driver, int $amount, int $adminId, string $reason): WalletTransaction
    {
        // 1. Sanity (bug d'appelant)
        if ($amount <= 0) {
            throw new \InvalidArgumentException("Withdraw amount must be > 0, got {$amount}.");
        }

        // 2. Métier : retrait minimum (frais MoMo/banque)
        $minWithdraw = (int) AppSetting::get('driver_min_withdraw_fcfa', 500);
        if ($amount < $minWithdraw) {
            throw new \DomainException("Retrait minimum: {$minWithdraw} FCFA.");
        }

        // 3. Métier : pas de retrait pendant une course active
        if ($driver->availability_status === 'busy') {
            throw new \DomainException('Retrait impossible : ce livreur a une course en cours.');
        }

        return DB::transaction(function () use ($driver, $amount, $adminId, $reason) {
            $wallet = DriverWallet::where('driver_id', $driver->id)
                ->lockForUpdate()
                ->firstOrFail();

            // 4. Métier : solde suffisant (vérifié SOUS le lock pour éviter race)
            if ($amount > $wallet->balance) {
                throw new \DomainException("Solde insuffisant : balance={$wallet->balance}, demandé={$amount}.");
            }

            $wallet->balance         -= $amount;
            $wallet->total_withdrawn += $amount;
            $wallet->save();

            return WalletTransaction::create([
                'driver_id'     => $driver->id,
                'type'          => WalletTransaction::TYPE_WITHDRAW,
                'amount_fcfa'   => -$amount, // signe négatif (CHECK Postgres)
                'balance_after' => $wallet->balance,
                'metadata'      => [
                    'admin_id' => $adminId,
                    'reason'   => $reason,
                ],
            ]);
        });
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

        return DB::transaction(function () use ($driver, $course, $amount) {
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

        return DB::transaction(function () use ($driver, $course, $amount) {
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

        return DB::transaction(function () use ($driver, $amount, $adminId, $reason) {
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

        return DB::transaction(function () use ($driver, $amount, $adminId, $reason) {
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

        return DB::transaction(function () use ($driver, $course, $amount) {
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
    }
}
