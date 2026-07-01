<?php

namespace App\Jobs;

use App\Models\WebhookDelivery;
use App\Services\WebhookDispatcher;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable as FoundationQueueable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;

/**
 * SendWebhookDeliveryJob — envoie effectivement le webhook HTTP + gère les retries.
 *
 * Rejoué automatiquement 3 fois par Laravel en cas d'échec, avec backoff
 * exponentiel : 30s → 5min → 30min. Après 3 échecs, la delivery passe en
 * `failed` et l'app peut relancer un retry manuel depuis l'UI dev.
 *
 * Idempotence côté receveur : chaque envoi porte le même `event_id` dans le
 * body → l'app tiers peut dédupliquer même si Air Mess re-tape.
 */
class SendWebhookDeliveryJob implements ShouldQueue
{
    use FoundationQueueable;
    use Queueable;
    use InteractsWithQueue;
    use SerializesModels;

    /** Nb de tentatives maximum (Laravel). */
    public int $tries = 3;

    /** Timeout HTTP par tentative (secondes). */
    public int $timeout = 15;

    public function __construct(public int $deliveryId)
    {
    }

    /**
     * Backoff exponentiel entre retries.
     * Tentative 1 → immédiate ; échec → 30s ; échec → 300s ; échec → 1800s.
     */
    public function backoff(): array
    {
        return [30, 300, 1800];
    }

    public function handle(): void
    {
        /** @var WebhookDelivery|null $delivery */
        $delivery = WebhookDelivery::with('apiApplication')->find($this->deliveryId);
        if (! $delivery || $delivery->isDelivered()) {
            return; // supprimée entre-temps ou déjà réussie
        }

        $app = $delivery->apiApplication;
        if (! $app || ! $app->hasWebhookConfigured()) {
            // Config retirée entre-temps : on marque comme failed avec explication.
            $delivery->update([
                'status'     => WebhookDelivery::STATUS_FAILED,
                'last_error' => 'Webhook config retirée avant envoi.',
                'last_attempted_at' => now(),
                'attempts'   => $delivery->attempts + 1,
            ]);
            return;
        }

        $body = json_encode($delivery->payload, JSON_UNESCAPED_UNICODE);
        $signature = WebhookDispatcher::sign($body, $app->webhook_secret);

        $delivery->increment('attempts');
        $delivery->update(['last_attempted_at' => now()]);

        try {
            $response = Http::withHeaders([
                'Content-Type'         => 'application/json',
                'User-Agent'           => 'AirMess-Webhook/1.0',
                'X-AirMess-Event'      => $delivery->event_type,
                'X-AirMess-Event-Id'   => $delivery->event_id,
                'X-AirMess-Signature'  => $signature,
                'X-AirMess-Delivery'   => (string) $delivery->id,
            ])
                ->timeout($this->timeout)
                ->withBody($body, 'application/json')
                ->post($delivery->url);

            $status = $response->status();
            $delivery->update([
                'last_http_status'   => $status,
                'last_response_body' => substr((string) $response->body(), 0, 2000),
            ]);

            if ($response->successful()) {
                $delivery->update([
                    'status'       => WebhookDelivery::STATUS_DELIVERED,
                    'delivered_at' => now(),
                    'last_error'   => null,
                ]);
                return;
            }

            // Non-2xx → on relance (Laravel gère la re-mise en queue via l'exception).
            throw new \RuntimeException("Réponse HTTP $status");

        } catch (\Throwable $e) {
            $delivery->update([
                'last_error' => substr($e->getMessage(), 0, 500),
            ]);

            // Si on a atteint le max de tries, on marque failed définitivement.
            if ($delivery->attempts >= $this->tries) {
                $delivery->update(['status' => WebhookDelivery::STATUS_FAILED]);
                return;
            }

            throw $e; // laisse Laravel replanifier avec le backoff
        }
    }

    /** Appelé après la dernière tentative en échec. */
    public function failed(\Throwable $exception): void
    {
        WebhookDelivery::where('id', $this->deliveryId)->update([
            'status'     => WebhookDelivery::STATUS_FAILED,
            'last_error' => substr($exception->getMessage(), 0, 500),
        ]);
    }
}
