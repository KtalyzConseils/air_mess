<?php

namespace Tests\Feature\Admin;

use App\Models\{Admin, AppSetting, Driver, DriverWallet, User, UserWallet, UserWalletTransaction, WalletTransaction, WalletWithdrawRequest};
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Le wallet n'est débité qu'à la confirmation du virement (webhook FedaPay `sent`
 * ou « Marquer comme viré ») — jamais à l'approbation — et une seule fois.
 */
class WithdrawPayoutSettlementTest extends TestCase
{
    use RefreshDatabase;

    private int $payoutId = 9000;

    protected function setUp(): void
    {
        parent::setUp();
        config(['services.fedapay.webhook_secret' => 'whsec_test', 'services.fedapay.secret_key' => 'sk_test']);
        Http::fake(function ($request) {
            if (str_ends_with($request->url(), '/payouts')) {
                return Http::response(['v1/payout' => ['id' => ++$this->payoutId, 'reference' => 'PO-'.$this->payoutId, 'status' => 'pending']]);
            }
            return Http::response(['message' => 'ok']); // /payouts/start
        });
    }

    private function driverWithBalance(int $balance): Driver
    {
        $driver = Driver::factory()->create(['activation_status' => 'active', 'availability_status' => 'available']);
        DriverWallet::updateOrCreate(['driver_id' => $driver->id], ['balance' => $balance]);
        return $driver;
    }

    private function approve(WalletWithdrawRequest $w)
    {
        Sanctum::actingAs(Admin::factory()->create(['sub_role' => 'super'])->user);
        return $this->postJson("/api/admin/withdraw-requests/{$w->id}/approve");
    }

    private function webhook(WalletWithdrawRequest $w, string $event, string $status)
    {
        $payload = json_encode(['name' => $event, 'entity' => ['id' => (int) $w->fresh()->payout_provider_ref, 'reference' => 'PO-REF', 'status' => $status]]);
        $t = time();
        $sig = hash_hmac('sha256', $t.'.'.$payload, 'whsec_test');

        return $this->call('POST', '/api/webhooks/fedapay', [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_X_FEDAPAY_SIGNATURE' => "t={$t},s={$sig}",
        ], $payload);
    }

    private function pendingDriverWithdraw(Driver $driver, int $amount): WalletWithdrawRequest
    {
        return WalletWithdrawRequest::create([
            'driver_id' => $driver->id, 'amount_fcfa' => $amount, 'target_method' => 'momo',
            'target_account' => '+229 01 97 00 00 01', 'status' => WalletWithdrawRequest::STATUS_PENDING,
        ]);
    }

    public function test_approval_reserves_without_debit_and_sent_webhook_debits_exactly_once(): void
    {
        $driver = $this->driverWithBalance(10000);
        $w = $this->pendingDriverWithdraw($driver, 4000);

        $this->approve($w)->assertOk();

        $wallet = DriverWallet::where('driver_id', $driver->id)->first();
        $this->assertSame(10000, $wallet->balance, 'Aucun débit avant la confirmation FedaPay');
        $this->assertSame(6000, $wallet->available());
        $this->assertNotNull($w->fresh()->payout_provider_ref);
        $this->assertSame(0, WalletTransaction::where('driver_id', $driver->id)->where('type', 'withdraw')->count());

        // Statut intermédiaire : rien ne bouge
        $this->webhook($w, 'payout.updated', 'processing')->assertOk();
        $this->assertSame(10000, $wallet->fresh()->balance);

        $this->webhook($w, 'payout.sent', 'sent')->assertOk();
        $this->webhook($w, 'payout.sent', 'sent')->assertOk(); // rejeu FedaPay

        $this->assertSame(6000, $wallet->fresh()->balance);
        $this->assertSame(6000, $wallet->fresh()->available());
        $this->assertNotNull($w->fresh()->paid_at);
        $this->assertSame(1, WalletTransaction::where('driver_id', $driver->id)->where('type', 'withdraw')->count());
    }

    public function test_failed_webhook_releases_reservation_without_any_wallet_movement(): void
    {
        $driver = $this->driverWithBalance(10000);
        $w = $this->pendingDriverWithdraw($driver, 4000);
        $this->approve($w)->assertOk();

        $this->webhook($w, 'payout.failed', 'failed')->assertOk();
        $this->webhook($w, 'payout.failed', 'failed')->assertOk();

        $wallet = DriverWallet::where('driver_id', $driver->id)->first();
        $this->assertSame(10000, $wallet->balance);
        $this->assertSame(10000, $wallet->available());
        $this->assertNotNull($w->fresh()->payout_failed_at);
        $this->assertSame(0, WalletTransaction::where('driver_id', $driver->id)->count());
    }

    public function test_reservation_blocks_a_second_approval_exceeding_available(): void
    {
        $driver = $this->driverWithBalance(5000);
        $first = $this->pendingDriverWithdraw($driver, 4000);
        $this->approve($first)->assertOk();

        $second = $this->pendingDriverWithdraw($driver, 2000);
        $this->approve($second)->assertStatus(422);
        $this->assertSame(WalletWithdrawRequest::STATUS_PENDING, $second->fresh()->status);
    }

    public function test_legacy_withdraw_already_debited_is_not_debited_again(): void
    {
        $driver = $this->driverWithBalance(6000);
        $w = WalletWithdrawRequest::create([
            'driver_id' => $driver->id, 'amount_fcfa' => 4000, 'target_method' => 'momo', 'target_account' => '0197000001',
            'status' => WalletWithdrawRequest::STATUS_APPROVED, 'decided_at' => now(),
            'payout_initiated_at' => now(), 'payout_provider_ref' => '777',
        ]);
        WalletTransaction::create([
            'driver_id' => $driver->id, 'type' => 'withdraw', 'amount_fcfa' => -4000, 'balance_after' => 6000,
            'metadata' => ['admin_id' => null, 'reason' => "Approval of withdraw request #{$w->id}"],
        ]);

        $this->webhook($w, 'payout.sent', 'sent')->assertOk();

        $this->assertSame(6000, DriverWallet::where('driver_id', $driver->id)->value('balance'));
        $this->assertSame(1, WalletTransaction::where('driver_id', $driver->id)->where('type', 'withdraw')->count());
    }

    public function test_manual_mark_paid_debits_once(): void
    {
        $driver = $this->driverWithBalance(10000);
        $w = WalletWithdrawRequest::create([
            'driver_id' => $driver->id, 'amount_fcfa' => 3000, 'target_method' => 'bank', 'target_account' => 'BJ066',
            'status' => WalletWithdrawRequest::STATUS_APPROVED, 'decided_at' => now(),
        ]);
        Sanctum::actingAs(Admin::factory()->create(['sub_role' => 'super'])->user);

        $this->postJson("/api/admin/withdraw-requests/{$w->id}/mark-paid", ['external_payout_reference' => 'VIR-1'])->assertOk();
        $this->postJson("/api/admin/withdraw-requests/{$w->id}/mark-paid", ['external_payout_reference' => 'VIR-1'])->assertStatus(422);

        $this->assertSame(7000, DriverWallet::where('driver_id', $driver->id)->value('balance'));
        $this->assertSame(1, WalletTransaction::where('driver_id', $driver->id)->where('type', 'withdraw')->count());
    }

    public function test_user_instant_withdraw_is_debited_only_by_sent_webhook(): void
    {
        AppSetting::updateOrCreate(['key' => 'user_payout_mode'], ['value' => 'instant', 'type' => 'string']);
        \Illuminate\Support\Facades\Cache::flush();
        $user = User::factory()->create(['type' => 'individual', 'phone' => '+2290197000002']);
        UserWallet::updateOrCreate(['user_id' => $user->id], ['balance' => 8000, 'pending_reserved' => 0]);
        Sanctum::actingAs($user);

        $this->postJson('/api/me/wallet/withdraw-request', [
            'amount' => 3000, 'target_method' => 'momo', 'target_account' => '0197000002',
        ])->assertCreated();

        $w = WalletWithdrawRequest::where('user_id', $user->id)->firstOrFail();
        $wallet = UserWallet::where('user_id', $user->id)->first();
        $this->assertSame(8000, $wallet->balance);
        $this->assertSame(5000, $wallet->available());

        $this->webhook($w, 'payout.sent', 'sent')->assertOk();

        $this->assertSame(5000, $wallet->fresh()->balance);
        $this->assertSame(1, UserWalletTransaction::where('user_id', $user->id)->where('type', 'withdraw')->count());
    }
}
