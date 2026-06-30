<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Payment extends Model
{
    // Types de flux (prévus pour les 5 flux du système de paiement)
    public const TYPE_SUBSCRIPTION   = 'subscription';
    public const TYPE_DELIVERY_FEE   = 'delivery_fee';
    public const TYPE_PAYOUT         = 'payout';
    public const TYPE_COD            = 'cod';
    public const TYPE_WALLET_DEPOSIT      = 'wallet_deposit';      // top-up caution driver
    public const TYPE_USER_WALLET_DEPOSIT = 'user_wallet_deposit'; // top-up wallet marchand/particulier

    // Cycle de vie
    public const STATUS_PENDING    = 'pending';
    public const STATUS_PROCESSING = 'processing';
    public const STATUS_PAID       = 'paid';
    public const STATUS_FAILED     = 'failed';
    public const STATUS_REFUNDED   = 'refunded';

    // Providers connus
    public const PROVIDER_FEDAPAY = 'fedapay';
    public const PROVIDER_MANUAL  = 'manual';

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'metadata'     => 'array',
            'raw_response' => 'array',
            'paid_at'      => 'datetime',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function isPaid(): bool
    {
        return $this->status === self::STATUS_PAID;
    }
}
