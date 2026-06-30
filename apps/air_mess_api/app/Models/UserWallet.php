<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

/**
 * Wallet unifié des utilisateurs payeurs (marchand + particulier).
 *
 * Modèle de réservation (hold) :
 *  - balance           = cash réel (incl. les holds)
 *  - pending_reserved  = holds sur courses non encore livrées
 *  - disponible        = balance - pending_reserved
 *
 * Toute mutation DOIT passer par App\Services\UserWalletService.
 */
class UserWallet extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'balance',
        'pending_reserved',
        'total_deposited',
        'total_spent',
    ];

    protected function casts(): array
    {
        return [
            'balance'          => 'integer',
            'pending_reserved' => 'integer',
            'total_deposited'  => 'integer',
            'total_spent'      => 'integer',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Disponible effectif (utilisable pour réserver une nouvelle course).
     */
    public function available(): int
    {
        return (int) $this->balance - (int) $this->pending_reserved;
    }

    /**
     * Le wallet peut-il couvrir un nouveau hold de $amount ?
     */
    public function canReserve(int $amount): bool
    {
        return $this->available() >= $amount;
    }
}
