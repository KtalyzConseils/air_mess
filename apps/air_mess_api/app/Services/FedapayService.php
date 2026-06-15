<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class FedapayService
{
    private string $apiUrl;
    private string $secretKey;
    private string $webhookSecret;
    private string $currency;

    public function __construct()
    {
        $env = config('services.fedapay.env', 'sandbox');
        $this->apiUrl = $env === 'production'
            ? 'https://api.fedapay.com/v1'
            : 'https://sandbox-api.fedapay.com/v1';
        $this->secretKey     = config('services.fedapay.secret_key');
        $this->webhookSecret = config('services.fedapay.webhook_secret');
        $this->currency      = config('services.fedapay.currency', 'XOF');
    }

    /**
     * Crée une transaction Fedapay + génère l'URL de paiement hébergée.
     * Renvoie ['transaction_id', 'reference', 'checkout_url'].
     */
    public function createCheckout(
        int $amountFcfa,
        string $description,
        array $customer,
        string $callbackUrl,
    ): array {
        // Étape 1 : créer la transaction
        $txResponse = Http::withToken($this->secretKey)
            ->acceptJson()
            ->post("{$this->apiUrl}/transactions", [
                'amount'       => $amountFcfa,
                'description'  => $description,
                'currency'     => ['iso' => $this->currency],
                'callback_url' => $callbackUrl,
                'customer'     => [
                    'email'        => $customer['email'],
                    'firstname'    => $customer['firstname'] ?? 'Marchand',
                    'lastname'     => $customer['lastname']  ?? 'AirMess',
                    'phone_number' => [
                        'number'  => $customer['phone'] ?? null,
                        'country' => 'bj',
                    ],
                ],
            ]);

        if ($txResponse->failed()) {
            Log::error('Fedapay createTransaction failed', ['body' => $txResponse->body()]);
            throw new RuntimeException('Échec de création de la transaction Fedapay.');
        }

        $transaction = $txResponse->json('v1/transaction');

        // Étape 2 : générer le token de paiement (URL hébergée)
        $tokenResponse = Http::withToken($this->secretKey)
            ->acceptJson()
            ->post("{$this->apiUrl}/transactions/{$transaction['id']}/token");

        if ($tokenResponse->failed()) {
            Log::error('Fedapay token generation failed', ['body' => $tokenResponse->body()]);
            throw new RuntimeException('Échec de génération du lien de paiement.');
        }

        return [
            'transaction_id' => $transaction['id'],
            'reference'      => $transaction['reference'],
            'checkout_url'   => $tokenResponse->json('url'),
        ];
    }

    /**
     * Vérifie la signature du webhook Fedapay.
     * Format du header : "t=<timestamp>,s=<signature>"
     * Signature attendue : HMAC-SHA256("<timestamp>.<payload>", webhook_secret).
     * Tolérance : timestamp doit être de moins de 5 minutes (anti-replay).
     */
    public function verifyWebhookSignature(string $rawPayload, ?string $signatureHeader): bool
    {
        if (! $signatureHeader || ! $this->webhookSecret) {
            return false;
        }

        $parts = [];
        foreach (explode(',', $signatureHeader) as $kv) {
            [$k, $v] = array_pad(explode('=', trim($kv), 2), 2, null);
            if ($k !== null && $v !== null) {
                $parts[$k] = $v;
            }
        }

        $timestamp = $parts['t'] ?? null;
        $signature = $parts['s'] ?? null;

        if (! $timestamp || ! $signature) {
            return false;
        }

        // Anti-replay : 24h de tolérance.
        // Fedapay réessaie les webhooks ratés en gardant le timestamp d'origine — avec
        // 5 minutes on se retrouve à rejeter les retries pour rien. L'idempotence par
        // provider_ref dans le controller protège déjà contre les rejeux malveillants.
        if (abs(time() - (int) $timestamp) > 86_400) {
            Log::warning('Fedapay webhook : timestamp trop vieux', ['t' => $timestamp]);
            return false;
        }

        $expected = hash_hmac('sha256', $timestamp . '.' . $rawPayload, $this->webhookSecret);

        return hash_equals($expected, $signature);
    }

    /**
     * Récupère le statut d'une transaction depuis Fedapay (utile pour reconciliation).
     */
    public function fetchTransaction(string $transactionId): array
    {
        $response = Http::withToken($this->secretKey)
            ->acceptJson()
            ->get("{$this->apiUrl}/transactions/{$transactionId}");

        if ($response->failed()) {
            throw new RuntimeException('Impossible de récupérer la transaction.');
        }
        return $response->json('v1/transaction');
    }
}
