<?php

namespace Tests\Feature\ApiApps;

use App\Models\Course;
use App\Models\PackageCategory;
use App\Models\UserWallet;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
use Tests\Feature\ApiApps\Concerns\WithApiApp;
use Tests\TestCase;

/**
 * Bout-en-bout : token d'app dev → POST /integration/courses → course créée
 * + tagged `api_application_id` + hold sur le wallet du user propriétaire
 * + quota consommé.
 *
 * On fake le Bus pour intercepter les WebhookJobs dispatchés en cascade —
 * ils sont testés séparément dans WebhookDeliveryTest.
 */
class IntegrationCourseWithApiAppTest extends TestCase
{
    use RefreshDatabase;
    use WithApiApp;

    private function coursePayload(): array
    {
        return [
            'external_reference' => 'ORD-42',
            'source'             => 'test-shop',
            'urgency'            => 'standard',
            'origin' => [
                'name'     => 'Boutique Awa',
                'phone'    => '+22990000001',
                'quartier' => 'Gbegamey',
                'city'     => 'Cotonou',
                'lat'      => 6.37,
                'lng'      => 2.41,
            ],
            'destination' => [
                'phone'    => '+22997000002',
                'quartier' => 'Calavi',
                'city'     => 'Abomey-Calavi',
            ],
        ];
    }

    public function test_creates_course_and_debits_owner_wallet_and_tags_app(): void
    {
        Bus::fake(); // évite les jobs webhook async pour ce test

        $owner = $this->createMarchantUser();
        $plan  = $this->createApiPlan(['api_requests_monthly' => 5]);
        $app   = $this->createApiApplication($owner, $plan);
        $this->fundWallet($owner, 50_000);
        PackageCategory::factory()->create(['code' => 'standard', 'is_active' => true]);

        $token = $app->createToken('api-app-key', ['api:create-course'])->plainTextToken;

        $res = $this->withHeader('Authorization', "Bearer $token")
            ->postJson('/api/integration/courses', $this->coursePayload());

        $res->assertStatus(201);
        $res->assertJsonStructure(['reference', 'status', 'tracking_url', 'delivery_fee']);

        // Course en base avec tag app_id + sender_id du propriétaire
        $course = Course::first();
        $this->assertNotNull($course);
        $this->assertSame($app->id, (int) $course->api_application_id);
        $this->assertSame($owner->id, (int) $course->sender_id);

        // Wallet du propriétaire : hold sur delivery_fee
        $wallet = UserWallet::where('user_id', $owner->id)->first();
        $this->assertSame((int) $course->delivery_fee, (int) $wallet->pending_reserved);

        // Quota app incrémenté
        $this->assertSame(1, (int) $app->fresh()->quota_used);
    }

    public function test_returns_402_when_wallet_insufficient(): void
    {
        Bus::fake();

        $owner = $this->createMarchantUser();
        $plan  = $this->createApiPlan();
        $app   = $this->createApiApplication($owner, $plan);
        $this->fundWallet($owner, 10); // trop bas pour couvrir la delivery_fee (~1500)
        PackageCategory::factory()->create(['code' => 'standard', 'is_active' => true]);

        $token = $app->createToken('api-app-key', ['api:create-course'])->plainTextToken;

        $res = $this->withHeader('Authorization', "Bearer $token")
            ->postJson('/api/integration/courses', $this->coursePayload());

        $res->assertStatus(402);
        $res->assertJsonPath('insufficient_funds', true);

        // Ni course, ni quota consommé
        $this->assertSame(0, Course::count());
        $this->assertSame(0, (int) $app->fresh()->quota_used);
    }

    public function test_idempotence_second_call_returns_existing_course_without_consuming_quota(): void
    {
        Bus::fake();

        $owner = $this->createMarchantUser();
        $plan  = $this->createApiPlan();
        $app   = $this->createApiApplication($owner, $plan);
        $this->fundWallet($owner);
        PackageCategory::factory()->create(['code' => 'standard', 'is_active' => true]);

        $token = $app->createToken('api-app-key', ['api:create-course'])->plainTextToken;
        $payload = $this->coursePayload();

        // 1er appel
        $r1 = $this->withHeader('Authorization', "Bearer $token")
            ->postJson('/api/integration/courses', $payload);
        $r1->assertStatus(201);
        $refFirst = $r1->json('reference');

        // 2nd appel avec le même external_reference
        $r2 = $this->withHeader('Authorization', "Bearer $token")
            ->postJson('/api/integration/courses', $payload);

        // Pas de nouvelle course, mais l'ancienne renvoyée en 200
        $r2->assertStatus(200);
        $this->assertSame($refFirst, $r2->json('reference'));
        $this->assertSame(1, Course::count());
        // Le quota n'est incrémenté que pour les créations réelles
        $this->assertSame(1, (int) $app->fresh()->quota_used);
    }

    public function test_missing_ability_returns_403(): void
    {
        $owner = $this->createMarchantUser();
        $plan  = $this->createApiPlan();
        $app   = $this->createApiApplication($owner, $plan);
        $this->fundWallet($owner);
        PackageCategory::factory()->create(['code' => 'standard', 'is_active' => true]);

        // Token sans l'ability nécessaire
        $badToken = $app->createToken('random-ability-key', ['wrong:ability'])->plainTextToken;

        $res = $this->withHeader('Authorization', "Bearer $badToken")
            ->postJson('/api/integration/courses', $this->coursePayload());

        $res->assertStatus(403);
    }
}
