<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SubscriptionPlan extends Model
{
    public const CODE_TRIAL    = 'trial';
    public const CODE_STARTER  = 'starter';
    public const CODE_PRO      = 'pro';
    public const CODE_BUSINESS = 'business';

    // Codes des plans API dev (pour distinguer des plans marchand classiques).
    public const CODE_API_STARTER = 'api_starter';
    public const CODE_API_PRO     = 'api_pro';
    public const CODE_API_PREMIUM = 'api_premium';

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'features'    => 'array',
            'is_active'   => 'boolean',
            'is_api_plan' => 'boolean',
        ];
    }

    public function isFree(): bool
    {
        return $this->monthly_price_fcfa === 0;
    }

    /** Un plan API est illimité si son quota vaut 0 (convention identique à `included_courses`). */
    public function isUnlimitedApi(): bool
    {
        return $this->is_api_plan && (int) $this->api_requests_monthly === 0;
    }
}
