<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DeviceToken;
use App\Models\Notification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class NotificationController extends Controller
{
    /**
     * Enregistre ou met à jour le token d'un device pour le user courant.
     */
    public function registerToken(Request $request): JsonResponse
    {
        $data = $request->validate([
            'token'    => ['required', 'string', 'max:255'],
            // 'ios-voip' = token PushKit (VoIP) iOS, canal séparé pour l'appel entrant.
            'platform' => ['required', Rule::in(['android', 'ios', 'web', 'ios-voip'])],
            'manufacturer' => ['nullable', 'string', 'max:80'],
            'model_name' => ['nullable', 'string', 'max:120'],
            'os_version' => ['nullable', 'string', 'max:40'],
            'app_version' => ['nullable', 'string', 'max:40'],
        ]);

        $deviceToken = DeviceToken::updateOrCreate(
            ['token' => $data['token']],
            [
                'user_id'      => $request->user()->id,
                'platform'     => $data['platform'],
                'last_seen_at' => now(),
                'manufacturer' => $data['manufacturer'] ?? null,
                'model_name' => $data['model_name'] ?? null,
                'os_version' => $data['os_version'] ?? null,
                'app_version' => $data['app_version'] ?? null,
            ],
        );

        return response()->json(['device_token' => $deviceToken], 201);
    }

    public function currentToken(Request $request): JsonResponse
    {
        $data = $request->validate(['token' => ['required', 'string', 'max:255']]);
        $exists = DeviceToken::where('user_id', $request->user()->id)
            ->where('token', $data['token'])
            ->exists();

        return response()->json(['registered' => $exists]);
    }

    /**
     * Supprime le token push d'un device (à la déconnexion) pour que ce device
     * ne reçoive plus les notifications de course. Scopé au user courant.
     */
    public function deleteToken(Request $request): JsonResponse
    {
        $data = $request->validate([
            'token' => ['required', 'string', 'max:255'],
        ]);

        DeviceToken::where('token', $data['token'])
            ->where('user_id', $request->user()->id)
            ->delete();

        return response()->json(['deleted' => true]);
    }

    /**
     * Liste paginée des notifications du user courant.
     */
    public function index(Request $request): JsonResponse
    {
        $perPage = min((int) $request->query('per_page', 20), 100);

        return response()->json(
            Notification::where('user_id', $request->user()->id)
                ->latest()
                ->paginate($perPage),
        );
    }

    /**
     * Marque une notification comme lue.
     */
    public function markRead(Request $request, Notification $notification): JsonResponse
    {
        if ($notification->user_id !== $request->user()->id) {
            abort(403);
        }

        $notification->update(['read_at' => now()]);

        return response()->json(['notification' => $notification->fresh()]);
    }

    public function acknowledgePush(Request $request, Notification $notification): JsonResponse
    {
        if ($notification->user_id !== $request->user()->id) abort(403);
        if ($notification->push_received_at === null) {
            $notification->forceFill(['push_received_at' => now()])->save();
        }

        return response()->json(['received' => true]);
    }

    /**
     * Compte des notifications non-lues (pour le badge).
     */
    public function unreadCount(Request $request): JsonResponse
    {
        $count = Notification::where('user_id', $request->user()->id)
            ->whereNull('read_at')
            ->count();

        return response()->json(['unread' => $count]);
    }
}
