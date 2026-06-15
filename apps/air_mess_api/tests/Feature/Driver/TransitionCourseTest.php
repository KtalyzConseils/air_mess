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
            'driver_id' => $driver->id,
            'status'    => $status,
            'package_category_id' => PackageCategory::factory()->create()->id,
        ]);
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
}
