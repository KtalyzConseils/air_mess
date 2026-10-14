<?php

namespace Tests\Feature\Admin;

use App\Models\Admin;
use App\Models\Driver;
use App\Models\DriverWallet;
use App\Models\WalletTransaction;
use App\Models\WalletWithdrawRequest;
use App\Services\FedapayService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use RuntimeException;
use Tests\TestCase;

/**
 * Incident prod 2026-10 : FedaPay refusait les payouts en 403 « Opération non autorisée ».
 * L'approbation admin répondait quand même « tentative de virement lancée » et le livreur
 * recevait « versement en cours » alors que rien n'était parti — argent débité, aucun virement.
 *
 * Ces tests verrouillent le comportement attendu : un échec FedaPay est remonté tel quel
 * (approbation ET retentative), le wallet n'est pas débité sans virement confirmé, et aucun état « payé »
 * n'est écrit sans confirmation de la part du fournisseur.
 */
class WithdrawPayoutFailureTest extends TestCase
{
    use RefreshDatabase;

    private const FEDAPAY_403 = 'Échec FedaPay (HTTP 403) : Opération non autorisée';

    private function actingAsOpsAdmin(): void
    {
        $admin = Admin::factory()->create(['sub_role' => Admin::ROLE_OPS]);
        Sanctum::actingAs($admin->user);
    }

    /**
     * @return array{0: Driver, 1: WalletWithdrawRequest}
     */
    private function pendingWithdrawForDriver(int $balance = 50_000, int $amount = 10_000): array
    {
        $driver = Driver::factory()->create([
            'activation_status'   => 'active',
            'availability_status' => 'available',
        ]);
        DriverWallet::factory()->create(['driver_id' => $driver->id, 'balance' => $balance]);

        $withdraw = WalletWithdrawRequest::create([
            'driver_id'      => $driver->id,
            'amount_fcfa'    => $amount,
            'target_method'  => WalletWithdrawRequest::METHOD_MOMO,
            'target_account' => '97000000',
            'status'         => WalletWithdrawRequest::STATUS_PENDING,
        ]);

        return [$driver, $withdraw];
    }

    public function test_approval_reports_fedapay_failure_instead_of_pretending_the_transfer_started(): void
    {
        $this->actingAsOpsAdmin();
        [$driver, $withdraw] = $this->pendingWithdrawForDriver();

        $this->mock(FedapayService::class)
            ->shouldReceive('createPayout')
            ->once()
            ->andThrow(new RuntimeException(self::FEDAPAY_403));

        $response = $this->postJson("/api/admin/withdraw-requests/{$withdraw->id}/approve")
            ->assertOk()
            ->assertJsonPath('payout_status', 'failed');

        // Le message ne doit plus annoncer un virement lancé.
        $this->assertStringContainsString('virement automatique', mb_strtolower((string) $response->json('message')));

        $fresh = $withdraw->fresh();
        $this->assertNotNull($fresh->payout_failed_at);
        $this->assertNull($fresh->paid_at);
        $this->assertStringContainsString('403', (string) $fresh->payout_failure_reason);

        // Aucun débit : le wallet n'est débité qu'à la confirmation du virement
        // (webhook FedaPay `sent` ou « Marquer comme viré » après virement manuel).
        $this->assertSame(
            50_000,
            (int) DriverWallet::where('driver_id', $driver->id)->value('balance'),
        );
        $this->assertSame(
            0,
            WalletTransaction::where('driver_id', $driver->id)
                ->where('type', WalletTransaction::TYPE_WITHDRAW)
                ->count(),
        );

        // Le livreur, qui vient de lire « versement en cours », doit recevoir la correction.
        $this->assertDatabaseHas('notifications', [
            'user_id' => $driver->user_id,
            'type'    => 'wallet.withdraw_failed_initiation',
        ]);
    }

    public function test_retry_reports_the_failure_instead_of_pretending_the_transfer_started(): void
    {
        $this->actingAsOpsAdmin();
        [, $withdraw] = $this->pendingWithdrawForDriver();

        $withdraw->update([
            'status'                => WalletWithdrawRequest::STATUS_APPROVED,
            'decided_at'            => now()->subDay(),
            'payout_failed_at'      => now()->subHour(),
            'payout_failure_reason' => self::FEDAPAY_403,
        ]);

        $this->mock(FedapayService::class)
            ->shouldReceive('createPayout')
            ->once()
            ->andThrow(new RuntimeException(self::FEDAPAY_403));

        $this->postJson("/api/admin/withdraw-requests/{$withdraw->id}/retry-payout")
            ->assertOk()
            ->assertJsonPath('payout_status', 'failed');

        $this->assertNotNull($withdraw->fresh()->payout_failed_at);
    }

    public function test_accepted_payout_is_reported_as_initiated_and_never_flagged_as_failed(): void
    {
        $this->actingAsOpsAdmin();
        [, $withdraw] = $this->pendingWithdrawForDriver();

        $this->mock(FedapayService::class)
            ->shouldReceive('createPayout')
            ->once()
            ->andReturn(['id' => 'payout_123', 'reference' => 'py_123', 'status' => 'pending']);

        $this->postJson("/api/admin/withdraw-requests/{$withdraw->id}/approve")
            ->assertOk()
            ->assertJsonPath('payout_status', 'initiated');

        $fresh = $withdraw->fresh();
        $this->assertNotNull($fresh->payout_initiated_at);
        $this->assertNull($fresh->payout_failed_at);
        $this->assertSame('payout_123', $fresh->payout_provider_ref);
    }
}
