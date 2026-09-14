<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MerchantWaitlistEntry extends Model
{
    protected $fillable = [
        'commerce_type',
        'commerce_type_other',
        'nda_partner',
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
        'whatsapp',
        'status',
        'bonus_amount',
        'bonus_code',
    ];

    protected function casts(): array
    {
        return [
            'delivery_methods' => 'array',
            'problems' => 'array',
            'interest_level' => 'integer',
            'bonus_amount' => 'integer',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }
}
