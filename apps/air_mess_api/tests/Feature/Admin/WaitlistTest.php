<?php

namespace Tests\Feature\Admin;

use App\Mail\WaitlistOpenedMail;
use App\Models\Admin;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class WaitlistTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_inform_and_activate_a_waitlisted_user_once(): void
    {
        Mail::fake();
        $adminUser = User::factory()->create(['type' => User::TYPE_ADMIN]);
        $admin = Admin::create([
            'user_id' => $adminUser->id,
            'first_name' => 'Admin',
            'last_name' => 'Test',
            'sub_role' => Admin::ROLE_COMMERCIAL,
        ]);
        $waiting = User::factory()->create([
            'type' => User::TYPE_INDIVIDUAL,
            'is_active' => false,
            'waitlisted_at' => now(),
        ]);
        Sanctum::actingAs($adminUser);

        $this->postJson("/api/admin/waitlist/{$waiting->id}/notify")
            ->assertOk()
            ->assertJsonPath('status', 'notified');

        $waiting->refresh();
        $this->assertTrue($waiting->is_active);
        $this->assertNotNull($waiting->waitlist_notified_at);
        $this->assertSame($admin->id, $waiting->waitlist_notified_by);
        Mail::assertSent(WaitlistOpenedMail::class, fn ($mail) => $mail->hasTo($waiting->email));

        $this->postJson("/api/admin/waitlist/{$waiting->id}/notify")
            ->assertOk()
            ->assertJsonPath('status', 'already_notified');
        Mail::assertSentCount(1);
    }
}
