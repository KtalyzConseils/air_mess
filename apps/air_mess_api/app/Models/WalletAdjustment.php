<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

/**
 * Journal IMMUABLE des ajustements financiers arbitrés par un ops.
 *
 * Chaque ligne est la source de vérité d'un mouvement wallet post-livraison
 * (incident, saisie caution, refund, débit driver…). Une transaction wallet
 * correspondante est créée automatiquement en cascade par WalletAdjustmentService.
 *
 * Jamais d'UPDATE ni de DELETE. Une correction = une nouvelle ligne inverse.
 */
class WalletAdjustment extends Model
{
    use HasFactory;

    public const WALLET_TYPE_DRIVER = 'driver';
    public const WALLET_TYPE_USER   = 'user';

    // Enum des motifs — cohérent avec le CHECK de la migration.
    public const REASON_INCIDENT_REFUND      = 'incident_refund';       // + marchand après incident (colis abîmé, perte…)
    public const REASON_INCIDENT_DEBIT       = 'incident_debit';        // − driver responsable d'un incident
    public const REASON_CAUTION_SEIZURE      = 'caution_seizure';       // − saisie caution driver (fraude confirmée)
    public const REASON_NO_SHOW_REFUND       = 'no_show_refund';        // + marchand pour partial hold release post-capture
    public const REASON_RETURN_SHIPPING_FEE  = 'return_shipping_fee';   // − marchand pour coût course retour
    public const REASON_MANUAL_CREDIT        = 'manual_credit';         // + super-admin (correction/geste)
    public const REASON_MANUAL_DEBIT         = 'manual_debit';          // − super-admin (correction)

    public $timestamps = false;
    protected $dates   = ['created_at'];

    protected $fillable = [
        'wallet_type',
        'wallet_owner_id',
        'amount_fcfa',
        'reason_code',
        'notes',
        'course_id',
        'incident_id',
        'admin_id',
        'balance_after',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'amount_fcfa'   => 'integer',
            'balance_after' => 'integer',
            'created_at'    => 'datetime',
        ];
    }

    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    public function incident(): BelongsTo
    {
        return $this->belongsTo(CourseIncident::class, 'incident_id');
    }

    public function admin(): BelongsTo
    {
        return $this->belongsTo(Admin::class);
    }

    /**
     * Résout le propriétaire du wallet en fonction du type. Retourne un Driver
     * ou un User selon `wallet_type`. On préfère cette méthode explicite à un
     * MorphTo natif car les deux modèles n'ont pas de table shared parent.
     */
    public function owner()
    {
        return $this->wallet_type === self::WALLET_TYPE_DRIVER
            ? Driver::query()->find($this->wallet_owner_id)
            : User::query()->find($this->wallet_owner_id);
    }

    public function isCredit(): bool
    {
        return $this->amount_fcfa > 0;
    }

    public function isDebit(): bool
    {
        return $this->amount_fcfa < 0;
    }
}
