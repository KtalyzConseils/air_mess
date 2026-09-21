<?php

namespace Tests\Feature\Waitlist;

use App\Models\Admin;
use App\Models\DriverWaitlist;
use App\Models\User;
use App\Services\PhoneVerificationToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DriverSurveyTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_driver_survey_is_persisted_and_visible_in_admin_results(): void
    {
        $phone = '+2290196000000';
        $payload = $this->surveyPayload([
            'prenom' => 'Koffi',
            'nom' => 'AHOUANSOU',
            'telephone' => $phone,
            'operateur' => 'MTN MoMo',
            'zone' => 'Godomey',
            'majeur' => true,
            'consentements' => [
                'cgu_version' => '2026-09',
                'cgu_at' => now()->toIso8601String(),
                'confidentialite_at' => now()->toIso8601String(),
            ],
            'verification_token' => app(PhoneVerificationToken::class)->issue($phone),
            'profil_operationnel' => [
                'moto' => "M'appartient",
                'permis' => 'Oui, valide',
                'telephone_type' => 'Smartphone Android',
                'mobile_money' => ['MTN MoMo'],
                'langue' => 'Fon',
                'jours_par_semaine' => '5 a 6 jours',
                'moments' => ['Midi', 'Soir'],
                'experience_livraison' => 'Oui, de temps en temps',
                'anciennete' => '6 mois a 1 an',
                'reunion' => ['moment' => 'Dimanche', 'lieu' => 'Godomey'],
                'formation_preferee' => 'Demonstration en groupe',
            ],
            'bonus_demande' => true,
            'source' => 'enquete_web',
            'src' => 'site_web',
        ]);

        $this->postJson('/api/waitlist/drivers', $payload)
            ->assertCreated()
            ->assertJsonPath('compte.statut', 'en_liste_attente')
            ->assertJsonPath('liste_attente.zone', 'Godomey');

        $this->assertDatabaseHas('driver_waitlists', [
            'survey_response_id' => '7674a5bc-1111-4111-8111-123456789abc',
            'full_name' => 'Koffi AHOUANSOU',
            'whatsapp' => $phone,
            'zone' => 'Godomey',
            'status' => DriverWaitlist::STATUS_WAITLISTED,
        ]);

        $adminUser = User::factory()->create(['type' => User::TYPE_ADMIN]);
        Admin::create([
            'user_id' => $adminUser->id,
            'first_name' => 'Admin',
            'last_name' => 'Test',
            'sub_role' => Admin::ROLE_COMMERCIAL,
        ]);
        Sanctum::actingAs($adminUser);

        $this->getJson('/api/admin/waitlists/drivers')
            ->assertOk()
            ->assertJsonPath('total', 1)
            ->assertJsonPath('data.0.survey_response_id', '7674a5bc-1111-4111-8111-123456789abc')
            ->assertJsonPath('data.0.account_payload.operateur', 'MTN MoMo')
            ->assertJsonPath('data.0.survey_payload.answers.A10', 'Fon');
    }

    public function test_driver_survey_retries_are_idempotent(): void
    {
        $payload = $this->surveyPayload(null);

        $this->postJson('/api/waitlist/drivers', $payload)->assertCreated();
        $this->postJson('/api/waitlist/drivers', $payload)->assertOk();

        $this->assertSame(1, DriverWaitlist::query()->count());
    }

    private function surveyPayload(?array $account): array
    {
        return [
            'survey' => 'airmess_livreurs',
            'version' => '2.0',
            'mode' => 'web',
            'response' => [
                'response_id' => '7674a5bc-1111-4111-8111-123456789abc',
                'started_at' => now()->subMinutes(8)->toIso8601String(),
                'submitted_at' => now()->toIso8601String(),
                'duration_s' => 480,
                'suspect' => false,
                'src' => 'site_web',
                'completed' => true,
                'stop_reason' => null,
                'answers' => [
                    'A1' => 'Godomey',
                    'A2' => 'Oui',
                    'A4' => 'Oui, valide',
                    'A5' => 'Smartphone Android',
                    'A7' => ['MTN MoMo'],
                    'A10' => 'Fon',
                    'B1' => '5 a 6 jours',
                    'B2' => ['Midi', 'Soir'],
                    'S4' => 'Oui, de temps en temps',
                    'S5' => '6 mois a 1 an',
                    'H3' => 'Dimanche',
                    'H4' => 'Godomey',
                    'H5' => 'Demonstration en groupe',
                    'Z1' => 'Oui',
                ],
            ],
            'account' => $account,
        ];
    }
}
