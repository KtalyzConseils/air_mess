<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\CreateCourseRequest;
use App\Models\Course;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use App\Services\NotificationService;
use App\Models\Admin;
use App\Models\CourseIncident;
use App\Models\Driver;
use Illuminate\Validation\Rule;

class CourseController extends Controller
{
    /**
     * Crée une nouvelle course.
     */
    public function store(
        CreateCourseRequest $request,
        NotificationService $notifier,
        \App\Services\CourseBillingService $billing,
        \App\Services\UserWalletService $walletService,
        \App\Services\PriceCalculator $priceCalculator,
    ): JsonResponse {
        $data = $request->validated();
        $user = $request->user();

        // Tarif calculé via la formule linéaire y = a × x + b (cf. PriceCalculator).
        // Les settings admin (price_per_km_fcfa, price_min_fcfa, …) pilotent chaque paramètre.
        $urgency  = $data['urgency'] ?? 'standard';
        $estimate = $priceCalculator->estimate(
            (float) $data['origin_lat'],
            (float) $data['origin_lng'],
            (float) $data['destination_lat'],
            (float) $data['destination_lng'],
            $urgency,
        );
        $deliveryFee    = $estimate['fee'];
        $driverPercent  = (int) \App\Models\AppSetting::get('driver_commission_percent', 75);
        $driverEarnings = (int) round($deliveryFee * $driverPercent / 100);

        // ===== Modèle de paiement (cf. project_wallet_user) =====
        // Tout expéditeur peut être payeur : marchand ET particulier. Plus de quota
        // gratuit pour les particuliers → une course sender-paid coûte le delivery_fee,
        // réglé par le wallet (ou pay-as-you-go Fedapay si solde insuffisant).
        //
        // Nouveau : si `delivery_fee_paid_by = recipient`, le marchand ne paie RIEN
        // à la création. Le driver Airmess collectera les frais chez le destinataire
        // à la livraison, et le revenu ira directement dans platform_earnings.
        $paidBy = $data['delivery_fee_paid_by'] ?? Course::PAID_BY_SENDER;
        $isSenderPaid = $paidBy === Course::PAID_BY_SENDER;
        $isPayer = ($user->isMarchant() || $user->isIndividual()) && $isSenderPaid;

        // Si payeur (mode sender-paid uniquement), on tente d'abord le wallet.
        // Si dispo insuffisant → fallback Fedapay. Pre-check sans hold (le hold
        // sera posé sous lock dans la transaction).
        if ($isPayer) {
            $wallet = $user->wallet;
            if (! $wallet || ! $wallet->canReserve($deliveryFee)) {
                return $billing->initiateOneShotCheckout($user, $data, $deliveryFee, $driverEarnings);
            }
        }

        // Détection "course premium" : exposition risque > caution driver moyenne.
        // MAX(encaissement, valeur déclarée) — l'encaissement est un débit driver
        // au pickup (débité pour de vrai sur sa caution), la valeur déclarée est
        // ce qu'on doit indemniser au marchand en cas de vol (Cas 7).
        $threshold = (int) \App\Models\AppSetting::get('high_value_threshold_fcfa', 30000);
        $collection = (int) ($data['collection_amount'] ?? 0);
        $declared   = (int) ($data['package_declared_value'] ?? 0);
        $exposure   = max($collection, $declared);
        $isHighValue = $threshold > 0 && $exposure >= $threshold;

        try {
            $course = DB::transaction(function () use ($data, $user, $deliveryFee, $driverEarnings, $isPayer, $walletService, $isHighValue) {
                $course = Course::create(array_merge($data, [
                    'sender_id'       => $user->id,
                    'status'          => isset($data['scheduled_for'])
                        ? Course::STATUS_PENDING_PREP
                        : Course::STATUS_AWAITING,
                    'delivery_fee'    => $deliveryFee,
                    'driver_earnings' => $driverEarnings,
                    'has_collection'  => $data['has_collection'] ?? false,
                    'urgency'         => $data['urgency'] ?? 'standard',
                    'is_high_value'   => $isHighValue,
                    // Défaut explicite si le front n'envoie rien : marchand paie (comportement historique).
                    // Le pipeline financier reste inchangé en 5b — pas de branchement conditionnel encore.
                    'delivery_fee_paid_by' => $data['delivery_fee_paid_by'] ?? Course::PAID_BY_SENDER,

                    // Filet de sécurité : on génère reference+token ici même si les events firent
                    'reference'       => $this->generateReference(),
                    'tracking_token'  => Str::random(10),
                    'pickup_code'     => Course::generateCode(),
                    'delivery_code'   => Course::generateCode(),
                ]));

                // Hold wallet : sous lock pessimiste. Si le pre-check a passé mais
                // qu'un autre thread a vidé le wallet entre temps (race), throw → rollback
                // de la course + fallback checkout côté catch ci-dessous.
                if ($isPayer) {
                    $reserved = $walletService->reserveForCourse($user, $course, $deliveryFee);
                    if (! $reserved) {
                        throw new \DomainException('Wallet insuffisant à la réservation (race).');
                    }
                }


                return $course;
            });
        } catch (\DomainException $e) {
            // Race : wallet vidé entre le pre-check et le hold → fallback pay-as-you-go.
            return $billing->initiateOneShotCheckout($user, $data, $deliveryFee, $driverEarnings);
        }

        if ($course->is_high_value) {
            // Course premium : ne PAS pusher aux drivers publics.
            // Alerter les 4 rôles admin — ops prend le lead, les autres en visibilité.
            $adminUserIds = Admin::whereIn('sub_role', [
                Admin::ROLE_SUPER, Admin::ROLE_OPS,
                Admin::ROLE_COMMERCIAL, Admin::ROLE_SUPPORT,
            ])->pluck('user_id')->toArray();

            $notifier->sendToUsers(
                $adminUserIds,
                'course.high_value',
                'Course premium à traiter',
                "Course {$course->reference} — exposition "
                . number_format($exposure, 0, ',', ' ') . " FCFA. "
                . "Prise en charge manuelle requise (hors pool driver).",
                [
                    'reference'      => $course->reference,
                    'exposure_fcfa'  => $exposure,
                    'is_high_value'  => true,
                ],
                $course->id,
            );

            // Notif marchand : transparence sur la prise en charge premium.
            $notifier->sendToUser(
                $course->sender_id,
                'course.high_value.marchand',
                'Course en prise en charge premium',
                "Votre course {$course->reference} dépasse le seuil grand public. "
                . "Notre équipe va vous contacter pour assigner un livreur dédié.",
                ['reference' => $course->reference],
                $course->id,
            );
        } else {
            // Flow normal : PUSH aux livreurs disponibles dans un rayon de 8 km
            $driverUserIds = Driver::availableNear($course->origin_lat, $course->origin_lng, 8.0)
            ->pluck('user_id')
            ->toArray();

            $title = $course->urgency === 'express' ? '⚡ Course Express' : '📦 Nouvelle course';
            $body  = "{$course->origin_quartier} → {$course->destination_quartier} · {$course->driver_earnings} FCFA";

            $notifier->sendToUsers($driverUserIds, 'course.offered', $title, $body,
                ['reference' => $course->reference],
                $course->id,
            );
        }

        return response()->json([
            'message'       => $course->is_high_value
                ? 'Course créée. Prise en charge premium en cours.'
                : 'Course créée. En attente d\'attribution.',
            'course'        => $course->load(['sender', 'packageCategory']),
            'is_high_value' => (bool) $course->is_high_value,
        ], 201);
    }

    /**
     * Dry-run — calcule le tarif estimé pour une course sans la créer.
     * Appelé par la page de création marchande pour afficher le prix live
     * quand les 2 pins et l'urgence changent. Renvoie le breakdown complet
     * (distance, per_km, min, multiplier, capped) pour la transparence UI.
     */
    public function estimate(
        \Illuminate\Http\Request $request,
        \App\Services\PriceCalculator $priceCalculator,
    ): JsonResponse {
        $data = $request->validate([
            'origin_lat'      => ['required', 'numeric', 'between:-90,90'],
            'origin_lng'      => ['required', 'numeric', 'between:-180,180'],
            'destination_lat' => ['required', 'numeric', 'between:-90,90'],
            'destination_lng' => ['required', 'numeric', 'between:-180,180'],
            'urgency'         => ['nullable', Rule::in(['standard', 'express'])],
        ]);

        $breakdown = $priceCalculator->estimate(
            (float) $data['origin_lat'],
            (float) $data['origin_lng'],
            (float) $data['destination_lat'],
            (float) $data['destination_lng'],
            $data['urgency'] ?? 'standard',
        );

        return response()->json($breakdown);
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

        // Incidents (les ouverts en priorité) — utiles au marchand pour visibilité
        // et surtout à l'admin (déclencheur du panneau d'arbitrage).
        $course->load([
            'sender', 'driver.user', 'packageCategory',
            'originAddress', 'destinationAddress',
            'incidents' => fn ($q) => $q->orderByDesc('created_at'),
            'incidents.reportedBy:id,name,type',
        ]);

        return response()->json(['course' => $course]);
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
     * Signalement d'un incident par le marchand ou le particulier sur SA course.
     *
     * Diffère du signalement driver (DriverController::reportIncident) :
     *  - types restreints à ceux qu'un expéditeur peut légitimement voir (colis
     *    endommagé, perdu, adresse erronée, souci d'encaissement, autre)
     *  - reporter_type = 'marchant' (le back ne distingue pas marchand/particulier
     *    dans ce champ pour rester compatible avec l'enum existant)
     *  - la position n'est pas capturée (pas de sens côté web)
     *
     * Notifie l'ops + le livreur si assigné.
     */
    public function reportIncident(
        \Illuminate\Http\Request $request,
        Course $course,
        NotificationService $notifier,
    ): JsonResponse {
        $user = $request->user();
        $this->authorizeAccessToCourse($user, $course);

        // Seul l'expéditeur (marchand/particulier) peut signaler ici. L'admin
        // qui voudrait ouvrir un incident passe par un autre canal (support).
        if ($course->sender_id !== $user->id) {
            return response()->json(['message' => 'Seul l\'expéditeur peut signaler un incident sur cette course.'], 403);
        }

        $allowedTypes = [
            CourseIncident::TYPE_PACKAGE_DAMAGED,
            CourseIncident::TYPE_PACKAGE_LOST,
            CourseIncident::TYPE_WRONG_ADDRESS,
            CourseIncident::TYPE_WRONG_RECIPIENT,
            CourseIncident::TYPE_PAYMENT_ISSUE,
            CourseIncident::TYPE_OTHER,
        ];

        $data = $request->validate([
            'type'        => ['required', Rule::in($allowedTypes)],
            'description' => ['required', 'string', 'min:10', 'max:1000'],
        ]);

        // Cas 8 — fenêtre de contestation pour signalement POST-livraison.
        // Sur une course delivered, seuls certains types sont acceptés,
        // et uniquement dans la fenêtre (défaut 7j). Passé ce délai la
        // livraison est acquise — l'ops peut toujours créer manuellement
        // un incident via un support ticket si un cas exceptionnel arrive.
        if ($course->status === Course::STATUS_DELIVERED) {
            if (! in_array($data['type'], CourseIncident::POST_DELIVERY_TYPES, true)) {
                return response()->json([
                    'message' => 'Ce type d\'incident n\'est pas signalable après livraison.',
                ], 422);
            }
            $windowDays = (int) \App\Models\AppSetting::get('dispute_window_days', 7);
            if ($course->delivered_at && $course->delivered_at->diffInDays(now()) > $windowDays) {
                return response()->json([
                    'message' => "Fenêtre de contestation dépassée ({$windowDays} jours). Contactez le support pour un examen exceptionnel.",
                ], 422);
            }
        } elseif ($course->isTerminal()) {
            // cancelled / failed : incident non pertinent
            return response()->json([
                'message' => 'Impossible de signaler un incident : cette course est déjà clôturée.',
            ], 422);
        }

        $incident = CourseIncident::create([
            'course_id'     => $course->id,
            'reported_by'   => $user->id,
            'reporter_type' => 'marchant',   // enum existant — vaut aussi pour un individual
            'type'          => $data['type'],
            'description'   => $data['description'],
            'status'        => 'open',
        ]);

        // Notif ops + super-admin — voient un badge critique
        $opsUserIds = Admin::whereIn('sub_role', [Admin::ROLE_OPS, Admin::ROLE_SUPER])
            ->pluck('user_id')
            ->toArray();
        $notifier->sendToUsers(
            $opsUserIds,
            'incident.reported',
            '🚨 Nouvel incident marchand',
            "Incident ({$data['type']}) signalé par l'expéditeur sur la course {$course->reference}.",
            ['reference' => $course->reference, 'incident_type' => $data['type']],
            $course->id,
        );

        // Notif livreur assigné le cas échéant — visibilité de son côté
        if ($course->driver_id) {
            $course->loadMissing('driver.user');
            if ($course->driver && $course->driver->user_id) {
                $notifier->sendToUser(
                    $course->driver->user_id,
                    'course.incident',
                    '⚠️ Incident signalé sur ta course',
                    "L'expéditeur a signalé un incident sur la course {$course->reference}.",
                    ['reference' => $course->reference, 'incident_type' => $data['type']],
                    $course->id,
                );
            }
        }

        return response()->json([
            'message'  => 'Incident signalé. L\'équipe ops traitera votre demande.',
            'incident' => $incident,
        ], 201);
    }

    /**
     * Annule une course (statut → cancelled).
     */
    public function cancel(
        \Illuminate\Http\Request $request,
        Course $course,
        NotificationService $notifier,
        \App\Services\UserWalletService $walletService,
    ): JsonResponse
    {
        $this->authorizeAccessToCourse($request->user(), $course);

        if ($course->isTerminal()) {
            return response()->json([
                'message' => 'Impossible d\'annuler : la course est déjà clôturée.',
            ], 422);
        }

        $request->validate([
            'reason'                => ['nullable', 'string', 'max:500'],
            // Cas 6 — confirmation renforcée post-pickup. Le front DOIT envoyer
            // ce flag pour valider une annulation après pickup ; sinon on refuse.
            'confirm_post_pickup'   => ['nullable', 'boolean'],
        ]);

        $isPostPickup = in_array(
            $course->status,
            [Course::STATUS_PICKED_UP, Course::STATUS_AT_DROPOFF],
            true,
        );

        // Cas 6 — Marchand annule après pickup : bascule en course retour.
        // Seul le SENDER (marchand/particulier) peut déclencher ce chemin ;
        // le driver a d'autres outils (incident, abandon), l'admin a le support/dispute.
        if ($isPostPickup) {
            $user = $request->user();
            $isSender = ($user->isMarchant() || $user->isIndividual()) && $course->sender_id === $user->id;
            if (! $isSender) {
                return response()->json([
                    'message' => 'Impossible d\'annuler : le colis est déjà entre les mains du livreur.',
                ], 422);
            }
            if (! $request->boolean('confirm_post_pickup')) {
                return response()->json([
                    'message'                     => 'Le colis a été récupéré. Confirmez explicitement l\'annulation.',
                    'requires_post_pickup_confirm' => true,
                    'delivery_fee'                => (int) $course->delivery_fee,
                ], 422);
            }

            return $this->initiateMarchandCancelReturn($course, $request, $notifier);
        }

        $previousStatus = $course->status;
        // Le livreur assigné (s'il y en a un) doit être libéré, sinon il reste bloqué en "busy".
        $driver = $course->driver_id ? Driver::find($course->driver_id) : null;

        DB::transaction(function () use ($course, $request, $previousStatus, $driver, $walletService) {
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

            // Wallet : libérer la réservation posée à la création (no-op si pas paid_from_wallet).
            // On annule toujours AVANT pickup ici (garde au-dessus), donc jamais de charge à refund.
            if ($course->paid_from_wallet) {
                $walletService->releaseReservation(
                    $course->sender,
                    $course,
                    (int) $course->delivery_fee,
                );
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
                'Course annulée',
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
     * Cas 6 — Marchand annule après pickup.
     * Bascule la course en `returning_to_sender` (comme Cas 4), génère un
     * `return_code`, crée un CourseIncident type=marchand_cancelled pour
     * que l'ops arbitre financièrement le retour via le preset dédié.
     *
     * Le driver-app détecte automatiquement le statut et bascule sur l'écran
     * de retour vers marchand — flow entièrement partagé avec Cas 4.
     */
    private function initiateMarchandCancelReturn(
        Course $course,
        \Illuminate\Http\Request $request,
        NotificationService $notifier,
    ): JsonResponse {
        $previousStatus = $course->status;
        $driver         = $course->driver_id ? Driver::find($course->driver_id) : null;
        $reason         = $request->input('reason');
        $user           = $request->user();

        $incident = DB::transaction(function () use ($course, $previousStatus, $reason, $user) {
            $course->status              = Course::STATUS_RETURNING_TO_SENDER;
            $course->is_return_trip      = true;
            $course->return_code         = Course::generateCode();
            $course->cancellation_reason = $reason;
            $course->cancelled_by        = $user->id;
            $course->save();

            $incident = \App\Models\CourseIncident::create([
                'course_id'     => $course->id,
                'reported_by'   => $user->id,
                'reporter_type' => 'marchant',
                'type'          => \App\Models\CourseIncident::TYPE_MARCHAND_CANCELLED,
                'description'   => $reason ?: 'Annulation marchand post-pickup.',
                'status'        => 'open',
            ]);

            \App\Models\CourseStatusHistory::create([
                'course_id'       => $course->id,
                'from_status'     => $previousStatus,
                'to_status'       => Course::STATUS_RETURNING_TO_SENDER,
                'changed_by_id'   => $user->id,
                'changed_by_type' => 'user',
                'reason'          => 'marchand_cancel_return: ' . ($reason ?: 'sans motif'),
                'metadata'        => [
                    'return_code' => $course->return_code,
                    'incident_id' => $incident->id,
                ],
            ]);

            return $incident;
        });

        // Notif driver : le colis doit revenir chez le marchand.
        if ($driver) {
            $notifier->sendToUser(
                $driver->user_id,
                'course.marchand_cancelled_return',
                'Annulation marchand — retour du colis',
                "Le marchand a annulé la course {$course->reference}. Ramenez le colis à l'origine ; il vous donnera le code de retour à la remise.",
                [
                    'reference'   => $course->reference,
                    'return_code' => null, // le driver ne l'a PAS ; c'est le marchand qui l'a
                ],
                $course->id,
            );
        }

        // Notif marchand avec le return_code (à donner au driver à la remise).
        $notifier->sendToUser(
            $user->id,
            'course.return_initiated',
            'Retour du colis en cours',
            "Le livreur revient. Code à lui donner à la remise : {$course->return_code}",
            ['reference' => $course->reference, 'return_code' => $course->return_code],
            $course->id,
        );

        return response()->json([
            'message'  => 'Annulation acceptée. Le colis vous est rapporté ; l\'ops finalisera la facturation.',
            'course'   => $course->fresh(),
            'incident' => $incident,
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
