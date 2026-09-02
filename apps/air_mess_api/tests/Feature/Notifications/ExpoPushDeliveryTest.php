<?php

namespace Tests\Feature\Notifications;

use App\Jobs\CheckExpoPushReceipts;
use App\Models\DeviceToken;
use App\Models\User;
use App\Services\ExpoPushClient;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class ExpoPushDeliveryTest extends TestCase
{
    use RefreshDatabase;

    public function test_successful_ticket_schedules_receipt_check(): void
    {
        Queue::fake();
        Http::fake([
            'exp.host/--/api/v2/push/send' => Http::response([
                'data' => [['status' => 'ok', 'id' => 'receipt-1']],
            ]),
        ]);

        app(ExpoPushClient::class)->push(['ExponentPushToken[ok]'], 'Titre', 'Corps');

        Queue::assertPushed(CheckExpoPushReceipts::class, fn ($job) =>
            $job->receiptTokens === ['receipt-1' => 'ExponentPushToken[ok]']
        );
    }

    public function test_unregistered_ticket_deletes_stale_token(): void
    {
        Queue::fake();
        $user = User::factory()->create();
        DeviceToken::create([
            'user_id' => $user->id,
            'token' => 'ExponentPushToken[stale]',
            'platform' => 'android',
        ]);
        Http::fake([
            'exp.host/--/api/v2/push/send' => Http::response(['data' => [[
                'status' => 'error',
                'details' => ['error' => 'DeviceNotRegistered'],
            ]]]),
        ]);

        app(ExpoPushClient::class)->push(['ExponentPushToken[stale]'], 'Titre', 'Corps');

        $this->assertDatabaseMissing('device_tokens', ['token' => 'ExponentPushToken[stale]']);
    }

    public function test_unregistered_receipt_deletes_stale_token(): void
    {
        $user = User::factory()->create();
        DeviceToken::create([
            'user_id' => $user->id,
            'token' => 'ExponentPushToken[receipt-stale]',
            'platform' => 'android',
        ]);
        Http::fake([
            'exp.host/--/api/v2/push/getReceipts' => Http::response(['data' => [
                'receipt-2' => [
                    'status' => 'error',
                    'details' => ['error' => 'DeviceNotRegistered'],
                ],
            ]]),
        ]);

        (new CheckExpoPushReceipts([
            'receipt-2' => 'ExponentPushToken[receipt-stale]',
        ]))->handle();

        $this->assertDatabaseMissing('device_tokens', ['token' => 'ExponentPushToken[receipt-stale]']);
    }
}
