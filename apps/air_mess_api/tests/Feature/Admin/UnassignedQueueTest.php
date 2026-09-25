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

    public function test_diagnostic_identifies_people_without_double_counting_broadcasts(): void
    {
        $this->authenticate();
        $course = Course::withoutEvents(fn () => Course::factory()->create([
            'reference' => 'TEST-PEOPLE', 'status' => Course::STATUS_AWAITING,
            'driver_id' => null, 'origin_lat' => 6.37, 'origin_lng' => 2.39,
        ]));
        $driver = Driver::factory()->create(['activation_status' => 'active', 'availability_status' => 'available', 'current_lat' => 6.37, 'current_lng' => 2.39]);
        $busy = Driver::factory()->create(['activation_status' => 'active', 'availability_status' => 'busy', 'current_lat' => 6.37, 'current_lng' => 2.39]);
        $outside = Driver::factory()->create(['activation_status' => 'active', 'availability_status' => 'available', 'current_lat' => 6.57, 'current_lng' => 2.39]);
        foreach (range(1, 2) as $i) {
            \App\Models\Notification::create(['user_id' => $driver->user_id, 'course_id' => $course->id,
                'type' => 'course.offered', 'title' => 'Test', 'body' => 'Test',
                'push_received_at' => $i === 1 ? now() : null]);
        }
        // Même total de refus et de contactés, mais pas les mêmes personnes.
        \App\Models\CourseDeclineRecord::create(['driver_id' => $busy->id, 'course_id' => $course->id, 'reason' => 'personal', 'created_at' => now()]);
        $diagnostic = $this->getJson('/api/admin/courses-unassigned')->assertOk()->json('courses.0.assignment_diagnostic');
        $this->assertSame(1, $diagnostic['contacted_count']);
        $this->assertCount(1, $diagnostic['people']['contacted']);
        $this->assertSame($driver->id, $diagnostic['people']['contacted'][0]['driver_id']);
        $this->assertNotNull($diagnostic['people']['contacted'][0]['push_received_at']);
        $this->assertSame($driver->id, $diagnostic['people']['unanswered'][0]['driver_id']);
        $this->assertSame($busy->id, $diagnostic['people']['declined'][0]['driver_id']);
        $this->assertSame('personal', $diagnostic['people']['declined'][0]['reason']);
        $this->assertSame($outside->id, $diagnostic['people']['nearest'][0]['driver_id']);
        $this->assertSame($busy->id, $diagnostic['people']['busy'][0]['driver_id']);
        $this->assertSame($driver->id, $diagnostic['people']['available'][0]['driver_id']);
        $this->assertNotSame('all_contacted_declined', $diagnostic['code']);
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
