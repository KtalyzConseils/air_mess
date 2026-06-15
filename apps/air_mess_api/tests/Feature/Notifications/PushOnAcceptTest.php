<?php

namespace Tests\Feature\Notifications;

use App\Models\Course;
use App\Models\DeviceToken;
use App\Models\Driver;
use App\Models\PackageCategory;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PushOnAcceptTest extends TestCase
{
    use RefreshDatabase;

    public function test_accept_course_pushes_notification_to_sender(): void
    {
        Http::fake();

        // Marchand qui crée la course + son device token
        $marchant = User::factory()->create(['type' => 'marchant']);
        DeviceToken::create([
            'user_id' => $marchant->id,
            'token'   => 'ExponentPushToken[marchant]',
            'platform' => 'android',
        ]);

        // Livreur qui va accepter
        $driverUser = User::factory()->create(['type' => 'driver']);
        $driver = Driver::factory()->create([
            'user_id' => $driverUser->id,
            'activation_status' => 'active',
            'availability_status' => 'available',
        ]);

        $course = Course::factory()->create([
            'sender_id' => $marchant->id,
            'driver_id' => null,
            'status'    => Course::STATUS_AWAITING,
            'package_category_id' => PackageCategory::factory()->create()->id,
        ]);

        Sanctum::actingAs($driverUser);
        $this->postJson("/api/driver/courses/{$course->id}/accept")->assertStatus(200);

        // 1. Une row notifications doit exister pour le marchand
        $this->assertDatabaseHas('notifications', [
            'user_id'   => $marchant->id,
            'type'      => 'course.accepted',
            'course_id' => $course->id,
        ]);

        // 2. L'API Expo doit avoir été appelée avec le bon token
        Http::assertSent(function ($request) {
            return $request->url() === 'https://exp.host/--/api/v2/push/send'
                && collect($request->data())->contains(fn($m) => $m['to'] === 'ExponentPushToken[marchant]');
        });
    }
}
