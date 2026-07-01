<?php

namespace Tests\Feature\ApiApps;

use App\Models\ApiApplication;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Feature\ApiApps\Concerns\WithApiApp;
use Tests\TestCase;

/**
 * Vérifie la mécanique du quota mensuel sur ApiApplication.
 *
 *   - `canConsumeRequest()` renvoie false quand le quota est atteint
 *   - `consumeRequest()` incrémente le compteur
 *   - Reset lunaire paresseux : quand la période est ancienne, tout est remis à 0
 *   - Le middleware `api.quota` renvoie 429 quand le quota est épuisé
 *
 * NB : le fait qu'une course soit VRAIMENT créée après le passage du middleware
 * n'est pas testé ici — voir IntegrationCourseWithApiAppTest pour ce bout du flow.
 */
class QuotaEnforcementTest extends TestCase
{
    use RefreshDatabase;
    use WithApiApp;

    public function test_can_consume_until_limit_then_blocked(): void
    {
        $user = $this->createMarchantUser();
        $plan = $this->createApiPlan(['api_requests_monthly' => 3]);
        $app = $this->createApiApplication($user, $plan);

        $this->assertTrue($app->canConsumeRequest());
        $app->consumeRequest();
        $app->consumeRequest();
        $app->consumeRequest();
        $app->refresh();

        $this->assertSame(3, (int) $app->quota_used);
        $this->assertFalse($app->canConsumeRequest());
    }

    public function test_suspended_app_cannot_consume(): void
    {
        $user = $this->createMarchantUser();
        $plan = $this->createApiPlan();
        $app  = $this->createApiApplication($user, $plan, [
            'status' => ApiApplication::STATUS_SUSPENDED,
        ]);

        $this->assertFalse($app->canConsumeRequest());
    }

    public function test_unlimited_plan_never_blocks(): void
    {
        $user = $this->createMarchantUser();
        $plan = $this->createApiPlan(['api_requests_monthly' => 0]); // 0 = illimité
        $app  = $this->createApiApplication($user, $plan);

        for ($i = 0; $i < 50; $i++) {
            $app->consumeRequest();
        }
        $this->assertTrue($app->fresh()->canConsumeRequest());
        $this->assertNull($app->fresh()->remainingQuota());
    }

    public function test_lazy_reset_when_period_is_last_month(): void
    {
        $user = $this->createMarchantUser();
        $plan = $this->createApiPlan(['api_requests_monthly' => 5]);
        $app  = $this->createApiApplication($user, $plan, [
            'quota_used'              => 5,
            'quota_period_started_at' => now()->subMonth()->startOfMonth(),
        ]);

        // Le check déclenche le reset paresseux.
        $this->assertTrue($app->canConsumeRequest());
        $app->refresh();
        $this->assertSame(0, (int) $app->quota_used);
        $this->assertTrue($app->quota_period_started_at->isSameMonth(now()));
    }

    public function test_middleware_returns_429_when_quota_reached(): void
    {
        $user = $this->createMarchantUser();
        $plan = $this->createApiPlan(['api_requests_monthly' => 1]);
        $app  = $this->createApiApplication($user, $plan, ['quota_used' => 1]);

        $token = $app->createToken('api-app-key', ['api:create-course'])->plainTextToken;

        $res = $this->withHeader('Authorization', "Bearer $token")
            ->postJson('/api/integration/courses', []); // payload volontairement vide

        // Le middleware `api.quota` bloque AVANT que la validation payload ne s'exécute.
        $res->assertStatus(429);
        $res->assertJsonPath('quota_limit', 1);
        $res->assertJsonPath('quota_used', 1);
    }

    public function test_middleware_returns_403_when_app_suspended(): void
    {
        $user = $this->createMarchantUser();
        $plan = $this->createApiPlan();
        $app  = $this->createApiApplication($user, $plan, [
            'status' => ApiApplication::STATUS_SUSPENDED,
        ]);

        $token = $app->createToken('api-app-key', ['api:create-course'])->plainTextToken;

        $res = $this->withHeader('Authorization', "Bearer $token")
            ->postJson('/api/integration/courses', []);

        $res->assertStatus(403);
    }
}
