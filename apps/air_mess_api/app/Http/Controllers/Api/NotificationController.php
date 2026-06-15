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
            'platform' => ['required', Rule::in(['android', 'ios', 'web'])],
        ]);

        $deviceToken = DeviceToken::updateOrCreate(
            ['token' => $data['token']],
            [
                'user_id'      => $request->user()->id,
                'platform'     => $data['platform'],
                'last_seen_at' => now(),
            ],
        );

        return response()->json(['device_token' => $deviceToken], 201);
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
