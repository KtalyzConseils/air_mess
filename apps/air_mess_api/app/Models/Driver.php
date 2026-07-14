<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Driver extends Model
{
    use HasFactory;

    public const STATUS_OFFLINE = 'offline';
    public const STATUS_AVAILABLE = 'available';
    public const STATUS_BUSY = 'busy';
    public const STATUS_ON_BREAK = 'on_break';

    protected $fillable = [
        'user_id',
        'first_name',
        'last_name',
        'gender',
        'birth_date',
        'photo_url',
        'cni_url',
        'driving_license_url',
        'vehicle_type',
        'vehicle_plate',
        'vehicle_color',
        'equipment',
        'emergency_contact_name',
        'emergency_contact_phone',
        'emergency_contact2_name',
        'emergency_contact2_phone',
        'preferred_response_channel',
        'health_card',
        'activation_status',
        'availability_status',
        'current_lat',
        'current_lng',
        'last_position_at',
        'acceptance_rate',
        'incidents_count',
    ];

    protected function casts(): array
    {
        return [
            'birth_date' => 'date',
            'equipment' => 'array',
            'health_card' => 'array',
            'last_position_at' => 'datetime',
            'current_lat' => 'float',
            'current_lng' => 'float',
            'acceptance_rate' => 'float',
        ];
    }

    protected $hidden = [
        'health_card', // sensible — pas exposé dans les API par défaut
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function earnings()
    {
        return $this->hasMany(DriverEarning::class);
    }

    public function payouts()
    {
        return $this->hasMany(DriverPayout::class);
    }

    /**
     * Wallet (caution) du livreur. Créé à l'inscription, 1 par driver.
     */
    public function wallet()
    {
        return $this->hasOne(DriverWallet::class);
    }

    /**
     * Journal de toutes les opérations sur le wallet.
     */
    public function walletTransactions()
    {
        return $this->hasMany(WalletTransaction::class);
    }

    /**
     * Demandes de retrait de caution (pending = en attente de validation admin).
     */
    public function withdrawRequests()
    {
        return $this->hasMany(WalletWithdrawRequest::class);
    }

    /**
     * Refus de courses offertes (cf. project_wallet_driver_todo #7).
     */
    public function declineRecords()
    {
        return $this->hasMany(CourseDeclineRecord::class);
    }

    /**
     * Recalcule l'acceptance_rate sur une fenêtre rolling 30 jours et le persiste.
     * Formule : accepts / (accepts + declines) — 100% par défaut si aucun event.
     *
     * Appelé après chaque accept ou decline pour garder le compteur frais.
     */
    public function recalcAcceptanceRate(): float
    {
        $cutoff = now()->subDays(30);

        $accepts = Course::where('driver_id', $this->id)
            ->where('assigned_at', '>=', $cutoff)
            ->count();
        $declines = CourseDeclineRecord::where('driver_id', $this->id)
            ->where('created_at', '>=', $cutoff)
            ->count();

        $total = $accepts + $declines;
        $rate = $total > 0 ? round(($accepts / $total) * 100, 2) : 100.0;

        $this->update(['acceptance_rate' => $rate]);

        return $rate;
    }

    /**
     * Solde en attente (gains livrés mais pas encore versés).
     */
    public function pendingBalance(): int
    {
        return (int) $this->earnings()
            ->where('status', DriverEarning::STATUS_PENDING)
            ->sum('amount_fcfa');
    }

    /**
     * Total versé tout temps (somme des payouts payés).
     */
    public function totalPaidOut(): int
    {
        return (int) $this->payouts()
            ->where('status', DriverPayout::STATUS_PAID)
            ->sum('total_amount_fcfa');
    }

    // Helpers d'état
    public function isAvailable(): bool
    {
        return $this->availability_status === self::STATUS_AVAILABLE
            && $this->activation_status === 'active';
    }

    // Notigications
    public function scopeAvailableNear($query, float $lat, float $lng, float $radiusKm)
    {
        $sinLat = "sin(radians((current_lat - ?) / 2))";
        $sinLng = "sin(radians((current_lng - ?) / 2))";
        $haversine = "CAST(2 * 6371 * asin(sqrt("
            . "$sinLat * $sinLat"
            . " + cos(radians(?)) * cos(radians(current_lat)) * $sinLng * $sinLng"
            . ")) AS REAL)";

        return $query
            ->where('availability_status', 'available')
            ->where('activation_status', 'active')
            ->whereNotNull('current_lat')
            ->whereNotNull('current_lng')
            ->whereRaw("$haversine <= ?", [$lat, $lat, $lat, $lng, $lng, $radiusKm]);
    }

}
