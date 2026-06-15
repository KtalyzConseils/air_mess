<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class DriverPayout extends Model
{
    use HasFactory;

    public const STATUS_PENDING = 'pending';
    public const STATUS_PAID    = 'paid';
    public const STATUS_FAILED  = 'failed';

    public const METHOD_MOBILE_MONEY  = 'mobile_money';
    public const METHOD_BANK_TRANSFER = 'bank_transfer';
    public const METHOD_CASH          = 'cash';

    protected $fillable = [
        'driver_id',
        'total_amount_fcfa',
        'earnings_count',
        'status',
        'method',
        'destination',
        'period_start',
        'period_end',
        'paid_at',
        'failure_reason',
        'metadata',
        'triggered_by',
    ];

    protected function casts(): array
    {
        return [
            'period_start'     => 'date',
            'period_end'       => 'date',
            'paid_at'          => 'datetime',
            'metadata'         => 'array',
            'total_amount_fcfa'=> 'integer',
            'earnings_count'   => 'integer',
        ];
    }

    public function driver()
    {
        return $this->belongsTo(Driver::class);
    }

    public function earnings()
    {
        return $this->hasMany(DriverEarning::class, 'payout_id');
    }

    public function triggeredBy()
    {
        return $this->belongsTo(User::class, 'triggered_by');
    }
}
