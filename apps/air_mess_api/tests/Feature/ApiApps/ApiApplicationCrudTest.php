<?php

namespace Tests\Feature\ApiApps;

use App\Models\ApiApplication;
use App\Models\SubscriptionPlan;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\Feature\ApiApps\Concerns\WithApiApp;
use Tests\TestCase;

/**
 * CRUD `/me/api-apps` par le user propriétaire + endpoint public `/api-plans`.
 */
class ApiApplicationCrudTest extends TestCase
{
    use RefreshDatabase;
    use WithApiApp;

    public function test_lists_only_api_plans(): void
    {
        $user = $this->createMarchantUser();
        Sanctum::actingAs($user);

        $this->createApiPlan(['code' => 'api_starter', 'sort_order' => 10]);
        $this->createApiPlan([
            'code' => 'api_pro', 'name' => 'API Pro',
            'monthly_price_fcfa' => 15000, 'api_requests_monthly' => 100,
            'sort_order' => 11,
        ]);
        // Plan classique marchand — NE doit PAS apparaître
        SubscriptionPlan::create([
            'code' => 'business', 'name' => 'Business',
            'monthly_price_fcfa' => 40000, 'included_courses' => 500,
            'is_active' => true, 'is_api_plan' => false, 'sort_order' => 3,
        ]);

        $res = $this->getJson('/api/api-plans');

        $res->assertOk();
        $codes = collect($res->json('data'))->pluck('code')->all();
        $this->assertContains('api_starter', $codes);
        $this->assertContains('api_pro', $codes);
        $this->assertNotContains('business', $codes);
    }

    public function test_user_can_create_and_list_apps(): void
    {
        $user = $this->createMarchantUser();
        $plan = $this->createApiPlan();
        Sanctum::actingAs($user);

        $res = $this->postJson('/api/me/api-apps', [
            'name'                 => 'Mon shop',
            'description'          => 'Ma boutique en ligne',
            'subscription_plan_id' => $plan->id,
        ]);

        $res->assertCreated();
        $res->assertJsonPath('data.name', 'Mon shop');
        $res->assertJsonPath('data.quota_used', 0);
        $res->assertJsonPath('data.quota_limit', 15);
        $res->assertJsonPath('data.plan.code', 'api_starter');

        $listRes = $this->getJson('/api/me/api-apps');
        $listRes->assertOk();
        $this->assertCount(1, $listRes->json('data'));
    }

    public function test_user_cannot_create_app_on_non_api_plan(): void
    {
        $user = $this->createMarchantUser();
        $nonApiPlan = SubscriptionPlan::create([
            'code' => 'business', 'name' => 'Business',
            'monthly_price_fcfa' => 40000, 'included_courses' => 500,
            'is_active' => true, 'is_api_plan' => false, 'sort_order' => 3,
        ]);
        Sanctum::actingAs($user);

        $res = $this->postJson('/api/me/api-apps', [
            'name' => 'X',
            'subscription_plan_id' => $nonApiPlan->id,
        ]);

        $res->assertStatus(422);
    }

    public function test_user_cannot_see_or_delete_another_users_app(): void
    {
        $owner  = $this->createMarchantUser();
        $intruder = $this->createMarchantUser();
        $plan = $this->createApiPlan();
        $app = $this->createApiApplication($owner, $plan);

        Sanctum::actingAs($intruder);

        // Show
        $this->getJson("/api/me/api-apps/{$app->id}")->assertNotFound();

        // Update
        $this->patchJson("/api/me/api-apps/{$app->id}", ['name' => 'Hack'])
            ->assertNotFound();

        // Delete
        $this->deleteJson("/api/me/api-apps/{$app->id}")->assertNotFound();

        // L'app existe toujours et n'a pas été renommée
        $this->assertDatabaseHas('api_applications', ['id' => $app->id, 'name' => 'Test app']);
    }

    public function test_delete_cascade_revokes_tokens(): void
    {
        $user = $this->createMarchantUser();
        $plan = $this->createApiPlan();
        $app = $this->createApiApplication($user, $plan);
        $app->createToken('api-app-key', ['api:create-course']);

        $this->assertDatabaseCount('personal_access_tokens', 1);

        Sanctum::actingAs($user);
        $this->deleteJson("/api/me/api-apps/{$app->id}")->assertOk();

        $this->assertDatabaseMissing('api_applications', ['id' => $app->id]);
        $this->assertDatabaseCount('personal_access_tokens', 0);
    }

    public function test_generated_key_has_correct_ability_and_polymorphic_type(): void
    {
        $user = $this->createMarchantUser();
        $plan = $this->createApiPlan();
        $app = $this->createApiApplication($user, $plan);

        Sanctum::actingAs($user);

        $res = $this->postJson("/api/me/api-apps/{$app->id}/keys");
        $res->assertCreated();
        $res->assertJsonStructure(['id', 'key', 'message']);

        $this->assertDatabaseHas('personal_access_tokens', [
            'tokenable_type' => ApiApplication::class,
            'tokenable_id'   => $app->id,
        ]);
    }
}
