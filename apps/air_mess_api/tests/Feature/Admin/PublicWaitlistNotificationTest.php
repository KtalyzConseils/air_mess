<?php

namespace Tests\Feature\Admin;

use App\Mail\PublicWaitlistReadyMail;
use App\Models\Admin;
use App\Models\DriverWaitlist;
use App\Models\MerchantWaitlist;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PublicWaitlistNotificationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Sanctum::actingAs(Admin::factory()->create(['sub_role' => 'ops'])->user);
        Mail::fake();
    }

    public function test_admin_can_notify_a_merchant_prospect(): void
    {
        $candidate = MerchantWaitlist::create([
            'commerce_type' => 'Restauration rapide / plats préparés', 'zone' => 'Cotonou',
            'weekly_orders' => 'Moins de 10', 'delivery_methods' => ['Aucune'], 'problems' => ['Aucun'],
            'worst_experience' => 'Aucune', 'cash_collection_issue' => 'Non', 'time_lost_weekly' => 'Aucune',
            'orders_lost_weekly' => 'Aucune', 'expected_benefit' => 'Livrer', 'commission_acceptance' => 'Oui',
            'reasonable_fee' => '500', 'mobile_money_trust' => 'Oui', 'interest_level' => 5,
            'trial_interest' => 'Oui', 'contact_name' => 'Prospect Marchand', 'email' => 'merchant.prospect@example.test',
            'status' => 'waitlisted', 'bonus_amount' => 500,
        ]);

        $this->postJson("/api/admin/waitlists/merchants/{$candidate->id}/notify")->assertOk();

        Mail::assertSent(PublicWaitlistReadyMail::class, fn ($mail) => $mail->hasTo('merchant.prospect@example.test') && strlen($mail->activationToken) === 64);
        $this->assertSame('notified', $candidate->fresh()->status);
        $this->assertNotNull($candidate->fresh()->notified_at);
        $this->assertNotNull($candidate->fresh()->activation_token_hash);
    }

    public function test_admin_can_notify_a_driver_prospect(): void
    {
        $candidate = DriverWaitlist::create([
            'vehicle_type' => 'Moto', 'zone' => 'Cotonou', 'experience' => 'Débutant',
            'availability' => 'Temps plein', 'platforms_used' => ['Aucune'], 'weekly_deliveries' => '0',
            'weekly_income' => '0', 'problems' => ['Aucun'], 'worst_experience' => 'Aucune',
            'expected_payment_model' => 'Fixe', 'expected_weekly_income' => '20000',
            'mobile_money_trust' => 'Oui', 'interest_level' => 5, 'launch_availability' => 'Oui',
            'full_name' => 'Prospect Livreur', 'email' => 'driver.prospect@example.test',
            'whatsapp' => '97000000', 'status' => 'waitlisted',
        ]);

        $this->postJson("/api/admin/waitlists/drivers/{$candidate->id}/notify")->assertOk();

        Mail::assertSent(PublicWaitlistReadyMail::class, fn ($mail) => $mail->hasTo('driver.prospect@example.test') && strlen($mail->activationToken) === 64);
        $this->assertSame('notified', $candidate->fresh()->status);
        $this->assertNotNull($candidate->fresh()->notified_at);

        $mail = Mail::sent(PublicWaitlistReadyMail::class)->first();
        $this->getJson('/api/waitlist/activation/'.$mail->activationToken)
            ->assertOk()
            ->assertJsonPath('prefill.kind', 'driver')
            ->assertJsonPath('prefill.email', 'driver.prospect@example.test')
            ->assertJsonPath('prefill.first_name', 'Prospect')
            ->assertJsonPath('prefill.last_name', 'Livreur')
            ->assertJsonPath('prefill.vehicle_type', 'moto');
    }
}
