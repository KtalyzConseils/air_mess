<?php

namespace App\Services;

use App\Models\DeviceToken;
use Firebase\JWT\JWT;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Envoi de notifications web push via l'API FCM HTTP v1 (tokens `platform=web`
 * de la PWA marchant-web). Authentification par compte de service Firebase
 * (fichier JSON pointé par FIREBASE_CREDENTIALS) — le JWT est signé localement
 * avec firebase/php-jwt puis échangé contre un access token OAuth2 (cache ~50 min).
 *
 * Best-effort comme ExpoPushClient : ne lève jamais, log les échecs.
 * Sans FIREBASE_CREDENTIALS configuré, l'envoi est silencieusement ignoré.
 */
class FcmClient
{
    private const OAUTH_SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';

    private const TOKEN_CACHE_KEY = 'fcm:access_token';

    /**
     * Envoie une notification à plusieurs tokens FCM web.
     * Les tokens invalides (UNREGISTERED) sont supprimés de device_tokens.
     *
     * @param array<string, mixed> $data  payload additionnel (casté en strings, exigence FCM)
     * @param string|null          $link  URL ouverte au clic sur la notification
     */
    public function send(array $tokens, string $title, string $body, array $data = [], ?string $link = null): void
    {
        $tokens = array_values(array_unique(array_filter($tokens)));
        if (empty($tokens)) {
            return;
        }

        $credentials = $this->credentials();
        if ($credentials === null) {
            return; // FCM non configuré (dev local) — les autres canaux font le travail.
        }

        $accessToken = $this->accessToken($credentials);
        if ($accessToken === null) {
            return;
        }

        $endpoint = "https://fcm.googleapis.com/v1/projects/{$credentials['project_id']}/messages:send";

        // FCM v1 exige des valeurs string dans data.
        $stringData = [];
        foreach ($data as $key => $value) {
            if ($value === null) {
                continue;
            }
            $stringData[$key] = is_scalar($value) ? (string) $value : json_encode($value);
        }

        foreach ($tokens as $token) {
            $message = [
                'token'        => $token,
                'notification' => ['title' => $title, 'body' => $body],
                'data'         => $stringData,
                'webpush'      => [
                    'notification' => [
                        'icon'  => '/pwa-192x192.png',
                        'badge' => '/pwa-192x192.png',
                    ],
                ],
            ];
            if ($link) {
                $message['webpush']['fcm_options'] = ['link' => $link];
            }

            try {
                $response = Http::withToken($accessToken)
                    ->timeout(10)
                    ->post($endpoint, ['message' => $message]);

                if ($response->successful()) {
                    continue;
                }

                // Token expiré/désinscrit : on le retire pour ne plus le solliciter.
                $error = $response->json('error.status');
                if (in_array($error, ['UNREGISTERED', 'NOT_FOUND', 'INVALID_ARGUMENT'], true)) {
                    DeviceToken::where('token', $token)->where('platform', 'web')->delete();
                    continue;
                }

                Log::warning('FCM push failed', ['status' => $response->status(), 'error' => $error]);
            } catch (\Throwable $e) {
                Log::warning('FCM push exception', ['err' => $e->getMessage()]);
            }
        }
    }

    /**
     * Contenu du fichier de compte de service, ou null si non configuré.
     *
     * @return array{project_id: string, client_email: string, private_key: string, token_uri: string}|null
     */
    private function credentials(): ?array
    {
        $path = config('services.firebase.credentials');
        if (! $path || ! is_file($path)) {
            return null;
        }

        $json = json_decode((string) file_get_contents($path), true);
        if (! is_array($json) || empty($json['client_email']) || empty($json['private_key'])) {
            Log::error('FIREBASE_CREDENTIALS : fichier de compte de service illisible.');

            return null;
        }

        return [
            'project_id'   => $json['project_id'] ?? (string) config('services.firebase.project_id'),
            'client_email' => $json['client_email'],
            'private_key'  => $json['private_key'],
            'token_uri'    => $json['token_uri'] ?? 'https://oauth2.googleapis.com/token',
        ];
    }

    /**
     * Access token OAuth2 (scope firebase.messaging), mis en cache 50 minutes.
     */
    private function accessToken(array $credentials): ?string
    {
        $cached = Cache::get(self::TOKEN_CACHE_KEY);
        if (is_string($cached) && $cached !== '') {
            return $cached;
        }

        try {
            $now = time();
            $assertion = JWT::encode([
                'iss'   => $credentials['client_email'],
                'scope' => self::OAUTH_SCOPE,
                'aud'   => $credentials['token_uri'],
                'iat'   => $now,
                'exp'   => $now + 3600,
            ], $credentials['private_key'], 'RS256');

            $response = Http::asForm()->timeout(10)->post($credentials['token_uri'], [
                'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                'assertion'  => $assertion,
            ]);

            $token = $response->json('access_token');
            if (! $response->successful() || ! is_string($token)) {
                Log::warning('FCM OAuth token failed', ['status' => $response->status(), 'body' => $response->json()]);

                return null;
            }

            Cache::put(self::TOKEN_CACHE_KEY, $token, now()->addMinutes(50));

            return $token;
        } catch (\Throwable $e) {
            Log::warning('FCM OAuth exception', ['err' => $e->getMessage()]);

            return null;
        }
    }
}
