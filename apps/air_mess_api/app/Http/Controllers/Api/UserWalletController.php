<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AppSetting;
use App\Models\Payment;
use App\Models\UserWallet;
use App\Models\UserWalletTransaction;
use App\Services\FedapayService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

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

        return response()->json([
            'balance'              => (int) $wallet->balance,
            'pending_reserved'     => (int) $wallet->pending_reserved,
            'available'            => $wallet->available(),
            'total_deposited'      => (int) $wallet->total_deposited,
            'total_spent'          => (int) $wallet->total_spent,
            'min_recommended_fcfa' => $minRecommended,
            'is_low'               => $wallet->balance < $minRecommended,
            'recent_transactions'  => $recentTransactions,
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
