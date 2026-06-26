<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class SupportNote extends Model
{
    public const NOTABLE_COURSE   = 'course';
    public const NOTABLE_USER     = 'user';
    public const NOTABLE_INCIDENT = 'incident';

    public const ESCALATED_OPS        = 'ops';
    public const ESCALATED_COMMERCIAL = 'commercial';
    public const ESCALATED_SUPER      = 'super';

    protected $fillable = [
        'admin_id',
        'notable_type',
        'notable_id',
        'body',
        'escalated_to',
    ];

    public function admin(): BelongsTo
    {
        return $this->belongsTo(Admin::class);
    }

    public function notable(): MorphTo
    {
        return $this->morphTo();
    }
}
