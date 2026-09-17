<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AccountingJournal extends Model
{
    public const UPDATED_AT = null;

    protected $fillable = [
        'event_type',
        'description',
        'course_id',
        'payment_id',
        'wallet_withdraw_request_id',
        'driver_id',
        'user_id',
        'admin_id',
        'idempotency_key',
        'metadata',
        'occurred_at',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'metadata' => 'array',
            'occurred_at' => 'datetime',
            'created_at' => 'datetime',
        ];
    }

    public function lines()
    {
        return $this->hasMany(AccountingLine::class);
    }

    public function course()
    {
        return $this->belongsTo(Course::class);
    }
}
