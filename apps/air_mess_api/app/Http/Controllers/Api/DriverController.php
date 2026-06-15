<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Models\CourseStatusHistory;
use App\Models\Driver;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use App\Services\NotificationService;
use App\Models\CourseIncident;
use App\Models\Admin;


class DriverController extends Controller
{
    private const MATCHING_RADIUS_KM = 8.0; // rayon max d'une ville comme Cotonou

    // ===== 1. AVAILABILITY =====
    public function updateAvailability(Request $request): JsonResponse
    {
        $data = $request->validate([
            'availability_status' => ['required', Rule::in(['offline', 'available', 'on_break'])],
        ]);

        $driver = $this->currentDriver($request);

        // On ne peut pas se mettre 'available' si on a une course en cours
        $hasActive = Course::where('driver_id', $driver->id)
            ->whereNotIn('status', Course::TERMINAL_STATUSES)
            ->whereNotIn('status', [Course::STATUS_AWAITING])
            ->exists();

        $driver->update([
            'availability_status' => $hasActive ? 'busy' : $data['availability_status'],
        ]);

        return response()->json(['driver' => $driver->fresh()]);
    }

    // ===== 2. POSITION =====
    public function updatePosition(Request $request): JsonResponse
    {
        $data = $request->validate([
            'lat' => ['required', 'numeric', 'between:-90,90'],
            'lng' => ['required', 'numeric', 'between:-180,180'],
        ]);

        $driver = $this->currentDriver($request);

        // Mise à jour dénormalisée (sera abstrait via Repository plus tard)
        $driver->update([
            'current_lat'      => $data['lat'],
            'current_lng'      => $data['lng'],
            'last_position_at' => now(),
        ]);

        return response()->json(['ok' => true]);
    }

    // ===== 3. PROPOSITIONS DE COURSES (matching par distance) =====

    public function offeredCourses(Request $request): JsonResponse
    {
        $driver = $this->currentDriver($request);

        if ($driver->availability_status !== 'available') {
            return response()->json(['courses' => []]);
        }

        $query = Course::where('status', Course::STATUS_AWAITING)
            ->whereNull('driver_id')
            ->with('packageCategory');

        // Si on connaît la position du livreur → on trie et filtre par proximité
        if ($driver->current_lat !== null && $driver->current_lng !== null) {
            $query
                ->selectDistanceFrom((float) $driver->current_lat, (float) $driver->current_lng)
                ->withinRadius((float) $driver->current_lat, (float) $driver->current_lng, self::MATCHING_RADIUS_KM)
                ->orderByRaw("urgency = 'express' DESC")
                ->orderBy('distance_km');
        } else {
            $query
                ->orderByRaw("urgency = 'express' DESC")
                ->latest();
        }

        $courses = $query->limit(10)->get()->makeHidden(['pickup_code', 'delivery_code']);

        return response()->json(['courses' => $courses]);
    }


    // ===== 4. ACCEPTER UNE COURSE =====
    public function acceptCourse(Request $request, Course $course, NotificationService $notifier): JsonResponse
    {
        $driver = $this->currentDriver($request);

        // Vérifs métier
        if ($course->status !== Course::STATUS_AWAITING || $course->driver_id !== null) {
            return response()->json(['message' => 'Cette course n\'est plus disponible.'], 409);
        }

        if ($driver->availability_status !== 'available') {
            return response()->json(['message' => 'Vous n\'êtes pas disponible.'], 403);
        }

        DB::transaction(function () use ($driver, $course) {
            $course->update([
                'driver_id'   => $driver->id,
                'status'      => Course::STATUS_ASSIGNED,
                'assigned_at' => now(),
            ]);

            $driver->update(['availability_status' => 'busy']);

            CourseStatusHistory::create([
                'course_id'       => $course->id,
                'from_status'     => Course::STATUS_AWAITING,
                'to_status'       => Course::STATUS_ASSIGNED,
                'changed_by_id'   => $driver->user_id,
                'changed_by_type' => 'user',
                'reason'          => 'Course acceptée par le livreur',
            ]);
        });

       //PUSH au marchand expéditeur
        $notifier->sendToUser(
            $course->sender_id,
            'course.accepted',
            '✅ Votre course est acceptée',
            "{$driver->first_name} arrive. 🔑 Code de retrait : {$course->pickup_code}",
            [
                'reference'         => $course->reference,
                'driver_first_name' => $driver->first_name,
                'pickup_code'       => $course->pickup_code,
            ],
            $course->id,
        );

        return response()->json([
            'message' => 'Course acceptée.',
            'course'  => $course->fresh()
                ->load(['packageCategory', 'sender'])
                ->makeHidden(['pickup_code', 'delivery_code']),
        ]);

    }

    // ===== 5. TRANSITIONS DE STATUT GUIDÉES =====
    public function transition(Request $request, Course $course, NotificationService $notifier): JsonResponse
    {
        $driver = $this->currentDriver($request);

        if ($course->driver_id !== $driver->id) {
            return response()->json(['message' => 'Course non assignée à vous.'], 403);
        }

        $data = $request->validate([
            'action' => ['required', Rule::in([
                'start_to_pickup', 'arrived_pickup', 'pickup_confirmed',
                'arrived_dropoff', 'delivered', 'failed',
            ])],
            'pickup_code'    => ['required_if:action,pickup_confirmed', 'nullable', 'string', 'max:10'],
            'delivery_code'  => ['required_if:action,delivered', 'nullable', 'string', 'max:10'],
            'reason'         => ['required_if:action,failed', 'nullable', 'string', 'max:500'],
        ]);

        $transitions = [
            'start_to_pickup'   => [Course::STATUS_ASSIGNED, Course::STATUS_TO_PICKUP, null],
            'arrived_pickup'    => [Course::STATUS_TO_PICKUP, Course::STATUS_AT_PICKUP, null],
            'pickup_confirmed'  => [Course::STATUS_AT_PICKUP, Course::STATUS_PICKED_UP, 'picked_up_at'],
            'arrived_dropoff'   => [Course::STATUS_PICKED_UP, Course::STATUS_AT_DROPOFF, null],
            'delivered'         => [Course::STATUS_AT_DROPOFF, Course::STATUS_DELIVERED, 'delivered_at'],
            'failed'            => [null, Course::STATUS_FAILED, null], // depuis n'importe quel statut actif
        ];

        [$expectedFrom, $nextStatus, $timestampField] = $transitions[$data['action']];

        if ($expectedFrom && $course->status !== $expectedFrom) {
            return response()->json([
                'message' => "Action impossible depuis le statut actuel ({$course->status}).",
            ], 422);
        }

        // Validation stricte des codes : le livreur doit saisir le bon
        if ($data['action'] === 'pickup_confirmed' && $data['pickup_code'] !== $course->pickup_code) {
            throw ValidationException::withMessages([
                'pickup_code' => 'Code de retrait incorrect.',
            ]);
        }
        if ($data['action'] === 'delivered' && $data['delivery_code'] !== $course->delivery_code) {
            throw ValidationException::withMessages([
                'delivery_code' => 'Code de livraison incorrect.',
            ]);
        }

        DB::transaction(function () use ($course, $driver, $nextStatus, $timestampField, $data) {
            $updates = ['status' => $nextStatus];
            if ($timestampField) {
                $updates[$timestampField] = now();
            }

            $course->update($updates);

            // Libérer le livreur si terminal
            if (in_array($nextStatus, Course::TERMINAL_STATUSES, true)) {
                $driver->update(['availability_status' => 'available']);
            }

            // Créditer le livreur quand la course est livrée
            if ($nextStatus === Course::STATUS_DELIVERED) {
                \App\Models\DriverEarning::updateOrCreate(
                    ['course_id' => $course->id],
                    [
                        'driver_id'   => $driver->id,
                        'amount_fcfa' => $course->driver_earnings,
                        'status'      => \App\Models\DriverEarning::STATUS_PENDING,
                        'credited_at' => now(),
                    ],
                );
            }

            CourseStatusHistory::create([
                'course_id'       => $course->id,
                'from_status'     => $course->getOriginal('status'),
                'to_status'       => $nextStatus,
                'changed_by_id'   => $driver->user_id,
                'changed_by_type' => 'user',
                'reason'          => $data['reason'] ?? null,
                'metadata'        => array_filter([
                    'pickup_code'   => $data['pickup_code']   ?? null,
                    'delivery_code' => $data['delivery_code'] ?? null,
                ]),
            ]);
        });

        //PUSH au marchand sur les transitions visibles côté client
        $messages = [
            Course::STATUS_TO_PICKUP   => ['🚀 Le livreur est en route',  'Il se dirige vers le point de retrait.'],
            Course::STATUS_AT_PICKUP   => ['📍 Le livreur est arrivé',    'Il prépare le retrait du colis.'],
            Course::STATUS_PICKED_UP   => ['📦 Colis récupéré',           'Le livreur a votre colis et part vers la destination.'],
            Course::STATUS_AT_DROPOFF  => ['🚦 Le livreur arrive',         'Il est sur place pour la livraison au destinataire.'],
            Course::STATUS_DELIVERED   => ['🎉 Colis livré',              'La course est terminée. Merci !'],
            Course::STATUS_FAILED      => ['⚠️ Livraison échouée',        'Le livreur signale un problème. Voir détails.'],
        ];

        if (isset($messages[$nextStatus])) {
            [$title, $body] = $messages[$nextStatus];
            $notifier->sendToUser(
                $course->sender_id,
                "course.{$nextStatus}",
                $title, $body,
                ['reference' => $course->reference],
                $course->id,
            );
        }

        return response()->json([
            'message' => 'Statut mis à jour.',
            'course'  => $course->fresh()->makeHidden(['pickup_code', 'delivery_code']),
        ]);

    }

    // ===== Helper =====
    private function currentDriver(Request $request): Driver
    {
        $user = $request->user();

        if (! $user || ! $user->isDriver() || ! $user->driver) {
            abort(403, 'Réservé aux livreurs.');
        }

        return $user->driver;
    }

    // ===== 6. BALANCE (gains en attente + total versé) =====
    public function balance(Request $request): JsonResponse
    {
        $driver = $this->currentDriver($request);

        return response()->json([
            'pending_balance_fcfa' => $driver->pendingBalance(),
            'total_paid_out_fcfa'  => $driver->totalPaidOut(),
            'pending_count'        => (int) $driver->earnings()
                ->where('status', \App\Models\DriverEarning::STATUS_PENDING)
                ->count(),
        ]);
    }

    // ===== 6bis. HISTORIQUE DES GAINS (earnings paginés) =====
    public function earningsHistory(Request $request): JsonResponse
    {
        $driver = $this->currentDriver($request);
        $perPage = min((int) $request->query('per_page', 20), 100);

        $earnings = $driver->earnings()
            ->with('course:id,reference,origin_quartier,destination_quartier,delivered_at')
            ->latest('credited_at')
            ->paginate($perPage);

        return response()->json($earnings);
    }

    // ===== 6ter. HISTORIQUE DES VERSEMENTS =====
    public function payoutsHistory(Request $request): JsonResponse
    {
        $driver = $this->currentDriver($request);
        $perPage = min((int) $request->query('per_page', 20), 100);

        $payouts = $driver->payouts()
            ->latest('created_at')
            ->paginate($perPage);

        return response()->json($payouts);
    }

    // ===== 6quater. STATS DU LIVREUR (déjà existant) =====
    public function stats(Request $request): JsonResponse
    {
        $driver = $this->currentDriver($request);

        $base = Course::where('driver_id', $driver->id)
            ->where('status', Course::STATUS_DELIVERED);

        $periods = [
            'today'     => (clone $base)->whereDate('delivered_at', today()),
            'last_7'    => (clone $base)->where('delivered_at', '>=', now()->subDays(7)),
            'last_30'   => (clone $base)->where('delivered_at', '>=', now()->subDays(30)),
            'all_time'  => (clone $base),
        ];

        $response = [];
        foreach ($periods as $key => $q) {
            $response[$key] = [
                'courses'  => (int) (clone $q)->count(),
                'earnings' => (float) (clone $q)->sum('driver_earnings'),
            ];
        }

        return response()->json($response);
    }

    // ===== 7. SIGNALER UN INCIDENT =====
    public function reportIncident(Request $request, Course $course, NotificationService $notifier): JsonResponse
    {
        $driver = $this->currentDriver($request);

        if ($course->driver_id !== $driver->id) {
            return response()->json(['message' => 'Course non assignée à vous.'], 403);
        }

        if ($course->isTerminal()) {
            return response()->json(['message' => 'Course déjà clôturée.'], 422);
        }

        $data = $request->validate([
            'type'        => ['required', Rule::in(CourseIncident::TYPES)],
            'description' => ['nullable', 'string', 'max:1000'],
            'lat'         => ['nullable', 'numeric', 'between:-90,90'],
            'lng'         => ['nullable', 'numeric', 'between:-180,180'],
        ]);

        $incident = CourseIncident::create([
            'course_id'     => $course->id,
            'reported_by'   => $driver->user_id,
            'reporter_type' => 'driver',
            'type'          => $data['type'],
            'description'   => $data['description'] ?? null,
            // Position : celle fournie, sinon la dernière position connue du livreur
            'lat'           => $data['lat'] ?? $driver->current_lat,
            'lng'           => $data['lng'] ?? $driver->current_lng,
            'status'        => 'open',
        ]);

        // Compteur d'incidents du livreur (le champ existait, il sert enfin)
        $driver->increment('incidents_count');

        // Prévenir le marchand expéditeur
        $notifier->sendToUser(
            $course->sender_id,
            'course.incident',
            '⚠️ Incident signalé',
            "Un incident a été signalé sur votre course {$course->reference}.",
            ['reference' => $course->reference, 'incident_type' => $data['type']],
            $course->id,
        );

        // Alerter les admins ops/super pour qu'ils traitent vite
        $opsUserIds = Admin::whereIn('sub_role', [Admin::ROLE_OPS, Admin::ROLE_SUPER])
        ->pluck('user_id')
        ->toArray();

        $notifier->sendToUsers(
            $opsUserIds,
            'incident.reported',
            '🚨 Nouvel incident',
            "Incident ({$data['type']}) signalé sur la course {$course->reference}.",
            ['reference' => $course->reference, 'incident_type' => $data['type']],
            $course->id,
        );


        return response()->json([
            'message'  => 'Incident signalé.',
            'incident' => $incident,
        ], 201);
    }

}
