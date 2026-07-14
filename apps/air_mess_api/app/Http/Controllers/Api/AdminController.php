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
use App\Services\DriverWalletService;
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
            'new_driver_id'                => ['required', 'exists:drivers,id'],
            'reason'                       => ['nullable', 'string', 'max:500'],
            // Cas 5 — Le colis est déjà entre les mains du driver initial
            // (panne/accident post-pickup). Le nouveau driver ira le récupérer
            // auprès du driver précédent, pas au marchand.
            'pickup_from_previous_driver'  => ['nullable', 'boolean'],
            'transfer_lat'                 => ['nullable', 'numeric', 'between:-90,90'],
            'transfer_lng'                 => ['nullable', 'numeric', 'between:-180,180'],
        ]);

        if ($course->isTerminal()) {
            return response()->json(['message' => 'Course déjà clôturée.'], 422);
        }

        $isPostPickup = in_array($course->status, [Course::STATUS_PICKED_UP, Course::STATUS_AT_DROPOFF], true);
        $wantsTransfer = (bool) ($data['pickup_from_previous_driver'] ?? false);

        // Chemin classique : réassignation avant pickup → statut ASSIGNED
        // Chemin transfert : réassignation après pickup → statut PICKED_UP conservé
        //                    + flag transfer + coords figées du driver initial
        if ($isPostPickup && ! $wantsTransfer) {
            return response()->json([
                'message' => 'Impossible de réaffecter : le colis est déjà entre les mains du livreur. '
                           . 'Cochez "colis chez le driver précédent" pour transférer physiquement, '
                           . 'ou marquez la course en litige.',
            ], 422);
        }

        $newDriver = Driver::findOrFail($data['new_driver_id']);

        if (! $newDriver->isAvailable()) {
            return response()->json([
                'message' => 'Ce livreur n\'est pas disponible (hors-ligne, occupé ou compte inactif). Choisissez un livreur disponible.',
            ], 422);
        }
        $oldDriver = $course->driver_id ? Driver::find($course->driver_id) : null;

        // Coords de transfert : celles fournies (position au signalement) ou
        // fallback sur la current position du driver initial. Sans coord fiable
        // en chemin transfert, on refuse — pas de rendez-vous à l'aveugle.
        $transferLat = $data['transfer_lat'] ?? $oldDriver?->current_lat;
        $transferLng = $data['transfer_lng'] ?? $oldDriver?->current_lng;
        if ($wantsTransfer && (! $transferLat || ! $transferLng)) {
            return response()->json([
                'message' => 'Coordonnées de transfert manquantes : le driver initial n\'a pas de position récente. '
                           . 'Fournissez transfer_lat / transfer_lng manuellement.',
            ], 422);
        }

        DB::transaction(function () use ($course, $newDriver, $data, $oldDriver, $request, $wantsTransfer, $transferLat, $transferLng) {
            $updates = [
                'driver_id'   => $newDriver->id,
                'assigned_at' => now(),
            ];

            if ($wantsTransfer) {
                // Le colis reste "picked_up" au sens système : pas de re-pickup
                // au marchand. Le nouveau driver le récupère auprès du précédent,
                // et son écran l'oriente vers transfer_lat/lng.
                $updates['previous_driver_id']          = $oldDriver?->id;
                $updates['pickup_from_previous_driver'] = true;
                $updates['transfer_lat']                = $transferLat;
                $updates['transfer_lng']                = $transferLng;
                // On ne touche PAS au statut : la course reste picked_up (ou at_dropoff).
            } else {
                // Réassignation classique pré-pickup : la course repart à zéro côté driver.
                $updates['status'] = Course::STATUS_ASSIGNED;
            }

            $course->update($updates);

            $newDriver->update(['availability_status' => 'busy']);

            // En transfert, le driver initial garde le colis quelques minutes de plus
            // (le temps du rendez-vous), mais côté système on le libère : il pourra
            // accepter d'autres courses une fois le transfert fait.
            if ($oldDriver) {
                $oldDriver->update(['availability_status' => 'available']);
            }

            CourseStatusHistory::create([
                'course_id'       => $course->id,
                'from_status'     => $course->getOriginal('status'),
                'to_status'       => $wantsTransfer ? $course->status : Course::STATUS_ASSIGNED,
                'changed_by_id'   => $request->user()->id,
                'changed_by_type' => 'user',
                'reason'          => ($wantsTransfer ? 'Transfert physique post-pickup : ' : 'Réaffectation admin : ')
                                     . ($data['reason'] ?? 'sans motif'),
                'metadata'        => [
                    'old_driver_id'                => $oldDriver?->id,
                    'new_driver_id'                => $newDriver->id,
                    'pickup_from_previous_driver'  => $wantsTransfer,
                    'transfer_lat'                 => $wantsTransfer ? $transferLat : null,
                    'transfer_lng'                 => $wantsTransfer ? $transferLng : null,
                ],
            ]);
        });

        // ===== Notifications (hors transaction : on ne notifie que si l'écriture a réussi) =====

        // 1. Nouveau livreur : il hérite de la course
        if ($wantsTransfer) {
            $notifier->sendToUser(
                $newDriver->user_id,
                'course.assigned_transfer',
                'Course à récupérer (transfert)',
                "Le colis est chez un autre livreur. Rendez-vous à sa position pour le récupérer. Course {$course->reference}.",
                [
                    'reference'                   => $course->reference,
                    'pickup_from_previous_driver' => true,
                    'transfer_lat'                => $transferLat,
                    'transfer_lng'                => $transferLng,
                ],
                $course->id,
            );
        } else {
            $notifier->sendToUser(
                $newDriver->user_id,
                'course.assigned_to_you',
                'Course attribuée',
                "{$course->origin_quartier} → {$course->destination_quartier} · {$course->driver_earnings} FCFA",
                ['reference' => $course->reference],
                $course->id,
            );
        }

        // 2. Ancien livreur : on l'informe du retrait (ou du transfert imminent)
        if ($oldDriver && $oldDriver->id !== $newDriver->id) {
            if ($wantsTransfer) {
                $notifier->sendToUser(
                    $oldDriver->user_id,
                    'course.transfer_incoming',
                    'Transfert du colis',
                    "Restez sur place, {$newDriver->first_name} vient chercher le colis de la course {$course->reference}.",
                    [
                        'reference'  => $course->reference,
                        'new_driver' => $newDriver->first_name,
                    ],
                    $course->id,
                );
            } else {
                $notifier->sendToUser(
                    $oldDriver->user_id,
                    'course.removed',
                    'Course retirée',
                    "La course {$course->reference} vous a été retirée par l'administration.",
                    ['reference' => $course->reference],
                    $course->id,
                );
            }
        }

        // 3. Marchand : changement de livreur + rappel du code de retrait uniquement
        //    en chemin classique (en transfert, le colis a déjà quitté ses mains).
        if (! $wantsTransfer) {
            $notifier->sendToUser(
                $course->sender_id,
                'course.driver_changed',
                'Changement de livreur',
                "{$newDriver->first_name} prend en charge votre course. Code de retrait : {$course->pickup_code}",
                [
                    'reference'         => $course->reference,
                    'driver_first_name' => $newDriver->first_name,
                    'pickup_code'       => $course->pickup_code,
                ],
                $course->id,
            );
        } else {
            $notifier->sendToUser(
                $course->sender_id,
                'course.driver_changed',
                'Changement de livreur en cours',
                "Le livreur initial de la course {$course->reference} a rencontré un problème. "
                . "{$newDriver->first_name} prend le relais.",
                ['reference' => $course->reference],
                $course->id,
            );
        }

        return response()->json([
            'message' => $wantsTransfer ? 'Course transférée physiquement.' : 'Course réaffectée.',
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

    // ===== Cas 7 — Vol livreur =====

    /**
     * Marque une course comme fraude et bannit le driver.
     *
     * Actions atomiques (rollback si un maillon casse) :
     *   1. Release du hold marchand si paid_from_wallet (le marchand ne paie pas la course)
     *   2. Crédit marchand = valeur déclarée + collection_amount (si has_collection)
     *      via wallet_adjustment reason=incident_refund
     *   3. Saisie caution driver via wallet_adjustment reason=caution_seizure,
     *      montant capé sur le solde disponible (Cas 2 réutilisé)
     *   4. Driver banni : activation_status = 'banned' (irréversible sans intervention super-admin)
     *   5. Course : is_fraud=true, status=failed, fraud_shortfall_fcfa = manque non couvert
     *   6. Création d'un CourseIncident type driver_theft résolu immédiatement
     *
     * Le manque à combler (shortfall) est stocké dans fraud_shortfall_fcfa pour
     * la réconciliation comptable. C'est le passif que Air Mess doit soit
     * absorber, soit récupérer par voie juridique (plainte police, recours civil).
     *
     * Endpoint réservé au super-admin (défense en profondeur : bannissement + saisie
     * = décision lourde, jamais déléguée à un ops).
     */
    public function markFraud(
        Request $request,
        Course $course,
        \App\Services\WalletAdjustmentService $adjustments,
        \App\Services\UserWalletService $userWallet,
        NotificationService $notifier,
    ): JsonResponse {
        $data = $request->validate([
            'note' => ['required', 'string', 'min:20', 'max:2000'],
        ]);

        if ($course->is_fraud) {
            return response()->json(['message' => 'Course déjà marquée comme fraude.'], 422);
        }
        if (! $course->driver) {
            return response()->json(['message' => 'Aucun livreur assigné à cette course.'], 422);
        }
        if ($course->status === Course::STATUS_DELIVERED) {
            return response()->json([
                'message' => 'La course est marquée livrée. Vérifiez d\'abord avec le client (fraude sur livraison prétendue) avant de bannir le driver.',
            ], 422);
        }

        $admin = $request->user()->admin;

        // Calcul du montant dû au marchand.
        // Colis volé : le marchand perd la valeur déclarée. Sans valeur déclarée
        // on ne peut pas indemniser (l'ops devra créer un ajustement manuel après enquête).
        $packageValue    = (int) ($course->package_declared_value ?? 0);
        $collectionOwed  = $course->has_collection ? (int) ($course->collection_amount ?? 0) : 0;
        $refundOwed      = $packageValue + $collectionOwed;

        try {
            $result = DB::transaction(function () use (
                $course, $data, $admin, $adjustments, $userWallet, $refundOwed, $packageValue, $collectionOwed
            ) {
                // 1. Release du hold marchand si posé (le marchand ne paie pas la course foirée).
                if ($course->paid_from_wallet && $course->sender) {
                    $userWallet->releaseReservation(
                        $course->sender,
                        $course,
                        (int) $course->delivery_fee,
                    );
                }

                // 2. Crédit marchand (valeur colis + encaissement).
                //    Ne s'applique que si sender existe et qu'il y a quelque chose à créditer.
                $marchandAdj = null;
                if ($course->sender && $refundOwed > 0) {
                    $marchandAdj = $adjustments->applyToUser(
                        user:       $course->sender,
                        amount:     $refundOwed,
                        reasonCode: \App\Models\WalletAdjustment::REASON_INCIDENT_REFUND,
                        course:     $course,
                        incident:   null,
                        adminId:    $admin->id,
                        notes:      '[Fraude driver] Remboursement colis + encaissement. Valeur colis: '
                                    . number_format($packageValue, 0, ',', ' ') . ' FCFA'
                                    . ($collectionOwed > 0 ? ', encaissement: ' . number_format($collectionOwed, 0, ',', ' ') . ' FCFA' : ''),
                    );
                }

                // 3. Saisie caution driver — auto-cap sur le solde disponible.
                //    Réutilise la mécanique Cas 2 mais on cible directement toute la caution.
                $driverWallet = \App\Models\DriverWallet::where('driver_id', $course->driver->id)
                    ->lockForUpdate()
                    ->first();

                $driverAdj    = null;
                $seizedAmount = 0;
                if ($driverWallet && $driverWallet->balance > 0) {
                    $seizedAmount = (int) $driverWallet->balance;
                    $driverAdj = $adjustments->applyToDriver(
                        driver:     $course->driver,
                        amount:     -$seizedAmount,
                        reasonCode: \App\Models\WalletAdjustment::REASON_CAUTION_SEIZURE,
                        course:     $course,
                        incident:   null,
                        adminId:    $admin->id,
                        notes:      '[Fraude driver] Saisie intégrale de la caution.',
                    );
                }

                // 4. Bannissement driver — plus fort que suspended (temporaire).
                $course->driver->update([
                    'activation_status'   => 'banned',
                    'availability_status' => 'offline',
                ]);

                // 5. Course : marquée fraude + failed + shortfall.
                $previousStatus = $course->status;
                $shortfall      = max(0, $refundOwed - $seizedAmount);
                $course->update([
                    'status'                => Course::STATUS_FAILED,
                    'is_fraud'              => true,
                    'fraud_shortfall_fcfa'  => $shortfall > 0 ? $shortfall : null,
                    'cancelled_at'          => now(),
                ]);

                CourseStatusHistory::create([
                    'course_id'       => $course->id,
                    'from_status'     => $previousStatus,
                    'to_status'       => Course::STATUS_FAILED,
                    'changed_by_id'   => $admin->user_id ?? null,
                    'changed_by_type' => 'admin',
                    'reason'          => 'mark_fraud: ' . $data['note'],
                    'metadata'        => [
                        'refund_owed'   => $refundOwed,
                        'seized_amount' => $seizedAmount,
                        'shortfall'     => $shortfall,
                        'driver_id'     => $course->driver->id,
                    ],
                ]);

                // 6. Incident driver_theft résolu immédiatement (trace).
                $incident = \App\Models\CourseIncident::create([
                    'course_id'       => $course->id,
                    'reported_by'     => $admin->user_id ?? null,
                    'reporter_type'   => 'admin',
                    'type'            => \App\Models\CourseIncident::TYPE_DRIVER_THEFT,
                    'description'     => $data['note'],
                    'status'          => 'resolved',
                    'resolution_note' => 'Saisie caution + bannissement driver + refund marchand appliqués via mark-fraud.',
                    'resolved_by'     => $admin->user_id ?? null,
                    'resolved_at'     => now(),
                ]);

                return [
                    'marchandAdj'  => $marchandAdj,
                    'driverAdj'    => $driverAdj,
                    'seizedAmount' => $seizedAmount,
                    'shortfall'    => $shortfall,
                    'incident'     => $incident,
                ];
            });
        } catch (\DomainException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        // Notifs
        if ($course->sender_id && $refundOwed > 0) {
            $notifier->sendToUser(
                $course->sender_id,
                'incident.fraud_refund',
                'Fraude livreur — remboursement',
                "Course {$course->reference} : votre wallet a été crédité de "
                . number_format($refundOwed, 0, ',', ' ') . ' FCFA suite à un signalement de fraude livreur.',
                ['reference' => $course->reference, 'amount' => $refundOwed],
                $course->id,
            );
        }
        if ($course->driver && $course->driver->user_id) {
            $notifier->sendToUser(
                $course->driver->user_id,
                'driver.banned',
                'Compte banni',
                'Votre compte a été banni suite à un signalement de fraude. Contactez le support.',
                ['reference' => $course->reference],
                $course->id,
            );
        }

        return response()->json([
            'message' => 'Course marquée comme fraude. Driver banni, caution saisie, marchand remboursé.',
            'course'  => $course->fresh(),
            'summary' => [
                'refund_owed'   => $refundOwed,
                'package_value' => $packageValue,
                'collection'    => $collectionOwed,
                'seized_amount' => $result['seizedAmount'],
                'shortfall'     => $result['shortfall'],
            ],
            'incident' => $result['incident'],
        ]);
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
        $marchant->load(['user', 'user.wallet', 'validatedBy', 'commercialAssignedTo']);

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
        $driver->load(['user', 'wallet']);

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

        // Refus de courses (rolling 30j) — cf. project_wallet_driver_todo #7
        $declineCutoff = now()->subDays(30);
        $declinesByReason = \DB::table('course_decline_records')
            ->where('driver_id', $driver->id)
            ->where('created_at', '>=', $declineCutoff)
            ->selectRaw('reason, COUNT(*) as n')
            ->groupBy('reason')
            ->pluck('n', 'reason');
        $recentDeclines = \App\Models\CourseDeclineRecord::with('course:id,reference,origin_quartier,destination_quartier')
            ->where('driver_id', $driver->id)
            ->where('created_at', '>=', $declineCutoff)
            ->latest('created_at')
            ->limit(10)
            ->get();

        return response()->json([
            'driver'   => $driver,
            'stats'    => $stats,
            'declines' => [
                'total_30d'   => $declinesByReason->sum(),
                'by_reason'   => $declinesByReason,
                'recent'      => $recentDeclines,
            ],
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
    public function validateDriver(Driver $driver, \App\Services\BrevoSmsService $sms): JsonResponse
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

        // Email de validation au driver (queued) — envoyé quel que soit le canal préféré.
        try {
            \Illuminate\Support\Facades\Mail::to($driver->user->email)
                ->send(new \App\Mail\DriverValidatedMail($driver->user));
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('DriverValidatedMail failed', [
                'err' => $e->getMessage(),
                'driver_id' => $driver->id,
            ]);
        }

        // Canal préféré choisi à la candidature. Branche 'sms' actuellement
        // DORMANTE (option grisée "bientôt disponible" côté front) — le code
        // reste prêt pour l'activation. 'whatsapp' = contact manuel par l'ops
        // (lien wa.me affiché sur la fiche driver admin). Si un flux "refus de
        // candidature" est créé plus tard, réutiliser la même logique.
        if ($driver->preferred_response_channel === 'sms' && $driver->user->phone) {
            $sms->send(
                \App\Support\Phone::normalize($driver->user->phone),
                'Air Mess : votre compte livreur est activé ! Connectez-vous sur l\'app Air Mess Livreur.',
            );
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

    // ===== 8ter. ARBITRER UN INCIDENT AVEC AJUSTEMENTS WALLET =====
    /**
     * Panneau ops complet : résout l'incident ET applique les ajustements wallet
     * (refund marchand + débit driver) dans une seule transaction atomique.
     *
     * Payload attendu (chaque bloc optionnel — l'ops peut refund seul, débit seul, ou les 2) :
     *   - reason_code_marchand : REASON_INCIDENT_REFUND | REASON_NO_SHOW_REFUND | REASON_RETURN_SHIPPING_FEE | REASON_MANUAL_CREDIT | REASON_MANUAL_DEBIT
     *   - amount_marchand      : montant signé (positif = crédit marchand, négatif = débit)
     *   - reason_code_driver   : REASON_INCIDENT_DEBIT | REASON_CAUTION_SEIZURE | REASON_MANUAL_CREDIT | REASON_MANUAL_DEBIT
     *   - amount_driver        : montant signé (positif = crédit driver rare, négatif = débit)
     *   - resolution_note      : texte libre, obligatoire (raison humaine pour l'audit + notif)
     *
     * En sortie : incident résolu + 0..2 wallet_adjustments créés + notifs.
     * Si un des adjustments échoue, TOUT est rollback (aucun ajustement partiel).
     */
    public function arbitrateIncident(
        Request $request,
        CourseIncident $incident,
        \App\Services\WalletAdjustmentService $adjustments,
        NotificationService $notifier,
    ): JsonResponse {
        if ($incident->status !== 'open') {
            return response()->json(['message' => 'Cet incident est déjà clôturé.'], 422);
        }

        $data = $request->validate([
            'resolution_note'        => ['required', 'string', 'max:1000'],
            'reason_code_marchand'   => ['nullable', 'string', 'max:40'],
            'amount_marchand'        => ['nullable', 'integer'],
            'reason_code_driver'     => ['nullable', 'string', 'max:40'],
            'amount_driver'          => ['nullable', 'integer'],
        ]);

        // Cohérence : si un reason_code est fourni, l'amount correspondant doit
        // l'être aussi (et non nul). Empêche les payloads incomplets.
        if (($data['reason_code_marchand'] ?? null) !== null && ($data['amount_marchand'] ?? 0) === 0) {
            return response()->json(['message' => 'amount_marchand est requis et non nul quand reason_code_marchand est fourni.'], 422);
        }
        if (($data['reason_code_driver'] ?? null) !== null && ($data['amount_driver'] ?? 0) === 0) {
            return response()->json(['message' => 'amount_driver est requis et non nul quand reason_code_driver est fourni.'], 422);
        }

        $course = $incident->course()->with('driver', 'sender')->first();
        if (! $course) {
            return response()->json(['message' => 'Course introuvable pour cet incident.'], 422);
        }

        $admin = $request->user()->admin;

        // Reasons pour lesquelles on autorise le débit auto-capé + auto-suspension
        // si la caution driver ne couvre pas le montant "juste" (Cas 2 & 7).
        $cappableReasons = [
            \App\Models\WalletAdjustment::REASON_INCIDENT_DEBIT,
            \App\Models\WalletAdjustment::REASON_CAUTION_SEIZURE,
        ];

        try {
            [$marchandAdj, $driverAdj, $cautionShort] = DB::transaction(function () use (
                $data, $incident, $course, $admin, $adjustments, $cappableReasons
            ) {
                $marchandAdj  = null;
                $driverAdj    = null;
                $cautionShort = false;

                // Ajustement marchand (côté user_wallet) — le sender de la course.
                if (($data['reason_code_marchand'] ?? null) !== null && $course->sender) {
                    $marchandAdj = $adjustments->applyToUser(
                        user:       $course->sender,
                        amount:     (int) $data['amount_marchand'],
                        reasonCode: $data['reason_code_marchand'],
                        course:     $course,
                        incident:   $incident,
                        adminId:    $admin->id,
                        notes:      $data['resolution_note'],
                    );
                }

                // Ajustement driver (côté wallet caution) — le driver assigné.
                if (($data['reason_code_driver'] ?? null) !== null && $course->driver) {
                    $requestedAmount = (int) $data['amount_driver'];
                    $isDebit         = $requestedAmount < 0;
                    $isCappable      = in_array($data['reason_code_driver'], $cappableReasons, true);

                    // Cas 2 & 7 : si la caution ne couvre pas le débit "juste", on cape
                    // au disponible ET on suspend le driver. Le reste des reasons garde
                    // la contrainte stricte (throw si insuffisant).
                    if ($isDebit && $isCappable) {
                        $wallet = \App\Models\DriverWallet::where('driver_id', $course->driver->id)
                            ->lockForUpdate()
                            ->firstOrFail();

                        $needed = abs($requestedAmount);
                        if ($needed > (int) $wallet->balance) {
                            $capped = -1 * (int) $wallet->balance;
                            if ($capped === 0) {
                                // Rien à débiter mais on veut quand même tracer l'insuffisance.
                                // On saute la création de l'adjustment (amount=0 refusé par CHECK)
                                // et on suspend directement.
                                $course->driver->update(['activation_status' => 'suspended']);
                                $cautionShort = true;
                                return [$marchandAdj, null, $cautionShort];
                            }

                            $driverAdj = $adjustments->applyToDriver(
                                driver:     $course->driver,
                                amount:     $capped,
                                reasonCode: $data['reason_code_driver'],
                                course:     $course,
                                incident:   $incident,
                                adminId:    $admin->id,
                                notes:      "[Caution insuffisante — montant capé sur solde disponible] " . $data['resolution_note'],
                            );
                            $course->driver->update(['activation_status' => 'suspended']);
                            $cautionShort = true;
                        } else {
                            $driverAdj = $adjustments->applyToDriver(
                                driver:     $course->driver,
                                amount:     $requestedAmount,
                                reasonCode: $data['reason_code_driver'],
                                course:     $course,
                                incident:   $incident,
                                adminId:    $admin->id,
                                notes:      $data['resolution_note'],
                            );
                        }
                    } else {
                        // Chemin classique : contrainte stricte, throw si insuffisant.
                        $driverAdj = $adjustments->applyToDriver(
                            driver:     $course->driver,
                            amount:     $requestedAmount,
                            reasonCode: $data['reason_code_driver'],
                            course:     $course,
                            incident:   $incident,
                            adminId:    $admin->id,
                            notes:      $data['resolution_note'],
                        );
                    }
                }

                // Résolution de l'incident (dans la même transaction — soit tout passe, soit rien).
                $incident->update([
                    'status'          => 'resolved',
                    'resolution_note' => $data['resolution_note'],
                    'resolved_by'     => $admin->user_id ?? null,
                    'resolved_at'     => now(),
                ]);

                return [$marchandAdj, $driverAdj, $cautionShort];
            });
        } catch (\DomainException $e) {
            // Solde insuffisant côté user (débit qui mangerait les holds courses)
            // ou côté driver sur un motif non-cappable (manual_debit).
            // L'incident reste OPEN — l'ops peut ajuster son arbitrage.
            return response()->json(['message' => $e->getMessage()], 422);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        // Notifs : marchand + livreur + reporter (déduplique si reporter == marchand).
        $notifiedUserIds = [];

        if ($course->sender_id) {
            $notifier->sendToUser(
                $course->sender_id,
                'incident.arbitrated',
                '⚖️ Incident arbitré',
                $this->buildMarchandNotification($course, $marchandAdj, $data['resolution_note']),
                ['reference' => $course->reference],
                $course->id,
            );
            $notifiedUserIds[] = $course->sender_id;
        }

        if ($course->driver && $course->driver->user_id && ! in_array($course->driver->user_id, $notifiedUserIds, true)) {
            $driverMessage = $this->buildDriverNotification($course, $driverAdj, $data['resolution_note']);
            if ($cautionShort) {
                $driverMessage .= ' Votre caution est insuffisante pour couvrir le débit — votre compte est temporairement suspendu jusqu\'à rechargement.';
            }
            $notifier->sendToUser(
                $course->driver->user_id,
                'incident.arbitrated',
                $cautionShort ? '⚠️ Compte suspendu — caution insuffisante' : '⚖️ Incident arbitré',
                $driverMessage,
                ['reference' => $course->reference, 'caution_short' => $cautionShort],
                $course->id,
            );
            $notifiedUserIds[] = $course->driver->user_id;
        }

        if ($incident->reported_by && ! in_array($incident->reported_by, $notifiedUserIds, true)) {
            $notifier->sendToUser(
                $incident->reported_by,
                'incident.arbitrated',
                '✅ Ton signalement a été traité',
                "Course {$course->reference} : {$data['resolution_note']}",
                ['reference' => $course->reference],
                $course->id,
            );
        }

        return response()->json([
            'message'      => $cautionShort
                ? 'Incident arbitré. Débit driver capé sur la caution disponible + auto-suspension.'
                : 'Incident arbitré. Les ajustements ont été appliqués.',
            'incident'     => $incident->fresh()->load([
                'course:id,reference',
                'reportedBy:id,name',
                'resolvedBy:id,name',
            ]),
            'adjustments'  => [
                'marchand' => $marchandAdj,
                'driver'   => $driverAdj,
            ],
            'caution_short' => $cautionShort,
        ]);
    }

    /**
     * Cas 3 — No-show partiel confirmé (1 clic).
     *
     * L'ops a validé que le driver a bien essayé mais que le client est
     * injoignable. Applique atomiquement :
     *   1. Capture partielle sur le wallet marchand
     *      = delivery_fee × (100 − conflicts_no_show_marchand_refund_percent)%
     *      → le reste est rendu au marchand (release du hold).
     *      Ne s'applique que si la course était paid_from_wallet ; sinon on
     *      passe directement à l'étape 2 (pas de hold à ajuster côté user).
     *   2. Crédit partiel de la caution driver
     *      = driver_earnings × conflicts_no_show_driver_earnings_percent%
     *   3. Course → failed + incident → resolved.
     *
     * L'ops peut toujours utiliser l'arbitrage manuel pour des cas plus
     * nuancés (pourcentages différents pour cette course spécifique).
     */
    public function noShowPartial(
        Request $request,
        CourseIncident $incident,
        \App\Services\UserWalletService $userWallet,
        DriverWalletService $driverWallet,
        NotificationService $notifier,
    ): JsonResponse {
        if ($incident->status !== 'open') {
            return response()->json(['message' => 'Cet incident est déjà clôturé.'], 422);
        }
        if ($incident->type !== 'recipient_unreachable') {
            return response()->json([
                'message' => 'Le préréglage "no-show partiel" ne s\'applique qu\'aux incidents "client injoignable".',
            ], 422);
        }

        $data = $request->validate([
            'resolution_note' => ['required', 'string', 'max:1000'],
        ]);

        $course = $incident->course()->with('driver', 'sender')->first();
        if (! $course) {
            return response()->json(['message' => 'Course introuvable pour cet incident.'], 422);
        }
        if ($course->isTerminal()) {
            return response()->json(['message' => 'Course déjà clôturée.'], 422);
        }
        if (! $course->driver) {
            return response()->json(['message' => 'Aucun livreur assigné à cette course.'], 422);
        }

        // Lecture des % courants (paramétrés, avec fallback sécurisé)
        $marchandRefundPct = (int) \App\Models\AppSetting::get('conflicts_no_show_marchand_refund_percent', 50);
        $driverEarnPct     = (int) \App\Models\AppSetting::get('conflicts_no_show_driver_earnings_percent', 50);
        $marchandRefundPct = max(0, min(100, $marchandRefundPct));
        $driverEarnPct     = max(0, min(100, $driverEarnPct));

        $deliveryFee     = (int) $course->delivery_fee;
        $driverEarnings  = (int) $course->driver_earnings;
        $capturedAmount  = (int) round($deliveryFee * (100 - $marchandRefundPct) / 100);
        $partialEarnings = (int) round($driverEarnings * $driverEarnPct / 100);

        $admin = $request->user()->admin;

        try {
            [$chargeTx, $earnTx] = DB::transaction(function () use (
                $incident, $course, $capturedAmount, $partialEarnings,
                $userWallet, $driverWallet, $data, $admin, $marchandRefundPct, $driverEarnPct
            ) {
                $chargeTx = null;
                $earnTx   = null;

                // 1. Capture partielle marchand (uniquement si hold posé)
                if ($course->paid_from_wallet && $course->sender && $capturedAmount > 0) {
                    $chargeTx = $userWallet->chargePartial($course->sender, $course, $capturedAmount);
                }
                // Si pas paid_from_wallet, la course n'a pas été payée d'avance (paiement
                // externe Fedapay one-shot) : ce cas ne charge pas le wallet marchand.
                // L'ops peut faire un refund manuel via l'arbitrage classique si besoin.

                // 2. Crédit partiel driver
                if ($partialEarnings > 0) {
                    $earnTx = $driverWallet->earnPartial(
                        $course->driver,
                        $course,
                        $partialEarnings,
                        'no_show',
                    );
                }

                // 3. Course → failed + trace historique
                $previousStatus = $course->status;
                $course->status = Course::STATUS_FAILED;
                $course->save();

                CourseStatusHistory::create([
                    'course_id'       => $course->id,
                    'from_status'     => $previousStatus,
                    'to_status'       => Course::STATUS_FAILED,
                    'reason'          => 'no_show_partial',
                    'changed_by_id'   => $admin->user_id ?? null,
                    'changed_by_type' => 'admin',
                    'metadata'        => [
                        'incident_id'          => $incident->id,
                        'marchand_refund_pct'  => $marchandRefundPct,
                        'driver_earnings_pct'  => $driverEarnPct,
                        'captured_amount'      => $capturedAmount,
                        'partial_earnings'     => $partialEarnings,
                    ],
                ]);

                // 4. Résolution incident
                $incident->update([
                    'status'          => 'resolved',
                    'resolution_note' => $data['resolution_note'],
                    'resolved_by'     => $admin->user_id ?? null,
                    'resolved_at'     => now(),
                ]);

                return [$chargeTx, $earnTx];
            });
        } catch (\DomainException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        // Notifs
        if ($course->sender_id) {
            $refundAmount = $deliveryFee - $capturedAmount;
            $notifier->sendToUser(
                $course->sender_id,
                'incident.arbitrated',
                '⚖️ No-show confirmé',
                "Course {$course->reference} : le client était injoignable. "
                . number_format($refundAmount, 0, ',', ' ') . " FCFA vous ont été rendus, "
                . number_format($capturedAmount, 0, ',', ' ') . " FCFA facturés pour le trajet effectué.",
                ['reference' => $course->reference],
                $course->id,
            );
        }

        if ($course->driver && $course->driver->user_id) {
            $notifier->sendToUser(
                $course->driver->user_id,
                'incident.arbitrated',
                '⚖️ No-show confirmé',
                "Course {$course->reference} : "
                . number_format($partialEarnings, 0, ',', ' ') . " FCFA crédités sur votre caution pour le trajet effectué.",
                ['reference' => $course->reference],
                $course->id,
            );
        }

        return response()->json([
            'message'  => 'No-show partiel appliqué.',
            'incident' => $incident->fresh(),
            'preset'   => [
                'marchand_refund_pct' => $marchandRefundPct,
                'driver_earnings_pct' => $driverEarnPct,
                'delivery_fee'        => $deliveryFee,
                'captured_amount'     => $capturedAmount,
                'refunded_amount'     => $deliveryFee - $capturedAmount,
                'driver_earnings'     => $driverEarnings,
                'partial_earnings'    => $partialEarnings,
            ],
            'transactions' => [
                'marchand_charge' => $chargeTx,
                'driver_earning'  => $earnTx,
            ],
        ]);
    }

    /**
     * Cas 4 — Course retour confirmée (1 clic).
     *
     * Le driver a rendu le colis au marchand (course en `failed`, incident
     * `recipient_refused` toujours ouvert). L'ops confirme le retour et
     * applique atomiquement :
     *   1. Capture partielle sur le wallet marchand
     *      = delivery_fee × conflicts_return_marchand_shipping_fee_percent%
     *      (défaut 100 : marchand paie le fee complet, la plateforme éponge le retour)
     *   2. Crédit driver = earnings normaux + earnings × conflicts_return_driver_return_earnings_percent%
     *      (défaut 50 : bonus retour au driver pour le 2e trajet)
     *   3. Incident → resolved.
     *
     * Prérequis : course.status = failed, course.is_return_trip = true,
     * incident.type = recipient_refused, incident.status = open.
     */
    public function returnTripConfirmed(
        Request $request,
        CourseIncident $incident,
        \App\Services\UserWalletService $userWallet,
        DriverWalletService $driverWallet,
        NotificationService $notifier,
    ): JsonResponse {
        if ($incident->status !== 'open') {
            return response()->json(['message' => 'Cet incident est déjà clôturé.'], 422);
        }
        if ($incident->type !== 'recipient_refused') {
            return response()->json([
                'message' => 'Ce préréglage ne s\'applique qu\'aux incidents "colis refusé".',
            ], 422);
        }

        $data = $request->validate([
            'resolution_note' => ['required', 'string', 'max:1000'],
        ]);

        $course = $incident->course()->with('driver', 'sender')->first();
        if (! $course) {
            return response()->json(['message' => 'Course introuvable pour cet incident.'], 422);
        }
        if (! $course->is_return_trip || $course->status !== Course::STATUS_FAILED) {
            return response()->json([
                'message' => 'Ce préréglage nécessite que le driver ait confirmé le retour du colis au marchand (course en failed via return_confirmed).',
            ], 422);
        }
        if (! $course->driver) {
            return response()->json(['message' => 'Aucun livreur assigné à cette course.'], 422);
        }

        $marchandShippingPct = (int) \App\Models\AppSetting::get('conflicts_return_marchand_shipping_fee_percent', 100);
        $driverReturnPct     = (int) \App\Models\AppSetting::get('conflicts_return_driver_return_earnings_percent', 50);
        $marchandShippingPct = max(0, min(200, $marchandShippingPct));
        $driverReturnPct     = max(0, min(200, $driverReturnPct));

        $deliveryFee    = (int) $course->delivery_fee;
        $driverEarnings = (int) $course->driver_earnings;
        $capturedAmount = (int) round($deliveryFee * $marchandShippingPct / 100);
        // Total au driver = earnings normaux + bonus retour
        $totalDriverAmount = $driverEarnings + (int) round($driverEarnings * $driverReturnPct / 100);

        $admin = $request->user()->admin;

        try {
            [$chargeTx, $earnTx] = DB::transaction(function () use (
                $incident, $course, $capturedAmount, $totalDriverAmount,
                $userWallet, $driverWallet, $data, $admin, $marchandShippingPct, $driverReturnPct
            ) {
                $chargeTx = null;
                $earnTx   = null;

                // 1. Capture marchand (uniquement si hold posé)
                if ($course->paid_from_wallet && $course->sender && $capturedAmount > 0) {
                    // Si capturedAmount > delivery_fee (cas 150%), on cape sur delivery_fee
                    // — le hold ne couvre pas plus. Le reste (bonus 50%) est éponge plateforme.
                    $captureUnderHold = min($capturedAmount, (int) $course->delivery_fee);
                    $chargeTx = $userWallet->chargePartial($course->sender, $course, $captureUnderHold);
                }

                // 2. Crédit driver (earnings + bonus retour) via earnPartial
                if ($totalDriverAmount > 0) {
                    $earnTx = $driverWallet->earnPartial(
                        $course->driver,
                        $course,
                        $totalDriverAmount,
                        'return_trip',
                    );
                }

                // 3. Résolution incident (course déjà en failed via return_confirmed)
                $incident->update([
                    'status'          => 'resolved',
                    'resolution_note' => $data['resolution_note'],
                    'resolved_by'     => $admin->user_id ?? null,
                    'resolved_at'     => now(),
                ]);

                return [$chargeTx, $earnTx];
            });
        } catch (\DomainException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        // Notifs
        if ($course->sender_id) {
            $notifier->sendToUser(
                $course->sender_id,
                'incident.arbitrated',
                '⚖️ Retour confirmé',
                "Course {$course->reference} : "
                . number_format($capturedAmount, 0, ',', ' ') . " FCFA facturés pour le trajet aller-retour. "
                . ($capturedAmount < $deliveryFee
                    ? number_format($deliveryFee - $capturedAmount, 0, ',', ' ') . ' FCFA rendus.'
                    : ''),
                ['reference' => $course->reference],
                $course->id,
            );
        }

        if ($course->driver && $course->driver->user_id) {
            $notifier->sendToUser(
                $course->driver->user_id,
                'incident.arbitrated',
                '⚖️ Retour confirmé',
                "Course {$course->reference} : "
                . number_format($totalDriverAmount, 0, ',', ' ') . " FCFA crédités sur votre caution (trajet + bonus retour).",
                ['reference' => $course->reference],
                $course->id,
            );
        }

        return response()->json([
            'message'  => 'Course retour confirmée.',
            'incident' => $incident->fresh(),
            'preset'   => [
                'marchand_shipping_pct'   => $marchandShippingPct,
                'driver_return_pct'       => $driverReturnPct,
                'delivery_fee'            => $deliveryFee,
                'captured_amount'         => $capturedAmount,
                'refunded_amount'         => max(0, $deliveryFee - $capturedAmount),
                'driver_earnings_base'    => $driverEarnings,
                'total_driver_amount'     => $totalDriverAmount,
            ],
            'transactions' => [
                'marchand_charge' => $chargeTx,
                'driver_earning'  => $earnTx,
            ],
        ]);
    }

    /**
     * Cas 6 — Annulation marchand confirmée (1 clic).
     *
     * Structure identique au preset Cas 4 (retour post-refus client), avec un
     * garde différent : l'incident doit être type `marchand_cancelled`. On
     * partage volontairement les settings `conflicts_return_*` : au démarrage,
     * marchand-annule et client-refuse sont facturés pareil (défaut 100% du
     * fee marchand + 50% bonus driver). L'ops peut punir plus en ajoutant un
     * `manual_debit` via l'arbitrage classique si un marchand récidive.
     *
     * Prérequis : course.status = failed, course.is_return_trip = true,
     * incident.type = marchand_cancelled, incident.status = open.
     */
    public function marchandCancelConfirmed(
        Request $request,
        CourseIncident $incident,
        \App\Services\UserWalletService $userWallet,
        DriverWalletService $driverWallet,
        NotificationService $notifier,
    ): JsonResponse {
        if ($incident->status !== 'open') {
            return response()->json(['message' => 'Cet incident est déjà clôturé.'], 422);
        }
        if ($incident->type !== 'marchand_cancelled') {
            return response()->json([
                'message' => 'Ce préréglage ne s\'applique qu\'aux annulations marchand post-pickup.',
            ], 422);
        }

        $data = $request->validate([
            'resolution_note' => ['required', 'string', 'max:1000'],
        ]);

        $course = $incident->course()->with('driver', 'sender')->first();
        if (! $course) {
            return response()->json(['message' => 'Course introuvable pour cet incident.'], 422);
        }
        if (! $course->is_return_trip || $course->status !== Course::STATUS_FAILED) {
            return response()->json([
                'message' => 'Ce préréglage nécessite que le driver ait confirmé le retour du colis (course en failed via return_confirmed).',
            ], 422);
        }
        if (! $course->driver) {
            return response()->json(['message' => 'Aucun livreur assigné à cette course.'], 422);
        }

        $marchandShippingPct = (int) \App\Models\AppSetting::get('conflicts_return_marchand_shipping_fee_percent', 100);
        $driverReturnPct     = (int) \App\Models\AppSetting::get('conflicts_return_driver_return_earnings_percent', 50);
        $marchandShippingPct = max(0, min(200, $marchandShippingPct));
        $driverReturnPct     = max(0, min(200, $driverReturnPct));

        $deliveryFee    = (int) $course->delivery_fee;
        $driverEarnings = (int) $course->driver_earnings;
        $capturedAmount = (int) round($deliveryFee * $marchandShippingPct / 100);
        $totalDriverAmount = $driverEarnings + (int) round($driverEarnings * $driverReturnPct / 100);

        $admin = $request->user()->admin;

        try {
            [$chargeTx, $earnTx] = DB::transaction(function () use (
                $incident, $course, $capturedAmount, $totalDriverAmount,
                $userWallet, $driverWallet, $data, $admin
            ) {
                $chargeTx = null;
                $earnTx   = null;

                if ($course->paid_from_wallet && $course->sender && $capturedAmount > 0) {
                    $captureUnderHold = min($capturedAmount, (int) $course->delivery_fee);
                    $chargeTx = $userWallet->chargePartial($course->sender, $course, $captureUnderHold);
                }

                if ($totalDriverAmount > 0) {
                    $earnTx = $driverWallet->earnPartial(
                        $course->driver,
                        $course,
                        $totalDriverAmount,
                        'marchand_cancel',
                    );
                }

                $incident->update([
                    'status'          => 'resolved',
                    'resolution_note' => $data['resolution_note'],
                    'resolved_by'     => $admin->user_id ?? null,
                    'resolved_at'     => now(),
                ]);

                return [$chargeTx, $earnTx];
            });
        } catch (\DomainException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        if ($course->sender_id) {
            $notifier->sendToUser(
                $course->sender_id,
                'incident.arbitrated',
                'Annulation confirmée',
                "Course {$course->reference} : "
                . number_format($capturedAmount, 0, ',', ' ') . " FCFA facturés pour le trajet effectué. "
                . ($capturedAmount < $deliveryFee
                    ? number_format($deliveryFee - $capturedAmount, 0, ',', ' ') . ' FCFA rendus.'
                    : ''),
                ['reference' => $course->reference],
                $course->id,
            );
        }

        if ($course->driver && $course->driver->user_id) {
            $notifier->sendToUser(
                $course->driver->user_id,
                'incident.arbitrated',
                'Annulation marchand confirmée',
                "Course {$course->reference} : "
                . number_format($totalDriverAmount, 0, ',', ' ') . " FCFA crédités sur votre caution (trajet + bonus retour).",
                ['reference' => $course->reference],
                $course->id,
            );
        }

        return response()->json([
            'message'  => 'Annulation marchand confirmée.',
            'incident' => $incident->fresh(),
            'preset'   => [
                'marchand_shipping_pct'   => $marchandShippingPct,
                'driver_return_pct'       => $driverReturnPct,
                'delivery_fee'            => $deliveryFee,
                'captured_amount'         => $capturedAmount,
                'refunded_amount'         => max(0, $deliveryFee - $capturedAmount),
                'driver_earnings_base'    => $driverEarnings,
                'total_driver_amount'     => $totalDriverAmount,
            ],
            'transactions' => [
                'marchand_charge' => $chargeTx,
                'driver_earning'  => $earnTx,
            ],
        ]);
    }

    private function buildMarchandNotification(
        \App\Models\Course $course,
        ?\App\Models\WalletAdjustment $adj,
        string $note,
    ): string {
        if (! $adj) {
            return "Course {$course->reference} : {$note}";
        }
        if ($adj->isCredit()) {
            return "Course {$course->reference} : votre wallet a été crédité de "
                . number_format($adj->amount_fcfa, 0, ',', ' ') . " FCFA. {$note}";
        }
        return "Course {$course->reference} : votre wallet a été débité de "
            . number_format(abs($adj->amount_fcfa), 0, ',', ' ') . " FCFA. {$note}";
    }

    private function buildDriverNotification(
        \App\Models\Course $course,
        ?\App\Models\WalletAdjustment $adj,
        string $note,
    ): string {
        if (! $adj) {
            return "Course {$course->reference} : {$note}";
        }
        if ($adj->isCredit()) {
            return "Course {$course->reference} : votre caution a été créditée de "
                . number_format($adj->amount_fcfa, 0, ',', ' ') . " FCFA. {$note}";
        }
        return "Course {$course->reference} : votre caution a été débitée de "
            . number_format(abs($adj->amount_fcfa), 0, ',', ' ') . " FCFA. {$note}";
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
        $individual->load(['user', 'user.wallet']);

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

    // ===== 14. LISTE DES DEMANDES DE RETRAIT (CAUTION DRIVER) =====
    public function withdrawRequests(Request $request): JsonResponse
    {
        $perPage = min((int) $request->query('per_page', 20), 100);
        $query = \App\Models\WalletWithdrawRequest::query()
            ->with([
                'driver:id,user_id,first_name,last_name',
                'driver.user:id,phone,email',
                'user:id,name,phone,email,type',
                'user.marchant:id,user_id,raison_sociale',
                'user.individual:id,user_id,first_name,last_name',
            ])
            ->latest();

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        // Filtre par type de demandeur (driver | user | tous si omis).
        $ownerType = $request->query('owner_type');
        if ($ownerType === 'driver') {
            $query->whereNotNull('driver_id');
        } elseif ($ownerType === 'user') {
            $query->whereNotNull('user_id');
        }

        return response()->json($query->paginate($perPage));
    }

    // ===== 14a. DÉTAIL D'UNE DEMANDE DE RETRAIT (pour page admin de revue) =====
    /**
     * Renvoie le contexte complet nécessaire à l'admin avant approbation/rejet :
     *  - la demande + driver
     *  - l'état actuel du wallet (balance + cumuls)
     *  - la course active du driver (si busy) → l'approbation sera bloquée
     *  - les 10 dernières transactions wallet
     *  - les agrégats des retraits passés (approved/rejected count + total approuvé)
     */
    public function showWithdrawRequest(\App\Models\WalletWithdrawRequest $withdraw): JsonResponse
    {
        $withdraw->load([
            'driver:id,user_id,first_name,last_name,availability_status,activation_status',
            'driver.user:id,phone,email',
            'driver.wallet',
            'user:id,name,phone,email,type',
            'user.marchant:id,user_id,raison_sociale',
            'user.individual:id,user_id,first_name,last_name',
            'decidedByAdmin:id,first_name,last_name',
            'paidByAdmin:id,first_name,last_name',
        ]);

        if ($withdraw->isForDriver()) {
            return $this->showDriverWithdrawRequest($withdraw);
        }

        return $this->showUserWithdrawRequest($withdraw);
    }

    /**
     * Détail d'une demande driver — inclut la caution + course active (blocage si busy).
     */
    private function showDriverWithdrawRequest(\App\Models\WalletWithdrawRequest $withdraw): JsonResponse
    {
        $driver = $withdraw->driver;

        // Course active = non terminale (couvre tous les statuts "en cours")
        $activeCourse = \App\Models\Course::query()
            ->where('driver_id', $driver->id)
            ->whereNotIn('status', \App\Models\Course::TERMINAL_STATUSES)
            ->latest()
            ->first(['id', 'reference', 'status', 'has_collection', 'collection_amount']);

        $recentTransactions = \App\Models\WalletTransaction::query()
            ->where('driver_id', $driver->id)
            ->with('course:id,reference')
            ->latest('created_at')
            ->limit(10)
            ->get(['id', 'type', 'amount_fcfa', 'balance_after', 'course_id', 'created_at']);

        $pastRequests = \App\Models\WalletWithdrawRequest::query()
            ->where('driver_id', $driver->id)
            ->where('id', '!=', $withdraw->id)
            ->selectRaw('status, COUNT(*) as count, COALESCE(SUM(amount_fcfa), 0) as total')
            ->groupBy('status')
            ->get()
            ->keyBy('status');

        return response()->json([
            'request'             => $withdraw,
            'owner_type'          => 'driver',
            'active_course'       => $activeCourse,
            'recent_transactions' => $recentTransactions,
            'past_requests'       => [
                'approved_count'  => (int) ($pastRequests['approved']->count ?? 0),
                'approved_total'  => (int) ($pastRequests['approved']->total ?? 0),
                'rejected_count'  => (int) ($pastRequests['rejected']->count ?? 0),
                'cancelled_count' => (int) ($pastRequests['cancelled']->count ?? 0),
            ],
        ]);
    }

    /**
     * Détail d'une demande user marchand/particulier — balance user_wallet + 10 dernières
     * transactions + agrégats des retraits passés.
     */
    private function showUserWithdrawRequest(\App\Models\WalletWithdrawRequest $withdraw): JsonResponse
    {
        $user = $withdraw->user;

        $wallet = \App\Models\UserWallet::firstOrCreate(['user_id' => $user->id]);

        $recentTransactions = \App\Models\UserWalletTransaction::query()
            ->where('user_id', $user->id)
            ->with('course:id,reference')
            ->latest('created_at')
            ->limit(10)
            ->get(['id', 'type', 'amount_fcfa', 'balance_after', 'course_id', 'created_at']);

        $pastRequests = \App\Models\WalletWithdrawRequest::query()
            ->where('user_id', $user->id)
            ->where('id', '!=', $withdraw->id)
            ->selectRaw('status, COUNT(*) as count, COALESCE(SUM(amount_fcfa), 0) as total')
            ->groupBy('status')
            ->get()
            ->keyBy('status');

        return response()->json([
            'request'             => $withdraw,
            'owner_type'          => 'user',
            'user_wallet'         => [
                'balance'          => (int) $wallet->balance,
                'pending_reserved' => (int) $wallet->pending_reserved,
                'available'        => $wallet->available(),
                'total_deposited'  => (int) $wallet->total_deposited,
                'total_spent'      => (int) $wallet->total_spent,
            ],
            'recent_transactions' => $recentTransactions,
            'past_requests'       => [
                'approved_count'  => (int) ($pastRequests['approved']->count ?? 0),
                'approved_total'  => (int) ($pastRequests['approved']->total ?? 0),
                'rejected_count'  => (int) ($pastRequests['rejected']->count ?? 0),
                'cancelled_count' => (int) ($pastRequests['cancelled']->count ?? 0),
            ],
        ]);
    }

    // ===== 14bis. APPROUVER UNE DEMANDE DE RETRAIT =====
    /**
     * Approuve une demande pending : appelle DriverWalletService::withdraw() pour
     * débiter la caution. Si la règle métier échoue (driver busy, solde baissé entre
     * temps), la demande RESTE en pending et l'admin pourra retenter — la demande
     * elle-même est légitime, c'est l'état du wallet qui est transitoire.
     */
    public function approveWithdrawRequest(
        Request $request,
        \App\Models\WalletWithdrawRequest $withdraw,
        \App\Services\DriverWalletService $driverWallet,
        \App\Services\UserWalletService $userWallet,
        \App\Services\FedapayService $fedapay,
        NotificationService $notifier,
    ): JsonResponse {
        if ($withdraw->status !== \App\Models\WalletWithdrawRequest::STATUS_PENDING) {
            return response()->json([
                'message' => "Cette demande n'est plus en attente (statut actuel: {$withdraw->status}).",
            ], 422);
        }

        $admin = $request->user()->admin;

        // 1. Débit du wallet + transition à approved (transaction atomique)
        try {
            DB::transaction(function () use ($withdraw, $admin, $driverWallet, $userWallet, $notifier) {
                if ($withdraw->isForDriver()) {
                    $driverWallet->withdraw(
                        driver:  $withdraw->driver,
                        amount:  $withdraw->amount_fcfa,
                        adminId: $admin->id,
                        reason:  "Approval of withdraw request #{$withdraw->id}",
                    );
                } else {
                    $userWallet->withdraw(
                        user:    $withdraw->user,
                        amount:  $withdraw->amount_fcfa,
                        adminId: $admin->id,
                        reason:  "Approval of withdraw request #{$withdraw->id}",
                    );
                }

                $withdraw->update([
                    'status'              => \App\Models\WalletWithdrawRequest::STATUS_APPROVED,
                    'decided_by_admin_id' => $admin->id,
                    'decided_at'          => now(),
                ]);

                $notifier->sendToUser(
                    $this->withdrawNotifyUserId($withdraw),
                    'wallet.withdraw_approved',
                    '✅ Retrait approuvé',
                    "Votre retrait de " . number_format($withdraw->amount_fcfa, 0, ',', ' ') . " FCFA a été validé. Versement en cours sur votre {$withdraw->target_method}.",
                    ['withdraw_id' => $withdraw->id],
                    null,
                );
            });
        } catch (\DomainException $e) {
            // La demande reste en pending — l'admin pourra retenter plus tard
            return response()->json(['message' => $e->getMessage()], 422);
        }

        // 2. Appel automatique FedaPay payout (hors transaction : on garde le débit même si l'API plante).
        //    Le webhook FedaPay remplira paid_at + external_payout_reference quand le virement aboutit.
        //    Si l'API échoue, la demande reste approved avec payout_failed_at → admin peut retenter
        //    ou faire le virement manuel via le bouton "Marquer comme viré" (filet de sécurité).
        $this->tryInitiateFedapayPayout($withdraw->fresh(), $fedapay);

        return response()->json([
            'message'  => 'Demande approuvée. Tentative de virement automatique lancée.',
            'request'  => $withdraw->fresh()->load(['driver.user', 'user']),
        ]);
    }

    /**
     * Renvoie l'ID user à notifier pour une demande de retrait, qu'elle soit
     * portée par un driver (→ driver.user_id) ou par un user (→ user_id).
     */
    private function withdrawNotifyUserId(\App\Models\WalletWithdrawRequest $withdraw): int
    {
        return $withdraw->isForDriver()
            ? (int) $withdraw->driver->user_id
            : (int) $withdraw->user_id;
    }

    /**
     * Tente d'initier un payout FedaPay pour une demande approuvée.
     * Idempotent : ne fait rien si payout_initiated_at est déjà rempli (sauf si payout_failed_at).
     * Pas de throw : c'est un best-effort. En cas d'échec, l'admin a le filet manuel.
     */
    private function tryInitiateFedapayPayout(
        \App\Models\WalletWithdrawRequest $withdraw,
        \App\Services\FedapayService $fedapay,
    ): void {
        // Idempotence : on n'appelle pas 2 fois sauf si la 1ère a échoué (retentative)
        if ($withdraw->payout_initiated_at && ! $withdraw->payout_failed_at) {
            return;
        }
        // Bank n'est pas encore supporté par FedaPay → l'admin fera le virement manuel
        if ($withdraw->target_method !== \App\Models\WalletWithdrawRequest::METHOD_MOMO) {
            return;
        }

        // Coordonnées Fedapay adaptées au propriétaire (driver ou user marchand/particulier).
        if ($withdraw->isForDriver()) {
            $customer = [
                'email'     => $withdraw->driver->user->email ?? null,
                'firstname' => $withdraw->driver->first_name,
                'lastname'  => $withdraw->driver->last_name,
            ];
            $description = "Air Mess — Retrait caution #{$withdraw->id}";
        } else {
            $u = $withdraw->user;
            $customer = [
                'email'     => $u->email ?? null,
                'firstname' => $u->name,
            ];
            $description = "Air Mess — Retrait wallet #{$withdraw->id}";
        }

        try {
            $payout = $fedapay->createPayout(
                amountFcfa:    $withdraw->amount_fcfa,
                mode:          'mtn', // sandbox accepte 'mtn' pour tester
                accountNumber: $withdraw->target_account,
                customer: $customer,
                description: $description,
            );

            $withdraw->update([
                'payout_initiated_at'    => now(),
                'payout_provider_ref'    => $payout['id'],
                'payout_failed_at'       => null, // on efface un éventuel échec précédent (retentative)
                'payout_failure_reason'  => null,
            ]);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('FedaPay payout initiation failed', [
                'withdraw_id' => $withdraw->id,
                'error'       => $e->getMessage(),
            ]);
            $withdraw->update([
                'payout_failed_at'      => now(),
                'payout_failure_reason' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Retentative explicite d'un payout FedaPay (super-admin).
     * Utile quand le 1er appel a échoué (timeout, API down, etc).
     */
    public function retryWithdrawPayout(
        \App\Models\WalletWithdrawRequest $withdraw,
        \App\Services\FedapayService $fedapay,
    ): JsonResponse {
        if ($withdraw->status !== \App\Models\WalletWithdrawRequest::STATUS_APPROVED) {
            return response()->json(['message' => 'Seules les demandes approuvées peuvent retenter un payout.'], 422);
        }
        if ($withdraw->isPaid()) {
            return response()->json(['message' => 'Cette demande est déjà payée.'], 422);
        }
        if ($withdraw->payout_initiated_at && ! $withdraw->payout_failed_at) {
            return response()->json(['message' => 'Un payout est déjà en cours, attendez le webhook.'], 422);
        }

        $this->tryInitiateFedapayPayout($withdraw, $fedapay);

        return response()->json([
            'message' => 'Nouvelle tentative de payout lancée.',
            'request' => $withdraw->fresh()->load(['driver.user', 'paidByAdmin']),
        ]);
    }

    // ===== 14ter. REJETER UNE DEMANDE DE RETRAIT =====
    public function rejectWithdrawRequest(
        Request $request,
        \App\Models\WalletWithdrawRequest $withdraw,
        NotificationService $notifier,
    ): JsonResponse {
        $data = $request->validate([
            'reason' => ['required', 'string', 'max:500'],
        ]);

        if ($withdraw->status !== \App\Models\WalletWithdrawRequest::STATUS_PENDING) {
            return response()->json([
                'message' => "Cette demande n'est plus en attente (statut actuel: {$withdraw->status}).",
            ], 422);
        }

        $admin = $request->user()->admin;

        $withdraw->update([
            'status'              => \App\Models\WalletWithdrawRequest::STATUS_REJECTED,
            'decided_by_admin_id' => $admin->id,
            'decided_at'          => now(),
            'rejection_reason'    => $data['reason'],
        ]);

        $notifier->sendToUser(
            $this->withdrawNotifyUserId($withdraw),
            'wallet.withdraw_rejected',
            '🚫 Retrait refusé',
            "Votre demande de retrait a été refusée. Raison : {$data['reason']}",
            ['withdraw_id' => $withdraw->id],
            null,
        );

        return response()->json([
            'message' => 'Demande refusée. Le demandeur a été notifié.',
            'request' => $withdraw->fresh()->load(['driver.user', 'user']),
        ]);
    }

    // ===== 15bis. EXPORT CSV DES TRANSACTIONS WALLET (super-admin) =====
    /**
     * Export CSV unifié des transactions wallet (driver + user) pour la compta IRL.
     * Une ligne par transaction, période ajustable.
     */
    public function reconciliationExportCsv(Request $request): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        $data = $request->validate([
            'from' => ['nullable', 'date'],
            'to'   => ['nullable', 'date'],
        ]);
        $from = isset($data['from']) ? \Carbon\Carbon::parse($data['from'])->startOfDay() : now()->subDays(30)->startOfDay();
        $to   = isset($data['to'])   ? \Carbon\Carbon::parse($data['to'])->endOfDay()     : now()->endOfDay();

        $filename = 'reconciliation_' . $from->format('Ymd') . '_' . $to->format('Ymd') . '.csv';

        return response()->streamDownload(function () use ($from, $to) {
            $out = fopen('php://output', 'w');
            fwrite($out, "\xEF\xBB\xBF"); // BOM UTF-8 pour Excel
            fputcsv($out, ['wallet_type', 'wallet_owner_id', 'wallet_owner_name', 'tx_id', 'tx_type', 'amount_fcfa', 'balance_after', 'course_id', 'created_at'], ';');

            \DB::table('wallet_transactions as wt')
                ->join('drivers as d', 'd.id', '=', 'wt.driver_id')
                ->whereBetween('wt.created_at', [$from, $to])
                ->orderBy('wt.created_at')
                ->select('wt.id', 'wt.type', 'wt.amount_fcfa', 'wt.balance_after', 'wt.course_id', 'wt.created_at', 'd.id as driver_id', 'd.first_name', 'd.last_name')
                ->chunk(500, function ($rows) use ($out) {
                    foreach ($rows as $r) {
                        fputcsv($out, [
                            'driver',
                            $r->driver_id,
                            trim($r->first_name . ' ' . $r->last_name),
                            $r->id,
                            $r->type,
                            $r->amount_fcfa,
                            $r->balance_after,
                            $r->course_id,
                            $r->created_at,
                        ], ';');
                    }
                });

            \DB::table('user_wallet_transactions as uwt')
                ->join('users as u', 'u.id', '=', 'uwt.user_id')
                ->whereBetween('uwt.created_at', [$from, $to])
                ->orderBy('uwt.created_at')
                ->select('uwt.id', 'uwt.type', 'uwt.amount_fcfa', 'uwt.balance_after', 'uwt.course_id', 'uwt.created_at', 'u.id as user_id', 'u.name')
                ->chunk(500, function ($rows) use ($out) {
                    foreach ($rows as $r) {
                        fputcsv($out, [
                            'user',
                            $r->user_id,
                            $r->name,
                            $r->id,
                            $r->type,
                            $r->amount_fcfa,
                            $r->balance_after,
                            $r->course_id,
                            $r->created_at,
                        ], ';');
                    }
                });

            fclose($out);
        }, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }

    // ===== 15. RÉCONCILIATION COMPTABLE (super-admin uniquement) =====
    /**
     * Dashboard financier pour la compta. Retourne en 1 seule réponse :
     *  - Snapshot temps réel (argent en circulation dans tous les wallets)
     *  - Flux sur une période (top-ups, charges, retraits, refunds)
     *  - Marge brute plateforme (revenus courses - part driver)
     *  - Anomalies à vérifier (4 catégories)
     *
     * Cf. project_wallet_driver_todo #6.
     */
    public function reconciliation(Request $request): JsonResponse
    {
        $data = $request->validate([
            'from' => ['nullable', 'date'],
            'to'   => ['nullable', 'date'],
        ]);
        // Période par défaut : 30 derniers jours
        $from = isset($data['from']) ? \Carbon\Carbon::parse($data['from'])->startOfDay() : now()->subDays(30)->startOfDay();
        $to   = isset($data['to'])   ? \Carbon\Carbon::parse($data['to'])->endOfDay()     : now()->endOfDay();

        // ===== A. Snapshot temps réel : argent en circulation =====
        $driverCirculation = \DB::table('driver_wallets')->selectRaw(
            'COALESCE(SUM(balance), 0) AS total, COUNT(*) AS wallets'
        )->first();
        $userCirculation = \DB::table('user_wallets')->selectRaw(
            'COALESCE(SUM(balance), 0) AS total, COALESCE(SUM(pending_reserved), 0) AS reserved, COUNT(*) AS wallets'
        )->first();

        // ===== B/C. Flux sur la période =====
        // Driver wallet flux (par type)
        $driverFlows = \DB::table('wallet_transactions')
            ->whereBetween('created_at', [$from, $to])
            ->selectRaw('type, COUNT(*) AS n, COALESCE(SUM(amount_fcfa), 0) AS total')
            ->groupBy('type')
            ->get()
            ->keyBy('type');
        // User wallet flux (par type)
        $userFlows = \DB::table('user_wallet_transactions')
            ->whereBetween('created_at', [$from, $to])
            ->selectRaw('type, COUNT(*) AS n, COALESCE(SUM(amount_fcfa), 0) AS total')
            ->groupBy('type')
            ->get()
            ->keyBy('type');
        // Retraits effectivement versés sur la période
        $withdrawsPaid = \DB::table('wallet_withdraw_requests')
            ->whereBetween('paid_at', [$from, $to])
            ->whereNotNull('paid_at')
            ->selectRaw('COUNT(*) AS n, COALESCE(SUM(amount_fcfa), 0) AS total')
            ->first();

        // ===== E. Marge brute plateforme sur la période =====
        // Courses livrées sur la période : delivery_fee (revenu) - driver_earnings (commission driver)
        $revenue = \DB::table('courses')
            ->where('status', Course::STATUS_DELIVERED)
            ->whereBetween('delivered_at', [$from, $to])
            ->selectRaw(
                'COUNT(*) AS n,
                COALESCE(SUM(delivery_fee), 0) AS gross,
                COALESCE(SUM(driver_earnings), 0) AS driver_share'
            )
            ->first();

        // ===== D. Anomalies à vérifier =====
        // 1. Driver wallets dormants : balance > 5000 ET dernière transaction > 60 jours
        $dormantThreshold = now()->subDays(60);
        $dormantDrivers = \DB::table('driver_wallets as dw')
            ->join('drivers as d', 'd.id', '=', 'dw.driver_id')
            ->leftJoin(\DB::raw('(SELECT driver_id, MAX(created_at) AS last_tx FROM wallet_transactions GROUP BY driver_id) AS lt'), 'lt.driver_id', '=', 'dw.driver_id')
            ->where('dw.balance', '>', 5000)
            ->where(function ($q) use ($dormantThreshold) {
                $q->whereNull('lt.last_tx')->orWhere('lt.last_tx', '<', $dormantThreshold);
            })
            ->select('d.id', 'd.first_name', 'd.last_name', 'dw.balance', 'lt.last_tx')
            ->orderByDesc('dw.balance')
            ->limit(20)
            ->get();

        // 2. Driver balances très élevées (> 100 000 FCFA)
        $highBalanceDrivers = \DB::table('driver_wallets as dw')
            ->join('drivers as d', 'd.id', '=', 'dw.driver_id')
            ->where('dw.balance', '>', 100000)
            ->select('d.id', 'd.first_name', 'd.last_name', 'dw.balance')
            ->orderByDesc('dw.balance')
            ->limit(20)
            ->get();

        // 3. Drift driver : SUM(transactions.amount_fcfa) != wallet.balance pour un driver
        // Note : on cherche les wallets dont la somme des TX diverge de la balance enregistrée.
        $driftDrivers = \DB::select(<<<'SQL'
            SELECT dw.driver_id, d.first_name, d.last_name, dw.balance,
                   COALESCE(SUM(wt.amount_fcfa), 0) AS sum_tx,
                   dw.balance - COALESCE(SUM(wt.amount_fcfa), 0) AS drift
            FROM driver_wallets dw
            JOIN drivers d ON d.id = dw.driver_id
            LEFT JOIN wallet_transactions wt ON wt.driver_id = dw.driver_id
            GROUP BY dw.driver_id, d.first_name, d.last_name, dw.balance
            HAVING dw.balance != COALESCE(SUM(wt.amount_fcfa), 0)
            LIMIT 20
        SQL);

        // 4. Drift user : pareil côté user_wallets
        $driftUsers = \DB::select(<<<'SQL'
            SELECT uw.user_id, u.name, uw.balance,
                   COALESCE(SUM(uwt.amount_fcfa), 0) AS sum_tx,
                   uw.balance - COALESCE(SUM(uwt.amount_fcfa), 0) AS drift
            FROM user_wallets uw
            JOIN users u ON u.id = uw.user_id
            LEFT JOIN user_wallet_transactions uwt ON uwt.user_id = uw.user_id
            GROUP BY uw.user_id, u.name, uw.balance
            HAVING uw.balance != COALESCE(SUM(uwt.amount_fcfa), 0)
            LIMIT 20
        SQL);

        return response()->json([
            'period' => [
                'from' => $from->toIso8601String(),
                'to'   => $to->toIso8601String(),
            ],
            'snapshot' => [
                'drivers' => [
                    'wallets_count'   => (int) $driverCirculation->wallets,
                    'total_balance'   => (int) $driverCirculation->total,
                ],
                'users' => [
                    'wallets_count'   => (int) $userCirculation->wallets,
                    'total_balance'   => (int) $userCirculation->total,
                    'total_reserved'  => (int) $userCirculation->reserved,
                ],
                'grand_total' => (int) $driverCirculation->total + (int) $userCirculation->total,
            ],
            'flows' => [
                'driver' => $driverFlows,
                'user'   => $userFlows,
                'withdraws_paid' => [
                    'count' => (int) $withdrawsPaid->n,
                    'total' => (int) $withdrawsPaid->total,
                ],
            ],
            'margin' => [
                'delivered_courses' => (int) $revenue->n,
                'gross_revenue'     => (int) $revenue->gross,
                'driver_commission' => (int) $revenue->driver_share,
                'platform_margin'   => (int) $revenue->gross - (int) $revenue->driver_share,
            ],
            'anomalies' => [
                'dormant_drivers'      => $dormantDrivers,
                'high_balance_drivers' => $highBalanceDrivers,
                'drift_drivers'        => $driftDrivers,
                'drift_users'          => $driftUsers,
                'has_any' => $dormantDrivers->isNotEmpty()
                    || $highBalanceDrivers->isNotEmpty()
                    || count($driftDrivers) > 0
                    || count($driftUsers) > 0,
            ],
        ]);
    }

    // ===== 14quinquies. AJUSTEMENT MANUEL D'UN WALLET DRIVER (super-admin) =====
    /**
     * Crédit ou débit manuel d'un wallet driver, hors flow Fedapay.
     * Cas d'usage : rattrapage de bug, top-up MoMo direct, geste commercial, test.
     *
     * Garde-fous :
     *  - réservé au super-admin (gardé côté route)
     *  - direction explicite ('credit' ou 'debit')
     *  - raison obligatoire (min 10 chars) — trace dans metadata
     *  - balance >= 0 garanti par le service (DomainException si débit > balance)
     *  - chaque appel = 1 transaction immuable (audit)
     */
    public function adjustDriverWallet(
        Request $request,
        \App\Models\Driver $driver,
        \App\Services\DriverWalletService $walletService,
    ): JsonResponse {
        $data = $request->validate([
            'direction' => ['required', Rule::in(['credit', 'debit'])],
            'amount'    => ['required', 'integer', 'min:1'],
            'reason'    => ['required', 'string', 'min:10', 'max:500'],
        ]);

        $admin = $request->user()->admin;

        try {
            $tx = $data['direction'] === 'credit'
                ? $walletService->adjustCredit($driver, $data['amount'], $admin->id, $data['reason'])
                : $walletService->adjustDebit($driver, $data['amount'], $admin->id, $data['reason']);
        } catch (\DomainException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json([
            'message'      => 'Ajustement effectué.',
            'transaction'  => $tx,
            'wallet'       => $driver->wallet()->first(),
        ]);
    }

    // ===== 14sexies. AJUSTEMENT MANUEL D'UN WALLET USER (marchand/particulier) =====
    public function adjustUserWallet(
        Request $request,
        \App\Models\User $user,
        \App\Services\UserWalletService $userWalletService,
    ): JsonResponse {
        if (! $user->isMarchant() && ! $user->isIndividual()) {
            return response()->json([
                'message' => "L'ajustement de wallet user ne s'applique qu'aux marchands et particuliers.",
            ], 422);
        }

        $data = $request->validate([
            'direction' => ['required', Rule::in(['credit', 'debit'])],
            'amount'    => ['required', 'integer', 'min:1'],
            'reason'    => ['required', 'string', 'min:10', 'max:500'],
        ]);

        $admin = $request->user()->admin;

        try {
            $tx = $data['direction'] === 'credit'
                ? $userWalletService->adjustCredit($user, $data['amount'], $admin->id, $data['reason'])
                : $userWalletService->adjustDebit($user, $data['amount'], $admin->id, $data['reason']);
        } catch (\DomainException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json([
            'message'     => 'Ajustement effectué.',
            'transaction' => $tx,
            'wallet'      => $user->wallet()->first(),
        ]);
    }

    // ===== 14quater. MARQUER UNE DEMANDE COMME VIRÉE (trace du payout réel) =====
    /**
     * Après l'approbation (qui débite le wallet), l'admin va virer manuellement sur
     * MoMo/banque. Une fois fait, il revient ici renseigner la référence du virement
     * pour avoir une preuve traçable du paiement réel.
     *
     * Sans cet endpoint, on n'avait aucun moyen de répondre à un driver qui dirait
     * « je n'ai pas reçu mon argent ». Cf. project_wallet_driver_todo #2.
     */
    public function markWithdrawRequestPaid(
        Request $request,
        \App\Models\WalletWithdrawRequest $withdraw,
        NotificationService $notifier,
    ): JsonResponse {
        $data = $request->validate([
            'external_payout_reference' => ['required', 'string', 'max:100'],
        ]);

        if ($withdraw->status !== \App\Models\WalletWithdrawRequest::STATUS_APPROVED) {
            return response()->json([
                'message' => "Seules les demandes approuvées peuvent être marquées comme virées (statut actuel: {$withdraw->status}).",
            ], 422);
        }

        if ($withdraw->isPaid()) {
            return response()->json([
                'message' => "Cette demande a déjà été marquée comme virée le " . $withdraw->paid_at->format('d/m/Y H:i') . ".",
            ], 422);
        }

        $admin = $request->user()->admin;

        $withdraw->update([
            'external_payout_reference' => trim($data['external_payout_reference']),
            'paid_at'                   => now(),
            'paid_by_admin_id'          => $admin->id,
        ]);

        $notifier->sendToUser(
            $this->withdrawNotifyUserId($withdraw),
            'wallet.withdraw_paid',
            '✅ Virement effectué',
            "Votre retrait de " . number_format($withdraw->amount_fcfa, 0, ',', ' ') . " FCFA a été viré (réf: {$data['external_payout_reference']}).",
            ['withdraw_id' => $withdraw->id, 'reference' => $data['external_payout_reference']],
            null,
        );

        return response()->json([
            'message' => 'Demande marquée comme virée. Le demandeur a été notifié.',
            'request' => $withdraw->fresh()->load(['driver.user', 'user', 'paidByAdmin']),
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
