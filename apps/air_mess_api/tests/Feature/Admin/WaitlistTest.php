<?php

namespace Tests\Feature\Admin;

use App\Mail\DriverValidatedMail;
use App\Mail\MarchantValidatedMail;
use App\Models\Admin;
use App\Models\Driver;
use App\Models\Marchant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class WaitlistTest extends TestCase
{
    use RefreshDatabase;

    private function actingAsAdmin(): Admin
    {
        $adminUser = User::factory()->create(['type' => User::TYPE_ADMIN]);
        $admin = Admin::create([
            'user_id' => $adminUser->id,
            'first_name' => 'Admin',
            'last_name' => 'Test',
            'sub_role' => Admin::ROLE_COMMERCIAL,
        ]);
        Sanctum::actingAs($adminUser);

        return $admin;
    }

    public function test_waiting_list_uses_profile_status_not_notification_and_updates_after_external_validation(): void
    {
        Mail::fake();
        $this->actingAsAdmin();
        $merchantUser = User::factory()->create(['type' => User::TYPE_MARCHANT,
            'waitlisted_at' => now(), 'waitlist_notified_at' => null]);
        $merchant = Marchant::factory()->create(['user_id' => $merchantUser->id, 'validated_at' => null]);
        $driverUser = User::factory()->create(['type' => User::TYPE_DRIVER,
            'waitlisted_at' => now(), 'waitlist_notified_at' => now()]);
        $driver = Driver::factory()->create(['user_id' => $driverUser->id, 'activation_status' => 'pending']);
        $this->getJson('/api/admin/waitlist?status=waiting')->assertOk()->assertJsonPath('total', 2)
            ->assertJsonFragment(['id' => $merchantUser->id])->assertJsonFragment(['id' => $driverUser->id]);
        // Les fiches admin modifient les profils : aucun mail de liste d'attente nécessaire.
        $merchant->update(['validated_at' => now()]);
        $driver->update(['activation_status' => 'active']);
        for ($i = 0; $i < 2; $i++) {
            $this->getJson('/api/admin/waitlist?status=waiting')->assertOk()->assertJsonPath('total', 0);
        }
        $this->getJson('/api/admin/waitlist?status=all')->assertOk()->assertJsonPath('total', 2);
        $this->assertNull($merchantUser->fresh()->waitlist_notified_at);
        Mail::assertNothingSent();
        Mail::assertNothingQueued();
    }

    public function test_admin_can_validate_and_inform_a_waitlisted_marchant(): void
    {
        Mail::fake();
        $admin = $this->actingAsAdmin();
        $waiting = User::factory()->create([
            'type' => User::TYPE_MARCHANT,
            'is_active' => true,
            'waitlisted_at' => now(),
        ]);
        $marchant = Marchant::factory()->create([
            'user_id' => $waiting->id,
            'validated_at' => null,
        ]);

        $this->postJson("/api/admin/waitlist/{$waiting->id}/notify")
            ->assertOk()
            ->assertJsonPath('status', 'validated');

        $waiting->refresh();
        $this->assertNotNull($marchant->fresh()->validated_at);
        $this->assertNotNull($waiting->waitlist_notified_at);
        $this->assertSame($admin->id, $waiting->waitlist_notified_by);
        Mail::assertQueued(MarchantValidatedMail::class, fn ($mail) => $mail->hasTo($waiting->email));

        $this->postJson("/api/admin/waitlist/{$waiting->id}/notify")
            ->assertOk()
            ->assertJsonPath('status', 'already_validated');
        Mail::assertQueuedCount(1);
    }

    public function test_admin_can_validate_and_inform_a_pending_driver_from_waitlist(): void
    {
        Mail::fake();
        $admin = $this->actingAsAdmin();
        $waiting = User::factory()->create([
            'type' => User::TYPE_DRIVER,
            'is_active' => true,
            'waitlisted_at' => now(),
        ]);
        $driver = Driver::factory()->create([
            'user_id' => $waiting->id,
            'activation_status' => 'pending',
        ]);

        $this->postJson("/api/admin/waitlist/{$waiting->id}/notify")
            ->assertOk()
            ->assertJsonPath('status', 'validated');

        $this->assertSame('active', $driver->fresh()->activation_status);
        $waiting->refresh();
        $this->assertNotNull($waiting->waitlist_notified_at);
        $this->assertSame($admin->id, $waiting->waitlist_notified_by);
        Mail::assertQueued(DriverValidatedMail::class, fn ($mail) => $mail->hasTo($waiting->email));
    }
}
