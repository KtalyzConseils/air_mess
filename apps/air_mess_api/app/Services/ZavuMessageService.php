<?php

namespace App\Services;

use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ZavuMessageService
{
    /**
     * @param string $phoneE164 Numero au format E.164, ex. +2290190123456.
     * @return array{ok: bool, status: int|null, data: array|null, error: string|null}
     */
    public function send(string $channel, string $phoneE164, string $text): array
    {
        $apiKey = (string) config('services.zavu.key');

        if ($apiKey === '') {
            return [
                'ok' => false,
                'status' => null,
                'data' => null,
                'error' => 'ZAVUDEV_API_KEY ou ZAVU_API_KEY est manquant.',
            ];
        }

        try {
            $request = Http::withToken($apiKey)
                ->acceptJson()
                ->asJson();

            if ($sender = config('services.zavu.sender')) {
                $request = $request->withHeaders(['Zavu-Sender' => $sender]);
            }

            $response = $request->post((string) config('services.zavu.endpoint'), [
                'to' => $phoneE164,
                'text' => $text,
                'channel' => $channel,
                'idempotencyKey' => sprintf('airmess-test-%s-%s-%s', $channel, ltrim($phoneE164, '+'), now()->timestamp),
            ]);

            $data = $this->json($response);

            if (! $response->successful()) {
                Log::warning('Zavu message failed', [
                    'channel' => $channel,
                    'to' => $phoneE164,
                    'status' => $response->status(),
                    'body' => $data,
                ]);
            }

            return [
                'ok' => $response->successful(),
                'status' => $response->status(),
                'data' => $data,
                'error' => $response->successful() ? null : ($data['message'] ?? $data['error'] ?? $response->body()),
            ];
        } catch (\Throwable $e) {
            Log::warning('Zavu message exception', [
                'channel' => $channel,
                'to' => $phoneE164,
                'err' => $e->getMessage(),
            ]);

            return [
                'ok' => false,
                'status' => null,
                'data' => null,
                'error' => $e->getMessage(),
            ];
        }
    }

    public function usesTestKey(): bool
    {
        return str_starts_with((string) config('services.zavu.key'), 'zv_test_');
    }

    /**
     * @return array<string, mixed>|null
     */
    private function json(Response $response): ?array
    {
        try {
            $json = $response->json();

            return is_array($json) ? $json : null;
        } catch (\Throwable) {
            return null;
        }
    }
}
