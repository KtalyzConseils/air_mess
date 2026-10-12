<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MerchantWaitlist extends Model
{
    public const STATUS_WAITLISTED = 'waitlisted';

    protected $fillable = [
        'commerce_type',
        'commerce_type_other',
        'zone',
        'zone_other',
        'weekly_orders',
        'source',
        'source_other',
        'delivery_methods',
        'delivery_methods_other',
        'problems',
        'problems_other',
        'worst_experience',
        'cash_collection_issue',
        'time_lost_weekly',
        'orders_lost_weekly',
        'expected_benefit',
        'commission_acceptance',
        'reasonable_fee',
        'mobile_money_trust',
        'interest_level',
        'trial_interest',
        'shop_name',
        'contact_name',
        'email',
        'whatsapp',
        'status',
        'bonus_amount',
        'bonus_code',
        'bonus_redeemed_at',
        'notified_at',
        'activation_token_hash',
        'activation_expires_at',
        'activated_user_id',
        'activated_at',
        'ip_address',
    ];

    protected $hidden = ['activation_token_hash'];

    protected function casts(): array
    {
        return [
            'delivery_methods' => 'array',
            'problems' => 'array',
            'bonus_amount' => 'integer',
            'bonus_redeemed_at' => 'datetime',
            'notified_at' => 'datetime',
            'activation_expires_at' => 'datetime',
            'activated_at' => 'datetime',
        ];
    }
}
