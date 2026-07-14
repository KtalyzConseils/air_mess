<?php

namespace App\Services;

use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Vérifie les ID tokens Firebase émis par Phone Auth (inscription driver).
 *
 * Validation locale du JWT (signature RS256 contre les certificats publics
 * Google + claims aud/iss/exp) — pas besoin du SDK Admin ni d'un service
 * account : seul le project ID est requis (services.firebase.project_id).
 */
class FirebaseTokenVerifier
{
    private const CERTS_URL = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

    private const CERTS_CACHE_KEY = 'firebase:securetoken_certs';

    /**
     * Retourne le numéro vérifié (claim `phone_number`, format E.164) si le
     * jeton est un ID token Phone Auth valide de notre projet, sinon null.
     */
    public function verifyPhoneToken(string $idToken): ?string
    {
        $projectId = config('services.firebase.project_id');
        if (! $projectId) {
            Log::error('FIREBASE_PROJECT_ID manquant — vérification téléphone impossible.');

            return null;
        }

        $certs = $this->publicCerts();
        if ($certs === null) {
            return null;
        }

        try {
            $keys = [];
            foreach ($certs as $kid => $pem) {
                $keys[$kid] = new Key($pem, 'RS256');
            }

            // JWT::decode vérifie signature (via kid), exp, nbf et iat.
            $payload = JWT::decode($idToken, $keys);
        } catch (\Throwable $e) {
            Log::info('Firebase ID token rejeté', ['err' => $e->getMessage()]);

            return null;
        }

        $validAudience = ($payload->aud ?? null) === $projectId;
        $validIssuer   = ($payload->iss ?? null) === "https://securetoken.google.com/{$projectId}";
        $validSubject  = ! empty($payload->sub ?? null);
        $phoneNumber   = $payload->phone_number ?? null;

        if (! $validAudience || ! $validIssuer || ! $validSubject || ! is_string($phoneNumber)) {
            Log::info('Firebase ID token invalide (claims)', [
                'aud_ok' => $validAudience,
                'iss_ok' => $validIssuer,
                'sub_ok' => $validSubject,
                'has_phone' => is_string($phoneNumber),
            ]);

            return null;
        }

        return $phoneNumber;
    }

    /**
     * Certificats publics Google (kid => PEM), mis en cache selon le max-age
     * renvoyé par Google (rotation régulière des clés).
     *
     * @return array<string, string>|null
     */
    private function publicCerts(): ?array
    {
        $cached = Cache::get(self::CERTS_CACHE_KEY);
        if (is_array($cached) && $cached !== []) {
            return $cached;
        }

        try {
            $response = Http::timeout(10)->get(self::CERTS_URL);
            if (! $response->successful()) {
                Log::warning('Certificats Firebase indisponibles', ['status' => $response->status()]);

                return null;
            }

            $certs = $response->json();
            if (! is_array($certs) || $certs === []) {
                return null;
            }

            // TTL depuis Cache-Control: public, max-age=NNNN (fallback 1h)
            $ttl = 3600;
            if (preg_match('/max-age=(\d+)/', (string) $response->header('Cache-Control'), $m)) {
                $ttl = max(60, (int) $m[1]);
            }
            Cache::put(self::CERTS_CACHE_KEY, $certs, $ttl);

            return $certs;
        } catch (\Throwable $e) {
            Log::warning('Récupération certificats Firebase échouée', ['err' => $e->getMessage()]);

            return null;
        }
    }
}
