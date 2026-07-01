<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ApiApplication;
use App\Models\Marchant;
use App\Models\Payment;
use App\Models\SubscriptionPlan;
use App\Services\FedapayService;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class SubscriptionController extends Controller
{
    /**
     * Liste publique des plans (pour la page pricing).
     */
    public function plans(): JsonResponse
    {
        return response()->json([
            'plans' => SubscriptionPlan::where('is_active', true)
                ->orderBy('sort_order')
                ->get(),
        ]);
    }

    /**
     * Crée une transaction Fedapay et renvoie l'URL hébergée.
     */
    public function checkout(Request $request, FedapayService $fedapay): JsonResponse
    {
        $data = $request->validate([
            'plan_code'   => ['required', 'string', 'exists:subscription_plans,code'],
            'callback_url'=> ['required', 'url'],
        ]);

        $user = $request->user();
        if (! ($user->isMarchant() || $user->isIndividual())) {
            return response()->json(['message' => 'Réservé aux marchands et particuliers.'], 403);
        }
        if ($user->isMarchant() && ! $user->marchant) {
            return response()->json(['message' => 'Profil marchand incomplet.'], 403);
        }
        if ($user->isIndividual() && ! $user->individual) {
            return response()->json(['message' => 'Profil particulier incomplet.'], 403);
        }

        $plan = SubscriptionPlan::where('code', $data['plan_code'])->firstOrFail();

        // Pas la peine de payer pour le plan gratuit
        if ($plan->monthly_price_fcfa === 0) {
            return response()->json(['message' => 'Ce plan est gratuit.'], 422);
        }

        // On crée le Payment AVANT d'appeler Fedapay → si Fedapay rate, on a une trace
        $payment = Payment::create([
            'user_id'      => $user->id,
            'type'         => Payment::TYPE_SUBSCRIPTION,
            'amount_fcfa'  => $plan->monthly_price_fcfa,
            'currency'     => 'XOF',
            'status'       => Payment::STATUS_PENDING,
            'provider'     => Payment::PROVIDER_FEDAPAY,
            'description'  => "Abonnement {$plan->name} — " . (
                $user->isMarchant()
                    ? $user->marchant->raison_sociale
                    : trim("{$user->individual->first_name} {$user->individual->last_name}")
            ),
            'metadata'     => [
                'plan_code' => $plan->code,
                'plan_name' => $plan->name,
            ],
        ]);

        try {
            $checkout = $fedapay->createCheckout(
                amountFcfa: $plan->monthly_price_fcfa,
                description: "RMess — Abonnement {$plan->name}",
                customer: [
                    'email'     => $user->email,
                    'firstname' => $user->name,
                    'phone'     => $user->phone,
                ],
                callbackUrl: $data['callback_url'],
            );
        } catch (\Throwable $e) {
            $payment->update([
                'status'         => Payment::STATUS_FAILED,
                'failure_reason' => $e->getMessage(),
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
        ]);
    }

    /**
     * Webhook public — Fedapay nous notifie quand un paiement aboutit (ou échoue).
     */
    public function webhook(
        Request $request,
        FedapayService $fedapay,
        NotificationService $notifier,
        \App\Services\CourseBillingService $billing,
        \App\Services\DriverWalletService $walletService,
        \App\Services\UserWalletService $userWalletService,
    ): JsonResponse {
        // 1. Vérifier la signature
        $rawPayload = $request->getContent();
        $signature  = $request->header('X-FedaPay-Signature');

        if (! $fedapay->verifyWebhookSignature($rawPayload, $signature)) {
            Log::warning('Fedapay webhook : signature invalide', ['signature' => $signature]);
            return response()->json(['message' => 'Signature invalide.'], 403);
        }

        // 2. Lire le payload
        $payload = $request->json()->all();
        $tx      = $payload['entity'] ?? null;
        $event   = $payload['name'] ?? null;        // ex: 'transaction.approved' ou 'payout.approved'
        $txId    = $tx['id'] ?? null;

        if (! $txId) {
            return response()->json(['message' => 'Payload incomplet.'], 400);
        }

        // 2bis. Si l'event est un payout, on route vers une logique séparée
        // (les payouts matchent un WalletWithdrawRequest, pas un Payment).
        if (is_string($event) && str_starts_with($event, 'payout.')) {
            return $this->handlePayoutWebhook($event, $tx, $txId, $notifier);
        }

        // 3. Idempotence : si on a déjà traité, stop
        $payment = Payment::where('provider_ref', (string) $txId)->first();
        if (! $payment) {
            Log::warning('Fedapay webhook : Payment introuvable', ['tx_id' => $txId]);
            return response()->json(['message' => 'Inconnu.'], 200); // 200 sinon Fedapay retry à l'infini
        }
        if ($payment->isPaid()) {
            return response()->json(['message' => 'Déjà traité.'], 200);
        }

        // 4. Selon l'événement
        if ($event === 'transaction.approved' || ($tx['status'] ?? null) === 'approved') {
            DB::transaction(function () use ($payment, $tx, $notifier, $billing, $walletService, $userWalletService) {
                $payment->update([
                    'status'       => Payment::STATUS_PAID,
                    'paid_at'      => now(),
                    'raw_response' => $tx,
                ]);

                $user = $payment->user;

                if ($payment->type === Payment::TYPE_SUBSCRIPTION) {
                    $planCode = $payment->metadata['plan_code'] ?? null;
                    if ($planCode) {
                        $update = [
                            'subscription_plan'            => $planCode,
                            'subscription_status'          => 'active',
                            'subscription_started_at'      => now(),
                            'subscription_next_billing_at' => now()->addMonth(),
                        ];
                        // Le profil métier à mettre à jour dépend du type d'user
                        if ($user->isMarchant() && $user->marchant) {
                            $user->marchant->update($update);
                        } elseif ($user->isIndividual() && $user->individual) {
                            $user->individual->update($update);
                        }
                    }
                    $notifier->sendToUser(
                        $user->id,
                        'subscription.activated',
                        '🎉 Abonnement activé',
                        "Votre abonnement " . ($payment->metadata['plan_name'] ?? '') . " est actif. Merci !",
                        ['payment_id' => $payment->id],
                        null,
                    );
                }
                 elseif ($payment->type === Payment::TYPE_DELIVERY_FEE) {
                    // Course one-shot du particulier : on crée la course maintenant
                    $billing->finalizeOneShotCourse($payment, $notifier);
                }
                 elseif ($payment->type === Payment::TYPE_WALLET_DEPOSIT) {
                    // Top-up caution driver : on crédite le wallet via le service
                    if ($user->isDriver() && $user->driver) {
                        $walletService->deposit($user->driver, (int) $payment->amount_fcfa, $payment);

                        $notifier->sendToUser(
                            $user->id,
                            'wallet.deposited',
                            '💰 Caution rechargée',
                            'Votre caution a été créditée de ' . number_format($payment->amount_fcfa, 0, ',', ' ') . ' FCFA.',
                            ['payment_id' => $payment->id, 'amount' => $payment->amount_fcfa],
                            null,
                        );
                    } else {
                        \Illuminate\Support\Facades\Log::warning('wallet_deposit payment for non-driver user', [
                            'payment_id' => $payment->id,
                            'user_id'    => $user->id,
                            'user_type'  => $user->type,
                        ]);
                    }
                }
                 elseif ($payment->type === Payment::TYPE_API_APP_ACTIVATION) {
                    // Activation / renouvellement d'un plan API dev.
                    $appId  = $payment->metadata['api_application_id'] ?? null;
                    $planId = $payment->metadata['plan_id'] ?? null;
                    if ($appId && $planId) {
                        $app = ApiApplication::find($appId);
                        $plan = SubscriptionPlan::find($planId);
                        if ($app && $plan && $plan->is_api_plan) {
                            // Prolonge de 30 jours à partir de max(paid_until, now)
                            // pour ne pas perdre les jours restants si renouvellement anticipé.
                            $base = $app->paid_until && $app->paid_until->isFuture()
                                ? $app->paid_until
                                : now();

                            $app->update([
                                'subscription_plan_id' => $plan->id,
                                'paid_until'           => $base->copy()->addDays(30),
                                'status'               => ApiApplication::STATUS_ACTIVE,
                            ]);

                            $notifier->sendToUser(
                                $user->id,
                                'api_app.activated',
                                '⚡ Plan API activé',
                                "Ton plan {$plan->name} est actif jusqu'au " . $app->fresh()->paid_until->translatedFormat('d F Y') . '.',
                                ['api_application_id' => $app->id, 'payment_id' => $payment->id],
                                null,
                            );
                        }
                    }
                }
                 elseif ($payment->type === Payment::TYPE_USER_WALLET_DEPOSIT) {
                    // Top-up wallet marchand/particulier
                    if ($user->isMarchant() || $user->isIndividual()) {
                        $userWalletService->deposit($user, (int) $payment->amount_fcfa, $payment);

                        $notifier->sendToUser(
                            $user->id,
                            'wallet.deposited',
                            '💰 Wallet rechargé',
                            'Votre wallet a été crédité de ' . number_format($payment->amount_fcfa, 0, ',', ' ') . ' FCFA.',
                            ['payment_id' => $payment->id, 'amount' => $payment->amount_fcfa],
                            null,
                        );
                    } else {
                        \Illuminate\Support\Facades\Log::warning('user_wallet_deposit payment for non-payer user', [
                            'payment_id' => $payment->id,
                            'user_id'    => $user->id,
                            'user_type'  => $user->type,
                        ]);
                    }
                }
            });
        } elseif (in_array($event, ['transaction.canceled', 'transaction.declined'], true)) {
            $payment->update([
                'status'         => Payment::STATUS_FAILED,
                'failure_reason' => $tx['status'] ?? $event,
                'raw_response'   => $tx,
            ]);
        }

        return response()->json(['message' => 'OK']);
    }

    /**
     * Webhook FedaPay pour les events payout.* (virements sortants).
     * Match le WalletWithdrawRequest via payout_provider_ref.
     *
     *  - payout.approved/processed → remplit paid_at + external_payout_reference + notif driver
     *  - payout.failed/canceled   → flag payout_failed_at + raison, admin peut retenter
     */
    private function handlePayoutWebhook(
        string $event,
        array $tx,
        $txId,
        NotificationService $notifier,
    ): JsonResponse {
        $withdraw = \App\Models\WalletWithdrawRequest::where('payout_provider_ref', (string) $txId)->first();
        if (! $withdraw) {
            Log::warning('Fedapay payout webhook : WithdrawRequest introuvable', ['payout_id' => $txId, 'event' => $event]);
            return response()->json(['message' => 'Inconnu.'], 200);
        }

        // Idempotence : déjà payé via webhook ?
        if ($withdraw->isPaid() && in_array($event, ['payout.approved', 'payout.processed'], true)) {
            return response()->json(['message' => 'Déjà traité.'], 200);
        }

        if (in_array($event, ['payout.approved', 'payout.processed'], true)) {
            DB::transaction(function () use ($withdraw, $tx, $notifier) {
                $withdraw->update([
                    'paid_at'                  => now(),
                    'external_payout_reference' => $tx['reference'] ?? ('fedapay:' . $tx['id']),
                    'paid_by_admin_id'         => $withdraw->decided_by_admin_id, // payout auto = même admin qui a approuvé
                    'payout_failed_at'         => null,
                    'payout_failure_reason'    => null,
                ]);

                $notifier->sendToUser(
                    $withdraw->driver->user_id,
                    'wallet.withdraw_paid',
                    '✅ Virement effectué',
                    "Votre retrait de " . number_format($withdraw->amount_fcfa, 0, ',', ' ') . " FCFA a été viré automatiquement.",
                    ['withdraw_id' => $withdraw->id, 'reference' => $withdraw->external_payout_reference],
                    null,
                );
            });
        } elseif (in_array($event, ['payout.failed', 'payout.canceled', 'payout.declined'], true)) {
            $withdraw->update([
                'payout_failed_at'      => now(),
                'payout_failure_reason' => $tx['failure_reason'] ?? $tx['status'] ?? $event,
            ]);
            Log::warning('Fedapay payout failed', [
                'withdraw_id' => $withdraw->id,
                'event'       => $event,
                'tx'          => $tx,
            ]);
        }

        return response()->json(['message' => 'OK']);
    }
}
