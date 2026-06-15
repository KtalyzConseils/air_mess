<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Individual extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'first_name',
        'last_name',
        'gender',
        'birth_date',
        'cni_number',
        'monthly_courses_used',
        'monthly_courses_limit',
        'monthly_period_started_at',
        'fraud_score',
        'subscription_plan',
        'subscription_status',
        'subscription_started_at',
        'subscription_next_billing_at',
    ];

    protected function casts(): array
    {
        return [
            'birth_date' => 'date',
            'monthly_period_started_at'    => 'date',
            'subscription_started_at'      => 'datetime',
            'subscription_next_billing_at' => 'datetime',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Relation vers le plan d'abonnement souscrit (si applicable).
     */
    public function plan()
    {
        return $this->belongsTo(SubscriptionPlan::class, 'subscription_plan', 'code');
    }

    /**
     * Vrai si le particulier a un abonnement actif (pas expiré ni suspendu).
     */
    public function hasActiveSubscription(): bool
    {
        return $this->subscription_status === 'active';
    }

    /**
     * Accessor : le quota mensuel est dynamique.
     * - Si abo actif → on prend le `included_courses` du plan
     * - Sinon → on prend le quota gratuit standard (AppSetting)
     */
    public function getMonthlyCoursesLimitAttribute(): int
    {
        if ($this->hasActiveSubscription() && $this->plan) {
            return (int) $this->plan->included_courses;
        }
        return (int) AppSetting::get('individual_monthly_courses_limit', 20);
    }

    // Helper métier : a-t-il atteint son quota ?
    public function hasReachedMonthlyLimit(): bool
    {
        return $this->monthly_courses_used >= $this->monthly_courses_limit;
    }
}
