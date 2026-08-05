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
}
