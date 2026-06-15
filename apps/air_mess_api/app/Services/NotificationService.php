<?php

namespace App\Services;

use App\Models\DeviceToken;
use App\Models\Notification;

class NotificationService
{
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
        $this->expo->push($tokens, $title, $body, array_merge($data, [
            'notification_id' => $notif->id,
            'type'            => $type,
            'course_id'       => $courseId,
        ]));

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
