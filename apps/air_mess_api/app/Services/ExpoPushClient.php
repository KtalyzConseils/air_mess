<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ExpoPushClient
{
    private const ENDPOINT = 'https://exp.host/--/api/v2/push/send';

    /**
     * Envoie un push à plusieurs tokens Expo en un seul batch.
     * Expo accepte jusqu'à 100 messages par appel.
     */
    /**
     * @param  string       $sound      Son iOS + fallback Android <8 ('default' ou basename bundlé, ex 'new-course.wav')
     * @param  string|null  $channelId  Canal Android portant le son (le son Android vient du canal, pas de $sound)
     */
    public function push(array $tokens, string $title, string $body, array $data = [], string $sound = 'default', ?string $channelId = null): void
    {
        $tokens = array_values(array_unique(array_filter($tokens)));
        if (empty($tokens)) return;

        $messages = array_map(function ($t) use ($title, $body, $data, $sound, $channelId) {
            $message = [
                'to'    => $t,
                'sound' => $sound,
                'title' => $title,
                'body'  => $body,
                'data'  => $data,
                'priority' => 'high',
            ];
            // channelId : uniquement pour Android, ignoré par iOS.
            if ($channelId !== null) {
                $message['channelId'] = $channelId;
            }
            return $message;
        }, $tokens);

        try {
            $response = Http::acceptJson()->asJson()->post(self::ENDPOINT, $messages);
            if (! $response->successful()) {
                Log::warning('Expo push failed', ['status' => $response->status(), 'body' => $response->body()]);
            }
        } catch (\Throwable $e) {
            // On ne casse JAMAIS le flux métier si le push échoue
            Log::error('Expo push exception', ['error' => $e->getMessage()]);
        }
    }
}
