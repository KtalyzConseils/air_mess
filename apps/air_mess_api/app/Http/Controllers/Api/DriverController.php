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
use App\Services\DriverWalletService;
use App\Models\CourseIncident;
use App\Models\Admin;


class DriverController extends Controller
{
    private const MATCHING_RADIUS_KM = 8.0; // rayon max d'une ville comme Cotonou

    /**
     * Cas 3 — Client injoignable.
     * Nombre minimum de tentatives d'appel avant qu'un livreur puisse
     * signaler `recipient_unreachable`. Garde-fou anti-fraude.
     */
    private const MIN_CONTACT_ATTEMPTS_FOR_UNREACHABLE = 2;

    // ===== 1. AVAILABILITY =====
    public function updateAvailability(Request $request): JsonResponse
    {
        $data = $request->validate([
            'availability_status' => ['required', Rule::in(['offline', 'available', 'on_break'])],
        ]);

        $driver = $this->currentDriver($request, requireActive: true);

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

        $driver = $this->currentDriver($request, requireActive: true);

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
        $driver = $this->currentDriver($request, requireActive: true);

        if ($driver->availability_status !== 'available') {
            return response()->json(['courses' => []]);
        }

        $query = Course::where('status', Course::STATUS_AWAITING)
            ->whereNull('driver_id')
            ->with('packageCategory');

        // Filtre caution : on cache les courses avec encaissement > balance du wallet.
        // Le driver ne verra que ce qu'il peut couvrir avec sa caution.
        $balance = $driver->wallet?->balance ?? 0;
        $query->where(function ($q) use ($balance) {
            $q->where('has_collection', false)
              ->orWhere('collection_amount', '<=', $balance);
        });

        // Filtre refus : on cache les courses que ce driver a déjà refusées explicitement.
        // Évite qu'il revoie son refus dans la liste. Cf. project_wallet_driver_todo #7.
        $query->whereNotIn('id', function ($sub) use ($driver) {
            $sub->select('course_id')
                ->from('course_decline_records')
                ->where('driver_id', $driver->id);
        });

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
        $driver = $this->currentDriver($request, requireActive: true);

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

        // Recalcule l'acceptance_rate sur la fenêtre rolling 30j (cf. project_wallet_driver_todo #7)
        $driver->refresh()->recalcAcceptanceRate();

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

    /**
     * Refus explicite d'une course offerte par le driver.
     * Crée un CourseDeclineRecord, fait disparaître la course du flux offered-courses
     * pour ce driver, et recalcule son acceptance_rate sur 30j.
     *
     * Idempotent : un 2e decline sur la même course retourne 200 avec le record existant.
     *
     * Cf. project_wallet_driver_todo #7.
     */
    public function declineCourse(Request $request, Course $course): JsonResponse
    {
        $driver = $this->currentDriver($request, requireActive: true);

        $data = $request->validate([
            'reason'        => ['required', Rule::in(\App\Models\CourseDeclineRecord::REASONS)],
            'custom_reason' => [
                'required_if:reason,other', 'nullable', 'string', 'min:5', 'max:500',
            ],
        ]);

        // On ne peut refuser que des courses encore offertes (awaiting + sans driver_id)
        if ($course->status !== Course::STATUS_AWAITING || $course->driver_id !== null) {
            return response()->json([
                'message' => "Cette course n'est plus disponible (statut: {$course->status}).",
            ], 409);
        }

        // Idempotence applicative : si on a déjà refusé, on retourne le record existant.
        $existing = \App\Models\CourseDeclineRecord::where('driver_id', $driver->id)
            ->where('course_id', $course->id)
            ->first();
        if ($existing) {
            return response()->json([
                'message' => 'Vous aviez déjà refusé cette course.',
                'decline' => $existing,
            ], 200);
        }

        // custom_reason est uniquement présent quand reason='other' (CHECK Postgres)
        $customReason = $data['reason'] === \App\Models\CourseDeclineRecord::REASON_OTHER
            ? trim($data['custom_reason'])
            : null;

        DB::transaction(function () use ($driver, $course, $data, $customReason) {
            \App\Models\CourseDeclineRecord::create([
                'driver_id'     => $driver->id,
                'course_id'     => $course->id,
                'reason'        => $data['reason'],
                'custom_reason' => $customReason,
            ]);
        });

        // Recalcule l'acceptance_rate sur 30j après l'event decline
        $driver->refresh()->recalcAcceptanceRate();

        return response()->json([
            'message' => 'Course refusée. Elle ne réapparaîtra plus dans vos offres.',
        ], 201);
    }

    // ===== 5. TRANSITIONS DE STATUT GUIDÉES =====
    public function transition(
        Request $request,
        Course $course,
        NotificationService $notifier,
        DriverWalletService $walletService,
        \App\Services\UserWalletService $userWalletService,
    ): JsonResponse
    {
        $driver = $this->currentDriver($request, requireActive: true);

        if ($course->driver_id !== $driver->id) {
            return response()->json(['message' => 'Course non assignée à vous.'], 403);
        }

        $data = $request->validate([
            'action' => ['required', Rule::in([
                'start_to_pickup', 'arrived_pickup', 'pickup_confirmed',
                'arrived_dropoff', 'delivered', 'return_confirmed', 'failed',
            ])],
            'pickup_code'    => ['required_if:action,pickup_confirmed', 'nullable', 'string', 'max:10'],
            'delivery_code'  => ['required_if:action,delivered', 'nullable', 'string', 'max:10'],
            'return_code'    => ['required_if:action,return_confirmed', 'nullable', 'string', 'max:10'],
            'reason'         => ['required_if:action,failed', 'nullable', 'string', 'max:500'],
        ]);

        $transitions = [
            'start_to_pickup'   => [Course::STATUS_ASSIGNED, Course::STATUS_TO_PICKUP, null],
            'arrived_pickup'    => [Course::STATUS_TO_PICKUP, Course::STATUS_AT_PICKUP, null],
            'pickup_confirmed'  => [Course::STATUS_AT_PICKUP, Course::STATUS_PICKED_UP, 'picked_up_at'],
            'arrived_dropoff'   => [Course::STATUS_PICKED_UP, Course::STATUS_AT_DROPOFF, null],
            'delivered'         => [Course::STATUS_AT_DROPOFF, Course::STATUS_DELIVERED, 'delivered_at'],
            // Cas 4 — driver a rendu le colis au marchand après refus client.
            // La course termine en FAILED (pas delivered — le client n'a rien reçu).
            'return_confirmed'  => [Course::STATUS_RETURNING_TO_SENDER, Course::STATUS_FAILED, 'return_confirmed_at'],
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
        // Cas 4 — le driver a rendu le colis au marchand : on exige le return_code
        // que le marchand a reçu au moment du signalement de refus.
        if ($data['action'] === 'return_confirmed' && $data['return_code'] !== $course->return_code) {
            throw ValidationException::withMessages([
                'return_code' => 'Code de retour incorrect.',
            ]);
        }

        try {
            DB::transaction(function () use ($course, $driver, $nextStatus, $timestampField, $data, $walletService, $userWalletService) {
                // Capture le statut AVANT update pour les hooks wallet
                $previousStatus = $course->getOriginal('status');

                $updates = ['status' => $nextStatus];
                if ($timestampField) {
                    $updates[$timestampField] = now();
                }

                $course->update($updates);

                // Libérer le livreur si terminal
                if (in_array($nextStatus, Course::TERMINAL_STATUSES, true)) {
                    $driver->update(['availability_status' => 'available']);
                }

                // Hook wallet DRIVER : pickup confirmé → débit caution si course avec encaissement
                if ($nextStatus === Course::STATUS_PICKED_UP && $course->has_collection) {
                    $walletService->debitForPickup($driver, $course);
                }

                // Hook wallet DRIVER : failed APRÈS pickup → remboursement caution
                // Inclut aussi returning_to_sender (Cas 4 — retour au marchand)
                $wasPickedUp = in_array(
                    $previousStatus,
                    [Course::STATUS_PICKED_UP, Course::STATUS_AT_DROPOFF, Course::STATUS_RETURNING_TO_SENDER],
                    true,
                );
                if ($nextStatus === Course::STATUS_FAILED && $wasPickedUp && $course->has_collection) {
                    $walletService->refundFailedCourse($driver, $course);
                }

                // Créditer le livreur quand la course est livrée : les gains s'ajoutent
                // directement à son wallet (cf. project_wallet_driver).
                if ($nextStatus === Course::STATUS_DELIVERED && $course->driver_earnings > 0) {
                    $walletService->creditEarning($driver, $course, (int) $course->driver_earnings);
                }

                // ===== Hook wallet USER (marchand/particulier payeur) =====
                // Si la course était payable depuis le wallet (paid_from_wallet=true) :
                //  - delivered → capture du hold : on débite réellement le wallet
                //  - failed    → release du hold, SAUF si on vient de returning_to_sender
                //                (Cas 4) : dans ce cas l'ops doit arbitrer et
                //                capturer une part via le preset 1-clic.
                $comingFromReturn = $previousStatus === Course::STATUS_RETURNING_TO_SENDER;
                if ($course->paid_from_wallet && $course->sender) {
                    if ($nextStatus === Course::STATUS_DELIVERED) {
                        $userWalletService->chargeForCourse(
                            $course->sender,
                            $course,
                            (int) $course->delivery_fee,
                        );
                    } elseif ($nextStatus === Course::STATUS_FAILED && ! $comingFromReturn) {
                        $userWalletService->releaseReservation(
                            $course->sender,
                            $course,
                            (int) $course->delivery_fee,
                        );
                    }
                    // Si $comingFromReturn : on laisse le hold ; l'arbitrage ops
                    // via /admin/incidents/{id}/return-trip-confirmed appelera
                    // chargePartial() qui capture X et release le reste.
                }

                CourseStatusHistory::create([
                    'course_id'       => $course->id,
                    'from_status'     => $previousStatus,
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
        } catch (\DomainException $e) {
            // Règle métier violée par le service wallet (caution insuffisante, etc.)
            // → 422 propre, course non transitionnée (rollback auto de la transaction)
            return response()->json(['message' => $e->getMessage()], 422);
        }

        //PUSH au marchand sur les transitions visibles côté client
        $isReturnConfirmation = $data['action'] === 'return_confirmed';
        $messages = [
            Course::STATUS_TO_PICKUP   => ['🚀 Le livreur est en route',  'Il se dirige vers le point de retrait.'],
            Course::STATUS_AT_PICKUP   => ['📍 Le livreur est arrivé',    'Il prépare le retrait du colis.'],
            Course::STATUS_PICKED_UP   => ['📦 Colis récupéré',           'Le livreur a votre colis et part vers la destination.'],
            Course::STATUS_AT_DROPOFF  => ['🚦 Le livreur arrive',         'Il est sur place pour la livraison au destinataire.'],
            Course::STATUS_DELIVERED   => ['🎉 Colis livré',              'La course est terminée. Merci !'],
            Course::STATUS_FAILED      => $isReturnConfirmation
                ? ['📬 Colis rendu',           'Le livreur vous a rendu le colis refusé. L\'ops finalisera la facturation.']
                : ['⚠️ Livraison échouée',    'Le livreur signale un problème. Voir détails.'],
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
    /**
     * Résout le Driver courant depuis le token.
     *
     * @param  bool  $requireActive  Si true, refuse les drivers non encore activés (pending/suspended/validated).
     *                               À mettre à true pour TOUTES les actions opérationnelles (availability,
     *                               position, accept, transition, incident) — pas pour les lectures profil/solde.
     */
    private function currentDriver(Request $request, bool $requireActive = false): Driver
    {
        $user = $request->user();

        if (! $user || ! $user->isDriver() || ! $user->driver) {
            abort(403, 'Réservé aux livreurs.');
        }

        if ($requireActive && $user->driver->activation_status !== 'active') {
            abort(403, 'Votre compte est en attente de validation. Vous recevrez un email dès activation.');
        }

        return $user->driver;
    }

    // ===== 8. WALLET (caution) =====
    /**
     * État du wallet du driver : caution + cumulés + dernières transactions
     * + éventuelle demande de retrait en attente.
     * Accessible même au driver pending (lecture seule, pas une action sensible).
     */
    public function wallet(Request $request): JsonResponse
    {
        $driver = $this->currentDriver($request); // pas requireActive : lecture OK pour pending

        // Lazy-create si pour une raison X le wallet n'existe pas (defensive — tous devraient en avoir)
        $wallet = \App\Models\DriverWallet::firstOrCreate(['driver_id' => $driver->id]);

        $recentTransactions = \App\Models\WalletTransaction::where('driver_id', $driver->id)
            ->orderByDesc('created_at')
            ->limit(20)
            ->get(['id', 'type', 'amount_fcfa', 'balance_after', 'course_id', 'created_at']);

        $pendingWithdraw = \App\Models\WalletWithdrawRequest::where('driver_id', $driver->id)
            ->where('status', \App\Models\WalletWithdrawRequest::STATUS_PENDING)
            ->latest()
            ->first();

        // Plafonds anti-abus : usage actuel + limites pour que le driver sache où il en est
        $usage = \App\Models\WalletWithdrawRequest::usageForDriver($driver->id);
        $withdrawLimits = [
            'max_per_day_count'  => (int) \App\Models\AppSetting::get('driver_withdraw_max_per_day_count', 2),
            'max_per_week_count' => (int) \App\Models\AppSetting::get('driver_withdraw_max_per_week_count', 5),
            'max_per_day_fcfa'   => (int) \App\Models\AppSetting::get('driver_withdraw_max_per_day_fcfa', 30000),
            'max_per_week_fcfa'  => (int) \App\Models\AppSetting::get('driver_withdraw_max_per_week_fcfa', 100000),
            'used'               => $usage,
        ];

        return response()->json([
            'balance'         => $wallet->balance,
            'total_deposited' => $wallet->total_deposited,
            'total_withdrawn' => $wallet->total_withdrawn,
            'min_withdraw_fcfa' => (int) \App\Models\AppSetting::get('driver_min_withdraw_fcfa', 500),
            'recent_transactions' => $recentTransactions,
            'pending_withdraw_request' => $pendingWithdraw,
            'withdraw_limits' => $withdrawLimits,
        ]);
    }

    /**
     * Demande de top-up de caution : crée un Payment pending + checkout Fedapay.
     * Le wallet est crédité uniquement par le webhook (sous-étape 6c).
     */
    public function topUpWallet(Request $request, \App\Services\FedapayService $fedapay): JsonResponse
    {
        $driver = $this->currentDriver($request); // pas requireActive : un driver pending peut déjà déposer

        $minAmount = (int) \App\Models\AppSetting::get('driver_min_withdraw_fcfa', 500);

        $data = $request->validate([
            'amount'       => ['required', 'integer', "min:{$minAmount}"],
            'callback_url' => ['nullable', 'url'], // optionnel : fallback sur config('app.frontend_url')
        ]);

        // URL de retour Fedapay : celle fournie OU celle dérivée de la config
        $callbackUrl = $data['callback_url']
            ?? rtrim(config('app.frontend_url', 'https://rmess-production.up.railway.app'), '/') . '/billing/return';

        $payment = \App\Models\Payment::create([
            'user_id'     => $driver->user_id,
            'type'        => \App\Models\Payment::TYPE_WALLET_DEPOSIT,
            'amount_fcfa' => $data['amount'],
            'currency'    => 'XOF',
            'status'      => \App\Models\Payment::STATUS_PENDING,
            'provider'    => \App\Models\Payment::PROVIDER_FEDAPAY,
            'description' => "RMess — Dépôt caution {$driver->first_name} {$driver->last_name}",
            'metadata'    => ['driver_id' => $driver->id],
        ]);

        try {
            $checkout = $fedapay->createCheckout(
                amountFcfa: $data['amount'],
                description: 'RMess — Dépôt caution livreur',
                customer: [
                    'email'     => $driver->user->email,
                    'firstname' => $driver->first_name,
                    'lastname'  => $driver->last_name,
                    'phone'     => $driver->user->phone,
                ],
                callbackUrl: $callbackUrl,
            );
        } catch (\Throwable $e) {
            $payment->update([
                'status'         => \App\Models\Payment::STATUS_FAILED,
                'failure_reason' => $e->getMessage(),
            ]);
            \Illuminate\Support\Facades\Log::warning('topUpWallet: Fedapay createCheckout failed', [
                'driver_id' => $driver->id,
                'err'       => $e->getMessage(),
            ]);
            return response()->json(['message' => 'Impossible de créer le paiement.'], 502);
        }

        $payment->update([
            'provider_ref' => $checkout['transaction_id'],
            'status'       => \App\Models\Payment::STATUS_PROCESSING,
        ]);

        return response()->json([
            'payment_id'   => $payment->id,
            'checkout_url' => $checkout['checkout_url'],
        ]);
    }

    /**
     * Création d'une demande de retrait. Le débit du wallet n'a pas lieu ici :
     * il attend la validation admin (étape 7).
     */
    public function requestWithdraw(Request $request): JsonResponse
    {
        $driver = $this->currentDriver($request);

        $minAmount = (int) \App\Models\AppSetting::get('driver_min_withdraw_fcfa', 500);

        $data = $request->validate([
            'amount'         => ['required', 'integer', "min:{$minAmount}"],
            'target_method'  => ['required', Rule::in([
                \App\Models\WalletWithdrawRequest::METHOD_MOMO,
                \App\Models\WalletWithdrawRequest::METHOD_BANK,
            ])],
            'target_account' => ['required', 'string', 'max:100'],
        ]);

        if ($driver->availability_status === 'busy') {
            return response()->json([
                'message' => 'Retrait impossible : vous avez une course en cours.',
            ], 422);
        }

        $existingPending = \App\Models\WalletWithdrawRequest::where('driver_id', $driver->id)
            ->where('status', \App\Models\WalletWithdrawRequest::STATUS_PENDING)
            ->exists();
        if ($existingPending) {
            return response()->json([
                'message' => 'Vous avez déjà une demande en attente. Annulez-la avant d\'en créer une nouvelle.',
            ], 422);
        }

        // ===== Plafonds anti-abus (cf. project_wallet_driver_todo #3) =====
        // count_* compte tous statuts (anti-spam), amount_* compte pending+approved (argent décaissé)
        $usage    = \App\Models\WalletWithdrawRequest::usageForDriver($driver->id);
        $maxDayN  = (int) \App\Models\AppSetting::get('driver_withdraw_max_per_day_count', 2);
        $maxWeekN = (int) \App\Models\AppSetting::get('driver_withdraw_max_per_week_count', 5);
        $maxDayA  = (int) \App\Models\AppSetting::get('driver_withdraw_max_per_day_fcfa', 30000);
        $maxWeekA = (int) \App\Models\AppSetting::get('driver_withdraw_max_per_week_fcfa', 100000);

        if ($usage['count_24h'] >= $maxDayN) {
            return response()->json([
                'message' => "Limite atteinte : {$maxDayN} demande(s) max par 24h. Réessayez plus tard.",
            ], 422);
        }
        if ($usage['count_7d'] >= $maxWeekN) {
            return response()->json([
                'message' => "Limite atteinte : {$maxWeekN} demande(s) max par 7 jours. Réessayez la semaine prochaine.",
            ], 422);
        }
        if ($usage['amount_24h'] + $data['amount'] > $maxDayA) {
            $reste = max(0, $maxDayA - $usage['amount_24h']);
            return response()->json([
                'message' => "Plafond 24h dépassé. Reste disponible aujourd'hui : " . number_format($reste, 0, ',', ' ') . " FCFA.",
            ], 422);
        }
        if ($usage['amount_7d'] + $data['amount'] > $maxWeekA) {
            $reste = max(0, $maxWeekA - $usage['amount_7d']);
            return response()->json([
                'message' => "Plafond 7 jours dépassé. Reste disponible cette semaine : " . number_format($reste, 0, ',', ' ') . " FCFA.",
            ], 422);
        }

        $wallet = \App\Models\DriverWallet::firstOrCreate(['driver_id' => $driver->id]);
        if ($data['amount'] > $wallet->balance) {
            return response()->json([
                'message' => "Solde insuffisant : caution={$wallet->balance} FCFA, demandé={$data['amount']} FCFA.",
            ], 422);
        }

        $req = \App\Models\WalletWithdrawRequest::create([
            'driver_id'      => $driver->id,
            'amount_fcfa'    => $data['amount'],
            'target_method'  => $data['target_method'],
            'target_account' => $data['target_account'],
            'status'         => \App\Models\WalletWithdrawRequest::STATUS_PENDING,
        ]);

        return response()->json([
            'message' => 'Demande de retrait créée. Vous serez notifié(e) dès qu\'un admin la traite.',
            'request' => $req,
        ], 201);
    }

    /**
     * Annulation par le driver de sa propre demande pending (avant validation admin).
     */
    public function cancelWithdraw(Request $request, \App\Models\WalletWithdrawRequest $withdraw): JsonResponse
    {
        $driver = $this->currentDriver($request);

        if ($withdraw->driver_id !== $driver->id) {
            return response()->json(['message' => 'Cette demande ne vous appartient pas.'], 403);
        }
        if ($withdraw->status !== \App\Models\WalletWithdrawRequest::STATUS_PENDING) {
            return response()->json([
                'message' => "Annulation impossible (statut actuel: {$withdraw->status}).",
            ], 422);
        }

        $withdraw->update(['status' => \App\Models\WalletWithdrawRequest::STATUS_CANCELLED]);

        return response()->json([
            'message' => 'Demande annulée.',
            'request' => $withdraw->fresh(),
        ]);
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
        $driver = $this->currentDriver($request, requireActive: true);

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

        // Garde-fou anti-fraude sur les "client injoignable" : on exige
        // au moins N tentatives d'appel enregistrées. Le driver peut les
        // corriger manuellement s'il a appelé depuis son tel perso, avec
        // note justificative — cf. patchContactAttempts().
        if ($data['type'] === 'recipient_unreachable'
            && (int) $course->contact_attempts < self::MIN_CONTACT_ATTEMPTS_FOR_UNREACHABLE) {
            return response()->json([
                'message' => "Signalez au moins " . self::MIN_CONTACT_ATTEMPTS_FOR_UNREACHABLE
                    . " tentatives d'appel avant de déclarer le client injoignable.",
                'contact_attempts' => (int) $course->contact_attempts,
                'required'         => self::MIN_CONTACT_ATTEMPTS_FOR_UNREACHABLE,
            ], 422);
        }

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

        // Cas 4 — Client refuse : bascule automatique en course retour.
        // On génère un return_code (l'équivalent du delivery_code pour la remise
        // au marchand) et on notifie le marchand pour qu'il l'ait avant l'arrivée
        // du driver. Idempotent : si la course est déjà en returning_to_sender,
        // on ne re-génère pas.
        if ($data['type'] === 'recipient_refused'
            && $course->status === Course::STATUS_AT_DROPOFF) {
            DB::transaction(function () use ($course, $driver) {
                $previousStatus       = $course->status;
                $course->status       = Course::STATUS_RETURNING_TO_SENDER;
                $course->is_return_trip = true;
                $course->return_code  = Course::generateCode();
                $course->save();

                CourseStatusHistory::create([
                    'course_id'       => $course->id,
                    'from_status'     => $previousStatus,
                    'to_status'       => Course::STATUS_RETURNING_TO_SENDER,
                    'reason'          => 'recipient_refused_return',
                    'changed_by_id'   => $driver->user_id,
                    'changed_by_type' => 'driver',
                    'metadata'        => [
                        'return_code' => $course->return_code,
                    ],
                ]);
            });

            // Notif marchand avec le return_code (à donner au driver à réception).
            $notifier->sendToUser(
                $course->sender_id,
                'course.return_initiated',
                '🔄 Colis refusé — retour en cours',
                "Le client a refusé le colis. Le livreur revient. Code à lui donner : {$course->return_code}",
                ['reference' => $course->reference, 'return_code' => $course->return_code],
                $course->id,
            );
        } else {
            // Prévenir le marchand expéditeur (flow générique, hors cas 4)
            $notifier->sendToUser(
                $course->sender_id,
                'course.incident',
                '⚠️ Incident signalé',
                "Un incident a été signalé sur votre course {$course->reference}.",
                ['reference' => $course->reference, 'incident_type' => $data['type']],
                $course->id,
            );
        }

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

    // ===== 8. TENTATIVES D'APPEL DU DESTINATAIRE (Cas 3) =====

    /**
     * Incrément silencieux : appelé automatiquement par l'app driver au tap
     * "Appeler le destinataire" (avant l'ouverture du composeur tel://).
     * Idempotent au sens strict non (chaque tap compte) mais rate-limité
     * côté serveur : max 1 incrément toutes les 30 secondes pour éviter
     * qu'un tap répété gonfle artificiellement le compteur.
     */
    public function registerCallAttempt(Request $request, Course $course): JsonResponse
    {
        $driver = $this->currentDriver($request, requireActive: true);

        if ($course->driver_id !== $driver->id) {
            return response()->json(['message' => 'Course non assignée à vous.'], 403);
        }

        if ($course->isTerminal()) {
            return response()->json(['message' => 'Course déjà clôturée.'], 422);
        }

        // Rate-limit : 30s entre deux increments auto pour éviter
        // qu'un tap accidentel × 5 fasse sauter le compteur à +5.
        if ($course->last_contact_attempt_at
            && $course->last_contact_attempt_at->diffInSeconds(now()) < 30) {
            return response()->json([
                'message'          => 'Attendez avant de réessayer.',
                'contact_attempts' => (int) $course->contact_attempts,
            ]);
        }

        $course->increment('contact_attempts');
        $course->last_contact_attempt_at = now();
        $course->save();

        return response()->json([
            'contact_attempts'        => (int) $course->contact_attempts,
            'last_contact_attempt_at' => $course->last_contact_attempt_at?->toIso8601String(),
        ]);
    }

    /**
     * Correction manuelle du compteur (le livreur peut avoir appelé depuis
     * son téléphone perso plutôt que via l'app).
     * Une note justificative est exigée si le nouveau nombre EST SUPÉRIEUR
     * au compteur auto — pour tracer les cas de "j'ai vraiment appelé, promis"
     * et permettre à l'ops de recouper si un pattern d'abus apparaît.
     */
    public function patchContactAttempts(Request $request, Course $course): JsonResponse
    {
        $driver = $this->currentDriver($request, requireActive: true);

        if ($course->driver_id !== $driver->id) {
            return response()->json(['message' => 'Course non assignée à vous.'], 403);
        }

        if ($course->isTerminal()) {
            return response()->json(['message' => 'Course déjà clôturée.'], 422);
        }

        $data = $request->validate([
            'contact_attempts' => ['required', 'integer', 'min:0', 'max:20'],
            'note'             => ['nullable', 'string', 'max:500'],
        ]);

        $previous = (int) $course->contact_attempts;
        $new      = (int) $data['contact_attempts'];

        // On exige une note si le driver augmente le compteur (potentiel abus).
        // Baisser le compteur n'a aucun intérêt de fraude côté driver, donc pas
        // de contrainte.
        if ($new > $previous && empty($data['note'])) {
            throw ValidationException::withMessages([
                'note' => ['Précisez pourquoi vous augmentez le compteur (ex : "appels depuis mon tel perso").'],
            ]);
        }

        DB::transaction(function () use ($course, $new, $previous, $data, $driver) {
            $course->contact_attempts = $new;
            $course->last_contact_attempt_at = now();
            $course->save();

            // Trace dans l'historique de la course pour que l'ops voie
            // la correction lors d'un arbitrage.
            CourseStatusHistory::create([
                'course_id'       => $course->id,
                'from_status'     => $course->status,
                'to_status'       => $course->status,
                'reason'          => 'contact_attempts_manual_edit',
                'changed_by_id'   => $driver->user_id,
                'changed_by_type' => 'driver',
                'metadata'        => [
                    'previous' => $previous,
                    'new'      => $new,
                    'note'     => $data['note'] ?? null,
                ],
            ]);
        });

        return response()->json([
            'message'                 => 'Compteur mis à jour.',
            'contact_attempts'        => (int) $course->contact_attempts,
            'last_contact_attempt_at' => $course->last_contact_attempt_at?->toIso8601String(),
        ]);
    }

}
