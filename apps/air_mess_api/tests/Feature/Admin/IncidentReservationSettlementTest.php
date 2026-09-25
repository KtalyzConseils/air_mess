<?php

namespace Tests\Feature\Admin;

use App\Models\{Admin, Course, CourseIncident, User, UserWallet, UserWalletTransaction};
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class IncidentReservationSettlementTest extends TestCase
{
    use RefreshDatabase;

    public function test_driver_with_returning_parcel_cannot_be_deactivated(): void
    {
        $driver = \App\Models\Driver::factory()->create(['activation_status' => 'active']);
        Course::factory()->create([
            'reference' => 'DEACT-'.bin2hex(random_bytes(7)),
            'driver_id' => $driver->id, 'status' => Course::STATUS_RETURNING_TO_SENDER,
        ]);
        $token = $driver->user->createToken('test')->accessToken;
        Sanctum::actingAs(Admin::factory()->create(['sub_role' => 'super'])->user);
        $this->postJson("/api/admin/drivers/{$driver->id}/toggle-active")->assertStatus(422);
        $this->assertSame('active', $driver->fresh()->activation_status);
        $this->assertDatabaseHas('personal_access_tokens', ['id' => $token->id]);
    }

    public function test_previous_driver_holding_parcel_cannot_be_deactivated(): void
    {
        $previous = \App\Models\Driver::factory()->create(['activation_status' => 'active']);
        $next = \App\Models\Driver::factory()->create();
        Course::factory()->create([
            'reference' => 'DEACT-'.bin2hex(random_bytes(7)),
            'driver_id' => $next->id, 'previous_driver_id' => $previous->id,
            'pickup_from_previous_driver' => true, 'status' => Course::STATUS_PICKED_UP,
        ]);
        Sanctum::actingAs(Admin::factory()->create(['sub_role' => 'super'])->user);
        $this->postJson("/api/admin/drivers/{$previous->id}/toggle-active")->assertStatus(422);
        $this->assertSame('active', $previous->fresh()->activation_status);
    }

    private function scenario(int $otherHold = 0): array
    {
        $user = User::factory()->create(['type' => 'individual']);
        $wallet = UserWallet::firstOrCreate(['user_id' => $user->id], ['balance' => 0]);
        $wallet->update(['balance' => 2600, 'pending_reserved' => 1400 + $otherHold]);
        $course = Course::factory()->create([
            'reference' => 'IR-'.bin2hex(random_bytes(7)), 'sender_id' => $user->id,
            'status' => Course::STATUS_FAILED, 'delivery_fee' => 1400, 'paid_from_wallet' => true,
            'has_collection' => false, 'return_confirmed_at' => now(),
        ]);
        $incident = CourseIncident::create(['course_id' => $course->id, 'reported_by' => $user->id, 'reporter_type' => 'marchant', 'type' => 'other', 'status' => 'open']);
        Sanctum::actingAs(Admin::factory()->create(['sub_role' => 'ops'])->user);
        return [$wallet, $course, $incident];
    }

    public function test_incident_can_be_closed_without_financial_adjustments(): void
    {
        [$wallet, $course, $incident] = $this->scenario();
        $this->postJson("/api/admin/incidents/{$incident->id}/arbitrate", [
            'resolution_note' => 'Transfert termine, aucun ajustement necessaire',
        ])->assertOk();
        $this->assertSame('resolved', $incident->fresh()->status);
        $this->assertSame(2600, (int) $wallet->fresh()->balance);
        $this->assertSame(1400, (int) $wallet->fresh()->pending_reserved);
        $this->assertSame(0, UserWalletTransaction::where('course_id', $course->id)->count());
        $this->assertDatabaseMissing('wallet_adjustments', ['course_id' => $course->id]);
    }

    public function test_refund_captures_unspent_hold_and_cannot_be_replayed(): void
    {
        [$wallet, $course, $incident] = $this->scenario();
        $data = ['resolution_note' => 'Colis retourné, retenue de 350 F', 'reason_code_marchand' => 'incident_refund', 'amount_marchand' => 1050];
        $this->postJson("/api/admin/incidents/{$incident->id}/arbitrate", $data)->assertOk();
        $this->assertSame(2250, (int) $wallet->fresh()->balance);
        $this->assertSame(0, (int) $wallet->fresh()->pending_reserved);
        $this->assertFalse($course->fresh()->paid_from_wallet);
        $this->assertDatabaseHas('user_wallet_transactions', ['course_id' => $course->id, 'type' => 'course_charge', 'amount_fcfa' => -1400]);
        $this->assertDatabaseHas('user_wallet_transactions', ['course_id' => $course->id, 'type' => 'adjustment_incident', 'amount_fcfa' => 1050]);
        $this->postJson("/api/admin/incidents/{$incident->id}/arbitrate", $data)->assertUnprocessable();
        $this->assertSame(2250, (int) $wallet->fresh()->balance);
    }

    public function test_full_refund_preserves_other_course_reservations(): void
    {
        [$wallet, , $incident] = $this->scenario(500);
        $this->postJson("/api/admin/incidents/{$incident->id}/arbitrate", ['resolution_note' => 'Remboursement intégral', 'reason_code_marchand' => 'incident_refund', 'amount_marchand' => 1400])->assertOk();
        $this->assertSame(2600, (int) $wallet->fresh()->balance);
        $this->assertSame(500, (int) $wallet->fresh()->pending_reserved);
    }

    public function test_already_captured_course_is_not_charged_twice(): void
    {
        [$wallet, $course, $incident] = $this->scenario();
        app(\App\Services\UserWalletService::class)->chargePartial($course->sender, $course, 1400);
        $this->postJson("/api/admin/incidents/{$incident->id}/arbitrate", ['resolution_note' => 'Remboursement après débit', 'reason_code_marchand' => 'incident_refund', 'amount_marchand' => 1050])->assertOk();
        $this->assertSame(2250, (int) $wallet->fresh()->balance);
        $this->assertSame(0, (int) $wallet->fresh()->pending_reserved);
        $this->assertSame(1, UserWalletTransaction::where('course_id', $course->id)->where('type', 'course_charge')->count());
    }

    public function test_failed_driver_adjustment_rolls_back_capture_and_refund(): void
    {
        [$wallet, $course, $incident] = $this->scenario();
        $driver = \App\Models\Driver::factory()->create();
        \App\Models\DriverWallet::firstOrCreate(['driver_id' => $driver->id], ['balance' => 0])->update(['balance' => 0]);
        $course->update(['driver_id' => $driver->id]);
        $this->postJson("/api/admin/incidents/{$incident->id}/arbitrate", [
            'resolution_note' => 'Arbitrage non finançable', 'reason_code_marchand' => 'incident_refund', 'amount_marchand' => 1050,
            'reason_code_driver' => 'manual_debit', 'amount_driver' => -350,
        ])->assertUnprocessable();
        $this->assertSame(2600, (int) $wallet->fresh()->balance);
        $this->assertSame(1400, (int) $wallet->fresh()->pending_reserved);
        $this->assertTrue($course->fresh()->paid_from_wallet);
        $this->assertSame('open', $incident->fresh()->status);
        $this->assertSame(0, UserWalletTransaction::where('course_id', $course->id)->count());
    }

    public function test_empty_driver_caution_does_not_leave_incident_replayable(): void
    {
        [$wallet, $course, $incident] = $this->scenario();
        $driver = \App\Models\Driver::factory()->create();
        \App\Models\DriverWallet::firstOrCreate(['driver_id' => $driver->id], ['balance' => 0])->update(['balance' => 0]);
        $course->update(['driver_id' => $driver->id]);
        $data = ['resolution_note' => 'Caution insuffisante', 'reason_code_marchand' => 'incident_refund', 'amount_marchand' => 1050, 'reason_code_driver' => 'incident_debit', 'amount_driver' => -350];
        $this->postJson("/api/admin/incidents/{$incident->id}/arbitrate", $data)->assertOk();
        $this->assertSame('resolved', $incident->fresh()->status);
        $this->assertSame('suspended', $driver->fresh()->activation_status);
        $this->assertSame(2250, (int) $wallet->fresh()->balance);
        $this->postJson("/api/admin/incidents/{$incident->id}/arbitrate", $data)->assertUnprocessable();
    }
}
