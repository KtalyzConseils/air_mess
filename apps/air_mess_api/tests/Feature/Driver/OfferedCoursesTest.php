<?php

namespace Tests\Feature\Driver;

use App\Models\Course;
use App\Models\Driver;
use App\Models\PackageCategory;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class OfferedCoursesTest extends TestCase
{
    use RefreshDatabase;

    private function makeAvailableDriverAt(float $lat, float $lng): array
    {
        $user = User::factory()->create(['type' => 'driver']);
        $driver = Driver::factory()->create([
            'user_id' => $user->id,
            'activation_status' => 'active',
            'availability_status' => 'available',
            'current_lat' => $lat,
            'current_lng' => $lng,
        ]);
        return [$user, $driver];
    }

    private function makeAwaitingCourseAt(float $lat, float $lng, string $urgency = 'standard'): Course
    {
        return Course::factory()->create([
            'driver_id' => null,
            'status'    => Course::STATUS_AWAITING,
            'urgency'   => $urgency,
            'origin_lat' => $lat,
            'origin_lng' => $lng,
            'package_category_id' => PackageCategory::factory()->create()->id,
        ]);
    }

    public function test_available_driver_sees_awaiting_courses(): void
    {
        [$user] = $this->makeAvailableDriverAt(6.3703, 2.3912);
        $this->makeAwaitingCourseAt(6.3710, 2.3920);
        $this->makeAwaitingCourseAt(6.3720, 2.3930);

        Sanctum::actingAs($user);
        $response = $this->getJson('/api/driver/offered-courses');

        $response->assertStatus(200);
        $this->assertCount(2, $response->json('courses'));
    }

    public function test_offline_driver_sees_no_courses(): void
    {
        $user = User::factory()->create(['type' => 'driver']);
        Driver::factory()->create([
            'user_id' => $user->id,
            'activation_status' => 'active',
            'availability_status' => 'offline',
            'current_lat' => 6.3703,
            'current_lng' => 2.3912,
        ]);
        $this->makeAwaitingCourseAt(6.3710, 2.3920);

        Sanctum::actingAs($user);
        $response = $this->getJson('/api/driver/offered-courses');

        $response->assertStatus(200);
        $this->assertCount(0, $response->json('courses'));
    }

    public function test_courses_outside_matching_radius_are_excluded(): void
    {
        // Driver à Cotonou centre
        [$user] = $this->makeAvailableDriverAt(6.3703, 2.3912);

        // Course proche (~1 km)
        $near = $this->makeAwaitingCourseAt(6.3710, 2.3920);

        // Course très loin (~50 km au nord), hors rayon de 8 km
        $far = $this->makeAwaitingCourseAt(6.9000, 2.3912);

        Sanctum::actingAs($user);
        $response = $this->getJson('/api/driver/offered-courses');

        $ids = collect($response->json('courses'))->pluck('id');
        $this->assertContains($near->id, $ids);
        $this->assertNotContains($far->id, $ids);
    }

    public function test_express_courses_appear_before_standard(): void
    {
        [$user] = $this->makeAvailableDriverAt(6.3703, 2.3912);

        // Course standard PLUS PROCHE
        $standard = $this->makeAwaitingCourseAt(6.3705, 2.3914, 'standard');

        // Course express plus LOIN
        $express = $this->makeAwaitingCourseAt(6.3750, 2.3950, 'express');

        Sanctum::actingAs($user);
        $response = $this->getJson('/api/driver/offered-courses');

        $courses = $response->json('courses');
        $this->assertEquals($express->id, $courses[0]['id'], 'Express doit être en premier même si plus loin');
        $this->assertEquals($standard->id, $courses[1]['id']);
    }

    public function test_closer_courses_appear_first_within_same_urgency(): void
    {
        [$user] = $this->makeAvailableDriverAt(6.3703, 2.3912);

        $far  = $this->makeAwaitingCourseAt(6.3800, 2.4000, 'standard');  // ~1.5 km
        $near = $this->makeAwaitingCourseAt(6.3710, 2.3920, 'standard');  // ~0.1 km

        Sanctum::actingAs($user);
        $response = $this->getJson('/api/driver/offered-courses');

        $courses = $response->json('courses');
        $this->assertEquals($near->id, $courses[0]['id']);
        $this->assertEquals($far->id, $courses[1]['id']);
    }

    public function test_response_includes_distance_km_field(): void
    {
        [$user] = $this->makeAvailableDriverAt(6.3703, 2.3912);
        $this->makeAwaitingCourseAt(6.3710, 2.3920);

        Sanctum::actingAs($user);
        $response = $this->getJson('/api/driver/offered-courses');

        $first = $response->json('courses')[0];
        $this->assertArrayHasKey('distance_km', $first);
        $this->assertIsNumeric($first['distance_km']);
    }
}
