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

        // Nouvelle course : son + canal Android personnalisés. Toute autre notif : son système.
        $isNewCourse = $type === self::TYPE_NEW_COURSE;
        $sound     = $isNewCourse ? self::NEW_COURSE_SOUND : 'default';
        $channelId = $isNewCourse ? self::NEW_COURSE_CHANNEL : null;

        $tokens = DeviceToken::where('user_id', $userId)->pluck('token')->toArray();
        $this->expo->push($tokens, $title, $body, array_merge($data, [
            'notification_id' => $notif->id,
            'type'            => $type,
            'course_id'       => $courseId,
        ]), $sound, $channelId);

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
