<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

/**
 * Journal IMMUABLE des opérations sur les wallets driver.
 * Une ligne par opération, jamais d'UPDATE ni de DELETE.
 *
 * Convention de signe (enforcée par CHECK Postgres) :
 *  - deposit  : amount_fcfa > 0
 *  - refund   : amount_fcfa > 0
 *  - withdraw : amount_fcfa < 0
 *  - pickup_debit : amount_fcfa < 0
 */
class WalletTransaction extends Model
{
    use HasFactory;

    public const TYPE_DEPOSIT           = 'deposit';            // top-up via Fedapay
    public const TYPE_WITHDRAW          = 'withdraw';           // retrait validé par admin
    public const TYPE_PICKUP_DEBIT      = 'pickup_debit';       // course récupérée chez marchand
    public const TYPE_REFUND            = 'refund';             // course failed après pickup
    public const TYPE_EARNING           = 'earning';            // gain de course livrée — crédite directement la caution
    public const TYPE_ADJUSTMENT_CREDIT = 'adjustment_credit';  // crédit manuel super-admin (MoMo direct, geste, correctif)
    public const TYPE_ADJUSTMENT_DEBIT  = 'adjustment_debit';   // débit manuel super-admin (rattrapage bug, erreur comptable)

    // Pas d'updated_at — c'est immutable
    public $timestamps = false;
    protected $dates   = ['created_at'];

    protected $fillable = [
        'driver_id',
        'type',
        'amount_fcfa',
        'balance_after',
        'course_id',
        'payment_id',
        'metadata',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'amount_fcfa'   => 'integer',
            'balance_after' => 'integer',
            'metadata'      => 'array',
            'created_at'    => 'datetime',
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

    public function payment()
    {
        return $this->belongsTo(Payment::class);
    }
}
