<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Models\CourseStatusHistory;
use App\Models\Driver;
use App\Models\Individual;
use App\Models\Marchant;
use App\Models\Payment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use App\Services\NotificationService;
use App\Models\CourseIncident;


class AdminController extends Controller
{
    // ===== 1. DASHBOARD KPI =====
    public function dashboard(): JsonResponse
    {
        $today = now()->startOfDay();

        return response()->json([
            'kpi' => [
                'courses_today'      => Course::where('created_at', '>=', $today)->count(),
                'courses_in_progress' => Course::whereIn('status', [
                    Course::STATUS_ASSIGNED, Course::STATUS_TO_PICKUP,
                    Course::STATUS_AT_PICKUP, Course::STATUS_PICKED_UP,
                    Course::STATUS_AT_DROPOFF,
                ])->count(),
                'courses_awaiting'   => Course::where('status', Course::STATUS_AWAITING)->count(),
                'courses_delivered_today' => Course::where('status', Course::STATUS_DELIVERED)
                    ->where('delivered_at', '>=', $today)->count(),
                'drivers_online'     => Driver::whereIn('availability_status', ['available', 'busy'])->count(),
                'marchants_pending'  => Marchant::whereNull('validated_at')->count(),
                'incidents_open'     => CourseIncident::where('status', 'open')->count(),
            ],
            'courses_by_status' => Course::selectRaw('status, COUNT(*) AS total')
                ->groupBy('status')
                ->pluck('total', 'status'),

            // Répartition des livreurs par disponibilité (capacité terrain)
            'drivers_by_availability' => Driver::selectRaw('availability_status, COUNT(*) AS total')
                ->groupBy('availability_status')
                ->pluck('total', 'availability_status'),

            // File d'attribution : courses en attente d'un livreur, les plus anciennes d'abord
            'awaiting_queue' => Course::where('status', Course::STATUS_AWAITING)
                ->oldest()
                ->limit(8)
                ->get(['id', 'reference', 'origin_quartier', 'destination_quartier', 'urgency', 'created_at']),

            // Derniers incidents ouverts
            'recent_incidents' => CourseIncident::where('status', 'open')
                ->with('course:id,reference')
                ->latest()
                ->limit(5)
                ->get(['id', 'course_id', 'type', 'description', 'created_at']),
        ]);
    }

    // ===== 2. LISTE COMPLÈTE DES COURSES =====
    public function courses(Request $request): JsonResponse
    {
        $query = Course::query()
            ->with(['sender', 'driver.user', 'packageCategory'])
            ->latest();

        if ($status = $request->query('status')) {
            $statuses = is_array($status) ? $status : explode(',', $status);
            $query->whereIn('status', $statuses);
        }

        if ($q = $request->query('q')) {
            $query->where(function ($qq) use ($q) {
                $qq->where('reference', 'ILIKE', "%{$q}%")
                   ->orWhere('origin_name', 'ILIKE', "%{$q}%")
                   ->orWhere('destination_name', 'ILIKE', "%{$q}%");
            });
        }

        return response()->json($query->paginate(min((int) $request->query('per_page', 20), 100)));
    }

    // ===== 3. RÉAFFECTER UNE COURSE =====
    public function reassignCourse(Request $request, Course $course, NotificationService $notifier): JsonResponse
    {
        $data = $request->validate([
            'new_driver_id' => ['required', 'exists:drivers,id'],
            'reason'        => ['nullable', 'string', 'max:500'],
        ]);

        if ($course->isTerminal()) {
            return response()->json(['message' => 'Course déjà clôturée.'], 422);
        }

        if (in_array($course->status, [Course::STATUS_PICKED_UP, Course::STATUS_AT_DROPOFF], true)) {
            return response()->json([
                'message' => 'Impossible de réaffecter : le colis est déjà entre les mains du livreur. '
                           . 'Marquez la course en litige, ou demandez le retour du colis au marchand.',
            ], 422);
        }


        $newDriver = Driver::findOrFail($data['new_driver_id']);

        if (! $newDriver->isAvailable()) {
            return response()->json([
                'message' => 'Ce livreur n\'est pas disponible (hors-ligne, occupé ou compte inactif). Choisissez un livreur disponible.',
            ], 422);
        }
        $oldDriver = $course->driver_id ? Driver::find($course->driver_id) : null;

        DB::transaction(function () use ($course, $newDriver, $data, $oldDriver, $request) {
            $course->update([
                'driver_id'   => $newDriver->id,
                'status'      => Course::STATUS_ASSIGNED,
                'assigned_at' => now(),
            ]);

            $newDriver->update(['availability_status' => 'busy']);

            if ($oldDriver) {
                $oldDriver->update(['availability_status' => 'available']);
            }

            CourseStatusHistory::create([
                'course_id'       => $course->id,
                'from_status'     => $course->getOriginal('status'),
                'to_status'       => Course::STATUS_ASSIGNED,
                'changed_by_id'   => $request->user()->id,
                'changed_by_type' => 'user',
                'reason'          => 'Réaffectation admin : ' . ($data['reason'] ?? 'sans motif'),
                'metadata'        => [
                    'old_driver_id' => $oldDriver?->id,
                    'new_driver_id' => $newDriver->id,
                ],
            ]);
        });

        // ===== Notifications (hors transaction : on ne notifie que si l'écriture a réussi) =====

        // 1. Nouveau livreur : il hérite de la course
        $notifier->sendToUser(
            $newDriver->user_id,
            'course.assigned_to_you',
            '📦 Course attribuée',
            "{$course->origin_quartier} → {$course->destination_quartier} · {$course->driver_earnings} FCFA",
            ['reference' => $course->reference],
            $course->id,
        );

        // 2. Ancien livreur : on l'informe du retrait (sauf si c'est le même)
        if ($oldDriver && $oldDriver->id !== $newDriver->id) {
            $notifier->sendToUser(
                $oldDriver->user_id,
                'course.removed',
                '↩️ Course retirée',
                "La course {$course->reference} vous a été retirée par l'administration.",
                ['reference' => $course->reference],
                $course->id,
            );
        }

        // 3. Marchand : changement de livreur + rappel du code de retrait
        $notifier->sendToUser(
            $course->sender_id,
            'course.driver_changed',
            '🔄 Changement de livreur',
            "{$newDriver->first_name} prend en charge votre course. 🔑 Code de retrait : {$course->pickup_code}",
            [
                'reference'         => $course->reference,
                'driver_first_name' => $newDriver->first_name,
                'pickup_code'       => $course->pickup_code,
            ],
            $course->id,
        );

        return response()->json([
            'message' => 'Course réaffectée.',
            'course'  => $course->fresh()->load('driver.user'),
        ]);
    }


    // ===== 4. MARQUER UNE COURSE EN LITIGE =====
    public function disputeCourse(Request $request, Course $course): JsonResponse
    {
        $data = $request->validate([
            'reason' => ['required', 'string', 'max:500'],
        ]);

        $previousStatus = $course->status;

        DB::transaction(function () use ($course, $data, $request, $previousStatus) {
            $course->update(['status' => Course::STATUS_DISPUTED]);

            CourseStatusHistory::create([
                'course_id'       => $course->id,
                'from_status'     => $previousStatus,
                'to_status'       => Course::STATUS_DISPUTED,
                'changed_by_id'   => $request->user()->id,
                'changed_by_type' => 'user',
                'reason'          => $data['reason'],
            ]);
        });

        return response()->json(['message' => 'Course en litige.', 'course' => $course->fresh()]);
    }

    // ===== 5. LISTE DES MARCHANDS À VALIDER =====
    public function pendingMarchants(): JsonResponse
    {
        return response()->json([
            'marchants' => Marchant::whereNull('validated_at')
                ->with('user')
                ->latest()
                ->get(),
        ]);
    }

    // ===== 5bis. LISTE COMPLÈTE DES MARCHANDS (filtrable + paginée) =====
    public function marchants(Request $request): JsonResponse
    {
        $query = Marchant::query()->with('user')->latest();

        // Filtre par statut d'abonnement (trial, active, suspended, churned)
        if ($status = $request->query('subscription_status')) {
            $statuses = is_array($status) ? $status : explode(',', $status);
            $query->whereIn('subscription_status', $statuses);
        }

        // Filtre par état de validation : ?validation=pending | validated
        if ($validation = $request->query('validation')) {
            if ($validation === 'pending') {
                $query->whereNull('validated_at');
            } elseif ($validation === 'validated') {
                $query->whereNotNull('validated_at');
            }
        }

        // Filtre par secteur d'activité
        if ($secteur = $request->query('secteur_activite')) {
            $query->where('secteur_activite', $secteur);
        }

        // Recherche texte : raison sociale, IFU/RCCM, email ou téléphone du user
        if ($q = $request->query('q')) {
            $query->where(function ($qq) use ($q) {
                $qq->where('raison_sociale', 'ILIKE', "%{$q}%")
                   ->orWhere('ifu_rccm', 'ILIKE', "%{$q}%")
                   ->orWhereHas('user', function ($uq) use ($q) {
                       $uq->where('email', 'ILIKE', "%{$q}%")
                          ->orWhere('phone', 'ILIKE', "%{$q}%");
                   });
            });
        }

        return response()->json(
            $query->paginate(min((int) $request->query('per_page', 20), 100))
        );
    }

    // ===== 5ter. FICHE DÉTAILLÉE D'UN MARCHAND =====
    public function showMarchant(Marchant $marchant): JsonResponse
    {
        $marchant->load(['user', 'validatedBy', 'commercialAssignedTo']);

        // Statistiques de courses (le marchand est l'expéditeur : sender_id = user_id)
        $coursesQuery = Course::where('sender_id', $marchant->user_id);

        $stats = [
            'courses_total'     => (clone $coursesQuery)->count(),
            'courses_delivered' => (clone $coursesQuery)->where('status', Course::STATUS_DELIVERED)->count(),
            'courses_in_progress' => (clone $coursesQuery)->whereNotIn('status', Course::TERMINAL_STATUSES)->count(),
            'courses_cancelled' => (clone $coursesQuery)->where('status', Course::STATUS_CANCELLED)->count(),
            'last_course_at'    => (clone $coursesQuery)->latest()->value('created_at'),
        ];

        return response()->json([
            'marchant' => $marchant,
            'stats'    => $stats,
        ]);
    }

    // ===== 6. VALIDER UN MARCHAND =====
    public function validateMarchant(Request $request, Marchant $marchant): JsonResponse
    {
        if ($marchant->validated_at) {
            return response()->json(['message' => 'Marchand déjà validé.'], 422);
        }

        $marchant->update([
            'validated_at'        => now(),
            'validated_by'        => $request->user()->id,
            'subscription_status' => 'active',
        ]);

        // Email de validation au marchand
        try {
            \Illuminate\Support\Facades\Mail::to($marchant->user->email)
                ->send(new \App\Mail\MarchantValidatedMail($marchant->user));
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('MarchantValidatedMail failed', [
                'err' => $e->getMessage(),
                'marchant_id' => $marchant->id,
            ]);
        }

        return response()->json([
            'message'  => 'Marchand validé.',
            'marchant' => $marchant->fresh()->load('user'),
        ]);
    }

    // ===== 7. LISTE LIVE DES LIVREURS =====
    public function drivers(Request $request): JsonResponse
    {
        $query = Driver::query()->with('user')->latest();

        if ($status = $request->query('availability_status')) {
            $query->where('availability_status', $status);
        }

        // On veut aussi le solde en attente : somme des earnings(pending) par livreur.
        // withSum() ajoute un attribut "earnings_sum_amount_fcfa" calculé en une seule requête SQL.
        $query->withSum(
            ['earnings as pending_balance_fcfa' => function ($q) {
                $q->where('status', \App\Models\DriverEarning::STATUS_PENDING);
            }],
            'amount_fcfa',
        );

        return response()->json([
            'drivers' => $query->get(),
        ]);
    }


    // ===== 6bis. SUSPENDRE UN MARCHAND (coupe l'accès) =====
public function suspendMarchant(Request $request, Marchant $marchant): JsonResponse
{
    $data = $request->validate([
        'reason' => ['required', 'string', 'max:500'],
    ]);

    if ($marchant->subscription_status === 'suspended') {
        return response()->json(['message' => 'Ce marchand est déjà suspendu.'], 422);
    }

    DB::transaction(function () use ($marchant, $data) {
        $marchant->update([
            'subscription_status' => 'suspended',
            'notes' => trim(($marchant->notes ? $marchant->notes . "\n" : '')
                . '[' . now()->format('Y-m-d') . '] Suspendu : ' . $data['reason']),
        ]);

        // Couper l'accès : désactive le compte ET révoque les tokens en cours
        $marchant->user->update(['is_active' => false]);
        $marchant->user->tokens()->delete();
    });

    return response()->json([
        'message'  => 'Marchand suspendu.',
        'marchant' => $marchant->fresh()->load('user'),
    ]);
}

    // ===== 6ter. RÉACTIVER UN MARCHAND =====
    public function reactivateMarchant(Marchant $marchant): JsonResponse
    {
        if ($marchant->subscription_status !== 'suspended') {
            return response()->json(['message' => 'Ce marchand n\'est pas suspendu.'], 422);
        }

        DB::transaction(function () use ($marchant) {
            $marchant->update(['subscription_status' => 'active']);
            $marchant->user->update(['is_active' => true]);
        });

        return response()->json([
            'message'  => 'Marchand réactivé.',
            'marchant' => $marchant->fresh()->load('user'),
        ]);
    }

    // ===== 6quater. REFUSER UNE INSCRIPTION (garde la trace) =====
    public function rejectMarchant(Request $request, Marchant $marchant): JsonResponse
    {
        $data = $request->validate([
            'reason' => ['required', 'string', 'max:500'],
        ]);

        if ($marchant->validated_at) {
            return response()->json([
                'message' => 'Ce marchand est déjà validé : utilisez plutôt la suspension.',
            ], 422);
        }
        if ($marchant->subscription_status === 'churned') {
            return response()->json(['message' => 'Ce marchand a déjà été refusé.'], 422);
        }

        DB::transaction(function () use ($marchant, $data) {
            $marchant->update([
                'subscription_status' => 'churned',
                'notes' => trim(($marchant->notes ? $marchant->notes . "\n" : '')
                    . '[' . now()->format('Y-m-d') . '] Refusé : ' . $data['reason']),
            ]);

            $marchant->user->update(['is_active' => false]);
            $marchant->user->tokens()->delete();
        });

        return response()->json([
            'message'  => 'Inscription refusée.',
            'marchant' => $marchant->fresh()->load('user'),
        ]);
    }

    // ===== 6quinquies. SUPPRIMER DÉFINITIVEMENT UN MARCHAND =====
    public function destroyMarchant(Marchant $marchant): JsonResponse
    {
        // Garde-fou : impossible de supprimer s'il a des courses
        // (FK restrictOnDelete sur courses.sender_id → la suppression échouerait en base).
        if (Course::where('sender_id', $marchant->user_id)->exists()) {
            return response()->json([
                'message' => 'Suppression impossible : ce marchand a des courses. Suspendez-le plutôt.',
            ], 422);
        }

        DB::transaction(function () use ($marchant) {
            $user = $marchant->user;
            $user->tokens()->delete();
            $user->delete(); // cascade : supprime le marchand ET ses adresses
        });

        return response()->json(['message' => 'Marchand supprimé.']);
    }

    // ===== 7bis. FICHE DÉTAILLÉE D'UN LIVREUR =====
    public function showDriver(Driver $driver): JsonResponse
    {
        $driver->load('user');

        // Le livreur est rattaché aux courses via driver_id
        $coursesQuery = Course::where('driver_id', $driver->id);

        $stats = [
            'courses_total'       => (clone $coursesQuery)->count(),
            'courses_delivered'   => (clone $coursesQuery)->where('status', Course::STATUS_DELIVERED)->count(),
            'courses_in_progress' => (clone $coursesQuery)->whereNotIn('status', Course::TERMINAL_STATUSES)->count(),
            'courses_failed'      => (clone $coursesQuery)->where('status', Course::STATUS_FAILED)->count(),
            'total_earnings'      => (float) (clone $coursesQuery)
                ->where('status', Course::STATUS_DELIVERED)->sum('driver_earnings'),
            'last_delivery_at'    => (clone $coursesQuery)
                ->where('status', Course::STATUS_DELIVERED)->latest('delivered_at')->value('delivered_at'),
        ];

        return response()->json([
            'driver' => $driver,
            'stats'  => $stats,
        ]);
    }

    // ===== 7ter. ACTIVER / DÉSACTIVER LE COMPTE D'UN LIVREUR =====
    public function toggleDriverActive(Driver $driver): JsonResponse
    {
        // On active si le compte n'est pas déjà 'active', sinon on désactive.
        $activate = $driver->activation_status !== 'active';

        // Garde-fou : on ne désactive pas un livreur qui a une course en cours.
        if (! $activate) {
            $onCourse = Course::where('driver_id', $driver->id)
                ->whereIn('status', [
                    Course::STATUS_ASSIGNED,
                    Course::STATUS_TO_PICKUP,
                    Course::STATUS_AT_PICKUP,
                    Course::STATUS_PICKED_UP,
                    Course::STATUS_AT_DROPOFF,
                ])
                ->exists();

            if ($onCourse) {
                return response()->json([
                    'message' => 'Impossible de désactiver : ce livreur a une course en cours. Réaffectez-la d\'abord.',
                ], 422);
            }
        }

        DB::transaction(function () use ($driver, $activate) {
            $driver->update([
                'activation_status'   => $activate ? 'active' : 'suspended',
                // À la désactivation, on le sort du service (plus "disponible")
                'availability_status' => $activate ? $driver->availability_status : 'offline',
            ]);

            $driver->user->update(['is_active' => $activate]);

            // Désactivation = coupure immédiate : on révoque ses tokens
            if (! $activate) {
                $driver->user->tokens()->delete();
            }
        });

        return response()->json([
            'message' => $activate ? 'Compte livreur activé.' : 'Compte livreur désactivé.',
            'driver'  => $driver->fresh()->load('user'),
        ]);
    }

    // ===== 7quater. VALIDER UN LIVREUR (premier passage pending → active) =====
    /**
     * Différent de toggleDriverActive : ce endpoint est dédié à la VALIDATION INITIALE
     * d'un driver fraîchement inscrit, après vérification de ses documents par l'admin.
     * Envoie un email "Compte activé" au driver.
     */
    public function validateDriver(Driver $driver): JsonResponse
    {
        if ($driver->activation_status !== 'pending') {
            return response()->json([
                'message' => 'Ce livreur n\'est pas en attente de validation (statut actuel: ' . $driver->activation_status . ').',
            ], 422);
        }

        DB::transaction(function () use ($driver) {
            $driver->update(['activation_status' => 'active']);
            $driver->user->update(['is_active' => true]);
        });

        // Email de validation au driver (queued)
        try {
            \Illuminate\Support\Facades\Mail::to($driver->user->email)
                ->send(new \App\Mail\DriverValidatedMail($driver->user));
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('DriverValidatedMail failed', [
                'err' => $e->getMessage(),
                'driver_id' => $driver->id,
            ]);
        }

        return response()->json([
            'message' => 'Livreur validé. Email envoyé.',
            'driver'  => $driver->fresh()->load('user'),
        ]);
    }

    // ===== 7quinquies. SERVIR UN DOCUMENT PRIVÉ D'UN LIVREUR =====
    /**
     * Sert un document stocké sur le disk 'local' (privé). Protégé par le middleware
     * admin:ops (les fichiers contiennent CNI/permis, donc accès strictement admin).
     *
     * @param  string  $type  photo | cni | driving_license
     */
    public function driverDocument(Driver $driver, string $type)
    {
        $column = match ($type) {
            'photo'           => 'photo_url',
            'cni'             => 'cni_url',
            'driving_license' => 'driving_license_url',
            default           => null,
        };

        if ($column === null) {
            abort(404, 'Type de document inconnu.');
        }

        $path = $driver->{$column};
        if (! $path || ! \Illuminate\Support\Facades\Storage::disk('local')->exists($path)) {
            abort(404, 'Document non trouvé.');
        }

        // response()->file() détecte le mime-type via finfo et stream le fichier inline.
        $absolute = \Illuminate\Support\Facades\Storage::disk('local')->path($path);
        return response()->file($absolute);
    }

    // ===== 8. LISTE DES INCIDENTS =====
    public function incidents(Request $request): JsonResponse
    {
        $query = CourseIncident::query()
            ->with([
                'course:id,reference,status',
                'reportedBy:id,name,type',
            ])
            ->latest();

        // Filtre par statut : open | resolved | cancelled
        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        // Filtre par type d'incident
        if ($type = $request->query('type')) {
            $query->where('type', $type);
        }

        return response()->json(
            $query->paginate(min((int) $request->query('per_page', 20), 100))
        );
    }

    // ===== 8bis. RÉSOUDRE UN INCIDENT =====
    public function resolveIncident(Request $request, CourseIncident $incident, NotificationService $notifier): JsonResponse
    {
        if ($incident->status !== 'open') {
            return response()->json(['message' => 'Cet incident est déjà clôturé.'], 422);
        }

        $data = $request->validate([
            'resolution_note' => ['required', 'string', 'max:1000'],
        ]);

        $incident->update([
            'status'          => 'resolved',
            'resolution_note' => $data['resolution_note'],
            'resolved_by'     => $request->user()->id,
            'resolved_at'     => now(),
        ]);

        $course = $incident->course;

        // 1. Le marchand (expéditeur de la course) : la boucle est bouclée
        if ($course) {
            $notifier->sendToUser(
                $course->sender_id,
                'incident.resolved',
                '✅ Incident résolu',
                "L'incident sur votre course {$course->reference} a été traité : {$data['resolution_note']}",
                ['reference' => $course->reference],
                $course->id,
            );
        }

        // 2. Le livreur qui a signalé : accusé de traitement
        if ($incident->reported_by) {
            $notifier->sendToUser(
                $incident->reported_by,
                'incident.resolved',
                '✅ Ton signalement a été traité',
                ($course ? "Course {$course->reference} : " : '') . $data['resolution_note'],
                $course ? ['reference' => $course->reference] : [],
                $course?->id,
            );
        }


        return response()->json([
            'message'  => 'Incident résolu.',
            'incident' => $incident->fresh()->load([
                'course:id,reference',
                'reportedBy:id,name',
                'resolvedBy:id,name',
            ]),
        ]);
    }

    // ===== PAYOUTS LIVREURS =====

    /**
     * Liste tous les payouts toutes périodes confondues, filtrable par status et livreur.
     * Permet à l'admin d'avoir une vue d'ensemble pour gérer les versements à effectuer.
     */
    public function listAllPayouts(Request $request): JsonResponse
    {
        $query = \App\Models\DriverPayout::query()
            ->with(['driver:id,first_name,last_name,user_id', 'driver.user:id,name,phone'])
            ->latest('created_at');

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        if ($driverId = $request->query('driver_id')) {
            $query->where('driver_id', $driverId);
        }

        $perPage = min((int) $request->query('per_page', 25), 100);

        return response()->json($query->paginate($perPage));
    }

    public function driverEarnings(Driver $driver): JsonResponse
    {
        return response()->json([
            'driver' => $driver->only(['id', 'first_name', 'last_name']),
            'pending_balance_fcfa' => $driver->pendingBalance(),
            'total_paid_out_fcfa'  => $driver->totalPaidOut(),
            'earnings' => $driver->earnings()
                ->with('course:id,reference,delivered_at')
                ->latest('credited_at')
                ->paginate(30),
            'payouts' => $driver->payouts()
                ->latest('created_at')
                ->limit(20)
                ->get(),
        ]);
    }


    public function generateDriverPayout(
        Request $request,
        Driver $driver,
        \App\Services\DriverPayoutService $payoutService,
    ): JsonResponse {
        $data = $request->validate([
            'method'      => ['nullable', Rule::in(['mobile_money', 'bank_transfer', 'cash'])],
            'destination' => ['nullable', 'string', 'max:100'],
        ]);

        $payout = $payoutService->generatePayout(
            driver: $driver,
            method: $data['method'] ?? 'mobile_money',
            destination: $data['destination'] ?? null,
            triggeredByUserId: $request->user()->id,
        );

        if (! $payout) {
            return response()->json(['message' => 'Aucun gain en attente pour ce livreur.'], 422);
        }

        return response()->json([
            'message' => 'Versement créé. À effectuer manuellement puis marquer comme payé.',
            'payout'  => $payout,
        ], 201);
    }

    public function markPayoutPaid(
        \App\Models\DriverPayout $payout,
        \App\Services\DriverPayoutService $payoutService,
    ): JsonResponse {
        if ($payout->status === \App\Models\DriverPayout::STATUS_PAID) {
            return response()->json(['message' => 'Déjà payé.'], 422);
        }
        $payout = $payoutService->markPayoutAsPaid($payout);
        return response()->json(['message' => 'Versement confirmé.', 'payout' => $payout]);
    }

    // ===== APP SETTINGS (super-admin uniquement) =====

    public function listSettings(): JsonResponse
    {
        $settings = \App\Models\AppSetting::orderBy('group')->orderBy('key')->get()
            ->map(fn($s) => [
                'key'         => $s->key,
                'value'       => \App\Models\AppSetting::get($s->key), // valeur déjà castée
                'type'        => $s->type,
                'label'       => $s->label,
                'description' => $s->description,
                'group'       => $s->group,
                'updated_at'  => $s->updated_at,
                'updated_by'  => $s->updated_by ? [
                    'id'   => $s->updatedBy?->id,
                    'name' => $s->updatedBy?->name,
                ] : null,
            ])
            ->groupBy('group');

        return response()->json(['settings' => $settings]);
    }

    public function updateSetting(Request $request, string $key): JsonResponse
    {
        $setting = \App\Models\AppSetting::where('key', $key)->firstOrFail();

        $rules = match ($setting->type) {
            'number'  => ['value' => ['required', 'numeric', 'min:0']],
            'boolean' => ['value' => ['required', 'boolean']],
            'json'    => ['value' => ['required', 'array']],
            default   => ['value' => ['required', 'string', 'max:1000']],
        };
        $data = $request->validate($rules);

        \App\Models\AppSetting::set($key, $data['value'], $request->user()->id);

        return response()->json([
            'message' => 'Paramètre mis à jour.',
            'key'     => $key,
            'value'   => \App\Models\AppSetting::get($key),
        ]);
    }

    // ===== PLANS D'ABONNEMENT MARCHANDS (super-admin uniquement) =====

    public function listPlans(): JsonResponse
    {
        return response()->json([
            'plans' => \App\Models\SubscriptionPlan::orderBy('sort_order')->get(),
        ]);
    }

    public function updatePlan(Request $request, \App\Models\SubscriptionPlan $plan): JsonResponse
    {
        $data = $request->validate([
            'monthly_price_fcfa' => ['required', 'integer', 'min:0'],
            'included_courses'   => ['required', 'integer', 'min:1'],
            'is_active'          => ['nullable', 'boolean'],
        ]);

        $plan->update($data);

        return response()->json([
            'message' => 'Plan mis à jour.',
            'plan'    => $plan->fresh(),
        ]);
    }

    // ===== 10. LISTE DES PARTICULIERS =====
    /**
     * Liste paginée des particuliers avec recherche (nom/email) et filtre statut abo.
     * Réservé au middleware admin:commercial (super inclus).
     */
    public function individuals(Request $request): JsonResponse
    {
        $perPage = min((int) $request->query('per_page', 20), 100);
        $query = Individual::with('user')->latest();

        // Filtre par statut d'abo : 'free' (pas d'abo), 'active', 'expired', 'suspended', 'churned'
        if ($status = $request->query('subscription_status')) {
            if ($status === 'free') {
                $query->whereNull('subscription_status');
            } else {
                $query->where('subscription_status', $status);
            }
        }

        // Recherche libre sur nom + email + téléphone
        if ($q = trim((string) $request->query('q', ''))) {
            $query->where(function ($qq) use ($q) {
                $qq->where('first_name', 'ilike', "%{$q}%")
                   ->orWhere('last_name', 'ilike', "%{$q}%")
                   ->orWhereHas('user', function ($uq) use ($q) {
                       $uq->where('email', 'ilike', "%{$q}%")
                          ->orWhere('phone', 'ilike', "%{$q}%");
                   });
            });
        }

        return response()->json($query->paginate($perPage));
    }

    // ===== 11. FICHE DÉTAILLÉE D'UN PARTICULIER =====
    public function showIndividual(Individual $individual): JsonResponse
    {
        $individual->load('user');

        // Stats courses (le particulier est l'expéditeur via users.id = courses.sender_id)
        $coursesQuery = Course::where('sender_id', $individual->user_id);

        $stats = [
            'courses_total'       => (clone $coursesQuery)->count(),
            'courses_delivered'   => (clone $coursesQuery)->where('status', Course::STATUS_DELIVERED)->count(),
            'courses_in_progress' => (clone $coursesQuery)->whereNotIn('status', Course::TERMINAL_STATUSES)->count(),
            'courses_cancelled'   => (clone $coursesQuery)->whereIn('status', [Course::STATUS_CANCELLED, Course::STATUS_FAILED])->count(),
            'last_course_at'      => (clone $coursesQuery)->latest('created_at')->value('created_at'),
        ];

        // Paiements one-shot (delivery_fee = paiement à la course au-delà du quota)
        $oneShotPayments = Payment::where('user_id', $individual->user_id)
            ->where('type', Payment::TYPE_DELIVERY_FEE)
            ->latest('created_at')
            ->limit(50)
            ->get(['id', 'amount_fcfa', 'status', 'provider', 'paid_at', 'created_at']);

        $oneShotSummary = [
            'total_paid_fcfa' => (int) Payment::where('user_id', $individual->user_id)
                ->where('type', Payment::TYPE_DELIVERY_FEE)
                ->where('status', Payment::STATUS_PAID)
                ->sum('amount_fcfa'),
            'count_paid'      => Payment::where('user_id', $individual->user_id)
                ->where('type', Payment::TYPE_DELIVERY_FEE)
                ->where('status', Payment::STATUS_PAID)
                ->count(),
        ];

        return response()->json([
            'individual'         => $individual,
            'stats'              => $stats,
            'one_shot_payments'  => $oneShotPayments,
            'one_shot_summary'   => $oneShotSummary,
        ]);
    }

    // ===== 12. SUSPENDRE UN PARTICULIER =====
    public function suspendIndividual(Request $request, Individual $individual): JsonResponse
    {
        $data = $request->validate([
            'reason' => ['required', 'string', 'max:500'],
        ]);

        if ($individual->subscription_status === 'suspended' || ! $individual->user->is_active) {
            return response()->json(['message' => 'Ce particulier est déjà suspendu.'], 422);
        }

        DB::transaction(function () use ($individual, $data) {
            $individual->update(['subscription_status' => 'suspended']);
            $individual->user->update(['is_active' => false]);
            $individual->user->tokens()->delete(); // coupure immédiate
            // Log de la raison côté metadata si besoin plus tard (table individuals n'a pas de champ 'notes')
            \Illuminate\Support\Facades\Log::info('Individual suspended', [
                'individual_id' => $individual->id,
                'reason'        => $data['reason'],
            ]);
        });

        return response()->json([
            'message'    => 'Particulier suspendu.',
            'individual' => $individual->fresh()->load('user'),
        ]);
    }

    // ===== 13. RÉACTIVER UN PARTICULIER =====
    public function reactivateIndividual(Individual $individual): JsonResponse
    {
        if ($individual->user->is_active && $individual->subscription_status !== 'suspended') {
            return response()->json(['message' => 'Ce particulier n\'est pas suspendu.'], 422);
        }

        DB::transaction(function () use ($individual) {
            // Si l'abo était suspendu on le repasse à actif s'il avait un plan, sinon null (quota gratuit)
            $newStatus = $individual->subscription_plan ? 'active' : null;
            $individual->update(['subscription_status' => $newStatus]);
            $individual->user->update(['is_active' => true]);
        });

        return response()->json([
            'message'    => 'Particulier réactivé.',
            'individual' => $individual->fresh()->load('user'),
        ]);
    }
}
