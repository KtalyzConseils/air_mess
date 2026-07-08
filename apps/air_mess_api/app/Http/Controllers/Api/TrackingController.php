<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Admin;
use App\Models\AppSetting;
use App\Models\Course;
use App\Models\CourseIncident;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TrackingController extends Controller
{
    /**
     * Endpoint public : retourne les infos minimales pour le tracking client.
     */
    public function show(string $token): JsonResponse
    {
        $course = Course::with(['driver.user', 'packageCategory'])
            ->where('tracking_token', $token)
            ->first();

        if (! $course) {
            return response()->json(['message' => 'Lien de suivi invalide ou expiré.'], 404);
        }

        // On expose UNIQUEMENT des champs publics
        return response()->json([
            'tracking' => [
                'reference'           => $course->reference,
                'status'              => $course->status,
                'created_at'          => $course->created_at,
                'assigned_at'         => $course->assigned_at,
                'picked_up_at'        => $course->picked_up_at,
                'delivered_at'        => $course->delivered_at,
                // Code de livraison : ne exposer QUE quand le colis est en route
                // (status >= picked_up). Avant ça → null pour éviter une fuite prématurée.
                'delivery_code'       => $course->picked_up_at !== null
                    ? $course->delivery_code
                    : null,


                'origin'      => [
                    'name'     => $course->origin_name,
                    'quartier' => $course->origin_quartier,
                    'city'     => $course->origin_city,
                ],
                'destination' => [
                    'name'        => $course->destination_name,
                    'quartier'    => $course->destination_quartier,
                    'city'        => $course->destination_city,
                    'lat'         => $course->destination_lat,
                    'lng'         => $course->destination_lng,
                ],

                'package' => [
                    'description' => $course->package_description,
                    'category'    => $course->packageCategory?->name,
                ],

                'driver' => $course->driver
                    ? [
                        // On expose juste le prénom et le tel (masqué côté plus tard via numéro de relais)
                        'first_name' => $course->driver->first_name,
                        'phone'      => $course->driver->user->phone,
                        'current_lat' => $course->driver->current_lat,
                        'current_lng' => $course->driver->current_lng,
                        'last_position_at' => $course->driver->last_position_at,
                    ]
                    : null,

                // Historique simplifié (uniquement les statuts publics)
                'timeline' => $course->statusHistory()
                    ->orderBy('created_at')
                    ->get(['from_status', 'to_status', 'created_at'])
                    ->map(fn ($h) => [
                        'status'     => $h->to_status,
                        'created_at' => $h->created_at,
                    ]),
            ],
        ]);
    }

    /**
     * Cas 8 — Le destinataire conteste la livraison depuis le lien de suivi
     * ("Ce n'est pas moi qui ai reçu ce colis").
     *
     * Endpoint PUBLIC (identifié par le tracking_token, pas d'auth Sanctum).
     * Anti-abus :
     *  - nom + téléphone + description obligatoires (min 20 chars pour la description)
     *  - autorisé UNIQUEMENT si course.status = delivered dans la fenêtre
     *    (`dispute_window_days`, défaut 7 jours)
     *  - un seul incident wrong_recipient par course : refus si un incident open
     *    ou resolved de ce type existe déjà (évite le spam depuis un lien partagé)
     *
     * L'ops reçoit une push et enquête (appelle destinataire + driver).
     */
    public function dispute(Request $request, string $token, NotificationService $notifier): JsonResponse
    {
        $course = Course::where('tracking_token', $token)->first();
        if (! $course) {
            return response()->json(['message' => 'Lien de suivi invalide ou expiré.'], 404);
        }

        if ($course->status !== Course::STATUS_DELIVERED) {
            return response()->json([
                'message' => 'Cette contestation n\'est possible qu\'une fois la course marquée livrée.',
            ], 422);
        }

        $windowDays = (int) AppSetting::get('dispute_window_days', 7);
        if ($course->delivered_at && $course->delivered_at->diffInDays(now()) > $windowDays) {
            return response()->json([
                'message' => "Fenêtre de contestation dépassée ({$windowDays} jours). Contactez le marchand pour toute réclamation ultérieure.",
            ], 422);
        }

        $existing = CourseIncident::where('course_id', $course->id)
            ->where('type', CourseIncident::TYPE_WRONG_RECIPIENT)
            ->exists();
        if ($existing) {
            return response()->json([
                'message' => 'Une contestation a déjà été enregistrée pour cette course. L\'ops est en train de la traiter.',
            ], 422);
        }

        $data = $request->validate([
            'name'        => ['required', 'string', 'max:100'],
            'phone'       => ['required', 'string', 'max:30'],
            'description' => ['required', 'string', 'min:20', 'max:1000'],
        ]);

        $incident = CourseIncident::create([
            'course_id'     => $course->id,
            'reported_by'   => null, // pas d'utilisateur authentifié
            'reporter_type' => 'system', // enum existant — le back-office sait via metadata que c'est le destinataire
            'type'          => CourseIncident::TYPE_WRONG_RECIPIENT,
            'description'   => "Contestation destinataire via tracking. Nom: {$data['name']}. Tel: {$data['phone']}. Motif:\n{$data['description']}",
            'status'        => 'open',
        ]);

        // Notif ops + super — nécessite enquête humaine
        $opsUserIds = Admin::whereIn('sub_role', [Admin::ROLE_OPS, Admin::ROLE_SUPER])
            ->pluck('user_id')
            ->toArray();
        $notifier->sendToUsers(
            $opsUserIds,
            'incident.reported',
            'Contestation destinataire',
            "Le destinataire de la course {$course->reference} conteste la livraison. Contactez {$data['name']} au {$data['phone']}.",
            [
                'reference'      => $course->reference,
                'incident_type'  => CourseIncident::TYPE_WRONG_RECIPIENT,
                'reporter_name'  => $data['name'],
                'reporter_phone' => $data['phone'],
            ],
            $course->id,
        );

        // Notif marchand — sait qu'un problème a été soulevé
        $notifier->sendToUser(
            $course->sender_id,
            'course.disputed',
            'Contestation reçue',
            "Le destinataire de la course {$course->reference} a contesté la livraison. L'ops est en train d'enquêter.",
            ['reference' => $course->reference],
            $course->id,
        );

        return response()->json([
            'message'  => 'Contestation enregistrée. L\'équipe support va enquêter et vous recontacter au numéro fourni.',
            'incident' => [
                'id'         => $incident->id,
                'type'       => $incident->type,
                'status'     => $incident->status,
                'created_at' => $incident->created_at,
            ],
        ], 201);
    }
}
