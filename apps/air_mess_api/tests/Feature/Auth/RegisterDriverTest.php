<?php

namespace Tests\Feature\Auth;

use App\Models\Driver;
use App\Models\User;
use App\Services\FirebaseTokenVerifier;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class RegisterDriverTest extends TestCase
{
    use RefreshDatabase;

    /** Payload complet valide (hors fichiers), téléphone au format local avec espaces. */
    private function payload(array $overrides = []): array
    {
        return array_merge([
            'first_name' => 'Koffi',
            'last_name'  => 'Agbodjan',
            'gender'     => 'M',
            'birth_date' => '1995-04-12',
            'email'      => 'koffi@example.com',
            'phone'      => '+229 01 90 12 34 56',
            'password'              => 'secret123',
            'password_confirmation' => 'secret123',
            'firebase_id_token'     => 'fake-firebase-token',
            'vehicle_type'  => 'moto',
            'vehicle_plate' => 'AB-1234',
            'emergency_contact_name'   => 'Afi Agbodjan',
            'emergency_contact_phone'  => '+229 01 91 00 00 01',
            'emergency_contact2_name'  => 'Yao Agbodjan',
            'emergency_contact2_phone' => '+229 01 91 00 00 02',
            'accepted_terms' => '1',
            'cni_type' => 'cip', // 1 seule face — cas le plus simple par défaut
            'cni' => UploadedFile::fake()->create('cni.pdf', 200, 'application/pdf'),
        ], $overrides);
    }

    private function mockVerifier(?string $returnedPhone): void
    {
        $this->mock(FirebaseTokenVerifier::class)
            ->shouldReceive('verifyPhoneToken')
            ->andReturn($returnedPhone);
    }

    public function test_register_fails_without_firebase_token(): void
    {
        Storage::fake('local');

        $payload = $this->payload();
        unset($payload['firebase_id_token']);

        $this->postJson('/api/auth/register/driver', $payload)
            ->assertStatus(422)
            ->assertJsonValidationErrors(['firebase_id_token']);
    }

    public function test_register_fails_when_token_is_invalid(): void
    {
        Storage::fake('local');
        $this->mockVerifier(null);

        $this->postJson('/api/auth/register/driver', $this->payload())
            ->assertStatus(422)
            ->assertJsonValidationErrors(['phone']);
    }

    public function test_register_fails_when_token_belongs_to_another_phone(): void
    {
        Storage::fake('local');
        $this->mockVerifier('+2290199999999');

        $this->postJson('/api/auth/register/driver', $this->payload())
            ->assertStatus(422)
            ->assertJsonValidationErrors(['phone']);
    }

    public function test_register_requires_second_emergency_contact(): void
    {
        Storage::fake('local');
        $this->mockVerifier('+2290190123456');

        $payload = $this->payload();
        unset($payload['emergency_contact2_name'], $payload['emergency_contact2_phone']);

        $this->postJson('/api/auth/register/driver', $payload)
            ->assertStatus(422)
            ->assertJsonValidationErrors(['emergency_contact2_name', 'emergency_contact2_phone']);
    }

    public function test_register_succeeds_and_stores_normalized_phone_and_contacts(): void
    {
        Storage::fake('local');
        Http::fake(); // aucun appel réseau réel (push Expo, etc.)
        // Le claim Firebase correspond au numéro soumis une fois normalisé.
        $this->mockVerifier('+2290190123456');

        $response = $this->postJson('/api/auth/register/driver', $this->payload());

        $response->assertStatus(201)->assertJsonStructure(['user', 'token']);

        $user = User::where('email', 'koffi@example.com')->firstOrFail();
        // Téléphone stocké au format E.164 canonique (unicité fiable).
        $this->assertSame('+2290190123456', $user->phone);

        $driver = Driver::where('user_id', $user->id)->firstOrFail();
        $this->assertSame('Afi Agbodjan', $driver->emergency_contact_name);
        $this->assertSame('Yao Agbodjan', $driver->emergency_contact2_name);
        $this->assertSame('+229 01 91 00 00 02', $driver->emergency_contact2_phone);
        $this->assertSame('pending', $driver->activation_status);
        $this->assertNull($driver->preferred_response_channel);
    }

    public function test_cnib_requires_back_side(): void
    {
        Storage::fake('local');
        $this->mockVerifier('+2290190123456');

        // CNIB sans verso → rejet (recto + verso obligatoires pour ce type).
        $this->postJson('/api/auth/register/driver', $this->payload(['cni_type' => 'cnib']))
            ->assertStatus(422)
            ->assertJsonValidationErrors(['cni_back']);
    }

    public function test_cnib_with_back_side_stores_both_faces(): void
    {
        Storage::fake('local');
        Http::fake();
        $this->mockVerifier('+2290190123456');

        $this->postJson('/api/auth/register/driver', $this->payload([
            'cni_type' => 'cnib',
            'cni_back' => UploadedFile::fake()->create('verso.pdf', 200, 'application/pdf'),
        ]))->assertStatus(201);

        $driver = Driver::firstOrFail();
        $this->assertSame('cnib', $driver->cni_type);
        $this->assertNotNull($driver->cni_back_url);
        Storage::disk('local')->assertExists($driver->cni_back_url);
    }

    public function test_register_rejects_unknown_cni_type(): void
    {
        Storage::fake('local');
        $this->mockVerifier('+2290190123456');

        $this->postJson('/api/auth/register/driver', $this->payload(['cni_type' => 'permis']))
            ->assertStatus(422)
            ->assertJsonValidationErrors(['cni_type']);
    }

    public function test_pending_driver_can_set_response_channel_with_register_token(): void
    {
        Storage::fake('local');
        Http::fake();
        $this->mockVerifier('+2290190123456');

        $token = $this->postJson('/api/auth/register/driver', $this->payload())
            ->assertStatus(201)
            ->json('token');

        $this->withToken($token)
            ->postJson('/api/driver/response-channel', ['channel' => 'whatsapp'])
            ->assertStatus(200)
            ->assertJson(['channel' => 'whatsapp']);

        $this->assertSame(
            'whatsapp',
            Driver::firstOrFail()->preferred_response_channel,
        );
    }

    public function test_response_channel_rejects_unknown_value(): void
    {
        Storage::fake('local');
        Http::fake();
        $this->mockVerifier('+2290190123456');

        $token = $this->postJson('/api/auth/register/driver', $this->payload())->json('token');

        $this->withToken($token)
            ->postJson('/api/driver/response-channel', ['channel' => 'pigeon'])
            ->assertStatus(422);
    }
}
