<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;

/**
 * Envoie des pushs VoIP (PushKit) à des appareils iOS via APNs, en HTTP/2.
 *
 * Pourquoi un client dédié plutôt qu'Expo/FCM : sur iOS, seul un push VoIP réveille une
 * app fermée/verrouillée pour présenter un appel entrant (CallKit). Apple l'impose, et
 * ces pushs ne passent QUE par APNs, pas par Expo/FCM. Android continue d'utiliser le
 * push data-only via Expo (cf. ExpoPushClient).
 *
 * Auth token-based (.p8) : on signe un JWT ES256 (kid = key_id, iss = team_id) réutilisable
 * ~1 h. La même clé fonctionne en sandbox et en production ; seul l'hôte change.
 */
class ApnsVoipClient
{
    private const HOST_PROD    = 'https://api.push.apple.com';
    private const HOST_SANDBOX = 'https://api.sandbox.push.apple.com';

    /** APNs refuse un JWT de plus de 60 min ; on le régénère bien avant. */
    private const TOKEN_TTL = 3000; // 50 min

    private ?string $cachedJwt = null;
    private int $cachedJwtAt = 0;

    /**
     * Envoie un push VoIP à chaque token fourni.
     *
     * @param  string[]  $tokens  tokens VoIP (PushKit), hexadécimaux
     * @param  array     $data    données livrées à l'app (trajet, gains, course_id…)
     */
    public function push(array $tokens, array $data = []): void
    {
        $tokens = array_values(array_unique(array_filter($tokens)));
        if (empty($tokens)) {
            return;
        }

        $jwt = $this->authToken();
        if ($jwt === null) {
            Log::warning('APNs VoIP: config incomplète (key/key_id/team_id), envoi ignoré.');
            return;
        }

        $cfg     = config('services.apns');
        $host    = ($cfg['env'] ?? 'production') === 'production' ? self::HOST_PROD : self::HOST_SANDBOX;
        $topic   = rtrim((string) ($cfg['bundle_id'] ?? ''), '.') . '.voip';
        // Payload VoIP : pas d'`alert` (c'est CallKit qui affiche l'appel côté app).
        $payload = json_encode(['aps' => [], ...$data], JSON_UNESCAPED_UNICODE);

        foreach ($tokens as $token) {
            $this->sendOne($host, $token, $topic, $jwt, $payload);
        }
    }

    /** Un envoi unitaire. Ne lève jamais : un push raté ne casse pas le flux métier. */
    private function sendOne(string $host, string $token, string $topic, string $jwt, string $payload): void
    {
        $ch = curl_init("{$host}/3/device/{$token}");
        curl_setopt_array($ch, [
            CURLOPT_HTTP_VERSION   => CURL_HTTP_VERSION_2_0, // APNs EXIGE HTTP/2
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => $payload,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HEADER         => false,
            CURLOPT_TIMEOUT        => 10,
            CURLOPT_HTTPHEADER     => [
                "authorization: bearer {$jwt}",
                "apns-topic: {$topic}",
                'apns-push-type: voip',
                'apns-priority: 10',
                'apns-expiration: 0', // livraison immédiate, pas de mise en file
                'content-type: application/json',
            ],
        ]);

        $body   = curl_exec($ch);
        $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err    = curl_error($ch);
        curl_close($ch);

        if ($err !== '') {
            Log::error('APNs VoIP: échec réseau', ['error' => $err]);
            return;
        }
        if ($status !== 200) {
            // APNs renvoie un JSON {"reason":"BadDeviceToken"|"Unregistered"|...}
            Log::warning('APNs VoIP: rejet Apple', ['status' => $status, 'body' => $body]);
        }
    }

    /**
     * JWT ES256 signé avec la clé .p8, mis en cache ~50 min.
     *
     * Signature faite « à la main » avec openssl (et conversion DER → R||S brut) plutôt
     * qu'avec firebase/php-jwt, qui échouait à charger la clé depuis la variable d'env
     * ("OpenSSL unable to validate key"). Ce chemin est celui validé contre APNs (HTTP 200).
     */
    private function authToken(): ?string
    {
        $cfg    = config('services.apns');
        $keyId  = $cfg['key_id']  ?? null;
        $teamId = $cfg['team_id'] ?? null;
        $key    = $this->privateKey();

        if (! $keyId || ! $teamId || ! $key) {
            return null;
        }

        if ($this->cachedJwt !== null && (time() - $this->cachedJwtAt) < self::TOKEN_TTL) {
            return $this->cachedJwt;
        }

        $pkey = openssl_pkey_get_private($key);
        if ($pkey === false) {
            Log::error('APNs VoIP: clé privée illisible', ['error' => openssl_error_string()]);
            return null;
        }

        $header  = self::b64url(json_encode(['alg' => 'ES256', 'kid' => $keyId]));
        $claims  = self::b64url(json_encode(['iss' => $teamId, 'iat' => time()]));
        $signingInput = "{$header}.{$claims}";

        $der = '';
        if (! openssl_sign($signingInput, $der, $pkey, OPENSSL_ALGO_SHA256)) {
            Log::error('APNs VoIP: openssl_sign a échoué', ['error' => openssl_error_string()]);
            return null;
        }

        $this->cachedJwt   = "{$signingInput}." . self::b64url(self::derToRaw($der));
        $this->cachedJwtAt = time();
        return $this->cachedJwt;
    }

    /** base64url sans padding (format JWT). */
    private static function b64url(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    /**
     * Convertit une signature ECDSA DER (SEQUENCE de deux INTEGER R,S) en 64 octets
     * bruts R||S, comme l'exige JWS ES256. openssl_sign renvoie du DER ; APNs veut du brut.
     */
    private static function derToRaw(string $der): string
    {
        $offset = 2;
        if (ord($der[1]) & 0x80) {
            $offset += ord($der[1]) & 0x7f;
        }
        $offset++;                       // saute le tag INTEGER de R
        $rLen = ord($der[$offset]);
        $offset++;
        $r = substr($der, $offset, $rLen);
        $offset += $rLen;
        $offset++;                       // saute le tag INTEGER de S
        $sLen = ord($der[$offset]);
        $offset++;
        $s = substr($der, $offset, $sLen);

        $r = ltrim($r, "\x00");
        $s = ltrim($s, "\x00");
        return str_pad($r, 32, "\x00", STR_PAD_LEFT) . str_pad($s, 32, "\x00", STR_PAD_LEFT);
    }

    /** Contenu PEM de la clé .p8 : depuis APNS_KEY (inline) ou APNS_KEY_PATH (fichier). */
    private function privateKey(): ?string
    {
        $cfg = config('services.apns');
        $inline = $cfg['key'] ?? null;
        if (is_string($inline) && trim($inline) !== '') {
            return self::normalizePem($inline);
        }
        $path = $cfg['key_path'] ?? null;
        if (is_string($path) && $path !== '' && is_readable($path)) {
            $contents = file_get_contents($path);
            return $contents ? self::normalizePem($contents) : null;
        }
        return null;
    }

    /**
     * Reconstruit un PEM canonique quelle que soit la façon dont la variable d'env a
     * abîmé la clé : \n littéraux, tout collé sur une ligne, espaces, \r\n… OpenSSL 3
     * refuse ("DECODER unsupported") le moindre écart de format. On extrait le corps
     * base64, on le nettoie et on le ré-emballe en lignes de 64 caractères.
     */
    private static function normalizePem(string $raw): string
    {
        // Séquences d'échappement littérales → vrais sauts de ligne. On gère UN OU
        // PLUSIEURS antislash avant r/n (\n mais aussi \\n sur-échappé, fréquent quand la
        // clé traverse JSON → env). Un seul antislash laissait des parasites dans le base64.
        $s = preg_replace('/\\\\+[rn]/', "\n", $raw);

        // Cas avec marqueurs PEM : on extrait le corps et on ré-emballe proprement.
        if (preg_match('/-----BEGIN ([A-Z0-9 ]+?)-----(.*?)-----END [A-Z0-9 ]+?-----/s', $s, $m)) {
            $label = trim($m[1]);
            $body  = preg_replace('/\s+/', '', $m[2]); // enlève tous les blancs du base64
            $wrapped = chunk_split($body, 64, "\n");
            return "-----BEGIN {$label}-----\n{$wrapped}-----END {$label}-----\n";
        }

        // Cas SANS marqueurs : la variable ne contient que le corps base64 (fréquent quand
        // on colle une clé .p8 sans les lignes BEGIN/END). Le .p8 d'Apple étant du PKCS#8,
        // on l'emballe en "PRIVATE KEY".
        $body = preg_replace('/\s+/', '', $s);
        if ($body !== '' && preg_match('#^[A-Za-z0-9+/=]+$#', $body)) {
            $wrapped = chunk_split($body, 64, "\n");
            return "-----BEGIN PRIVATE KEY-----\n{$wrapped}-----END PRIVATE KEY-----\n";
        }

        return $s; // forme non reconnue : on renvoie tel quel
    }
}
