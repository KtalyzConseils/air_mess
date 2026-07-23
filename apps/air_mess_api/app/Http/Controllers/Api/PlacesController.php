<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Proxy Laravel pour Google Places (Autocomplete + Details).
 *
 * Pourquoi un proxy plutôt que d'appeler Google depuis le browser :
 *  - la clé Places API reste server-side, jamais exposée dans les requêtes du front,
 *  - on peut cacher (Redis) pour économiser les quotas Google,
 *  - on peut swap de provider (Google → Nominatim → …) sans toucher au front,
 *  - on peut rate-limiter par utilisateur (throttle:api).
 *
 * Toutes les routes sont derrière `auth:sanctum` (cf. routes/api.php) — seuls les
 * utilisateurs connectés (marchand, particulier, driver) peuvent chercher.
 */
class PlacesController extends Controller
{
    private const AUTOCOMPLETE_URL = 'https://maps.googleapis.com/maps/api/place/autocomplete/json';
    private const DETAILS_URL      = 'https://maps.googleapis.com/maps/api/place/details/json';

    /**
     * Autocomplete : renvoie une liste de suggestions (place_id + description).
     * Le front ne récupère PAS les coordonnées ici — il devra rappeler /details/{id}
     * uniquement quand l'utilisateur clique sur une suggestion.
     * Ce split est important car Google facture Details à part et cher — on ne
     * paye Details que sur une vraie sélection utilisateur.
     */
    public function search(Request $request): JsonResponse
    {
        $data = $request->validate([
            'q'         => ['required', 'string', 'min:2', 'max:120'],
            'language'  => ['nullable', 'string', 'size:2'],
            'sessionId' => ['nullable', 'string', 'max:64'],
        ]);

        $apiKey = config('services.google.places_key');
        if (empty($apiKey)) {
            return response()->json([
                'message' => 'Recherche de lieux indisponible (clé Places non configurée).',
            ], 503);
        }

        $language = $data['language'] ?? config('services.google.places_language', 'fr');
        $country  = config('services.google.places_country', 'bj');
        $center   = config('services.google.places_center', '6.3703,2.3912');
        $radius   = (int) config('services.google.places_radius_m', 50000);

        // Cache 30 min — les intitulés Google changent rarement, on économise
        // la facture d'autocomplete sur les recherches récurrentes ("marché Ganhi").
        $cacheKey = 'places:autocomplete:' . md5(mb_strtolower($data['q']) . '|' . $country . '|' . $language);

        $payload = Cache::remember($cacheKey, now()->addMinutes(30), function () use ($data, $apiKey, $language, $country, $center, $radius) {
            $query = [
                'input'        => $data['q'],
                'key'          => $apiKey,
                'language'     => $language,
                'components'   => 'country:' . $country,
                'location'     => $center,
                'radius'       => $radius,
                // sessiontoken : Google facture toute une session (autocomplete + 1 details)
                // au tarif d'un seul Details Session. Le front doit fournir un token stable
                // pendant la session de saisie et le renvoyer au /details pour bénéficier
                // de la remise. Sans token, chaque autocomplete est facturé unitairement.
            ];
            if (! empty($data['sessionId'])) {
                $query['sessiontoken'] = $data['sessionId'];
            }

            try {
                $res = Http::timeout(6)->get(self::AUTOCOMPLETE_URL, $query);
            } catch (\Throwable $e) {
                Log::warning('[places.search] HTTP échec', ['error' => $e->getMessage()]);
                return null;
            }

            if (! $res->ok()) {
                Log::warning('[places.search] Google réponse KO', ['status' => $res->status()]);
                return null;
            }

            $body = $res->json();
            $status = $body['status'] ?? 'UNKNOWN_ERROR';

            // ZERO_RESULTS = requête OK mais rien trouvé (à cacher aussi, pas d'erreur)
            if (! in_array($status, ['OK', 'ZERO_RESULTS'], true)) {
                Log::warning('[places.search] Google status non OK', [
                    'status'  => $status,
                    'message' => $body['error_message'] ?? null,
                ]);
                return null;
            }

            $predictions = array_map(function ($p) {
                return [
                    'place_id'    => $p['place_id'] ?? null,
                    'description' => $p['description'] ?? '',
                    'main_text'   => $p['structured_formatting']['main_text'] ?? ($p['description'] ?? ''),
                    'secondary'   => $p['structured_formatting']['secondary_text'] ?? '',
                ];
            }, $body['predictions'] ?? []);

            return array_values(array_filter($predictions, fn ($p) => ! empty($p['place_id'])));
        });

        if ($payload === null) {
            return response()->json([
                'message' => 'La recherche de lieux est momentanément indisponible.',
            ], 502);
        }

        return response()->json(['results' => $payload]);
    }

    /**
     * Details d'un place_id → lat/lng + adresse formatée.
     * Appelé UNE fois par sélection utilisateur. Cache 24h : un place_id
     * Google ne change quasiment jamais de coord.
     */
    public function details(Request $request, string $placeId): JsonResponse
    {
        if (! preg_match('/^[A-Za-z0-9_-]{5,200}$/', $placeId)) {
            return response()->json(['message' => 'Identifiant de lieu invalide.'], 422);
        }

        $apiKey = config('services.google.places_key');
        if (empty($apiKey)) {
            return response()->json([
                'message' => 'Recherche de lieux indisponible (clé Places non configurée).',
            ], 503);
        }

        $language  = $request->query('language', config('services.google.places_language', 'fr'));
        $sessionId = $request->query('sessionId');

        $cacheKey = 'places:details:' . $placeId . ':' . $language;

        $payload = Cache::remember($cacheKey, now()->addHours(24), function () use ($placeId, $apiKey, $language, $sessionId) {
            $query = [
                'place_id' => $placeId,
                'key'      => $apiKey,
                'language' => $language,
                // Restreindre les champs demandés = tarif inférieur (Basic Data plutôt
                // que Contact/Atmosphere). On n'a besoin que du nom + adresse + géo.
                'fields'   => 'place_id,name,formatted_address,geometry/location,address_components',
            ];
            if (! empty($sessionId)) {
                $query['sessiontoken'] = $sessionId;
            }

            try {
                $res = Http::timeout(6)->get(self::DETAILS_URL, $query);
            } catch (\Throwable $e) {
                Log::warning('[places.details] HTTP échec', ['error' => $e->getMessage()]);
                return null;
            }

            if (! $res->ok()) {
                Log::warning('[places.details] Google réponse KO', ['status' => $res->status()]);
                return null;
            }

            $body   = $res->json();
            $status = $body['status'] ?? 'UNKNOWN_ERROR';
            if ($status !== 'OK') {
                Log::warning('[places.details] Google status non OK', [
                    'status'  => $status,
                    'message' => $body['error_message'] ?? null,
                ]);
                return null;
            }

            $result = $body['result'] ?? [];
            $loc    = $result['geometry']['location'] ?? null;
            if (! $loc || ! isset($loc['lat'], $loc['lng'])) {
                return null;
            }

            // Extraire quartier + ville des address_components — pratique pour
            // pré-remplir les champs "quartier" et "ville" du formulaire côté front.
            $components = $result['address_components'] ?? [];
            $quartier = $city = null;
            foreach ($components as $c) {
                $types = $c['types'] ?? [];
                if (in_array('sublocality', $types, true) || in_array('sublocality_level_1', $types, true)) {
                    $quartier = $c['long_name'] ?? null;
                }
                if (in_array('locality', $types, true) || in_array('administrative_area_level_2', $types, true)) {
                    $city ??= $c['long_name'] ?? null;
                }
            }

            return [
                'place_id'          => $result['place_id'] ?? $placeId,
                'name'              => $result['name'] ?? null,
                'formatted_address' => $result['formatted_address'] ?? null,
                'lat'               => (float) $loc['lat'],
                'lng'               => (float) $loc['lng'],
                'quartier'          => $quartier,
                'city'              => $city,
            ];
        });

        if ($payload === null) {
            return response()->json([
                'message' => 'Impossible de récupérer les détails de ce lieu.',
            ], 502);
        }

        return response()->json(['place' => $payload]);
    }
}
