<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SubscriptionPlan extends Model
{
    public const CODE_TRIAL    = 'trial';
    public const CODE_STARTER  = 'starter';
    public const CODE_PRO      = 'pro';
    public const CODE_BUSINESS = 'business';

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'features'  => 'array',
            'is_active' => 'boolean',
        ];
    }

    public function isFree(): bool
    {
        return $this->monthly_price_fcfa === 0;
    }
}
