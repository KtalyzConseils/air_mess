<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

/**
 * Journal IMMUABLE des opérations sur les user_wallets.
 *
 * Convention de signe (enforcée par CHECK Postgres) :
 *  - deposit, refund, adjustment_credit, collection_credit  : amount_fcfa > 0
 *  - course_charge, adjustment_debit, withdraw              : amount_fcfa < 0
 */
class UserWalletTransaction extends Model
{
    use HasFactory;

    public const TYPE_DEPOSIT            = 'deposit';
    public const TYPE_COURSE_CHARGE      = 'course_charge';
    public const TYPE_REFUND             = 'refund';
    public const TYPE_ADJUSTMENT_CREDIT  = 'adjustment_credit';
    public const TYPE_ADJUSTMENT_DEBIT   = 'adjustment_debit';
    public const TYPE_WITHDRAW           = 'withdraw';
    // Livraison réussie d'une course avec has_collection : le driver a collecté
    // le cash chez le destinataire, on transfère cet argent au wallet marchand.
    public const TYPE_COLLECTION_CREDIT  = 'collection_credit';

    public $timestamps = false;
    protected $dates   = ['created_at'];

    protected $fillable = [
        'user_id',
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

    public function user()
    {
        return $this->belongsTo(User::class);
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
