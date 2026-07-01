<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\SendWebhookDeliveryJob;
use App\Models\ApiApplication;
use App\Models\WebhookDelivery;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * Config + historique webhooks pour une ApiApplication.
 *
 *   PUT    /me/api-apps/{app}/webhook             configure URL + regen secret
 *   DELETE /me/api-apps/{app}/webhook             désactive
 *   GET    /me/api-apps/{app}/deliveries          liste paginée
 *   POST   /me/api-apps/{app}/deliveries/{id}/retry  rejoue une delivery (pending/failed)
 *
 * Le secret HMAC en clair n'est renvoyé qu'à la config (regen à chaque PUT).
 */
class ApiApplicationWebhookController extends Controller
{
    /** Configure ou met à jour l'URL — regen automatique du secret. */
    public function configure(Request $request, ApiApplication $app): JsonResponse
    {
        $this->authorizeOwnership($request, $app);

        $data = $request->validate([
            'webhook_url' => 'required|url|max:500',
        ]);

        $secret = 'whsec_' . Str::random(48);

        $app->update([
            'webhook_url'    => $data['webhook_url'],
            'webhook_secret' => $secret,
        ]);

        return response()->json([
            'message'     => 'Webhook configuré. Copie le secret maintenant, il ne sera plus affiché.',
            'webhook_url' => $app->webhook_url,
            'secret'      => $secret,
        ]);
    }

    /** Désactive l'envoi de webhooks (efface URL + secret). */
    public function destroy(Request $request, ApiApplication $app): JsonResponse
    {
        $this->authorizeOwnership($request, $app);

        $app->update([
            'webhook_url'    => null,
            'webhook_secret' => null,
        ]);

        return response()->json(['message' => 'Webhooks désactivés.']);
    }

    /** Liste paginée des deliveries de cette app. */
    public function deliveries(Request $request, ApiApplication $app): JsonResponse
    {
        $this->authorizeOwnership($request, $app);

        $status = $request->query('status'); // pending|delivered|failed|null

        $query = $app->webhookDeliveries()->latest();
        if (in_array($status, ['pending', 'delivered', 'failed'], true)) {
            $query->where('status', $status);
        }

        $page = $query->paginate(20);
        $page->getCollection()->transform(fn (WebhookDelivery $d) => $this->presentDelivery($d));

        return response()->json($page);
    }

    /**
     * Rejoue une delivery — utile après une panne côté receveur.
     * On remet le statut à `pending` et on redispatch le job.
     */
    public function retry(Request $request, ApiApplication $app, WebhookDelivery $delivery): JsonResponse
    {
        $this->authorizeOwnership($request, $app);
        if ($delivery->api_application_id !== $app->id) {
            abort(404);
        }
        if (! $app->hasWebhookConfigured()) {
            return response()->json([
                'message' => "Impossible de rejouer : le webhook de l'app n'est pas configuré.",
            ], 422);
        }

        // Snapshot de l'URL actuelle (elle a pu changer depuis l'envoi initial).
        $delivery->update([
            'status'   => WebhookDelivery::STATUS_PENDING,
            'url'      => $app->webhook_url,
            'last_error' => null,
        ]);

        SendWebhookDeliveryJob::dispatch($delivery->id);

        return response()->json(['message' => 'Retry programmé.', 'delivery_id' => $delivery->id]);
    }

    private function authorizeOwnership(Request $request, ApiApplication $app): void
    {
        if ($app->user_id !== $request->user()->id) {
            abort(404);
        }
    }

    private function presentDelivery(WebhookDelivery $d): array
    {
        return [
            'id'               => $d->id,
            'event_id'         => $d->event_id,
            'event_type'       => $d->event_type,
            'course_id'        => $d->course_id,
            'url'              => $d->url,
            'status'           => $d->status,
            'attempts'         => (int) $d->attempts,
            'last_http_status' => $d->last_http_status,
            'last_error'       => $d->last_error,
            'delivered_at'     => $d->delivered_at?->toIso8601String(),
            'last_attempted_at' => $d->last_attempted_at?->toIso8601String(),
            'created_at'       => $d->created_at?->toIso8601String(),
        ];
    }
}
