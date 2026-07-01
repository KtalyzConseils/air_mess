<?php

namespace Tests\Feature\ApiApps\Concerns;

use App\Models\ApiApplication;
use App\Models\Marchant;
use App\Models\SubscriptionPlan;
use App\Models\User;
use App\Models\UserWallet;

/**
 * Setup partagé pour tous les feature tests de la feature "API dev apps".
 *
 * Crée à la demande :
 *   - un user marchand actif validé
 *   - un SubscriptionPlan API (starter par défaut, 15 req/mois)
 *   - une ApiApplication rattachée
 *   - un UserWallet crédité (pour couvrir les delivery_fee)
 */
trait WithApiApp
{
    protected function createApiPlan(array $overrides = []): SubscriptionPlan
    {
        return SubscriptionPlan::create(array_merge([
            'code'                 => 'api_starter',
            'name'                 => 'API Starter',
            'monthly_price_fcfa'   => 0,
            'included_courses'     => 0,
            'api_requests_monthly' => 15,
            'is_active'            => true,
            'is_api_plan'          => true,
            'sort_order'           => 10,
        ], $overrides));
    }

    protected function createMarchantUser(): User
    {
        $user = User::factory()->create(['type' => 'marchant', 'is_active' => true]);
        Marchant::factory()->create(['user_id' => $user->id]);
        return $user->refresh();
    }

    protected function createApiApplication(User $user, SubscriptionPlan $plan, array $overrides = []): ApiApplication
    {
        return $user->apiApplications()->create(array_merge([
            'subscription_plan_id'    => $plan->id,
            'name'                    => 'Test app',
            'status'                  => ApiApplication::STATUS_ACTIVE,
            'quota_used'              => 0,
            'quota_period_started_at' => now()->startOfMonth(),
        ], $overrides));
    }

    protected function fundWallet(User $user, int $amount = 50_000): UserWallet
    {
        $wallet = UserWallet::firstOrCreate(['user_id' => $user->id]);
        $wallet->update(['balance' => $amount]);
        return $wallet->refresh();
    }
}
