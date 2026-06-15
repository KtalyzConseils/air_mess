<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Course;
use Illuminate\Http\JsonResponse;

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
}
