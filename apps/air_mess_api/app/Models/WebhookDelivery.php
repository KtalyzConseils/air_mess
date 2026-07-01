<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * WebhookDelivery — une tentative d'envoi vers l'endpoint webhook d'une app.
 *
 * Voir [[project_wallet_user]] et [[project_data_model]] pour la philosophie
 * des journaux append-only. Les retries mettent à jour la MÊME ligne
 * (incrémentent `attempts`), on ne crée pas une ligne par essai.
 */
class WebhookDelivery extends Model
{
    public const STATUS_PENDING   = 'pending';
    public const STATUS_DELIVERED = 'delivered';
    public const STATUS_FAILED    = 'failed';

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'payload'            => 'array',
            'delivered_at'       => 'datetime',
            'last_attempted_at'  => 'datetime',
        ];
    }

    public function apiApplication(): BelongsTo
    {
        return $this->belongsTo(ApiApplication::class);
    }

    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    public function isDelivered(): bool
    {
        return $this->status === self::STATUS_DELIVERED;
    }

    public function isFailed(): bool
    {
        return $this->status === self::STATUS_FAILED;
    }
}
