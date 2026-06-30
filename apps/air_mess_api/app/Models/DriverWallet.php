<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

/**
 * Wallet (caution) d'un livreur — 1 ligne par driver, créée à l'inscription.
 *
 * Invariants à respecter (en plus du CHECK Postgres) :
 *  - balance >= 0 à tout moment
 *  - balance == SUM(wallet_transactions.amount_fcfa WHERE driver_id = X)
 *
 * Les mutations passent toujours par DriverWalletService (étape 3),
 * pas par des update() directs depuis l'extérieur.
 */
class DriverWallet extends Model
{
    use HasFactory;

    protected $fillable = [
        'driver_id',
        'balance',
        'total_deposited',
        'total_withdrawn',
    ];

    protected function casts(): array
    {
        return [
            'balance'         => 'integer',
            'total_deposited' => 'integer',
            'total_withdrawn' => 'integer',
        ];
    }

    public function driver()
    {
        return $this->belongsTo(Driver::class);
    }

    public function transactions()
    {
        return $this->hasMany(WalletTransaction::class, 'driver_id', 'driver_id');
    }

    /**
     * Vrai si le driver a assez de caution disponible pour accepter une course
     * avec un encaissement de $collectionAmount FCFA.
     */
    public function canCoverCollection(int $collectionAmount): bool
    {
        return $this->balance >= $collectionAmount;
    }
}
