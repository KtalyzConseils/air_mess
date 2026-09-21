<?php

namespace Tests\Feature\Admin;

use App\Models\Payment;
use App\Models\User;
use App\Services\SandboxFinancialAuditService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
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
}
