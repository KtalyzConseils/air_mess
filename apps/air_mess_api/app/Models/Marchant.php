<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Marchant extends Model
{
    use HasFactory ;
    protected $fillable = [
        'user_id',
        'raison_sociale',
        'ifu_rccm',
        'secteur_activite',
        'subscription_plan',
        'subscription_status',
        'subscription_started_at',
        'subscription_next_billing_at',
        'monthly_courses_used',
        'monthly_period_started_at',
        'validated_at',
        'validated_by',
        'commercial_assigned_to',
        'logo_url',
        'opening_hours',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'subscription_started_at' => 'datetime',
            'subscription_next_billing_at' => 'datetime',
            'monthly_period_started_at' => 'date',
            'validated_at' => 'datetime',
            'opening_hours' => 'array',
        ];
    }

    // ===== Relations =====

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function validatedBy()
    {
        return $this->belongsTo(User::class, 'validated_by');
    }

    public function commercialAssignedTo()
    {
        return $this->belongsTo(User::class, 'commercial_assigned_to');
    }

    public function plan()
    {
        return $this->belongsTo(SubscriptionPlan::class, 'subscription_plan', 'code');
    }

    /**
     * Le plan du marchand inclut-il l'accès à l'API d'intégration ?
     * (feature `api_access` — actuellement sur Starter/Pro/Business, pas Essai.)
     */
    public function hasApiAccess(): bool
    {
        return in_array('api_access', $this->plan?->features ?? [], true);
    }

    // ===== Helpers quota =====

    /**
     * Retourne la limite mensuelle du marchand selon son plan.
     */
    public function monthlyCoursesLimit(): int
    {
        return (int) ($this->plan?->included_courses ?? 0);
    }

    /**
     * Vérifie si le quota mensuel est atteint.
     * Reset automatique si la période a expiré.
     */
    public function hasReachedMonthlyLimit(): bool
    {
        $this->resetMonthlyPeriodIfNeeded();
        return $this->monthly_courses_used >= $this->monthlyCoursesLimit();
    }

    /**
     * Reset le compteur si la période en cours date de plus d'un mois.
     */
    public function resetMonthlyPeriodIfNeeded(): void
    {
        $startedAt = $this->monthly_period_started_at;
        if (! $startedAt || $startedAt->lt(now()->subMonth()->startOfDay())) {
            $this->update([
                'monthly_courses_used'      => 0,
                'monthly_period_started_at' => now()->startOfDay(),
            ]);
            $this->refresh();
        }
    }

    /**
     * Ratio d'utilisation (0.0 à 1.0+).
     */
    public function quotaUsageRatio(): float
    {
        $limit = $this->monthlyCoursesLimit();
        return $limit > 0 ? $this->monthly_courses_used / $limit : 0.0;
    }
}
