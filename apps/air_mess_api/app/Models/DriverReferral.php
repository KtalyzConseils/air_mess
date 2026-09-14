<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DriverReferral extends Model
{
    public const STATUS_PENDING = 'pending';
    public const STATUS_REWARDED = 'rewarded';

    protected $fillable = [
        'sponsor_driver_id',
        'referred_driver_id',
        'referral_code',
        'status',
        'delivered_courses_count',
        'required_delivered_courses',
        'reward_amount_fcfa',
        'qualified_at',
        'rewarded_at',
        'wallet_transaction_id',
    ];

    protected function casts(): array
    {
        return [
            'delivered_courses_count' => 'integer',
            'required_delivered_courses' => 'integer',
            'reward_amount_fcfa' => 'integer',
            'qualified_at' => 'datetime',
            'rewarded_at' => 'datetime',
        ];
    }

    public function sponsor()
    {
        return $this->belongsTo(Driver::class, 'sponsor_driver_id');
    }

    public function referred()
    {
        return $this->belongsTo(Driver::class, 'referred_driver_id');
    }

    public function walletTransaction()
    {
        return $this->belongsTo(WalletTransaction::class);
    }
}
