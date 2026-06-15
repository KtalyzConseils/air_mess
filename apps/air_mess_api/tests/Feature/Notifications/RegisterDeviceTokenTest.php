<?php

namespace Tests\Feature\Notifications;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class RegisterDeviceTokenTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_user_registers_token(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $response = $this->postJson('/api/device-tokens', [
            'token'    => 'ExponentPushToken[abc123]',
            'platform' => 'android',
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('device_tokens', [
            'token'   => 'ExponentPushToken[abc123]',
            'user_id' => $user->id,
        ]);
    }

    public function test_token_is_upserted_not_duplicated(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $this->postJson('/api/device-tokens', ['token' => 'ExponentPushToken[abc]', 'platform' => 'android']);
        $this->postJson('/api/device-tokens', ['token' => 'ExponentPushToken[abc]', 'platform' => 'android']);

        $this->assertDatabaseCount('device_tokens', 1);
    }

    public function test_unauthenticated_cannot_register(): void
    {
        $response = $this->postJson('/api/device-tokens', [
            'token' => 'whatever', 'platform' => 'android',
        ]);
        $response->assertStatus(401);
    }
}
