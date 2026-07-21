<?php

namespace Tests\Feature\Notifications;

use App\Models\DeviceToken;
use App\Models\User;
use App\Services\ExpoPushClient;
use App\Services\FcmClient;
use App\Services\NotificationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class WebPushRoutingTest extends TestCase
{
    use RefreshDatabase;

    public function test_web_tokens_go_to_fcm_and_mobile_tokens_to_expo(): void
    {
        $user = User::factory()->create();
        DeviceToken::create(['user_id' => $user->id, 'token' => 'fcm-web-token', 'platform' => 'web']);
        DeviceToken::create(['user_id' => $user->id, 'token' => 'ExponentPushToken[abc]', 'platform' => 'android']);

        $fcm = $this->mock(FcmClient::class);
        $fcm->shouldReceive('send')
            ->once()
            ->withArgs(function (array $tokens, string $title) {
                return $tokens === ['fcm-web-token'] && $title === 'Titre test';
            });

        $expo = $this->mock(ExpoPushClient::class);
        $expo->shouldReceive('push')
            ->once()
            ->withArgs(function (array $tokens) {
                return $tokens === ['ExponentPushToken[abc]'];
            });

        $notif = app(NotificationService::class)
            ->sendToUser($user->id, 'wallet.credited', 'Titre test', 'Corps test');

        $this->assertDatabaseHas('notifications', ['id' => $notif->id, 'user_id' => $user->id]);
    }

    public function test_fcm_client_is_noop_without_credentials(): void
    {
        config(['services.firebase.credentials' => null]);
        Http::fake();

        app(FcmClient::class)->send(['some-token'], 'Titre', 'Corps');

        Http::assertNothingSent();
    }

    public function test_no_fcm_call_when_user_has_no_web_token(): void
    {
        $user = User::factory()->create();
        DeviceToken::create(['user_id' => $user->id, 'token' => 'ExponentPushToken[xyz]', 'platform' => 'ios']);

        $fcm = $this->mock(FcmClient::class);
        $fcm->shouldNotReceive('send');

        $expo = $this->mock(ExpoPushClient::class);
        $expo->shouldReceive('push')->once();

        app(NotificationService::class)
            ->sendToUser($user->id, 'course.delivered', 'Livrée', 'Votre colis est arrivé');
    }
}
