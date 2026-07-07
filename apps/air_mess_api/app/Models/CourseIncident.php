<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CourseIncident extends Model
{
    // ===== Typologie des incidents =====
    public const TYPE_RECIPIENT_ABSENT      = 'recipient_absent';      // destinataire absent
    public const TYPE_RECIPIENT_UNREACHABLE = 'recipient_unreachable'; // injoignable au téléphone
    public const TYPE_WRONG_ADDRESS         = 'wrong_address';         // adresse erronée/introuvable
    public const TYPE_RECIPIENT_REFUSED     = 'recipient_refused';     // refus du colis
    public const TYPE_PACKAGE_DAMAGED       = 'package_damaged';       // colis endommagé
    public const TYPE_PACKAGE_LOST          = 'package_lost';          // colis perdu
    public const TYPE_VEHICLE_BREAKDOWN     = 'vehicle_breakdown';     // panne véhicule
    public const TYPE_ACCIDENT              = 'accident';              // accident
    public const TYPE_PAYMENT_ISSUE         = 'payment_issue';         // problème d'encaissement
    // Cas 6 — Marchand annule post-pickup. Créé côté back lors du cancel
    // (pas signalable manuellement par le driver ; hors MARCHAND_INCIDENT_TYPES).
    public const TYPE_MARCHAND_CANCELLED    = 'marchand_cancelled';
    public const TYPE_OTHER                 = 'other';

    public const TYPES = [
        self::TYPE_RECIPIENT_ABSENT, self::TYPE_RECIPIENT_UNREACHABLE,
        self::TYPE_WRONG_ADDRESS, self::TYPE_RECIPIENT_REFUSED,
        self::TYPE_PACKAGE_DAMAGED, self::TYPE_PACKAGE_LOST,
        self::TYPE_VEHICLE_BREAKDOWN, self::TYPE_ACCIDENT,
        self::TYPE_PAYMENT_ISSUE, self::TYPE_MARCHAND_CANCELLED,
        self::TYPE_OTHER,
    ];

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'lat' => 'float',
            'lng' => 'float',
            'resolved_at' => 'datetime',
        ];
    }

    public function course()     { return $this->belongsTo(Course::class); }
    public function reportedBy()  { return $this->belongsTo(User::class, 'reported_by'); }
    public function resolvedBy()  { return $this->belongsTo(User::class, 'resolved_by'); }
}
