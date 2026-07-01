<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ApiApplication;
use App\Models\Payment;
use App\Models\SubscriptionPlan;
use App\Services\FedapayService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

/**
 * Gestion des apps dev par le user propriétaire (marchand ou particulier).
 *
 *   GET    /me/api-apps           liste
 *   POST   /me/api-apps           créer (choix du plan)
 *   GET    /me/api-apps/{app}     détail (avec quota utilisé)
 *   PATCH  /me/api-apps/{app}     renommer / changer de plan
 *   DELETE /me/api-apps/{app}     supprimer (cascade sur les tokens)
 *
 * NB : la génération de clés se fait par un contrôleur séparé
 * (`ApiApplicationKeyController`) pour garder les responsabilités propres.
 */
class MyApiApplicationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $apps = $request->user()
            ->apiApplications()
            ->with('plan')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (ApiApplication $a) => $this->present($a));

        return response()->json(['data' => $apps]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'                 => 'required|string|max:100',
            'description'          => 'nullable|string|max:500',
            'subscription_plan_id' => 'required|integer|exists:subscription_plans,id',
        ]);

        $plan = SubscriptionPlan::findOrFail($data['subscription_plan_id']);
        if (! $plan->is_api_plan) {
            return response()->json([
                'message' => 'Ce plan ne peut pas être utilisé pour une app API.',
            ], 422);
        }

        $app = $request->user()->apiApplications()->create([
            'subscription_plan_id'    => $plan->id,
            'name'                    => $data['name'],
            'description'             => $data['description'] ?? null,
            'status'                  => ApiApplication::STATUS_ACTIVE,
            'quota_used'              => 0,
            'quota_period_started_at' => Carbon::now()->startOfMonth(),
        ]);

        return response()->json(['data' => $this->present($app->load('plan'))], 201);
    }

    public function show(Request $request, ApiApplication $app): JsonResponse
    {
        $this->authorizeOwnership($request, $app);

        return response()->json(['data' => $this->present($app->load('plan'))]);
    }

    public function update(Request $request, ApiApplication $app): JsonResponse
    {
        $this->authorizeOwnership($request, $app);

        $data = $request->validate([
            'name'                 => 'sometimes|required|string|max:100',
            'description'          => 'sometimes|nullable|string|max:500',
            'subscription_plan_id' => 'sometimes|required|integer|exists:subscription_plans,id',
        ]);

        if (isset($data['subscription_plan_id'])) {
            $plan = SubscriptionPlan::findOrFail($data['subscription_plan_id']);
            if (! $plan->is_api_plan) {
                return response()->json([
                    'message' => 'Ce plan ne peut pas être utilisé pour une app API.',
                ], 422);
            }
            // Un changement de plan ne reset PAS le compteur en cours de mois :
            // c'est le comportement le plus prévisible côté client (upgrade
            // instantané, downgrade prend effet le mois suivant).
        }

        $app->update($data);

        return response()->json(['data' => $this->present($app->fresh('plan'))]);
    }

    public function destroy(Request $request, ApiApplication $app): JsonResponse
    {
        $this->authorizeOwnership($request, $app);

        // Révoque tous les tokens Sanctum liés (relation polymorphe).
        $app->tokens()->delete();
        $app->delete();

        return response()->json(['deleted' => true]);
    }

    /**
     * Souscription / renouvellement d'un plan API payant.
     *
     * Cas de figure :
     *   - Plan gratuit (prix 0) → activation immédiate, `paid_until = null`.
     *   - Plan payant → crée un Payment(type=api_app_activation) + checkout
     *     Fedapay ; l'activation effective (mise à jour `paid_until`) se fera
     *     au retour du webhook Fedapay (SubscriptionController::webhook).
     */
    public function subscribe(Request $request, ApiApplication $app, FedapayService $fedapay): JsonResponse
    {
        $this->authorizeOwnership($request, $app);

        $data = $request->validate([
            'plan_code'   => 'required|string|exists:subscription_plans,code',
            'callback_url' => 'required|url',
        ]);

        $plan = SubscriptionPlan::where('code', $data['plan_code'])->firstOrFail();
        if (! $plan->is_api_plan) {
            return response()->json(['message' => "Ce plan n'est pas un plan API."], 422);
        }

        // Plan gratuit → activation instantanée.
        if ((int) $plan->monthly_price_fcfa === 0) {
            $app->update([
                'subscription_plan_id' => $plan->id,
                'paid_until'           => null,
                'status'               => ApiApplication::STATUS_ACTIVE,
            ]);
            return response()->json([
                'message' => 'Plan activé.',
                'app'     => $this->present($app->fresh('plan')),
            ]);
        }

        // Plan payant → checkout Fedapay.
        $user = $request->user();
        $payment = Payment::create([
            'user_id'     => $user->id,
            'type'        => Payment::TYPE_API_APP_ACTIVATION,
            'amount_fcfa' => $plan->monthly_price_fcfa,
            'currency'    => 'XOF',
            'status'      => Payment::STATUS_PENDING,
            'provider'    => Payment::PROVIDER_FEDAPAY,
            'description' => "Air Mess — Plan API {$plan->name} ({$app->name})",
            'metadata'    => [
                'api_application_id' => $app->id,
                'plan_id'            => $plan->id,
                'plan_code'          => $plan->code,
                'plan_name'          => $plan->name,
            ],
        ]);

        try {
            $checkout = $fedapay->createCheckout(
                amountFcfa: $plan->monthly_price_fcfa,
                description: "Air Mess — Plan API {$plan->name}",
                customer: [
                    'email'     => $user->email,
                    'firstname' => $user->name ?? $user->email,
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

    // ─── Helpers ────────────────────────────────────────────────────────

    private function authorizeOwnership(Request $request, ApiApplication $app): void
    {
        if ($app->user_id !== $request->user()->id) {
            abort(404);
        }
    }

    private function present(ApiApplication $app): array
    {
        // Reset paresseux avant d'exposer le compteur — évite d'afficher
        // 15/15 en juillet si la dernière requête date de juin.
        $app->resetPeriodIfNeeded();

        $limit = $app->monthlyLimit();

        return [
            'id'                      => $app->id,
            'name'                    => $app->name,
            'description'             => $app->description,
            'status'                  => $app->status,
            'quota_used'              => (int) $app->quota_used,
            'quota_limit'             => $limit,        // 0 = illimité
            'quota_remaining'         => $app->remainingQuota(),
            'quota_period_started_at' => $app->quota_period_started_at?->toIso8601String(),
            'paid_until'              => $app->paid_until?->toIso8601String(),
            'is_expired'              => $app->paid_until !== null && $app->paid_until->isPast(),
            'webhook_url'             => $app->webhook_url,     // null si non configuré
            'has_webhook'             => $app->hasWebhookConfigured(),
            'plan'                    => $app->plan ? [
                'id'                   => $app->plan->id,
                'code'                 => $app->plan->code,
                'name'                 => $app->plan->name,
                'monthly_price_fcfa'   => (int) $app->plan->monthly_price_fcfa,
                'api_requests_monthly' => (int) ($app->plan->api_requests_monthly ?? 0),
            ] : null,
            'created_at'              => $app->created_at?->toIso8601String(),
        ];
    }
}
