<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

/**
 * Demande de retrait de caution par un driver.
 * Cycle : pending → approved | rejected | cancelled.
 * Le débit du wallet (via DriverWalletService::withdraw) n'a lieu QU'au passage approved.
 */
class WalletWithdrawRequest extends Model
{
    use HasFactory;

    public const STATUS_PENDING   = 'pending';
    public const STATUS_APPROVED  = 'approved';
    public const STATUS_REJECTED  = 'rejected';
    public const STATUS_CANCELLED = 'cancelled';

    public const METHOD_MOMO = 'momo';
    public const METHOD_BANK = 'bank';

    protected $fillable = [
        'driver_id',
        'amount_fcfa',
        'target_method',
        'target_account',
        'status',
        'decided_by_admin_id',
        'decided_at',
        'rejection_reason',
        'external_payout_reference',
        'paid_at',
        'paid_by_admin_id',
        'payout_initiated_at',
        'payout_provider_ref',
        'payout_failed_at',
        'payout_failure_reason',
    ];

    protected function casts(): array
    {
        return [
            'amount_fcfa'         => 'integer',
            'decided_at'          => 'datetime',
            'paid_at'             => 'datetime',
            'payout_initiated_at' => 'datetime',
            'payout_failed_at'    => 'datetime',
        ];
    }

    public function paidByAdmin()
    {
        return $this->belongsTo(Admin::class, 'paid_by_admin_id');
    }

    public function isPaid(): bool
    {
        return $this->paid_at !== null;
    }

    public function driver()
    {
        return $this->belongsTo(Driver::class);
    }

    public function decidedByAdmin()
    {
        return $this->belongsTo(Admin::class, 'decided_by_admin_id');
    }

    public function isPending(): bool
    {
        return $this->status === self::STATUS_PENDING;
    }

    /**
     * Calcule l'usage des plafonds de retrait sur les fenêtres 24h / 7j pour un driver.
     *
     * Convention :
     *  - count_*  : compte TOUS les statuts (pending + approved + rejected + cancelled)
     *               → empêche le spam même si les demandes sont refusées
     *  - amount_* : somme seulement pending + approved (= argent décaissé ou en cours)
     *               Une demande rejected/cancelled ne consomme pas de marge → le driver
     *               peut retenter avec un bon n° MoMo sans être bloqué.
     *
     * Cf. project_wallet_driver_todo #3 — comparaison avec AppSetting :
     *   driver_withdraw_max_per_day_count / _week_count / _day_fcfa / _week_fcfa
     */
    public static function usageForDriver(int $driverId): array
    {
        $day  = now()->subDay();
        $week = now()->subDays(7);

        $rows = static::query()
            ->where('driver_id', $driverId)
            ->where('created_at', '>=', $week)
            ->selectRaw(<<<SQL
                COUNT(*) FILTER (WHERE created_at >= ?)                                                              AS count_24h,
                COUNT(*)                                                                                             AS count_7d,
                COALESCE(SUM(amount_fcfa) FILTER (WHERE created_at >= ? AND status IN ('pending','approved')), 0)    AS amount_24h,
                COALESCE(SUM(amount_fcfa) FILTER (WHERE status IN ('pending','approved')), 0)                        AS amount_7d
            SQL, [$day, $day])
            ->first();

        return [
            'count_24h'  => (int) ($rows->count_24h ?? 0),
            'count_7d'   => (int) ($rows->count_7d ?? 0),
            'amount_24h' => (int) ($rows->amount_24h ?? 0),
            'amount_7d'  => (int) ($rows->amount_7d ?? 0),
        ];
    }
}
