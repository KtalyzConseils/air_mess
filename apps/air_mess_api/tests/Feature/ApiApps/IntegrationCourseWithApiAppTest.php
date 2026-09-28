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

    public function test_manage_course_and_wallet_even_when_creation_quota_exhausted(): void
    {
        Bus::fake();
        $owner = $this->createMarchantUser();
        $app = $this->createApiApplication($owner, $this->createApiPlan(['api_requests_monthly' => 1]));
        $this->fundWallet($owner, 5000);
        PackageCategory::factory()->create(['code' => 'standard', 'is_active' => true]);
        $token = $app->createToken('test', ['api:create-course'])->plainTextToken;
        $this->withToken($token);
        $created = $this->postJson('/api/integration/courses', $this->coursePayload())->assertCreated();
        $reference = $created->json('reference');
        $fee = $created->json('delivery_fee');
        $this->getJson('/api/integration/wallet')->assertOk()->assertJsonPath('balance', 5000)
            ->assertJsonPath('pending_reserved', $fee)->assertJsonPath('available', 5000 - $fee);
        $this->getJson("/api/integration/courses/$reference")->assertOk()->assertJsonPath('reference', $reference)
            ->assertJsonMissingPath('pickup_code')->assertJsonMissingPath('transfer_code');
        $this->postJson('/api/integration/courses', array_replace($this->coursePayload(), ['external_reference' => 'SECOND']))->assertStatus(429);
        $this->postJson("/api/integration/courses/$reference/cancel", ['reason' => 'Test terminé'])->assertOk()->assertJsonPath('status', 'cancelled');
        $this->postJson("/api/integration/courses/$reference/cancel", ['reason' => 'Retry'])->assertOk()->assertJsonPath('status', 'cancelled');
        $this->getJson('/api/integration/wallet')->assertOk()->assertJsonPath('balance', 5000)
            ->assertJsonPath('pending_reserved', 0)->assertJsonPath('available', 5000);
        $this->assertSame(1, (int) $app->fresh()->quota_used);
        $history = Course::first()->statusHistory()->where('to_status', Course::STATUS_CANCELLED)->get();
        $this->assertCount(1, $history);
        $this->assertSame('Test terminé', $history->first()->reason);
        $this->getJson('/api/me/wallet')->assertForbidden();
    }

    public function test_management_scopes_courses_to_application_and_owner(): void
    {
        Bus::fake();
        $owner = $this->createMarchantUser();
        $plan = $this->createApiPlan();
        $app = $this->createApiApplication($owner, $plan);
        $otherApp = $this->createApiApplication($owner, $plan);
        $foreign = $this->createApiApplication($this->createMarchantUser(), $plan);
        $this->withToken($app->createToken('test', ['api:create-course'])->plainTextToken);
        foreach ([$otherApp, $foreign] as $index => $targetApp) {
            $course = Course::factory()->create(['reference' => 'ISOLATION-'.$index,
                'sender_id' => $targetApp->user_id, 'api_application_id' => $targetApp->id,
                'status' => Course::STATUS_AWAITING]);
            $this->getJson('/api/integration/courses/'.$course->reference)->assertNotFound();
            $this->postJson('/api/integration/courses/'.$course->reference.'/cancel')->assertNotFound();
            $this->assertSame(Course::STATUS_AWAITING, $course->fresh()->status);
        }
    }

    public function test_management_rejects_suspended_app_and_inactive_owner(): void
    {
        $owner = $this->createMarchantUser();
        $app = $this->createApiApplication($owner, $this->createApiPlan());
        $this->withToken($app->createToken('test', ['api:create-course'])->plainTextToken);
        $app->update(['status' => 'suspended']);
        $this->getJson('/api/integration/wallet')->assertForbidden();
        $app->update(['status' => 'active']);
        $owner->update(['is_active' => false]);
        $this->getJson('/api/integration/wallet')->assertForbidden();
    }

    public function test_management_does_not_create_wallet_or_expose_codes_and_rejects_terminal_cancel(): void
    {
        Bus::fake();
        $owner = $this->createMarchantUser();
        $app = $this->createApiApplication($owner, $this->createApiPlan());
        $this->withToken($app->createToken('test', ['api:create-course'])->plainTextToken);
        $before = UserWallet::count();
        $this->getJson('/api/integration/wallet')->assertOk()->assertJsonPath('available', 0);
        $this->assertSame($before, UserWallet::count());
        $course = Course::factory()->create(['reference' => 'TERMINAL-READ', 'sender_id' => $owner->id,
            'api_application_id' => $app->id, 'status' => Course::STATUS_DELIVERED]);
        $this->postJson('/api/integration/courses/'.$course->reference.'/cancel')->assertUnprocessable();
        $this->assertSame(Course::STATUS_DELIVERED, $course->fresh()->status);
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
        $this->getJson('/api/integration/wallet')->assertForbidden();
        $this->getJson('/api/integration/courses/ANY')->assertForbidden();
        $this->postJson('/api/integration/courses/ANY/cancel')->assertForbidden();
    }

    public function test_post_pickup_requires_confirmation_and_keeps_hold_during_return(): void
    {
        Bus::fake();
        $owner = $this->createMarchantUser();
        $app = $this->createApiApplication($owner, $this->createApiPlan());
        $wallet = $this->fundWallet($owner, 5000);
        $course = Course::factory()->create(['reference' => 'RETURN-API', 'sender_id' => $owner->id,
            'api_application_id' => $app->id, 'status' => Course::STATUS_PICKED_UP,
            'delivery_fee' => 1500, 'paid_from_wallet' => true, 'pickup_from_previous_driver' => false]);
        $wallet->update(['pending_reserved' => 1500]);
        $this->withToken($app->createToken('test', ['api:create-course'])->plainTextToken);
        $url = '/api/integration/courses/'.$course->reference.'/cancel';
        $this->postJson($url, ['reason' => 'Test'])->assertUnprocessable()->assertJsonPath('requires_post_pickup_confirm', true);
        $this->assertSame(Course::STATUS_PICKED_UP, $course->fresh()->status);
        $this->postJson($url, ['reason' => 'Test', 'confirm_post_pickup' => true])->assertOk()
            ->assertJsonPath('status', Course::STATUS_RETURNING_TO_SENDER)->assertJsonMissingPath('return_code');
        $this->postJson($url, ['confirm_post_pickup' => true])->assertUnprocessable();
        $this->assertSame(1500, (int) $wallet->fresh()->pending_reserved);
        $this->assertSame(5000, (int) $wallet->fresh()->balance);
        $this->assertSame(1, \App\Models\CourseIncident::where('course_id', $course->id)->count());
        $this->assertSame(1, $course->statusHistory()->where('to_status', Course::STATUS_RETURNING_TO_SENDER)->count());
    }

    public function test_legacy_key_can_read_and_cancel_its_course(): void
    {
        Bus::fake();
        $owner = $this->createMarchantUser();
        $plan = \App\Models\SubscriptionPlan::updateOrCreate(['code' => 'business'], ['name' => 'Test',
            'monthly_price_fcfa' => 0, 'included_courses' => 0, 'is_active' => true, 'features' => ['api_access']]);
        $owner->marchant->update(['subscription_plan' => $plan->code]);
        $this->withToken($owner->createToken('test', ['integration:create-course'])->plainTextToken);
        $this->fundWallet($owner, 5000);
        $course = Course::factory()->create(['reference' => 'LEGACY-API', 'sender_id' => $owner->id,
            'api_application_id' => null, 'status' => Course::STATUS_AWAITING]);
        $this->getJson('/api/integration/wallet')->assertOk()->assertJsonPath('balance', 5000);
        $this->getJson('/api/integration/courses/'.$course->reference)->assertOk();
        $this->postJson('/api/integration/courses/'.$course->reference.'/cancel')->assertOk()->assertJsonPath('status', Course::STATUS_CANCELLED);
    }

    public function test_pending_transfer_cannot_be_cancelled_via_integration(): void
    {
        Bus::fake();
        $owner = $this->createMarchantUser();
        $app = $this->createApiApplication($owner, $this->createApiPlan());
        $this->withToken($app->createToken('test', ['api:create-course'])->plainTextToken);
        $course = Course::factory()->create(['reference' => 'TRANSFER-API', 'sender_id' => $owner->id,
            'api_application_id' => $app->id, 'status' => Course::STATUS_PICKED_UP, 'pickup_from_previous_driver' => true]);
        $this->postJson('/api/integration/courses/'.$course->reference.'/cancel', ['confirm_post_pickup' => true])->assertUnprocessable();
        $this->assertSame(Course::STATUS_PICKED_UP, $course->fresh()->status);
    }
}
