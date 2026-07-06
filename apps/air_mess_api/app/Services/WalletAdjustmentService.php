<?php

namespace App\Services;

use App\Models\Course;
use App\Models\CourseIncident;
use App\Models\Driver;
use App\Models\DriverWallet;
use App\Models\User;
use App\Models\UserWallet;
use App\Models\UserWalletTransaction;
use App\Models\WalletAdjustment;
use App\Models\WalletTransaction;
use Illuminate\Support\Facades\DB;

/**
 * Service unique pour arbitrer un mouvement wallet non-transactionnel
 * (post-livraison, hors flow normal course-charge / top-up / withdraw).
 *
 * Toute méthode `applyTo*` s'exécute en transaction atomique et crée :
 *   1. Une ligne `wallet_adjustments`         (source de vérité audit)
 *   2. Une ligne wallet_transactions          (impact wallet + snapshot balance)
 *   3. La mise à jour de la balance du wallet
 *
 * Retourne l'objet WalletAdjustment. La transaction wallet créée est reliée
 * via `metadata.adjustment_id` (FK inverse queryable côté transactions).
 *
 * Zéro modification directe de solde ne doit se faire ailleurs — ce service
 * est la seule voie légitime pour un débit/refund arbitré.
 */
class WalletAdjustmentService
{
    /**
     * Applique un ajustement sur un wallet driver.
     * L'amount est signé : positif = crédit, négatif = débit.
     * Pour un débit, on refuse si `balance + amount < 0` (protection).
     */
    public function applyToDriver(
        Driver $driver,
        int $amount,
        string $reasonCode,
        ?Course $course = null,
        ?CourseIncident $incident = null,
        ?int $adminId = null,
        ?string $notes = null,
    ): WalletAdjustment {
        if ($amount === 0) {
            throw new \InvalidArgumentException('WalletAdjustment amount must not be zero.');
        }
        $this->assertReasonMatchesSign($reasonCode, $amount);

        return DB::transaction(function () use ($driver, $amount, $reasonCode, $course, $incident, $adminId, $notes) {
            $wallet = DriverWallet::where('driver_id', $driver->id)
                ->lockForUpdate()
                ->firstOrFail();

            $newBalance = (int) $wallet->balance + $amount;
            if ($newBalance < 0) {
                throw new \DomainException(
                    "Ajustement impossible : balance driver ({$wallet->balance}) insuffisante pour un débit de " . abs($amount) . " FCFA."
                );
            }
            $wallet->balance = $newBalance;
            $wallet->save();

            $adj = WalletAdjustment::create([
                'wallet_type'     => WalletAdjustment::WALLET_TYPE_DRIVER,
                'wallet_owner_id' => $driver->id,
                'amount_fcfa'     => $amount,
                'reason_code'     => $reasonCode,
                'notes'           => $notes,
                'course_id'       => $course?->id,
                'incident_id'     => $incident?->id,
                'admin_id'        => $adminId,
                'balance_after'   => $newBalance,
            ]);

            WalletTransaction::create([
                'driver_id'     => $driver->id,
                'type'          => 'adjustment_incident',
                'amount_fcfa'   => $amount,
                'balance_after' => $newBalance,
                'course_id'     => $course?->id,
                'metadata'      => [
                    'adjustment_id' => $adj->id,
                    'reason_code'   => $reasonCode,
                    'incident_id'   => $incident?->id,
                    'admin_id'      => $adminId,
                ],
            ]);

            return $adj;
        });
    }

    /**
     * Applique un ajustement sur un wallet user marchand/particulier.
     * Contraint le débit à ne pas descendre en-dessous du hold (pending_reserved),
     * sinon le user pourrait « manquer » de couvrir les courses en cours.
     */
    public function applyToUser(
        User $user,
        int $amount,
        string $reasonCode,
        ?Course $course = null,
        ?CourseIncident $incident = null,
        ?int $adminId = null,
        ?string $notes = null,
    ): WalletAdjustment {
        if ($amount === 0) {
            throw new \InvalidArgumentException('WalletAdjustment amount must not be zero.');
        }
        $this->assertReasonMatchesSign($reasonCode, $amount);

        return DB::transaction(function () use ($user, $amount, $reasonCode, $course, $incident, $adminId, $notes) {
            $wallet = UserWallet::where('user_id', $user->id)
                ->lockForUpdate()
                ->firstOrFail();

            $newBalance = (int) $wallet->balance + $amount;
            $minBalance = (int) $wallet->pending_reserved;
            if ($newBalance < $minBalance) {
                throw new \DomainException(
                    "Ajustement impossible : balance user ({$wallet->balance}) après débit ({$newBalance}) descendrait sous le hold courses ({$wallet->pending_reserved})."
                );
            }
            $wallet->balance = $newBalance;
            $wallet->save();

            $adj = WalletAdjustment::create([
                'wallet_type'     => WalletAdjustment::WALLET_TYPE_USER,
                'wallet_owner_id' => $user->id,
                'amount_fcfa'     => $amount,
                'reason_code'     => $reasonCode,
                'notes'           => $notes,
                'course_id'       => $course?->id,
                'incident_id'     => $incident?->id,
                'admin_id'        => $adminId,
                'balance_after'   => $newBalance,
            ]);

            UserWalletTransaction::create([
                'user_id'       => $user->id,
                'type'          => 'adjustment_incident',
                'amount_fcfa'   => $amount,
                'balance_after' => $newBalance,
                'course_id'     => $course?->id,
                'metadata'      => [
                    'adjustment_id' => $adj->id,
                    'reason_code'   => $reasonCode,
                    'incident_id'   => $incident?->id,
                    'admin_id'      => $adminId,
                ],
            ]);

            return $adj;
        });
    }

    /**
     * Sanity check applicatif — le CHECK Postgres impose déjà la contrainte
     * mais on la double côté PHP pour lever une erreur claire avant le round-trip.
     */
    private function assertReasonMatchesSign(string $reasonCode, int $amount): void
    {
        $creditReasons = [
            WalletAdjustment::REASON_INCIDENT_REFUND,
            WalletAdjustment::REASON_NO_SHOW_REFUND,
            WalletAdjustment::REASON_MANUAL_CREDIT,
        ];
        $debitReasons = [
            WalletAdjustment::REASON_INCIDENT_DEBIT,
            WalletAdjustment::REASON_CAUTION_SEIZURE,
            WalletAdjustment::REASON_RETURN_SHIPPING_FEE,
            WalletAdjustment::REASON_MANUAL_DEBIT,
        ];

        if (in_array($reasonCode, $creditReasons, true) && $amount <= 0) {
            throw new \InvalidArgumentException("reason_code={$reasonCode} exige un montant positif, reçu {$amount}.");
        }
        if (in_array($reasonCode, $debitReasons, true) && $amount >= 0) {
            throw new \InvalidArgumentException("reason_code={$reasonCode} exige un montant négatif, reçu {$amount}.");
        }
        if (! in_array($reasonCode, [...$creditReasons, ...$debitReasons], true)) {
            throw new \InvalidArgumentException("reason_code={$reasonCode} inconnu.");
        }
    }
}
