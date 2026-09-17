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
        'ip_address',
    ];

    protected function casts(): array
    {
        return [
            'platforms_used' => 'array',
            'problems' => 'array',
            'interest_level' => 'integer',
        ];
    }
}
