<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

/**
 * Refus explicite d'une course offerte par un driver.
 * Immuable (un refus reste tracé même si la course est plus tard annulée/réassignée).
 */
class CourseDeclineRecord extends Model
{
    use HasFactory;

    public const REASON_TOO_FAR        = 'too_far';
    public const REASON_WRONG_QUARTIER = 'wrong_quartier';
    public const REASON_NO_HELMET      = 'no_helmet';
    public const REASON_VEHICLE_UNFIT  = 'vehicle_unfit';
    public const REASON_PERSONAL       = 'personal';
    public const REASON_OTHER          = 'other';

    public const REASONS = [
        self::REASON_TOO_FAR,
        self::REASON_WRONG_QUARTIER,
        self::REASON_NO_HELMET,
        self::REASON_VEHICLE_UNFIT,
        self::REASON_PERSONAL,
        self::REASON_OTHER,
    ];

    public $timestamps = false;
    protected $dates   = ['created_at'];

    protected $fillable = [
        'driver_id',
        'course_id',
        'reason',
        'custom_reason',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'created_at' => 'datetime',
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
}
