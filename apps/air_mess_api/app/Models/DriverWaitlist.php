<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DriverWaitlist extends Model
{
    public const STATUS_WAITLISTED = 'waitlisted';

    protected $fillable = [
        'vehicle_type',
        'zone',
        'zone_other',
        'experience',
        'availability',
        'source',
        'source_other',
        'platforms_used',
        'platforms_used_other',
        'weekly_deliveries',
        'weekly_income',
        'problems',
        'problems_other',
        'worst_experience',
        'expected_payment_model',
        'expected_weekly_income',
        'mobile_money_trust',
        'interest_level',
        'launch_availability',
        'full_name',
        'email',
        'whatsapp',
        'status',
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
            'platforms_used' => 'array',
            'problems' => 'array',
            'interest_level' => 'integer',
            'notified_at' => 'datetime',
            'activation_expires_at' => 'datetime',
            'activated_at' => 'datetime',
        ];
    }
}
