<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use App\Services\FirebaseTokenVerifier;
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
            'firebase_id_token'     => 'fake-phone-token',
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
            'firebase_id_token'     => 'fake-phone-token',
            'raison_sociale'   => 'Kponou Market',
            'secteur_activite' => 'boutique',
            'accepted_terms'   => '1',
        ], $overrides);
    }

    /** Mocke le verifier : claim téléphone + (optionnel) email Google. */
    private function mockVerifier(?string $phone, ?string $googleEmail = null): void
    {
        $mock = $this->mock(FirebaseTokenVerifier::class);
        $mock->shouldReceive('verifyPhoneToken')->andReturn($phone);
        $mock->shouldReceive('verifyGoogleEmail')->andReturn($googleEmail);
    }

    public function test_individual_register_requires_firebase_token(): void
    {
        $payload = $this->individualPayload();
        unset($payload['firebase_id_token']);

        $this->postJson('/api/auth/register/individual', $payload)
            ->assertStatus(422)
            ->assertJsonValidationErrors(['firebase_id_token']);
    }

    public function test_individual_register_rejects_token_of_another_phone(): void
    {
        $this->mockVerifier('+2290199999999');

        $this->postJson('/api/auth/register/individual', $this->individualPayload())
            ->assertStatus(422)
            ->assertJsonValidationErrors(['phone']);
    }

    public function test_individual_register_succeeds_and_marks_phone_verified(): void
    {
        $this->mockVerifier('+2290190123456');

        $this->postJson('/api/auth/register/individual', $this->individualPayload())
            ->assertStatus(201);

        $user = User::where('email', 'ama@example.com')->firstOrFail();
        $this->assertSame('+2290190123456', $user->phone);
        $this->assertNotNull($user->phone_verified_at);
        $this->assertNull($user->email_verified_at); // pas de Google ici
    }

    public function test_individual_register_with_google_marks_email_verified(): void
    {
        $this->mockVerifier('+2290190123456', 'ama@example.com');

        $this->postJson('/api/auth/register/individual', $this->individualPayload([
            'firebase_google_id_token' => 'fake-google-token',
        ]))->assertStatus(201);

        $this->assertNotNull(
            User::where('email', 'ama@example.com')->firstOrFail()->email_verified_at,
        );
    }

    public function test_individual_register_rejects_google_token_of_another_email(): void
    {
        $this->mockVerifier('+2290190123456', 'autre@example.com');

        $this->postJson('/api/auth/register/individual', $this->individualPayload([
            'firebase_google_id_token' => 'fake-google-token',
        ]))
            ->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    public function test_marchant_register_requires_firebase_token(): void
    {
        $payload = $this->marchantPayload();
        unset($payload['firebase_id_token']);

        $this->postJson('/api/auth/register/marchant', $payload)
            ->assertStatus(422)
            ->assertJsonValidationErrors(['firebase_id_token']);
    }

    public function test_marchant_register_succeeds_with_google(): void
    {
        $this->mockVerifier('+2290191223344', 'shop@example.com');

        $this->postJson('/api/auth/register/marchant', $this->marchantPayload([
            'firebase_google_id_token' => 'fake-google-token',
        ]))->assertStatus(201)->assertJsonStructure(['user', 'token']);

        $user = User::where('email', 'shop@example.com')->firstOrFail();
        $this->assertSame('+2290191223344', $user->phone);
        $this->assertNotNull($user->phone_verified_at);
        $this->assertNotNull($user->email_verified_at);
    }
}
