<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreIntegrationCourseRequest;
use App\Models\Course;
use App\Models\PackageCategory;
use App\Services\CourseCreationService;
use App\Services\GeocodingService;
use Illuminate\Http\JsonResponse;

/**
 * Création de course depuis un site externe (Gbandjo → Systige → AirMess).
 *
 * Flux : la commande passée sur le site marchand génère une course AirMess en
 * serveur-à-serveur. L'origine est le vendeur ; la destination est le client,
 * parfois sans GPS. Idempotent sur (marchand, external_reference) pour
 * absorber les retries du site externe sans créer de doublon.
 */
class IntegrationCourseController extends Controller
{
    public function store(
        StoreIntegrationCourseRequest $request,
        CourseCreationService $creator,
        GeocodingService $geocoder,
    ): JsonResponse {
        $data = $request->validated();
        $marchant = $request->user();

        // ===== Idempotence : même commande externe → on renvoie la course existante.
        $externalRef = $data['external_reference'] ?? null;
        if ($externalRef !== null) {
            $existing = Course::where('sender_id', $marchant->id)
                ->where('external_reference', $externalRef)
                ->first();

            if ($existing) {
                return $this->payload($existing, 200, 'Course déjà créée pour cette commande.');
            }
        }

        // ===== Quota marchand.
        if ($marchant->marchant->hasReachedMonthlyLimit()) {
            return response()->json([
                'message'       => 'Quota mensuel atteint.',
                'quota_reached' => true,
                'used'          => $marchant->marchant->monthly_courses_used,
                'limit'         => $marchant->marchant->monthlyCoursesLimit(),
            ], 402);
        }

        // ===== Tarif.
        $urgency = $data['urgency'] ?? 'standard';
        ['delivery_fee' => $deliveryFee, 'driver_earnings' => $driverEarnings] = $creator->pricing($urgency);

        // ===== Coordonnées de retrait : fournies, sinon géocodage best-effort.
        $origin = $data['origin'];
        $originLat = $origin['lat'] ?? null;
        $originLng = $origin['lng'] ?? null;

        if ($originLat === null || $originLng === null) {
            if ($coords = $geocoder->geocode($origin['street'] ?? null, $origin['quartier'], $origin['city'])) {
                [$originLat, $originLng] = [$coords['lat'], $coords['lng']];
            }
        }

        // Sans coordonnées de retrait, on ne peut pas pousser aux livreurs :
        // la course attend qu'un admin pose le pin (awaiting_geo).
        $hasOrigin = $originLat !== null && $originLng !== null;
        $status = $hasOrigin ? Course::STATUS_AWAITING : 'awaiting_geo';

        $dest = $data['destination'];
        $package = $data['package'] ?? [];

        $attributes = [
            'package_category_id' => $package['category_id'] ?? $this->defaultPackageCategoryId(),
            'package_description' => $package['description'] ?? 'Commande ' . ($externalRef ?? 'externe'),
            'package_size'        => $package['size'] ?? 'M',

            // Origine (vendeur)
            'origin_name'         => $origin['name'],
            'origin_phone'        => $origin['phone'],
            'origin_street'       => $origin['street'] ?? null,
            'origin_landmark'     => $origin['landmark'] ?? null,
            'origin_quartier'     => $origin['quartier'],
            'origin_city'         => $origin['city'],
            'origin_lat'          => $originLat,
            'origin_lng'          => $originLng,
            'origin_instructions' => $origin['instructions'] ?? null,

            // Destination (client) — souvent incomplète
            'destination_name'     => $dest['name'] ?? null,
            'destination_phone'    => $dest['phone'],
            'destination_street'   => $dest['address'] ?? null,
            'destination_landmark' => $dest['landmark'] ?? null,
            'destination_quartier' => $dest['quartier'] ?? null,
            'destination_city'     => $dest['city'] ?? null,
            'destination_lat'      => $dest['lat'] ?? null,
            'destination_lng'      => $dest['lng'] ?? null,
            'destination_instructions' => $dest['instructions'] ?? null,

            // Encaissement éventuel
            'has_collection'    => isset($data['collection_amount']),
            'collection_amount' => $data['collection_amount'] ?? null,
            'collection_method' => $data['collection_method'] ?? null,
        ];

        $course = $creator->persist($marchant, $attributes, [
            'status'             => $status,
            'urgency'            => $urgency,
            'delivery_fee'       => $deliveryFee,
            'driver_earnings'    => $driverEarnings,
            'source'             => $data['source'] ?? 'integration',
            'external_reference' => $externalRef,
        ]);

        // Push aux livreurs seulement si on a les coordonnées de retrait.
        if ($hasOrigin) {
            $creator->dispatchToAvailableDrivers($course);
        }

        return $this->payload($course, 201, $hasOrigin
            ? 'Course créée. En attente d\'attribution.'
            : 'Course créée. En attente de géolocalisation du point de retrait.');
    }

    private function defaultPackageCategoryId(): int
    {
        return (int) (PackageCategory::where('is_active', true)->where('code', 'standard')->value('id')
            ?? PackageCategory::where('is_active', true)->value('id'));
    }

    private function payload(Course $course, int $code, string $message): JsonResponse
    {
        return response()->json([
            'message'      => $message,
            'reference'    => $course->reference,
            'status'       => $course->status,
            'tracking_url' => $course->tracking_url,
            'delivery_fee' => $course->delivery_fee,
        ], $code);
    }
}
