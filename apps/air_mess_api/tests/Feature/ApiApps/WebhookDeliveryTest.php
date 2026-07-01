<?php

namespace Tests\Feature\ApiApps;

use App\Jobs\SendWebhookDeliveryJob;
use App\Models\Course;
use App\Models\PackageCategory;
use App\Models\WebhookDelivery;
use App\Services\WebhookDispatcher;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request as ClientRequest;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Sanctum as SanctumFacade;
use Laravel\Sanctum\Sanctum;
use Tests\Feature\ApiApps\Concerns\WithApiApp;
use Tests\TestCase;

/**
 * Webhooks sortants — configuration, dispatch automatique, signature HMAC,
 * retry (mocké via Http::fake).
 *
 * Le job n'est PAS exécuté en async en tests (queue driver = sync) : chaque
 * `dispatch` déclenche `handle()` immédiatement, ce qui rend la vérification
 * de la delivery en base directe.
 */
class WebhookDeliveryTest extends TestCase
{
    use RefreshDatabase;
    use WithApiApp;

    public function test_configure_webhook_stores_url_and_returns_secret_once(): void
    {
        $user = $this->createMarchantUser();
        $plan = $this->createApiPlan();
        $app  = $this->createApiApplication($user, $plan);
        Sanctum::actingAs($user);

        $res = $this->putJson("/api/me/api-apps/{$app->id}/webhook", [
            'webhook_url' => 'https://example.com/webhooks/airmess',
        ]);

        $res->assertOk();
        $res->assertJsonStructure(['message', 'webhook_url', 'secret']);
        $this->assertStringStartsWith('whsec_', $res->json('secret'));

        $app->refresh();
        $this->assertSame('https://example.com/webhooks/airmess', $app->webhook_url);
        $this->assertNotNull($app->webhook_secret);
        $this->assertTrue($app->hasWebhookConfigured());
    }

    public function test_disable_webhook_clears_url_and_secret(): void
    {
        $user = $this->createMarchantUser();
        $plan = $this->createApiPlan();
        $app  = $this->createApiApplication($user, $plan, [
            'webhook_url'    => 'https://example.com/wh',
            'webhook_secret' => 'whsec_test',
        ]);
        Sanctum::actingAs($user);

        $this->deleteJson("/api/me/api-apps/{$app->id}/webhook")->assertOk();

        $app->refresh();
        $this->assertNull($app->webhook_url);
        $this->assertNull($app->webhook_secret);
    }

    public function test_signature_verification_matches_hmac_sha256(): void
    {
        $body = json_encode(['event_type' => 'course.delivered', 'x' => 42]);
        $secret = 'whsec_abcdef';

        $expected = hash_hmac('sha256', $body, $secret);
        $actual = WebhookDispatcher::sign($body, $secret);

        $this->assertSame($expected, $actual);
    }

    public function test_course_status_change_dispatches_webhook_with_signed_payload(): void
    {
        // Http::fake capture les POST sortants au lieu de les envoyer réellement.
        Http::fake([
            '*' => Http::response('ok', 200),
        ]);

        $user = $this->createMarchantUser();
        $plan = $this->createApiPlan();
        $app  = $this->createApiApplication($user, $plan, [
            'webhook_url'    => 'https://example.com/wh',
            'webhook_secret' => 'whsec_abcdef',
        ]);
        $this->fundWallet($user);
        PackageCategory::factory()->create(['code' => 'standard', 'is_active' => true]);

        // 1) créer une course rattachée à l'app (dispatch course.created)
        $token = $app->createToken('api-app-key', ['api:create-course'])->plainTextToken;
        $this->withHeader('Authorization', "Bearer $token")
            ->postJson('/api/integration/courses', [
                'external_reference' => 'ORD-99',
                'origin' => [
                    'name' => 'X', 'phone' => '+22990000001',
                    'quartier' => 'Q', 'city' => 'C', 'lat' => 6.37, 'lng' => 2.41,
                ],
                'destination' => ['phone' => '+22997000002'],
            ])->assertCreated();

        $course = Course::first();
        $this->assertNotNull($course);

        // 2) transition assigned → dispatch course.assigned
        $course->update(['status' => 'assigned']);

        // 3) transition delivered → dispatch course.delivered
        $course->update(['status' => 'delivered']);

        // 3 deliveries en base : created, assigned, delivered
        $deliveries = WebhookDelivery::orderBy('id')->get();
        $this->assertCount(3, $deliveries);
        $this->assertSame('course.created',   $deliveries[0]->event_type);
        $this->assertSame('course.assigned',  $deliveries[1]->event_type);
        $this->assertSame('course.delivered', $deliveries[2]->event_type);

        // Toutes marquées delivered (Http::fake a répondu 200)
        foreach ($deliveries as $d) {
            $this->assertSame(WebhookDelivery::STATUS_DELIVERED, $d->status, "delivery {$d->id} attendue delivered");
        }

        // Vérifie signature envoyée sur le dernier POST
        Http::assertSent(function (ClientRequest $r) use ($app) {
            $signature = $r->header('X-AirMess-Signature')[0] ?? null;
            $body = $r->body();
            return $signature === hash_hmac('sha256', $body, $app->webhook_secret);
        });
    }

    public function test_failed_hook_marks_delivery_as_failed_definitively(): void
    {
        // La création de course va déclencher un dispatch webhook automatique
        // via l'observer — on fake Http pour ne pas partir en vrai réseau.
        Http::fake(['*' => Http::response('ok', 200)]);

        // Simule ce que fait Laravel quand un job a épuisé ses `tries` :
        // il appelle le hook failed() qui marque la delivery en `failed`.
        $user = $this->createMarchantUser();
        $plan = $this->createApiPlan();
        $app  = $this->createApiApplication($user, $plan, [
            'webhook_url'    => 'https://example.com/wh',
            'webhook_secret' => 'whsec_abcdef',
        ]);
        $course = $this->createDummyCourse($user, $app->id);

        $delivery = WebhookDelivery::create([
            'api_application_id' => $app->id,
            'course_id'          => $course->id,
            'event_id'           => '00000000-0000-0000-0000-000000000002',
            'event_type'         => 'course.delivered',
            'url'                => $app->webhook_url,
            'payload'            => ['event_type' => 'course.delivered'],
            'status'             => WebhookDelivery::STATUS_PENDING,
            'attempts'           => 3,
        ]);

        // On simule l'appel du hook `failed()` par Laravel après épuisement.
        (new SendWebhookDeliveryJob($delivery->id))
            ->failed(new \RuntimeException('HTTP 500 après 3 tentatives'));

        $delivery->refresh();
        $this->assertSame(WebhookDelivery::STATUS_FAILED, $delivery->status);
        $this->assertStringContainsString('HTTP 500', $delivery->last_error);
    }

    public function test_course_without_api_application_does_not_dispatch_webhook(): void
    {
        // Une course interne (sans api_application_id) ne doit pas générer
        // de webhook — c'est le rôle de l'observer d'ignorer ces cas.
        Bus::fake();

        $user = $this->createMarchantUser();
        $course = Course::create([
            'sender_id'      => $user->id,
            'reference'      => 'AM-INTERNAL-1',
            'tracking_token' => 'abc123',
            'pickup_code'    => 'PU',
            'delivery_code'  => 'DE',
            'status'         => 'awaiting_assignment',
            'urgency'        => 'standard',
            'delivery_fee'   => 1500,
            'driver_earnings'=> 1050,
            'package_category_id' => PackageCategory::factory()->create()->id,
            'package_description' => 'test',
            'package_size'   => 'M',
            'origin_name'    => 'X', 'origin_phone' => '+229',
            'origin_quartier'=> 'Q', 'origin_city' => 'C',
            'origin_lat' => 6.37, 'origin_lng' => 2.41,
            'destination_phone' => '+229',
            'has_collection' => false,
        ]);

        $course->update(['status' => 'delivered']);

        $this->assertSame(0, WebhookDelivery::count());
        Bus::assertNotDispatched(SendWebhookDeliveryJob::class);
    }

    public function test_manual_retry_replays_delivery(): void
    {
        Http::fake(['*' => Http::response('ok', 200)]);

        $user = $this->createMarchantUser();
        $plan = $this->createApiPlan();
        $app  = $this->createApiApplication($user, $plan, [
            'webhook_url'    => 'https://example.com/wh',
            'webhook_secret' => 'whsec_abcdef',
        ]);
        $course = $this->createDummyCourse($user, $app->id);

        $delivery = WebhookDelivery::create([
            'api_application_id' => $app->id,
            'course_id'          => $course->id,
            'event_id'           => '00000000-0000-0000-0000-000000000000',
            'event_type'         => 'course.delivered',
            'url'                => $app->webhook_url,
            'payload'            => ['event_type' => 'course.delivered'],
            'status'             => WebhookDelivery::STATUS_FAILED,
            'attempts'           => 3,
        ]);

        Sanctum::actingAs($user);
        $this->postJson("/api/me/api-apps/{$app->id}/deliveries/{$delivery->id}/retry")
            ->assertOk();

        $delivery->refresh();
        $this->assertSame(WebhookDelivery::STATUS_DELIVERED, $delivery->status);
    }

    /** Petit helper pour créer une course déjà rattachée à l'app. */
    private function createDummyCourse($user, int $apiAppId): Course
    {
        return Course::create([
            'sender_id'      => $user->id,
            'api_application_id' => $apiAppId,
            'reference'      => 'AM-T-' . substr(uniqid(), -8),
            'tracking_token' => substr(md5(uniqid()), 0, 10),
            'pickup_code'    => 'PU', 'delivery_code' => 'DE',
            'status'         => 'awaiting_assignment',
            'urgency'        => 'standard',
            'delivery_fee'   => 1500, 'driver_earnings' => 1050,
            'package_category_id' => PackageCategory::factory()->create()->id,
            'package_description' => 'test', 'package_size' => 'M',
            'origin_name' => 'X', 'origin_phone' => '+229',
            'origin_quartier' => 'Q', 'origin_city' => 'C',
            'origin_lat' => 6.37, 'origin_lng' => 2.41,
            'destination_phone' => '+229',
            'has_collection' => false,
        ]);
    }
}
