<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CourseCustodyEvent extends Model
{
    public const UPDATED_AT = null;

    public const ASSET_PACKAGE = 'package';
    public const ASSET_CASH_DELIVERY_FEE = 'cash_delivery_fee';
    public const ASSET_CASH_COLLECTION = 'cash_collection';

    protected $fillable = [
        'course_id',
        'event_type',
        'asset_type',
        'from_holder_type',
        'from_holder_id',
        'to_holder_type',
        'to_holder_id',
        'driver_id',
        'user_id',
        'amount_fcfa',
        'idempotency_key',
        'metadata',
        'occurred_at',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'amount_fcfa' => 'integer',
            'metadata' => 'array',
            'occurred_at' => 'datetime',
            'created_at' => 'datetime',
        ];
    }

    public function course()
    {
        return $this->belongsTo(Course::class);
    }
}
