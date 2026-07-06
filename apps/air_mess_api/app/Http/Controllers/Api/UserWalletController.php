<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AppSetting;
use App\Models\Payment;
use App\Models\UserWallet;
use App\Models\UserWalletTransaction;
use App\Models\WalletWithdrawRequest;
use App\Services\FedapayService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;

/**
 * Wallet payeur (marchand + particulier).
 *  - GET  /me/wallet              → état courant + historique
 *  - POST /me/wallet/top-up       → initier un top-up Fedapay (crédit via webhook)
 *
 * Drivers ont leur propre wallet (DriverController::wallet), ce controller ne les sert pas.
 */
class UserWalletController extends Controller
{
    /**
     * État du wallet + 20 dernières transactions + indicateurs.
     */
    public function show(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user->isMarchant() && ! $user->isIndividual()) {
            return response()->json(['message' => 'Ce wallet est réservé aux marchands et particuliers.'], 403);
        }

        // Lazy-create : tous les marchands/particuliers existants ont été backfillés,
        // mais on protège quand même contre un état incohérent.
        $wallet = UserWallet::firstOrCreate(['user_id' => $user->id]);

        $recentTransactions = UserWalletTransaction::where('user_id', $user->id)
            ->with('course:id,reference')
            ->orderByDesc('created_at')
            ->limit(20)
            ->get(['id', 'type', 'amount_fcfa', 'balance_after', 'course_id', 'created_at']);

        $minRecommended = (int) AppSetting::get('user_wallet_min_recommended_fcfa', 5000);

        // Payout marchand : on renvoie la même surface que le wallet driver pour
        // permettre à l'UI d'afficher plafonds + demande pending le cas échéant.
        $pendingWithdraw = WalletWithdrawRequest::where('user_id', $user->id)
            ->where('status', WalletWithdrawRequest::STATUS_PENDING)
            ->first(['id', 'amount_fcfa', 'target_method', 'target_account', 'created_at']);

        $withdrawLimits = [
            'max_per_day_count'  => (int) AppSetting::get('user_withdraw_max_per_day_count', 2),
            'max_per_week_count' => (int) AppSetting::get('user_withdraw_max_per_week_count', 5),
            'max_per_day_fcfa'   => (int) AppSetting::get('user_withdraw_max_per_day_fcfa', 100000),
            'max_per_week_fcfa'  => (int) AppSetting::get('user_withdraw_max_per_week_fcfa', 300000),
            'used'               => WalletWithdrawRequest::usageForUser($user->id),
        ];

        return response()->json([
            'balance'              => (int) $wallet->balance,
            'pending_reserved'     => (int) $wallet->pending_reserved,
            'available'            => $wallet->available(),
            'total_deposited'      => (int) $wallet->total_deposited,
            'total_spent'          => (int) $wallet->total_spent,
            'min_recommended_fcfa' => $minRecommended,
            'min_withdraw_fcfa'    => (int) AppSetting::get('user_min_withdraw_fcfa', 1000),
            'is_low'               => $wallet->balance < $minRecommended,
            'recent_transactions'  => $recentTransactions,
            'pending_withdraw_request' => $pendingWithdraw,
            'withdraw_limits'      => $withdrawLimits,
        ]);
    }

    /**
     * Le marchand/particulier demande un retrait de son wallet vers momo ou banque.
     * Le débit n'a lieu QU'au moment de l'approbation admin (cf. UserWalletService::withdraw).
     * Une seule demande pending à la fois par user (garde-fou anti double-décaissement).
     */
    public function requestWithdraw(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user->isMarchant() && ! $user->isIndividual()) {
            return response()->json(['message' => 'Ce wallet est réservé aux marchands et particuliers.'], 403);
        }

        $minAmount = (int) AppSetting::get('user_min_withdraw_fcfa', 1000);

        $data = $request->validate([
            'amount'         => ['required', 'integer', "min:{$minAmount}"],
            'target_method'  => ['required', Rule::in([
                WalletWithdrawRequest::METHOD_MOMO,
                WalletWithdrawRequest::METHOD_BANK,
            ])],
            'target_account' => ['required', 'string', 'max:100'],
        ]);

        // Une seule demande pending à la fois (empêche le double-décaissement
        // par plusieurs approbations simultanées).
        $existingPending = WalletWithdrawRequest::where('user_id', $user->id)
            ->where('status', WalletWithdrawRequest::STATUS_PENDING)
            ->exists();
        if ($existingPending) {
            return response()->json([
                'message' => 'Vous avez déjà une demande en attente. Annulez-la avant d\'en créer une nouvelle.',
            ], 422);
        }

        // Plafonds anti-abus (même modèle que le driver, valeurs séparées côté settings).
        // count_* compte tous statuts, amount_* compte pending+approved uniquement.
        $usage    = WalletWithdrawRequest::usageForUser($user->id);
        $maxDayN  = (int) AppSetting::get('user_withdraw_max_per_day_count', 2);
        $maxWeekN = (int) AppSetting::get('user_withdraw_max_per_week_count', 5);
        $maxDayA  = (int) AppSetting::get('user_withdraw_max_per_day_fcfa', 100000);
        $maxWeekA = (int) AppSetting::get('user_withdraw_max_per_week_fcfa', 300000);

        if ($usage['count_24h'] >= $maxDayN) {
            return response()->json([
                'message' => "Limite atteinte : {$maxDayN} demande(s) max par 24h. Réessayez plus tard.",
            ], 422);
        }
        if ($usage['count_7d'] >= $maxWeekN) {
            return response()->json([
                'message' => "Limite atteinte : {$maxWeekN} demande(s) max par 7 jours.",
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

        // Vérifie que le disponible actuel couvre le retrait.
        // (Les holds courses ne sont pas débités par un retrait.)
        $wallet = UserWallet::firstOrCreate(['user_id' => $user->id]);
        $available = $wallet->available();
        if ($data['amount'] > $available) {
            return response()->json([
                'message' => "Solde disponible insuffisant : disponible={$available} FCFA, demandé={$data['amount']} FCFA.",
            ], 422);
        }

        $req = WalletWithdrawRequest::create([
            'user_id'        => $user->id,
            'amount_fcfa'    => $data['amount'],
            'target_method'  => $data['target_method'],
            'target_account' => $data['target_account'],
            'status'         => WalletWithdrawRequest::STATUS_PENDING,
        ]);

        return response()->json([
            'message' => 'Demande de retrait créée. Un admin la traitera sous 24h ouvrées.',
            'request' => $req,
        ], 201);
    }

    /**
     * Annulation par le user de sa propre demande pending (avant décision admin).
     */
    public function cancelWithdraw(Request $request, WalletWithdrawRequest $withdraw): JsonResponse
    {
        $user = $request->user();

        if ($withdraw->user_id !== $user->id) {
            return response()->json(['message' => 'Cette demande ne vous appartient pas.'], 403);
        }
        if ($withdraw->status !== WalletWithdrawRequest::STATUS_PENDING) {
            return response()->json([
                'message' => "Annulation impossible (statut actuel: {$withdraw->status}).",
            ], 422);
        }

        $withdraw->update(['status' => WalletWithdrawRequest::STATUS_CANCELLED]);

        return response()->json([
            'message' => 'Demande annulée.',
            'request' => $withdraw->fresh(),
        ]);
    }

    /**
     * Demande de top-up : crée un Payment pending + checkout Fedapay.
     * Le wallet est crédité UNIQUEMENT par le webhook (anti-fraude).
     */
    public function topUp(Request $request, FedapayService $fedapay): JsonResponse
    {
        $user = $request->user();

        if (! $user->isMarchant() && ! $user->isIndividual()) {
            return response()->json(['message' => 'Ce wallet est réservé aux marchands et particuliers.'], 403);
        }

        // Min de top-up = même seuil que le min recommandé (évite les top-ups dérisoires).
        $minRecommended = (int) AppSetting::get('user_wallet_min_recommended_fcfa', 5000);
        $minTopUp = 500; // plancher absolu — on tolère les petits ajustements

        $data = $request->validate([
            'amount'       => ['required', 'integer', "min:{$minTopUp}"],
            'callback_url' => ['nullable', 'url'],
        ]);

        $callbackUrl = $data['callback_url']
            ?? rtrim(config('app.frontend_url', 'https://rmess-production.up.railway.app'), '/') . '/billing/return';

        $payment = Payment::create([
            'user_id'     => $user->id,
            'type'        => Payment::TYPE_USER_WALLET_DEPOSIT,
            'amount_fcfa' => $data['amount'],
            'currency'    => 'XOF',
            'status'      => Payment::STATUS_PENDING,
            'provider'    => Payment::PROVIDER_FEDAPAY,
            'description' => "RMess — Rechargement wallet {$user->name}",
        ]);

        try {
            $checkout = $fedapay->createCheckout(
                amountFcfa: $data['amount'],
                description: 'RMess — Rechargement wallet',
                customer: [
                    'email'     => $user->email,
                    'firstname' => $user->name,
                    'phone'     => $user->phone,
                ],
                callbackUrl: $callbackUrl,
            );
        } catch (\Throwable $e) {
            $payment->update([
                'status'         => Payment::STATUS_FAILED,
                'failure_reason' => $e->getMessage(),
            ]);
            Log::warning('UserWallet topUp: Fedapay createCheckout failed', [
                'user_id' => $user->id,
                'err'     => $e->getMessage(),
            ]);
            return response()->json(['message' => 'Impossible de créer le paiement.'], 502);
        }

        $payment->update([
            'provider_ref' => $checkout['transaction_id'],
            'status'       => Payment::STATUS_PROCESSING,
        ]);

        return response()->json([
            'payment_id'   => $payment->id,
            'checkout_url' => $checkout['checkout_url'],
            'amount'       => $data['amount'],
            'min_recommended' => $minRecommended,
        ]);
    }
}
