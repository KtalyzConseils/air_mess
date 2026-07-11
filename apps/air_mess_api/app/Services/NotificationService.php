<?php

namespace App\Services;

use App\Models\DeviceToken;
use App\Models\Notification;

class NotificationService
{
    /** Type de notif « nouvelle course proposée » : reçoit le son/canal personnalisés. */
    private const TYPE_NEW_COURSE = 'course.offered';

    /** Doit correspondre au canal créé côté app (lib/notifications.ts > NEW_COURSE_CHANNEL). */
    private const NEW_COURSE_CHANNEL = 'new-course';
    private const NEW_COURSE_SOUND   = 'new_course.wav';

    public function __construct(private ExpoPushClient $expo) {}

    /**
     * Crée une row notifications + push à tous les devices du user.
     */
    public function sendToUser(int $userId, string $type, string $title, string $body, array $data = [], ?int $courseId = null): Notification
    {
        $notif = Notification::create([
            'user_id'   => $userId,
            'type'      => $type,
            'title'     => $title,
            'body'      => $body,
            'data'      => $data,
            'course_id' => $courseId,
        ]);

        $tokens = DeviceToken::where('user_id', $userId)->pluck('token')->toArray();

        $payload = array_merge($data, [
            'notification_id' => $notif->id,
            'type'            => $type,
            'course_id'       => $courseId,
        ]);

        if ($type === self::TYPE_NEW_COURSE) {
            // Nouvelle course = alerte "appel entrant". On envoie un push DATA-ONLY :
            // aucune notif système, c'est la tâche de fond du client + Notifee qui
            // affichent la notif "appel" (sonnerie longue, boutons) + l'écran plein.
            // On joint trajet + gains pour afficher directement l'offre sur la notif.
            if ($courseId && ($course = \App\Models\Course::find($courseId))) {
                $payload['origin']      = $course->origin_quartier;
                $payload['destination'] = $course->destination_quartier;
                $payload['earnings']    = $course->driver_earnings;
            }
            $this->expo->push($tokens, '', '', $payload, 'default', null, dataOnly: true);
        } else {
            // Toute autre notif : notif système classique avec son par défaut.
            $this->expo->push($tokens, $title, $body, $payload, 'default', null);
        }

        return $notif;
    }

    /**
     * Pratique pour notifier plusieurs users (ex: tous les livreurs proches).
     */
    public function sendToUsers(array $userIds, string $type, string $title, string $body, array $data = [], ?int $courseId = null): void
    {
        foreach ($userIds as $uid) {
            $this->sendToUser($uid, $type, $title, $body, $data, $courseId);
        }
    }
}
