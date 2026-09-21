<?php

namespace Tests\Feature\Admin;

use App\Models\Admin;
use App\Models\Payment;
use App\Models\User;
use App\Services\SandboxFinancialAuditService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SandboxFinancialAuditTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_sandbox_credit_is_not_counted_twice_and_a_wallet_change_invalidates_the_snapshot(): void
    {
        $user = User::factory()->create();
        $paymentId = DB::table('payments')->insertGetId([
            'user_id' => $user->id,
            'type' => Payment::TYPE_USER_WALLET_DEPOSIT,
            'amount_fcfa' => 5000,
            'currency' => 'XOF',
            'status' => Payment::STATUS_PAID,
            'provider' => Payment::PROVIDER_FEDAPAY,
            'raw_response' => json_encode(['mode' => 'momo_test']),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('user_wallets')->insert([
            'user_id' => $user->id,
            'balance' => 5000,
            'pending_reserved' => 0,
            'total_deposited' => 5000,
            'total_spent' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('user_wallet_transactions')->insert([
            'user_id' => $user->id,
            'type' => 'deposit',
            'amount_fcfa' => 5000,
            'balance_after' => 5000,
            'payment_id' => $paymentId,
            'created_at' => now(),
        ]);

        $before = app(SandboxFinancialAuditService::class)->audit();

        $this->assertSame(5000, $before['user_wallets']['sandbox_credit_total']);
        $this->assertSame(5000, $before['user_wallets']['residual_upper_bound']);
        $this->assertCount(1, $before['payments']['ids']);

        DB::table('user_wallets')->where('user_id', $user->id)->update([
            'balance' => 4000,
            'updated_at' => now()->addSecond(),
        ]);
        $after = app(SandboxFinancialAuditService::class)->audit();

        $this->assertNotSame($before['snapshot_token'], $after['snapshot_token']);
        $this->assertSame(4000, $after['user_wallets']['residual_upper_bound']);
    }

    public function test_preview_repair_rejects_stale_snapshot_and_returns_compensation_plan(): void
    {
        $user = User::factory()->create();
        $paymentId = DB::table('payments')->insertGetId([
            'user_id' => $user->id,
            'type' => Payment::TYPE_USER_WALLET_DEPOSIT,
            'amount_fcfa' => 5000,
            'currency' => 'XOF',
            'status' => Payment::STATUS_PAID,
            'provider' => Payment::PROVIDER_FEDAPAY,
            'raw_response' => json_encode(['mode' => 'momo_test']),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('user_wallets')->insert([
            'user_id' => $user->id,
            'balance' => 5000,
            'pending_reserved' => 0,
            'total_deposited' => 5000,
            'total_spent' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('user_wallet_transactions')->insert([
            'user_id' => $user->id,
            'type' => 'deposit',
            'amount_fcfa' => 5000,
            'balance_after' => 5000,
            'payment_id' => $paymentId,
            'created_at' => now(),
        ]);

        $audit = app(SandboxFinancialAuditService::class)->audit();
        $plan = app(SandboxFinancialAuditService::class)->previewRepair($audit['snapshot_token']);

        $this->assertTrue($plan['correction_ready']);
        $this->assertSame(-5000, $plan['user_adjustments'][0]['amount_fcfa']);

        DB::table('user_wallets')->where('user_id', $user->id)->update([
            'balance' => 4000,
            'updated_at' => now()->addSecond(),
        ]);

        $this->expectException(\RuntimeException::class);
        app(SandboxFinancialAuditService::class)->previewRepair($audit['snapshot_token']);
    }

    public function test_apply_repair_executes_compensation_and_keeps_snapshot_validity(): void
    {
        $user = User::factory()->create();
        $paymentId = DB::table('payments')->insertGetId([
            'user_id' => $user->id,
            'type' => Payment::TYPE_USER_WALLET_DEPOSIT,
            'amount_fcfa' => 5000,
            'currency' => 'XOF',
            'status' => Payment::STATUS_PAID,
            'provider' => Payment::PROVIDER_FEDAPAY,
            'raw_response' => json_encode(['mode' => 'momo_test']),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('user_wallets')->insert([
            'user_id' => $user->id,
            'balance' => 5000,
            'pending_reserved' => 0,
            'total_deposited' => 5000,
            'total_spent' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('user_wallet_transactions')->insert([
            'user_id' => $user->id,
            'type' => 'deposit',
            'amount_fcfa' => 5000,
            'balance_after' => 5000,
            'payment_id' => $paymentId,
            'created_at' => now(),
        ]);

        $audit = app(SandboxFinancialAuditService::class)->audit();
        $result = app(SandboxFinancialAuditService::class)->applyRepair($audit['snapshot_token'], null);

        $this->assertSame(0, (int) DB::table('user_wallets')->where('user_id', $user->id)->value('balance'));
        $this->assertSame('manual_debit', DB::table('wallet_adjustments')->where('wallet_owner_id', $user->id)->value('reason_code'));
        $this->assertSame($audit['snapshot_token'], $result['snapshot_token']);
    }

    public function test_admin_endpoint_applies_sandbox_compensation_only_for_super_admin(): void
    {
        $user = User::factory()->create();
        $paymentId = DB::table('payments')->insertGetId([
            'user_id' => $user->id,
            'type' => Payment::TYPE_USER_WALLET_DEPOSIT,
            'amount_fcfa' => 5000,
            'currency' => 'XOF',
            'status' => Payment::STATUS_PAID,
            'provider' => Payment::PROVIDER_FEDAPAY,
            'raw_response' => json_encode(['mode' => 'momo_test']),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('user_wallets')->insert([
            'user_id' => $user->id,
            'balance' => 5000,
            'pending_reserved' => 0,
            'total_deposited' => 5000,
            'total_spent' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('user_wallet_transactions')->insert([
            'user_id' => $user->id,
            'type' => 'deposit',
            'amount_fcfa' => 5000,
            'balance_after' => 5000,
            'payment_id' => $paymentId,
            'created_at' => now(),
        ]);

        $admin = Admin::factory()->create(['sub_role' => Admin::ROLE_SUPER]);
        Sanctum::actingAs($admin->user);

        $token = app(SandboxFinancialAuditService::class)->audit()['snapshot_token'];

        $response = $this->postJson('/api/admin/sandbox/repair', ['snapshot_token' => $token]);

        $response->assertOk();
        $this->assertSame(0, (int) DB::table('user_wallets')->where('user_id', $user->id)->value('balance'));
        $this->assertSame('sandbox_compensation', DB::table('wallet_adjustments')->where('wallet_owner_id', $user->id)->value('notes'));
    }
}
