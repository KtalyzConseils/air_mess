<?php

namespace App\Observers;

use App\Models\ApiApplication;
use App\Models\Course;
use App\Models\CourseStatusHistory;
use App\Models\User;
use App\Services\WebhookDispatcher;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;

class CourseObserver
{
    /** Mapping status Course → event_type webhook (null = pas de webhook pour ce status). */
    private const STATUS_TO_EVENT = [
        'assigned'   => WebhookDispatcher::EVENT_COURSE_ASSIGNED,
        'picked_up'  => WebhookDispatcher::EVENT_COURSE_PICKED_UP,
        'delivered'  => WebhookDispatcher::EVENT_COURSE_DELIVERED,
        'cancelled'  => WebhookDispatcher::EVENT_COURSE_CANCELLED,
        'failed'     => WebhookDispatcher::EVENT_COURSE_FAILED,
    ];


    /**
     * Avant l'insertion : générer reference et tracking_token.
     */
    public function creating(Course $course): void
    {
        if (empty($course->reference)) {
            $year = now()->format('Y');
            $lastSeq = Course::whereYear('created_at', $year)->count() + 1;
            $course->reference = sprintf('AM-%s-%05d', $year, $lastSeq);
        }

        if (empty($course->tracking_token)) {
            $course->tracking_token = Str::random(10);
        }
    }

    /**
     * Après l'insertion : log la création comme premier événement + dispatch webhook.
     */
    public function created(Course $course): void
    {
        CourseStatusHistory::create(array_merge([
            'course_id'   => $course->id,
            'from_status' => null,
            'to_status'   => $course->status,
            'reason'      => 'Création de la course',
        ], $this->resolveChangedBy()));

        $this->dispatchWebhookIfApiApp($course, WebhookDispatcher::EVENT_COURSE_CREATED);
    }

    /**
     * À chaque update : log la transition de statut + dispatch webhook si transition mappée.
     */
    public function updated(Course $course): void
    {
        if (! $course->wasChanged('status')) {
            return;
        }

        CourseStatusHistory::create(array_merge([
            'course_id'   => $course->id,
            'from_status' => $course->getOriginal('status'),
            'to_status'   => $course->status,
        ], $this->resolveChangedBy()));

        $eventType = self::STATUS_TO_EVENT[$course->status] ?? null;
        if ($eventType) {
            $this->dispatchWebhookIfApiApp($course, $eventType);
        }
    }

    /**
     * Résout l'attribution du changement de status.
     *   - Auth via un User classique → changed_by_id = user.id, type = 'user'
     *   - Auth via un token d'ApiApplication → id = user propriétaire, type = 'api_application'
     *     (l'ID stocké doit rester une FK users valide)
     *   - Pas d'auth → changed_by_id = null, type = 'system'
     */
    private function resolveChangedBy(): array
    {
        $auth = Auth::user();

        // Résolution de l'ID à mettre dans changed_by_id (FK users).
        //   - Auth User classique → son id
        //   - Auth ApiApplication → user_id du propriétaire
        //   - Sinon (queue, jobs, tests directs) → null
        $userId = match (true) {
            $auth instanceof ApiApplication => $auth->user_id,
            $auth instanceof User           => $auth->id,
            default                          => null,
        };

        // Sécurité : si l'ID ne correspond pas à un vrai user (contexte
        // exotique, test partiel, race), on met null pour ne pas violer la FK.
        if ($userId !== null && ! User::whereKey($userId)->exists()) {
            $userId = null;
        }

        return [
            'changed_by_id'   => $userId,
            'changed_by_type' => $auth instanceof User ? 'user' : 'system',
        ];
    }

    /**
     * Émet le webhook uniquement si la course a été créée par une ApiApplication
     * (les courses internes n'ont pas d'api_application_id → pas de webhook).
     */
    private function dispatchWebhookIfApiApp(Course $course, string $eventType): void
    {
        if (! $course->api_application_id) {
            return;
        }
        $course->loadMissing('apiApplication');
        if (! $course->apiApplication) {
            return;
        }
        app(WebhookDispatcher::class)->dispatchCourseEvent($course->apiApplication, $course, $eventType);
    }
}
