<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use App\Models\MerchantWaitlist;
use App\Services\FirebaseTokenVerifier;
use App\Services\PublicWaitlistActivationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RegisterMarchantIndividualTest extends TestCase
{
    use RefreshDatabase;

    private function individualPayload(array $overrides = []): array
    {
        return array_merge([
            'first_name' => 'Ama',
            'last_name'  => 'Dossou',
            'email'      => 'ama@example.com',
            'phone'      => '+229 01 90 12 34 56',
            'password'              => 'secret123',
            'password_confirmation' => 'secret123',
            'accepted_terms' => '1',
        ], $overrides);
    }

    private function marchantPayload(array $overrides = []): array
    {
        return array_merge([
            'name'  => 'Jean Kponou',
            'email' => 'shop@example.com',
            'phone' => '+229 01 91 22 33 44',
            'password'              => 'secret123',
            'password_confirmation' => 'secret123',
            'raison_sociale'   => 'Kponou Market',
            'secteur_activite' => 'boutique',
            'accepted_terms'   => '1',
        ], $overrides);
    }

    /** Mocke le verifier pour la vérification Google (optionnelle). */
    private function mockGoogleVerifier(?string $googleEmail = null): void
    {
        $mock = $this->mock(FirebaseTokenVerifier::class);
        $mock->shouldReceive('verifyGoogleEmail')->andReturn($googleEmail);
    }

    public function test_individual_register_succeeds_and_marks_phone_verified(): void
    {
        $this->postJson('/api/auth/register/individual', $this->individualPayload())
            ->assertStatus(201);

        $user = User::where('email', 'ama@example.com')->firstOrFail();
        $this->assertSame('+2290190123456', $user->phone);
        $this->assertNotNull($user->phone_verified_at);
        $this->assertNull($user->email_verified_at); // pas de Google ici
    }

    public function test_individual_always_gets_direct_access_even_when_defer_login_is_sent(): void
    {
        $this->postJson('/api/auth/register/individual', $this->individualPayload([
            'defer_login' => true,
        ]))
            ->assertStatus(201)
            ->assertJsonStructure(['token']);

        $this->assertDatabaseCount('users', 1);
        $this->assertDatabaseCount('personal_access_tokens', 1);
        $user = User::firstOrFail();
        $this->assertTrue($user->is_active);
        $this->assertNull($user->waitlisted_at);
        $this->assertNull($user->waitlist_notified_at);
    }

    public function test_individual_register_with_google_marks_email_verified(): void
    {
        $this->mockGoogleVerifier('ama@example.com');

        $this->postJson('/api/auth/register/individual', $this->individualPayload([
            'firebase_google_id_token' => 'fake-google-token',
        ]))->assertStatus(201);

        $this->assertNotNull(
            User::where('email', 'ama@example.com')->firstOrFail()->email_verified_at,
        );
    }

    public function test_individual_register_rejects_google_token_of_another_email(): void
    {
        $this->mockGoogleVerifier('autre@example.com');

        $this->postJson('/api/auth/register/individual', $this->individualPayload([
            'firebase_google_id_token' => 'fake-google-token',
        ]))
            ->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    public function test_marchant_register_succeeds(): void
    {
        $this->postJson('/api/auth/register/marchant', $this->marchantPayload())
            ->assertStatus(201)
            ->assertJsonStructure(['user', 'token']);

        $user = User::where('email', 'shop@example.com')->firstOrFail();
        $this->assertSame('+2290191223344', $user->phone);
        $this->assertNotNull($user->phone_verified_at);
        $this->assertTrue($user->is_active);
        $this->assertNotNull($user->waitlisted_at);
        $this->assertNull($user->marchant->validated_at);
    }

    public function test_marchant_register_succeeds_with_google(): void
    {
        $this->mockGoogleVerifier('shop@example.com');

        $this->postJson('/api/auth/register/marchant', $this->marchantPayload([
            'firebase_google_id_token' => 'fake-google-token',
        ]))->assertStatus(201)->assertJsonStructure(['user', 'token']);

        $user = User::where('email', 'shop@example.com')->firstOrFail();
        $this->assertSame('+2290191223344', $user->phone);
        $this->assertNotNull($user->phone_verified_at);
        $this->assertNotNull($user->email_verified_at);
    }

    public function test_activation_link_prefills_and_is_consumed_by_merchant_registration(): void
    {
        $candidate = MerchantWaitlist::create([
            'commerce_type' => 'Restauration rapide / plats préparés', 'zone' => 'Cotonou',
            'weekly_orders' => 'Moins de 10', 'delivery_methods' => ['Vente sur place'],
            'problems' => ['Aucun problème particulier'], 'worst_experience' => 'Aucune',
            'cash_collection_issue' => 'Non, jamais', 'time_lost_weekly' => "Moins d'1 heure",
            'orders_lost_weekly' => 'Aucune', 'expected_benefit' => 'Livrer rapidement',
            'commission_acceptance' => 'Oui, sans hésiter', 'reasonable_fee' => '300 à 500 FCFA',
            'mobile_money_trust' => 'Oui, totalement', 'interest_level' => 5,
            'trial_interest' => 'Oui', 'shop_name' => 'Kponou Market',
            'contact_name' => 'Jean Kponou', 'email' => 'shop@example.com',
            'whatsapp' => '+2290191223344', 'status' => 'waitlisted', 'bonus_amount' => 500,
        ]);
        $token = app(PublicWaitlistActivationService::class)->issue($candidate);

        $this->getJson('/api/waitlist/activation/'.$token)
            ->assertOk()
            ->assertJsonPath('prefill.name', 'Jean Kponou')
            ->assertJsonPath('prefill.raison_sociale', 'Kponou Market')
            ->assertJsonPath('prefill.secteur_activite', 'restaurant');

        $this->postJson('/api/auth/register/marchant', $this->marchantPayload([
            'activation_token' => $token,
        ]))->assertCreated();

        $candidate->refresh();
        $this->assertSame('activated', $candidate->status);
        $this->assertNotNull($candidate->activated_at);
        $this->assertSame(User::where('email', 'shop@example.com')->firstOrFail()->id, $candidate->activated_user_id);

        $this->getJson('/api/waitlist/activation/'.$token)
            ->assertStatus(422)
            ->assertJsonValidationErrors(['activation_token']);
    }
}
