<?php

namespace Tests\Feature\Notifications;

use App\Models\Course;
use App\Models\Driver;
use App\Models\PackageCategory;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class PushOnTransitionTest extends TestCase
{
    use RefreshDatabase;

    private function setupCourse(string $status, int $senderId): array
    {
        $driverUser = User::factory()->create(['type' => 'driver']);
        $driver = Driver::factory()->create([
            'user_id' => $driverUser->id,
            'availability_status' => 'busy',
            'activation_status' => 'active',
        ]);
        $course = Course::factory()->create([
            'sender_id' => $senderId,
            'driver_id' => $driver->id,
            'status'    => $status,
            'package_category_id' => PackageCategory::factory()->create()->id,
        ]);
        return [$driverUser, $course];
    }

    #[DataProvider('transitionsProvider')]
    public function test_transition_creates_notification_for_sender(
        string $fromStatus,
        string $action,
        string $type,
        ?string $extraField,
        ?string $extraValue,
    ): void {
        Http::fake();
        $marchant = User::factory()->create(['type' => 'marchant']);
        [$driverUser, $course] = $this->setupCourse($fromStatus, $marchant->id);

        Sanctum::actingAs($driverUser);
        $payload = ['action' => $action];
        if ($extraField === 'pickup_code') {
            $payload['pickup_code'] = $course->pickup_code;
        } elseif ($extraField === 'delivery_code') {
            $payload['delivery_code'] = $course->delivery_code;
        } elseif ($extraField) {
            $payload[$extraField] = $extraValue;
        }

        $this->postJson("/api/driver/courses/{$course->id}/transition", $payload)
            ->assertStatus(200);

        $this->assertDatabaseHas('notifications', [
            'user_id'   => $marchant->id,
            'type'      => $type,
            'course_id' => $course->id,
        ]);
    }

    public static function transitionsProvider(): array
    {
        return [
            'driver_to_pickup' => [Course::STATUS_ASSIGNED,   'start_to_pickup',  'course.driver_to_pickup', null, null],
            'at_pickup'        => [Course::STATUS_TO_PICKUP,  'arrived_pickup',   'course.at_pickup',         null, null],
            'picked_up'        => [Course::STATUS_AT_PICKUP,  'pickup_confirmed', 'course.picked_up',         'pickup_code', '1234'],
            'at_dropoff'       => [Course::STATUS_PICKED_UP,  'arrived_dropoff',  'course.at_dropoff',        null, null],
            'delivered'        => [Course::STATUS_AT_DROPOFF, 'delivered',        'course.delivered',         'delivery_code', '8888'],
        ];
    }
}
