<?php

namespace Tests\Feature\Tracking;

use App\Models\Course;
use App\Models\PackageCategory;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PublicTrackingTest extends TestCase
{
    use RefreshDatabase;

    public function test_valid_token_returns_tracking_payload_without_auth(): void
    {
        $course = Course::factory()->create([
            'tracking_token' => 'TOKEN12345',
            'status'         => Course::STATUS_PICKED_UP,
            'package_category_id' => PackageCategory::factory()->create()->id,
        ]);

        // Pas d'authentification !
        $response = $this->getJson('/api/tracking/TOKEN12345');

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'tracking' => [
                'reference',
                'status',
                'origin'      => ['name', 'quartier', 'city'],
                'destination' => ['name', 'quartier', 'city', 'lat', 'lng'],
                'timeline',
            ],
        ]);
    }

    public function test_invalid_token_returns_404(): void
    {
        $response = $this->getJson('/api/tracking/DOES_NOT_EXIST');
        $response->assertStatus(404);
    }

    public function test_sensitive_fields_are_not_exposed(): void
    {
        $sender = \App\Models\User::factory()->create();
        Course::factory()->create([
            'tracking_token' => 'TOKEN67890',
            'sender_id'      => $sender->id,
            'delivery_fee'   => 9999,
            'package_category_id' => PackageCategory::factory()->create()->id,
        ]);

        $response = $this->getJson('/api/tracking/TOKEN67890');
        $body = $response->json('tracking');

        // Le payload ne doit PAS contenir ces champs sensibles
        $this->assertArrayNotHasKey('sender_id', $body);
        $this->assertArrayNotHasKey('delivery_fee', $body);
        $this->assertArrayNotHasKey('driver_earnings', $body);
    }

    public function test_status_history_is_included_in_timeline(): void
    {
        $course = Course::factory()->create([
            'tracking_token' => 'TIMELINE01',
            'status'         => Course::STATUS_PICKED_UP,
            'package_category_id' => PackageCategory::factory()->create()->id,
        ]);
        \App\Models\CourseStatusHistory::create([
            'course_id'       => $course->id,
            'from_status'     => Course::STATUS_AWAITING,
            'to_status'       => Course::STATUS_ASSIGNED,
            'changed_by_type' => 'system',
        ]);

        $response = $this->getJson('/api/tracking/TIMELINE01');
        $this->assertNotEmpty($response->json('tracking.timeline'));
    }
}
