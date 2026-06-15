<?php

namespace Tests\Feature\Driver;

use App\Models\Course;
use App\Models\Driver;
use App\Models\PackageCategory;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AcceptCourseTest extends TestCase
{
    use RefreshDatabase;

    private function makeDriver(string $availability = 'available'): array
    {
        $user = User::factory()->create(['type' => 'driver']);
        $driver = Driver::factory()->create([
            'user_id' => $user->id,
            'activation_status' => 'active',
            'availability_status' => $availability,
        ]);
        return [$user, $driver];
    }

    private function makeAwaitingCourse(): Course
    {
        return Course::factory()->create([
            'driver_id' => null,
            'status'    => Course::STATUS_AWAITING,
            'package_category_id' => PackageCategory::factory()->create()->id,
        ]);
    }

    public function test_available_driver_accepts_an_awaiting_course(): void
    {
        [$user] = $this->makeDriver();
        $course = $this->makeAwaitingCourse();

        Sanctum::actingAs($user);

        $response = $this->postJson("/api/driver/courses/{$course->id}/accept");

        $response->assertStatus(200);
        $this->assertEquals(Course::STATUS_ASSIGNED, $course->fresh()->status);
        $this->assertEquals($user->driver->id, $course->fresh()->driver_id);
        $this->assertNotNull($course->fresh()->assigned_at);
    }

    public function test_driver_becomes_busy_after_accepting(): void
    {
        [$user, $driver] = $this->makeDriver();
        $course = $this->makeAwaitingCourse();

        Sanctum::actingAs($user);
        $this->postJson("/api/driver/courses/{$course->id}/accept");

        $this->assertEquals('busy', $driver->fresh()->availability_status);
    }

    public function test_status_history_entry_is_created_on_accept(): void
    {
        [$user] = $this->makeDriver();
        $course = $this->makeAwaitingCourse();

        Sanctum::actingAs($user);
        $this->postJson("/api/driver/courses/{$course->id}/accept");

        $this->assertDatabaseHas('course_status_history', [
            'course_id'   => $course->id,
            'from_status' => Course::STATUS_AWAITING,
            'to_status'   => Course::STATUS_ASSIGNED,
        ]);
    }

    public function test_already_assigned_course_returns_409(): void
    {
        [$user] = $this->makeDriver();
        [$otherUser, $otherDriver] = $this->makeDriver();
        $course = Course::factory()->create([
            'driver_id' => $otherDriver->id,
            'status'    => Course::STATUS_ASSIGNED,
            'package_category_id' => PackageCategory::factory()->create()->id,
        ]);

        Sanctum::actingAs($user);
        $response = $this->postJson("/api/driver/courses/{$course->id}/accept");

        $response->assertStatus(409);
    }

    public function test_unavailable_driver_cannot_accept_returns_403(): void
    {
        [$user] = $this->makeDriver('offline');
        $course = $this->makeAwaitingCourse();

        Sanctum::actingAs($user);
        $response = $this->postJson("/api/driver/courses/{$course->id}/accept");

        $response->assertStatus(403);
        $this->assertEquals(Course::STATUS_AWAITING, $course->fresh()->status);
    }

    public function test_non_driver_user_cannot_accept(): void
    {
        $marchant = User::factory()->create(['type' => 'marchant']);
        $course = $this->makeAwaitingCourse();

        Sanctum::actingAs($marchant);
        $response = $this->postJson("/api/driver/courses/{$course->id}/accept");

        $response->assertStatus(403);
    }
}
