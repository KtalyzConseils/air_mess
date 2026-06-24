<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
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
        $event   = $payload['name'] ?? null;        // ex: 'transaction.approved'
        $txId    = $tx['id'] ?? null;

        if (! $txId) {
            return response()->json(['message' => 'Payload incomplet.'], 400);
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
}
