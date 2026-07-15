<?php

namespace App\Models;

use App\Observers\CourseObserver;
use Illuminate\Database\Eloquent\Attributes\ObservedBy;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

#[ObservedBy(CourseObserver::class)]
class Course extends Model
{
    use HasFactory;

    // Statuts (constantes pour éviter les chaînes magiques)
    public const STATUS_PENDING_PREP   = 'pending_preparation';
    public const STATUS_AWAITING       = 'awaiting_assignment';
    public const STATUS_ASSIGNED       = 'assigned';
    public const STATUS_TO_PICKUP      = 'driver_to_pickup';
    public const STATUS_AT_PICKUP      = 'at_pickup';
    public const STATUS_PICKED_UP      = 'picked_up';
    public const STATUS_AT_DROPOFF     = 'at_dropoff';
    public const STATUS_RETURNING_TO_SENDER = 'returning_to_sender';
    public const STATUS_DELIVERED      = 'delivered';
    public const STATUS_CANCELLED      = 'cancelled';
    public const STATUS_FAILED         = 'failed';
    public const STATUS_DISPUTED       = 'disputed';

    public const TERMINAL_STATUSES = [
        self::STATUS_DELIVERED,
        self::STATUS_CANCELLED,
        self::STATUS_FAILED,
    ];

    // Qui paie les frais de livraison — cf. migration add_delivery_fee_paid_by_to_courses.
    // 'sender'    : marchand paie via son wallet à la création (défaut, historique)
    // 'recipient' : destinataire paie à la remise, driver collecte total = produit + livraison.
    //               Réservé aux drivers Airmess (filtre appliqué dans offeredCourses).
    public const PAID_BY_SENDER    = 'sender';
    public const PAID_BY_RECIPIENT = 'recipient';

    protected $guarded = ['id']; // mass assignment OK sur tous les champs sauf id

    protected function casts(): array
    {
        return [
            'origin_lat' => 'float',
            'origin_lng' => 'float',
            'distance_km' => 'float',
            'destination_lat' => 'float',
            'destination_lng' => 'float',
            'package_weight_kg' => 'float',
            'package_declared_value' => 'float',
            'delivery_fee' => 'float',
            'driver_earnings' => 'float',
            'collection_amount' => 'float',
            'has_collection' => 'boolean',
            'scheduled_for' => 'datetime',
            'assigned_at' => 'datetime',
            'picked_up_at' => 'datetime',
            'delivered_at' => 'datetime',
            'cancelled_at' => 'datetime',
            'last_contact_attempt_at' => 'datetime',
            'is_return_trip' => 'boolean',
            'return_confirmed_at' => 'datetime',
            'pickup_from_previous_driver' => 'boolean',
            'transfer_lat' => 'float',
            'transfer_lng' => 'float',
            'is_fraud' => 'boolean',
            'is_high_value' => 'boolean',
        ];
    }

        // ===== Scopes géo (Haversine, sans PostGIS) =====

    /**
     * Formule Haversine en variante asin (cross-DB : Postgres + SQLite).
     * On évite least()/clamp parce que sqrt(...) reste mathématiquement dans [0, 1].
     * Bindings : 5 (lat, lat, lat, lng, lng).
     */
    private static function haversineSql(string $latCol, string $lngCol): string
    {
        $sinLat = "sin(radians(($latCol - ?) / 2))";
        $sinLng = "sin(radians(($lngCol - ?) / 2))";
        // CAST AS REAL force le type numerique : sans ca, les fonctions PHP branchees
        // (sqliteCreateFunction) peuvent retourner une string et faire bugger les
        // comparaisons (ex: '58.9' <= 8 evalue comme une comparaison de strings).
        return "CAST(2 * 6371 * asin(sqrt("
             . "$sinLat * $sinLat"
             . " + cos(radians(?)) * cos(radians($latCol)) * $sinLng * $sinLng"
             . ")) AS REAL)";
    }

    /**
     * Haversine entre deux paires de COLONNES (aucun binding).
     * Sert à mesurer un segment interne à la course (ex: origine → destination).
     */
    private static function haversineSqlCols(string $latA, string $lngA, string $latB, string $lngB): string
    {
        $sinLat = "sin(radians(($latA - $latB) / 2))";
        $sinLng = "sin(radians(($lngA - $lngB) / 2))";
        return "CAST(2 * 6371 * asin(sqrt("
            . "$sinLat * $sinLat"
            . " + cos(radians($latB)) * cos(radians($latA)) * $sinLng * $sinLng"
            . ")) AS REAL)";
    }


    /**
    * Ajoute une colonne `distance_km` = distance TOTALE que le livreur va parcourir :
    *   (position livreur → retrait) + (retrait → destination).
    */
    public function scopeSelectDistanceFrom($query, float $lat, float $lng, string $latCol = 'origin_lat', string $lngCol = 'origin_lng')
    {
        // Segment 1 : position du livreur → point de retrait (dépend du livreur → 5 bindings)
        $toPickup = self::haversineSql($latCol, $lngCol);
        // Segment 2 : retrait → destination (interne à la course, aucun binding)
        $trip = self::haversineSqlCols('origin_lat', 'origin_lng', 'destination_lat', 'destination_lng');

        return $query
            ->select('*')
            ->selectRaw("($toPickup + $trip) as distance_km", [$lat, $lat, $lat, $lng, $lng]);
    }


    /**
     * Ne garde que les courses dont l'origine est dans un rayon de $km kilomètres.
     */
    public function scopeWithinRadius($query, float $lat, float $lng, float $km, string $latCol = 'origin_lat', string $lngCol = 'origin_lng')
    {
        $haversine = self::haversineSql($latCol, $lngCol);
        return $query->whereRaw("$haversine <= ?", [$lat, $lat, $lat, $lng, $lng, $km]);
    }


    // ===== Relations =====
    public function sender()
    {
        return $this->belongsTo(User::class, 'sender_id');
    }

    /**
     * Application API qui a créé la course (null si course interne).
     * Utile pour le reporting et le décompte de quota.
     */
    public function apiApplication()
    {
        return $this->belongsTo(ApiApplication::class);
    }

    public function driver()
    {
        return $this->belongsTo(Driver::class);
    }

    public function packageCategory()
    {
        return $this->belongsTo(PackageCategory::class);
    }

    public function originAddress()
    {
        return $this->belongsTo(Address::class, 'origin_address_id');
    }

    public function destinationAddress()
    {
        return $this->belongsTo(Address::class, 'destination_address_id');
    }

    public function statusHistory()
    {
        return $this->hasMany(CourseStatusHistory::class)->orderBy('created_at');
    }

    public function cancelledBy()
    {
        return $this->belongsTo(User::class, 'cancelled_by');
    }

    // ===== Helpers métier =====
    public function isTerminal(): bool
    {
        return in_array($this->status, self::TERMINAL_STATUSES, true);
    }

    public function isInTransit(): bool
    {
        return in_array($this->status, [
            self::STATUS_TO_PICKUP, self::STATUS_AT_PICKUP,
            self::STATUS_PICKED_UP, self::STATUS_AT_DROPOFF,
        ], true);
    }

    public function getTrackingUrlAttribute(): string
    {
        // La page de suivi vit sur le FRONTEND (app), pas sur l'API. On construit
        // donc l'URL depuis FRONTEND_URL et non APP_URL (qui est le domaine API).
        return rtrim(config('app.frontend_url'), '/') . '/t/' . $this->tracking_token;
    }

    public static function generateCode(): string
    {
        return str_pad((string) random_int(0, 9999), 4, '0', STR_PAD_LEFT);
    }

    public function incidents()
    {
        return $this->hasMany(CourseIncident::class);
    }

}
