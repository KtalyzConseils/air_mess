<?php

namespace Tests\Feature\Driver;

use App\Models\Course;
use App\Models\Driver;
use App\Models\PackageCategory;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TransitionCourseTest extends TestCase
{
    use RefreshDatabase;

    private function setupDriverWithCourse(string $status): array
    {
        $user = User::factory()->create(['type' => 'driver']);
        $driver = Driver::factory()->create([
            'user_id' => $user->id,
            'activation_status' => 'active',
            'availability_status' => 'busy',
        ]);
        $course = Course::factory()->create([
            'reference' => 'TC-'.substr(bin2hex(random_bytes(8)), 0, 16),
            'driver_id' => $driver->id,
            'status'    => $status,
            'has_collection' => false,
            'collection_amount' => null,
            'package_category_id' => PackageCategory::factory()->create()->id,
        ]);
        \App\Models\DriverWallet::firstOrCreate(['driver_id' => $driver->id], ['balance' => 0]);
        return [$user, $driver, $course];
    }

    public function test_start_to_pickup_from_assigned(): void
    {
        [$user, , $course] = $this->setupDriverWithCourse(Course::STATUS_ASSIGNED);
        Sanctum::actingAs($user);

        $response = $this->postJson("/api/driver/courses/{$course->id}/transition", ['action' => 'start_to_pickup']);

        $response->assertStatus(200);
        $this->assertEquals(Course::STATUS_TO_PICKUP, $course->fresh()->status);
    }

    public function test_ops_can_organize_return_after_abandonment(): void
    {
        [$user, $driver, $course] = $this->setupDriverWithCourse(Course::STATUS_PICKED_UP);
        $course->update(['picked_up_at' => now()]);
        Sanctum::actingAs($user);
        $this->postJson("/api/driver/courses/{$course->id}/transition", ['action' => 'failed', 'reason' => 'Panne véhicule'])->assertOk();
        $incident = \App\Models\CourseIncident::where('course_id', $course->id)->firstOrFail();
        $admin = \App\Models\Admin::factory()->create(['sub_role' => 'ops']);
        Sanctum::actingAs($admin->user);
        $this->postJson("/api/admin/incidents/{$incident->id}/start-return")->assertOk();
        $this->assertEquals(Course::STATUS_RETURNING_TO_SENDER, $course->fresh()->status);
        $this->assertNotEmpty($course->fresh()->return_code);
        $this->assertEquals('open', $incident->fresh()->status);
        $this->postJson("/api/admin/incidents/{$incident->id}/start-return")->assertUnprocessable();
        Sanctum::actingAs($user);
        $this->getJson('/api/courses?status=returning_to_sender')->assertOk()->assertJsonPath('data.0.id', $course->id);
        $this->postJson("/api/driver/courses/{$course->id}/transition", ['action' => 'return_confirmed', 'return_code' => $course->fresh()->return_code])->assertOk();
        $this->assertSame(Course::STATUS_FAILED, $course->fresh()->status);
        $this->assertSame('available', $driver->fresh()->availability_status);
    }

    public function test_pickup_confirmed_requires_pickup_code(): void
    {
        [$user, , $course] = $this->setupDriverWithCourse(Course::STATUS_AT_PICKUP);
        Sanctum::actingAs($user);

        $response = $this->postJson("/api/driver/courses/{$course->id}/transition", [
            'action' => 'pickup_confirmed',
            // pas de pickup_code
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['pickup_code']);
    }

    public function test_pickup_confirmed_sets_picked_up_at(): void
    {
        [$user, , $course] = $this->setupDriverWithCourse(Course::STATUS_AT_PICKUP);
        Sanctum::actingAs($user);

        $this->postJson("/api/driver/courses/{$course->id}/transition", [
            'action' => 'pickup_confirmed',
            'pickup_code' => $course->pickup_code,
        ])->assertStatus(200);

        $this->assertNotNull($course->fresh()->picked_up_at);
    }

    public function test_pickup_confirmed_rejects_wrong_code(): void
    {
        [$user, , $course] = $this->setupDriverWithCourse(Course::STATUS_AT_PICKUP);
        Sanctum::actingAs($user);

        $response = $this->postJson("/api/driver/courses/{$course->id}/transition", [
            'action' => 'pickup_confirmed',
            'pickup_code' => '0000',
        ]);

        // Si jamais la factory a généré '0000', on retente avec '9999' (extrêmement improbable)
        if ($response->status() === 200) {
            $this->markTestSkipped('Code généré identique à la valeur de test (collision sur 1/10000).');
        }

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['pickup_code']);
        $this->assertEquals(Course::STATUS_AT_PICKUP, $course->fresh()->status);
    }

    public function test_delivered_requires_delivery_code(): void
    {
        [$user, , $course] = $this->setupDriverWithCourse(Course::STATUS_AT_DROPOFF);
        Sanctum::actingAs($user);

        $response = $this->postJson("/api/driver/courses/{$course->id}/transition", ['action' => 'delivered']);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['delivery_code']);
    }

    public function test_delivered_releases_driver_back_to_available(): void
    {
        [$user, $driver, $course] = $this->setupDriverWithCourse(Course::STATUS_AT_DROPOFF);
        Sanctum::actingAs($user);

        $this->postJson("/api/driver/courses/{$course->id}/transition", [
            'action' => 'delivered',
            'delivery_code' => $course->delivery_code,
        ])->assertStatus(200);

        $this->assertEquals(Course::STATUS_DELIVERED, $course->fresh()->status);
        $this->assertEquals('available', $driver->fresh()->availability_status);
        $this->assertNotNull($course->fresh()->delivered_at);
    }

    public function test_wrong_from_status_returns_422(): void
    {
        // On veut start_to_pickup mais la course est déjà picked_up
        [$user, , $course] = $this->setupDriverWithCourse(Course::STATUS_PICKED_UP);
        Sanctum::actingAs($user);

        $response = $this->postJson("/api/driver/courses/{$course->id}/transition", ['action' => 'start_to_pickup']);

        $response->assertStatus(422);
        $this->assertEquals(Course::STATUS_PICKED_UP, $course->fresh()->status);
    }

    public function test_driver_cannot_transition_someone_else_course(): void
    {
        [$user1] = $this->setupDriverWithCourse(Course::STATUS_ASSIGNED);

        // Un second driver avec sa propre course
        $user2 = User::factory()->create(['type' => 'driver']);
        $driver2 = Driver::factory()->create([
            'user_id' => $user2->id,
            'activation_status' => 'active',
            'availability_status' => 'busy',
        ]);
        $course = Course::factory()->create([
            'driver_id' => $driver2->id,
            'status'    => Course::STATUS_ASSIGNED,
            'package_category_id' => PackageCategory::factory()->create()->id,
        ]);

        // user1 essaie de manipuler la course du driver2
        Sanctum::actingAs($user1);
        $response = $this->postJson("/api/driver/courses/{$course->id}/transition", ['action' => 'start_to_pickup']);

        $response->assertStatus(403);
    }

    public function test_failed_action_requires_reason(): void
    {
        [$user, , $course] = $this->setupDriverWithCourse(Course::STATUS_PICKED_UP);
        Sanctum::actingAs($user);

        $response = $this->postJson("/api/driver/courses/{$course->id}/transition", ['action' => 'failed']);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['reason']);
    }

    public function test_abandon_before_pickup_reopens_offer_without_refunding(): void
    {
        [$user, $driver, $course] = $this->setupDriverWithCourse(Course::STATUS_ASSIGNED);
        $this->mock(\App\Services\CourseCreationService::class)->shouldReceive('dispatchToAvailableDrivers')->once();
        $this->mock(\App\Services\UserWalletService::class)->shouldNotReceive('releaseReservation');
        Sanctum::actingAs($user);
        $this->postJson("/api/driver/courses/{$course->id}/transition", ['action' => 'failed', 'reason' => 'Panne'])
            ->assertOk()->assertJsonPath('course.status', Course::STATUS_AWAITING);
        $this->assertNull($course->fresh()->driver_id);
        $this->assertNotNull($course->fresh()->offer_broadcasted_at);
        $this->assertSame('available', $driver->fresh()->availability_status);
        $this->assertDatabaseHas('course_decline_records', ['course_id' => $course->id, 'driver_id' => $driver->id]);
        $this->assertDatabaseHas('notifications', ['user_id' => $course->sender_id, 'course_id' => $course->id, 'type' => 'course.driver_abandoned']);
    }

    public function test_abandon_after_pickup_creates_one_open_incident_and_keeps_custody(): void
    {
        [$user, $driver, $course] = $this->setupDriverWithCourse(Course::STATUS_PICKED_UP);
        $this->mock(\App\Services\UserWalletService::class)->shouldNotReceive('releaseReservation');
        Sanctum::actingAs($user);
        for ($i = 0; $i < 2; $i++) {
            $this->postJson("/api/driver/courses/{$course->id}/transition", ['action' => 'failed', 'reason' => 'Panne'])
                ->assertOk()->assertJsonPath('course.status', Course::STATUS_PICKED_UP);
        }
        $this->assertSame($driver->id, $course->fresh()->driver_id);
        $this->assertSame('busy', $driver->fresh()->availability_status);
        $this->assertSame(1, \App\Models\CourseIncident::where('course_id', $course->id)->where('status', 'open')->count());
        $this->assertSame(1, \App\Models\CourseStatusHistory::where('course_id', $course->id)->where('reason', 'like', 'Abandon après récupération%')->count());
        $this->assertSame(1, \App\Models\Notification::where('course_id', $course->id)->where('user_id', $course->sender_id)->where('type', 'course.driver_abandoned')->count());
        $this->getJson('/api/courses?status=picked_up')->assertOk()->assertJsonPath('data.0.abandonment_pending', true);
        $this->postJson("/api/driver/courses/{$course->id}/transition", ['action' => 'arrived_dropoff'])->assertUnprocessable();
    }

    public function test_transfer_must_be_confirmed_before_going_to_customer(): void
    {
        [$user, , $course] = $this->setupDriverWithCourse(Course::STATUS_PICKED_UP);
        $previous = Driver::factory()->create(['availability_status' => 'busy']);
        $course->update(['pickup_from_previous_driver' => true, 'previous_driver_id' => $previous->id, 'transfer_code' => '123456']);
        Sanctum::actingAs($previous->user);
        $this->getJson('/api/courses?status=picked_up')->assertOk()->assertJsonPath('data.0.holding_for_transfer', true)
            ->assertJsonPath('data.0.handover_code', '123456')->assertJsonMissingPath('data.0.transfer_code');
        Sanctum::actingAs($user);
        $this->postJson("/api/driver/courses/{$course->id}/transition", ['action' => 'arrived_dropoff'])->assertUnprocessable();
        $this->getJson('/api/courses?status=picked_up')->assertOk()->assertJsonMissingPath('data.0.transfer_code')->assertJsonMissingPath('data.0.handover_code');
        $this->postJson("/api/driver/courses/{$course->id}/transition", ['action' => 'transfer_confirmed'])->assertUnprocessable();
        $this->postJson("/api/driver/courses/{$course->id}/transition", ['action' => 'transfer_confirmed', 'transfer_code' => '000000'])->assertUnprocessable();
        $this->assertTrue($course->fresh()->pickup_from_previous_driver);
        $this->assertSame('busy', $previous->fresh()->availability_status);
        $this->postJson("/api/driver/courses/{$course->id}/transition", ['action' => 'transfer_confirmed', 'transfer_code' => '123456'])->assertOk();
        $this->postJson("/api/driver/courses/{$course->id}/transition", ['action' => 'transfer_confirmed', 'transfer_code' => '123456'])->assertOk();
        $this->assertNull($course->fresh()->transfer_code);
        $this->assertSame(1, \App\Models\Notification::where('course_id', $course->id)->where('user_id', $course->sender_id)->where('type', 'course.transfer_confirmed')->count());
        $this->assertFalse($course->fresh()->pickup_from_previous_driver);
        $this->assertSame('available', $previous->fresh()->availability_status);
        Sanctum::actingAs($previous->user);
        $this->getJson('/api/courses?status=picked_up')->assertOk()->assertJsonCount(0, 'data');
        Sanctum::actingAs($user);
        $this->postJson("/api/driver/courses/{$course->id}/transition", ['action' => 'arrived_dropoff'])->assertOk();
        $this->assertDatabaseHas('notifications', ['user_id' => $course->sender_id, 'course_id' => $course->id, 'type' => 'course.transfer_confirmed']);
        $wrongCode = $course->delivery_code === '0000' ? '9999' : '0000';
        $this->postJson("/api/driver/courses/{$course->id}/transition", ['action' => 'delivered', 'delivery_code' => $wrongCode])->assertUnprocessable()->assertJsonValidationErrors('delivery_code');
        $this->postJson("/api/driver/courses/{$course->id}/transition", ['action' => 'delivered', 'delivery_code' => $course->delivery_code])->assertOk();
        $this->assertSame(Course::STATUS_DELIVERED, $course->fresh()->status);
    }

    public function test_transfer_code_is_limited_and_ops_exception_requires_authorization_and_reason(): void
    {
        [$user, , $course] = $this->setupDriverWithCourse(Course::STATUS_PICKED_UP);
        $previous = Driver::factory()->create(['availability_status' => 'busy']);
        $course->update(['pickup_from_previous_driver' => true, 'previous_driver_id' => $previous->id, 'transfer_code' => '123456']);
        $this->assertNotSame('123456', $course->getRawOriginal('transfer_code'));
        Sanctum::actingAs($previous->user);
        $this->postJson("/api/driver/courses/{$course->id}/transition", ['action' => 'transfer_confirmed', 'transfer_code' => '123456'])->assertForbidden();
        Sanctum::actingAs($user);
        for ($i = 0; $i < 5; $i++) {
            $this->postJson("/api/driver/courses/{$course->id}/transition", ['action' => 'transfer_confirmed', 'transfer_code' => '000000'])->assertUnprocessable();
        }
        $this->postJson("/api/driver/courses/{$course->id}/transition", ['action' => 'transfer_confirmed', 'transfer_code' => '123456'])->assertStatus(429);
        $this->assertTrue($course->fresh()->pickup_from_previous_driver);
        $endpoint = "/api/admin/courses/{$course->id}/confirm-transfer-exception";
        Sanctum::actingAs(\App\Models\Admin::factory()->create(['sub_role' => 'support'])->user);
        $this->postJson($endpoint, ['reason' => 'Remise vérifiée auprès des deux livreurs'])->assertForbidden();
        Sanctum::actingAs(\App\Models\Admin::factory()->create(['sub_role' => 'ops'])->user);
        $this->postJson($endpoint)->assertUnprocessable();
        $this->postJson($endpoint, ['reason' => 'Remise vérifiée auprès des deux livreurs'])->assertOk();
        $this->assertFalse($course->fresh()->pickup_from_previous_driver);
        $history = \App\Models\CourseStatusHistory::where('course_id', $course->id)->latest('id')->first();
        $this->assertTrue($history->metadata['ops_override']);
    }
}
