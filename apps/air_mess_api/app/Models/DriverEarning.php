<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class DriverEarning extends Model
{
    use HasFactory;

    public const STATUS_PENDING = 'pending';
    public const STATUS_PAID    = 'paid';
    public const STATUS_VOID    = 'void';

    protected $fillable = [
        'driver_id',
        'course_id',
        'amount_fcfa',
        'status',
        'payout_id',
        'credited_at',
    ];

    protected function casts(): array
    {
        return [
            'credited_at' => 'datetime',
            'amount_fcfa' => 'integer',
        ];
    }

    public function driver()
    {
        return $this->belongsTo(Driver::class);
    }

    public function course()
    {
        return $this->belongsTo(Course::class);
    }

    public function payout()
    {
        return $this->belongsTo(DriverPayout::class, 'payout_id');
    }

    public function scopePending($query)
    {
        return $query->where('status', self::STATUS_PENDING);
    }

    public function scopePaid($query)
    {
        return $query->where('status', self::STATUS_PAID);
    }
}
