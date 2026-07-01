<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreIntegrationCourseRequest;
use App\Models\Course;
use App\Models\PackageCategory;
use App\Models\UserWallet;
use App\Services\CourseCreationService;
use App\Services\GeocodingService;
use App\Services\UserWalletService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

/**
 * Création de course depuis un site externe (Gbandjo → Systige → AirMess).
 *
 * Flux : la commande passée sur le site marchand génère une course AirMess en
 * serveur-à-serveur. L'origine est le vendeur ; la destination est le client,
 * parfois sans GPS. Idempotent sur (marchand, external_reference) pour
 * absorber les retries du site externe sans créer de doublon.
 *
 * Paiement : comme pour le canal applicatif, le marchand est payeur. La course
 * est facturée via le wallet (modèle hold → débit à la livraison). Comme un
 * appel serveur-à-serveur ne peut pas suivre un checkout Fedapay interactif,
 * un solde insuffisant renvoie 402 (au marchand de recharger son wallet).
 */
class IntegrationCourseController extends Controller
{
    public function store(
        StoreIntegrationCourseRequest $request,
        CourseCreationService $creator,
        GeocodingService $geocoder,
        UserWalletService $walletService,
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

        // ===== Tarif.
        $urgency = $data['urgency'] ?? 'standard';
        ['delivery_fee' => $deliveryFee, 'driver_earnings' => $driverEarnings] = $creator->pricing($urgency);

        // ===== Paiement wallet : pré-check du solde disponible.
        // Le marchand est toujours payeur. Solde insuffisant → 402 (recharger le wallet) :
        // un appel serveur-à-serveur ne peut pas suivre un checkout Fedapay interactif.
        $wallet = UserWallet::firstOrCreate(['user_id' => $marchant->id]);
        if (! $wallet->canReserve($deliveryFee)) {
            return response()->json([
                'message'           => 'Solde wallet insuffisant. Rechargez votre wallet pour créer des courses via l\'API.',
                'insufficient_funds' => true,
                'available'         => $wallet->available(),
                'required'          => $deliveryFee,
            ], 402);
        }

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

        // Création de la course + hold wallet, atomiques : si la réservation
        // échoue (race : wallet vidé entre le pré-check et le hold), tout est
        // annulé et on renvoie 402 sans laisser de course fantôme.
        try {
            $course = DB::transaction(function () use ($creator, $marchant, $attributes, $status, $urgency, $deliveryFee, $driverEarnings, $data, $externalRef, $walletService) {
                $course = $creator->persist($marchant, $attributes, [
                    'status'             => $status,
                    'urgency'            => $urgency,
                    'delivery_fee'       => $deliveryFee,
                    'driver_earnings'    => $driverEarnings,
                    'source'             => $data['source'] ?? 'integration',
                    'external_reference' => $externalRef,
                ]);

                if (! $walletService->reserveForCourse($marchant, $course, $deliveryFee)) {
                    throw new \DomainException('Wallet insuffisant à la réservation (race).');
                }

                return $course;
            });
        } catch (\DomainException $e) {
            return response()->json([
                'message'            => 'Solde wallet insuffisant. Rechargez votre wallet pour créer des courses via l\'API.',
                'insufficient_funds' => true,
                'required'           => $deliveryFee,
            ], 402);
        }

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
