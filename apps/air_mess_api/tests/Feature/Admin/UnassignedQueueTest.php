<?php

namespace Tests\Feature\Admin;

use App\Models\Admin;
use App\Models\Course;
use App\Models\Driver;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class UnassignedQueueTest extends TestCase
{
    use RefreshDatabase;

    private function authenticate(): void
    {
        $admin = Admin::factory()->create(['sub_role' => 'ops']);
        Sanctum::actingAs($admin->user);
    }

    public function test_queue_prioritizes_express_then_recent_broadcasts(): void
    {
        $this->authenticate();
        $courses = Course::withoutEvents(function () {
            return collect([
                ['standard', 1], ['express', 30], ['express', 2], ['standard', 20],
            ])->map(fn ($item, $index) => Course::factory()->create([
                'reference' => 'TEST-QUEUE-'.$index,
                'status' => Course::STATUS_AWAITING,
                'driver_id' => null,
                'urgency' => $item[0],
                'offer_broadcasted_at' => now()->subMinutes($item[1]),
            ]));
        });

        $response = $this->getJson('/api/admin/courses-unassigned')->assertOk();
        $this->assertSame(
            [$courses[2]->id, $courses[1]->id, $courses[0]->id, $courses[3]->id],
            array_column($response->json('courses'), 'id'),
        );
    }

    public function test_course_with_a_driver_is_not_archived_even_if_its_status_is_stale(): void
    {
        $this->authenticate();
        $driver = Driver::factory()->create();
        $course = Course::withoutEvents(fn () => Course::factory()->create([
            'reference' => 'TEST-QUEUE-ASSIGNED',
            'status' => Course::STATUS_AWAITING,
            'driver_id' => $driver->id,
        ]));

        $this->postJson("/api/admin/courses/{$course->id}/cancel-support", ['reason' => 'Test sélection'])
            ->assertUnprocessable();
        $this->assertNull($course->fresh()->archived_at);
        $this->assertSame(Course::STATUS_AWAITING, $course->fresh()->status);
    }
}
