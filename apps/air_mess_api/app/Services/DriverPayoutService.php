<?php

namespace App\Services;

use App\Models\Driver;
use App\Models\DriverEarning;
use App\Models\DriverPayout;
use Illuminate\Support\Facades\DB;

class DriverPayoutService
{
    public function __construct(
        private NotificationService $notifier,
    ) {}

    /**
     * Génère un payout pour un livreur à partir de ses earnings pending.
     * Utilisable manuellement par un admin OU automatiquement par un job mensuel.
     *
     * Retourne le payout créé, ou null si aucun earning à régler.
     */
    public function generatePayout(
        Driver $driver,
        string $method = DriverPayout::METHOD_MOBILE_MONEY,
        ?string $destination = null,
        ?int $triggeredByUserId = null,
    ): ?DriverPayout {
        return DB::transaction(function () use ($driver, $method, $destination, $triggeredByUserId) {
            $earnings = DriverEarning::pending()
                ->where('driver_id', $driver->id)
                ->lockForUpdate()
                ->get();

            if ($earnings->isEmpty()) {
                return null;
            }

            $total = (int) $earnings->sum('amount_fcfa');

            $payout = DriverPayout::create([
                'driver_id'         => $driver->id,
                'total_amount_fcfa' => $total,
                'earnings_count'    => $earnings->count(),
                'status'            => DriverPayout::STATUS_PENDING,
                'method'            => $method,
                'destination'       => $destination,
                'period_start'      => $earnings->min('credited_at'),
                'period_end'        => $earnings->max('credited_at'),
                'triggered_by'      => $triggeredByUserId,
            ]);

            DriverEarning::whereIn('id', $earnings->pluck('id'))->update([
                'payout_id' => $payout->id,
            ]);

            return $payout;
        });
    }

    /**
     * Marque un payout comme effectué (l'argent a réellement été viré).
     * En MVP : virement manuel par l'admin, on note juste la transition.
     */
    public function markPayoutAsPaid(DriverPayout $payout): DriverPayout
    {
        DB::transaction(function () use ($payout) {
            $payout->update([
                'status'  => DriverPayout::STATUS_PAID,
                'paid_at' => now(),
            ]);
            DriverEarning::where('payout_id', $payout->id)
                ->update(['status' => DriverEarning::STATUS_PAID]);
        });

        $this->notifier->sendToUser(
            $payout->driver->user_id,
            'payout.paid',
            '💰 Versement reçu',
            "Votre versement de {$payout->total_amount_fcfa} FCFA a été effectué.",
            ['payout_id' => $payout->id],
        );

        return $payout->fresh();
    }

    /**
     * Annule un earning suite à une dispute / remboursement de course.
     */
    public function voidEarningForCourse(int $courseId): void
    {
        DriverEarning::where('course_id', $courseId)
            ->where('status', DriverEarning::STATUS_PENDING)
            ->update(['status' => DriverEarning::STATUS_VOID]);
    }
}
