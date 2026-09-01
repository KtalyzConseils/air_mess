<?php

namespace Tests\Feature\Auth;

use App\Mail\QuickRegistrationCodeMail;
use App\Models\Marchant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class QuickRegistrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_quick_marchant_registration_can_use_phone_without_email(): void
    {
        config(['services.brevo.sms_fake' => true]);

        $send = $this->postJson('/api/auth/register/quick/send-code', [
            'account_type'         => User::TYPE_MARCHANT,
            'display_name'         => 'Maison Kossi',
            'email'                => null,
            'phone'                => '+22997000000',
            'verification_channel' => 'phone',
            'phone_is_whatsapp'    => true,
            'accepted_terms'       => true,
        ]);

        $send->assertOk();
        $code = $send->json('debug_code');
        $this->assertNotEmpty($code);

        $verify = $this->postJson('/api/auth/register/quick/verify', [
            'phone' => '+22997000000',
            'code'  => $code,
        ]);

        $verify->assertCreated();
        $verify->assertJsonPath('user.type', User::TYPE_MARCHANT);
        $verify->assertJsonPath('user.email', null);
        $verify->assertJsonPath('user.marchant.raison_sociale', 'Maison Kossi');
        $this->assertNotEmpty($verify->json('token'));

        $this->assertDatabaseHas('users', [
            'name'  => 'Maison Kossi',
            'email' => null,
            'phone' => '+22997000000',
            'type'  => User::TYPE_MARCHANT,
        ]);
        $this->assertDatabaseHas('marchants', [
            'raison_sociale' => 'Maison Kossi',
            'validated_at'   => null,
        ]);
        $this->assertSame(1, Marchant::count());
    }

    public function test_quick_registration_requires_email_when_email_channel_is_selected(): void
    {
        $response = $this->postJson('/api/auth/register/quick/send-code', [
            'account_type'         => User::TYPE_INDIVIDUAL,
            'display_name'         => 'Kossi A',
            'email'                => null,
            'phone'                => '+22997000001',
            'verification_channel' => 'email',
            'phone_is_whatsapp'    => true,
            'accepted_terms'       => true,
        ]);

        $response->assertUnprocessable();
        $response->assertJsonValidationErrors(['email']);
    }

    public function test_quick_registration_email_channel_sends_real_mail_without_debug_code(): void
    {
        Mail::fake();
        config(['services.brevo.sms_fake' => true]);

        $response = $this->postJson('/api/auth/register/quick/send-code', [
            'account_type'         => User::TYPE_INDIVIDUAL,
            'display_name'         => 'Kossi A',
            'email'                => 'kossi@example.com',
            'phone'                => '+22997000002',
            'verification_channel' => 'email',
            'phone_is_whatsapp'    => true,
            'accepted_terms'       => true,
        ]);

        $response->assertOk();
        $response->assertJsonMissing(['debug_code']);

        Mail::assertQueued(QuickRegistrationCodeMail::class, function (QuickRegistrationCodeMail $mail) {
            return $mail->hasTo('kossi@example.com')
                && $mail->displayName === 'Kossi A'
                && preg_match('/^\d{6}$/', $mail->code) === 1;
        });
    }
}
