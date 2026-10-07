<?php

namespace Tests\Feature\Admin;

use App\Mail\DriverRejectedMail;
use App\Models\Admin;
use App\Models\Driver;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DriverRejectionTest extends TestCase
{
    use RefreshDatabase;

    public function test_ops_admin_can_reject_pending_driver_and_free_email(): void
    {
        Storage::fake('local');
        Mail::fake();

        $admin = Admin::factory()->create(['sub_role' => Admin::ROLE_OPS]);
        Sanctum::actingAs($admin->user);

        $user = User::factory()->create([
            'type' => User::TYPE_DRIVER,
            'email' => 'driver.reapply@example.test',
        ]);

        Storage::disk('local')->put('drivers/rejected/cni.pdf', 'fake');

        $driver = Driver::factory()->create([
            'user_id' => $user->id,
            'first_name' => 'Koffi',
            'last_name' => 'Rejected',
            'activation_status' => 'pending',
            'preferred_response_channel' => 'email',
            'cni_url' => 'drivers/rejected/cni.pdf',
        ]);

        $this->postJson("/api/admin/drivers/{$driver->id}/reject", [
            'reason' => 'Document CNI illisible.',
        ])->assertOk();

        $this->assertDatabaseMissing('drivers', ['id' => $driver->id]);
        $this->assertDatabaseMissing('users', ['id' => $user->id]);
        Storage::disk('local')->assertMissing('drivers/rejected/cni.pdf');

        Mail::assertSent(
            DriverRejectedMail::class,
            fn (DriverRejectedMail $mail) =>
                $mail->hasTo('driver.reapply@example.test')
                && $mail->reason === 'Document CNI illisible.',
        );

        $newUser = User::factory()->create([
            'type' => User::TYPE_DRIVER,
            'email' => 'driver.reapply@example.test',
        ]);

        $this->assertNotSame($user->id, $newUser->id);
    }

    public function test_non_pending_driver_cannot_be_rejected(): void
    {
        Mail::fake();

        $admin = Admin::factory()->create(['sub_role' => Admin::ROLE_OPS]);
        Sanctum::actingAs($admin->user);

        $driver = Driver::factory()->create(['activation_status' => 'active']);

        $this->postJson("/api/admin/drivers/{$driver->id}/reject", [
            'reason' => 'Dossier deja actif.',
        ])->assertStatus(422);

        $this->assertDatabaseHas('drivers', ['id' => $driver->id]);
        Mail::assertNothingSent();
    }
}
