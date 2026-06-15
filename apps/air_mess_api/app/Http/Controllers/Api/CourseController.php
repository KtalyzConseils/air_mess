<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\CreateCourseRequest;
use App\Models\Course;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use App\Services\NotificationService;
use App\Models\Driver;

class CourseController extends Controller
{
    /**
     * Crée une nouvelle course.
     */
    public function store(
        CreateCourseRequest $request,
        NotificationService $notifier,
        \App\Services\CourseBillingService $billing,
    ): JsonResponse {
        $data = $request->validated();
        $user = $request->user();

        // Calcul tarif simple pour le MVP
        $isExpress = ($data['urgency'] ?? 'standard') === 'express';
        $deliveryFee = (int) \App\Models\AppSetting::get(
            $isExpress ? 'express_delivery_fee_fcfa' : 'standard_delivery_fee_fcfa',
            $isExpress ? 2500 : 1500, // fallback si la setting n'existe pas
        );
        $driverPercent  = (int) \App\Models\AppSetting::get('driver_commission_percent', 75);
        $driverEarnings = (int) round($deliveryFee * $driverPercent / 100);


        // ===== Vérif quota marchand =====
        if ($user->isMarchant() && $user->marchant->hasReachedMonthlyLimit()) {
            return response()->json([
                'message'       => 'Quota mensuel atteint. Passez à un plan supérieur pour continuer.',
                'quota_reached' => true,
                'used'          => $user->marchant->monthly_courses_used,
                'limit'         => $user->marchant->monthlyCoursesLimit(),
            ], 402); // 402 Payment Required
        }

        // ===== Vérif quota particulier : au-delà → checkout one-shot =====
        if ($user->isIndividual() && $user->individual->hasReachedMonthlyLimit()) {
            return $billing->initiateOneShotCheckout($user, $data, $deliveryFee, $driverEarnings);
        }

        $course = DB::transaction(function () use ($data, $user, $deliveryFee, $driverEarnings) {
            $course = Course::create(array_merge($data, [
                'sender_id'       => $user->id,
                'status'          => isset($data['scheduled_for'])
                    ? Course::STATUS_PENDING_PREP
                    : Course::STATUS_AWAITING,
                'delivery_fee'    => $deliveryFee,
                'driver_earnings' => $driverEarnings,
                'has_collection'  => $data['has_collection'] ?? false,
                'urgency'         => $data['urgency'] ?? 'standard',

                // Filet de sécurité : on génère reference+token ici même si les events firent
                'reference'       => $this->generateReference(),
                'tracking_token'  => Str::random(10),
                'pickup_code'     => Course::generateCode(),
                'delivery_code'   => Course::generateCode(),
            ]));

            // Incrémenter le quota selon le type
            if ($user->isIndividual()) {
                $user->individual->increment('monthly_courses_used');
            } elseif ($user->isMarchant()) {
                $user->marchant->increment('monthly_courses_used');
            }

            return $course;
        });

        // Alerte quota marchand (80% / 100%)
        if ($user->isMarchant()) {
            $billing->sendQuotaAlertsIfNeeded($user->marchant->fresh(), $notifier);
        }

        // PUSH aux livreurs disponibles dans un rayon de 8 km
        $driverUserIds = Driver::availableNear($course->origin_lat, $course->origin_lng, 8.0)
        ->pluck('user_id')
        ->toArray();

        $title = $course->urgency === 'express' ? '⚡ Course Express' : '📦 Nouvelle course';
        $body  = "{$course->origin_quartier} → {$course->destination_quartier} · {$course->driver_earnings} FCFA";

        $notifier->sendToUsers($driverUserIds, 'course.offered', $title, $body,
            ['reference' => $course->reference],
            $course->id,
        );

        return response()->json([
            'message' => 'Course créée. En attente d\'attribution.',
            'course'  => $course->load(['sender', 'packageCategory']),
        ], 201);
    }

    /**
     * Liste paginée des courses du user authentifié.
     * Query params : status, page, per_page.
     */
    public function index(\Illuminate\Http\Request $request): JsonResponse
    {
        $user = $request->user();

        $query = Course::query()
            ->with(['packageCategory', 'driver.user'])
            ->latest();

        // Scoping selon le type d'utilisateur
        if ($user->isMarchant() || $user->isIndividual()) {
            $query->where('sender_id', $user->id);
        } elseif ($user->isDriver()) {
            $query->where('driver_id', $user->driver?->id);
        }
        // admin : voit tout (pas de filtrage)

        // Filtre optionnel par statut
        if ($status = $request->query('status')) {
            $statuses = is_array($status) ? $status : explode(',', $status);
            $query->whereIn('status', $statuses);
        }

        $perPage = min((int) $request->query('per_page', 15), 100);

        return response()->json($query->paginate($perPage));
    }

    /**
     * Détail d'une course.
     */
    public function show(\Illuminate\Http\Request $request, Course $course): JsonResponse
    {
        $this->authorizeAccessToCourse($request->user(), $course);

        return response()->json([
            'course' => $course->load([
                'sender', 'driver.user', 'packageCategory',
                'originAddress', 'destinationAddress',
            ]),
        ]);
    }

    /**
     * Historique des statuts d'une course.
     */
    public function history(\Illuminate\Http\Request $request, Course $course): JsonResponse
    {
        $this->authorizeAccessToCourse($request->user(), $course);

        return response()->json([
            'history' => $course->statusHistory()->with('changedBy')->get(),
        ]);
    }

    /**
     * Annule une course (statut → cancelled).
     */
    public function cancel(\Illuminate\Http\Request $request, Course $course, NotificationService $notifier): JsonResponse
    {
        $this->authorizeAccessToCourse($request->user(), $course);

        if ($course->isTerminal()) {
            return response()->json([
                'message' => 'Impossible d\'annuler : la course est déjà clôturée.',
            ], 422);
        }

        if (in_array($course->status, [Course::STATUS_PICKED_UP, Course::STATUS_AT_DROPOFF], true)) {
            return response()->json([
                'message' => 'Impossible d\'annuler : le colis est déjà entre les mains du livreur.',
            ], 422);
        }

        $request->validate(['reason' => ['nullable', 'string', 'max:500']]);

        $previousStatus = $course->status;
        // Le livreur assigné (s'il y en a un) doit être libéré, sinon il reste bloqué en "busy".
        $driver = $course->driver_id ? Driver::find($course->driver_id) : null;

        DB::transaction(function () use ($course, $request, $previousStatus, $driver) {
            $course->update([
                'status'              => Course::STATUS_CANCELLED,
                'cancelled_at'        => now(),
                'cancellation_reason' => $request->input('reason'),
                'cancelled_by'        => $request->user()->id,
            ]);

            // Libérer le livreur : il redevient disponible pour de nouvelles courses.
            if ($driver) {
                $driver->update(['availability_status' => 'available']);
            }

            \App\Models\CourseStatusHistory::create([
                'course_id'       => $course->id,
                'from_status'     => $previousStatus,
                'to_status'       => Course::STATUS_CANCELLED,
                'changed_by_id'   => $request->user()->id,
                'changed_by_type' => 'user',
                'reason'          => $request->input('reason'),
            ]);
        });

        // Prévenir le livreur assigné que la course lui est retirée (hors transaction).
        if ($driver) {
            $reason = $request->input('reason');
            $notifier->sendToUser(
                $driver->user_id,
                'course.cancelled',
                '↩️ Course annulée',
                "La course {$course->reference} a été annulée." . ($reason ? " Motif : {$reason}" : ''),
                ['reference' => $course->reference],
                $course->id,
            );
        }

        return response()->json([
            'message' => 'Course annulée.',
            'course'  => $course->fresh(),
        ]);
    }

    /**
     * Vérifie que l'utilisateur peut accéder à cette course.
     */
    private function authorizeAccessToCourse(\App\Models\User $user, Course $course): void
    {
        if ($user->isAdmin()) {
            return; // admin : tout autorisé
        }

        if (($user->isMarchant() || $user->isIndividual()) && $course->sender_id === $user->id) {
            return;
        }

        if ($user->isDriver() && $course->driver_id === $user->driver?->id) {
            return;
        }

        abort(403, 'Accès refusé à cette course.');
    }


    /**
     * Génère une référence unique du type AM-2026-00001.
     */
    private function generateReference(): string
    {
        $year = now()->format('Y');
        $count = Course::whereYear('created_at', $year)->count() + 1;

        // Boucle de sécurité contre les collisions de timing
        do {
            $ref = sprintf('AM-%s-%05d', $year, $count++);
        } while (Course::where('reference', $ref)->exists());

        return $ref;
    }
}
