<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Journal des revenus directs de la plateforme (hors wallet driver/user).
 * Cf. migration 2026_07_14_120000_create_platform_earnings_table.
 *
 * Immuable : $timestamps désactivé pour `updated_at`, on ne conserve que
 * `created_at` — chaque ligne est un fait comptable figé.
 */
class PlatformEarning extends Model
{
    public const KIND_DELIVERY_FEE = 'delivery_fee';

    public $timestamps = false;
    protected $dates   = ['created_at'];

    protected $fillable = [
        'kind',
        'course_id',
        'amount_fcfa',
        'driver_id',
        'metadata',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'amount_fcfa' => 'integer',
            'metadata'    => 'array',
            'created_at'  => 'datetime',
        ];
    }

    public function course()
    {
        return $this->belongsTo(Course::class);
    }

    public function driver()
    {
        return $this->belongsTo(Driver::class);
    }
}
