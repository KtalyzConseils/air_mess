<?php

namespace App\Services;

use App\Jobs\SendWebhookDeliveryJob;
use App\Models\ApiApplication;
use App\Models\Course;
use App\Models\WebhookDelivery;
use Illuminate\Support\Str;

/**
 * WebhookDispatcher — construit et fait partir un webhook vers l'endpoint
 * d'une ApiApplication.
 *
 * Responsabilité unique : préparer le payload standard, créer la ligne
 * `webhook_deliveries` (état `pending`), dispatcher le job HTTP asynchrone.
 * L'envoi effectif + le retry sont dans SendWebhookDeliveryJob.
 *
 * Le service NE fait PAS de policy (« dois-je notifier ? ») — c'est le rôle
 * de l'observer / listener qui l'appelle. Ici on part du principe que si on
 * est appelé, on doit envoyer.
 */
class WebhookDispatcher
{
    // Événements supportés — même énumération côté doc API.
    public const EVENT_COURSE_CREATED   = 'course.created';
    public const EVENT_COURSE_ASSIGNED  = 'course.assigned';
    public const EVENT_COURSE_PICKED_UP = 'course.picked_up';
    public const EVENT_COURSE_DELIVERED = 'course.delivered';
    public const EVENT_COURSE_CANCELLED = 'course.cancelled';
    public const EVENT_COURSE_FAILED    = 'course.failed';

    /**
     * Prépare et dispatche un webhook pour un event lié à une course.
     * Aucune action si l'app n'a pas configuré son webhook — les events
     * en cours ne sont pas persistés (pas de queue à rejouer plus tard).
     *
     * Retourne la WebhookDelivery créée (ou null si pas de config).
     */
    public function dispatchCourseEvent(ApiApplication $app, Course $course, string $eventType): ?WebhookDelivery
    {
        if (! $app->hasWebhookConfigured()) {
            return null;
        }

        $payload = $this->buildCoursePayload($course, $eventType);

        $delivery = WebhookDelivery::create([
            'api_application_id' => $app->id,
            'course_id'          => $course->id,
            'event_id'           => $payload['event_id'],
            'event_type'         => $eventType,
            'url'                => $app->webhook_url,
            'payload'            => $payload,
            'status'             => WebhookDelivery::STATUS_PENDING,
            'attempts'           => 0,
        ]);

        SendWebhookDeliveryJob::dispatch($delivery->id);

        return $delivery;
    }

    /**
     * Payload standard « course.* » — même schéma pour tous les events de
     * course. Le receveur discrimine sur `event_type`.
     */
    private function buildCoursePayload(Course $course, string $eventType): array
    {
        return [
            'event_id'   => (string) Str::uuid(),
            'event_type' => $eventType,
            'created_at' => now()->toIso8601String(),
            'data' => [
                'course' => [
                    'id'                 => $course->id,
                    'reference'          => $course->reference,
                    'status'             => $course->status,
                    'external_reference' => $course->external_reference,
                    'tracking_url'       => $course->tracking_url,

                    'urgency'            => $course->urgency,
                    'delivery_fee'       => (int) $course->delivery_fee,
                    'driver_earnings'    => (int) $course->driver_earnings,

                    'origin' => [
                        'name'     => $course->origin_name,
                        'quartier' => $course->origin_quartier,
                        'city'     => $course->origin_city,
                        'lat'      => $course->origin_lat,
                        'lng'      => $course->origin_lng,
                    ],
                    'destination' => [
                        'name'     => $course->destination_name,
                        'quartier' => $course->destination_quartier,
                        'city'     => $course->destination_city,
                        'lat'      => $course->destination_lat,
                        'lng'      => $course->destination_lng,
                    ],

                    'collection' => $course->has_collection ? [
                        'amount' => (int) $course->collection_amount,
                        'method' => $course->collection_method,
                    ] : null,

                    'created_at' => $course->created_at?->toIso8601String(),
                ],
            ],
        ];
    }

    /**
     * Signe un corps JSON avec le secret de l'app.
     * Signature = HMAC-SHA256(secret, body). Le receveur recalcule pour
     * vérifier. Utilisé aussi côté job (idem, appel statique).
     */
    public static function sign(string $body, string $secret): string
    {
        return hash_hmac('sha256', $body, $secret);
    }
}
