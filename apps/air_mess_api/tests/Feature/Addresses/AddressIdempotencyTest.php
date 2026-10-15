<?php

namespace Tests\Feature\Addresses;

use App\Models\Address;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Carnet d'adresses : le formulaire de l'app envoie une reference d'appel, et
 * rejouer la meme requete ne doit jamais creer une deuxieme adresse.
 */
class AddressIdempotencyTest extends TestCase
{
    use RefreshDatabase;

    private function payload(array $overrides = []): array
    {
        return [
            'recipient_name' => 'Yvette',
            'recipient_phone' => '+22996000000',
            'quartier' => 'Calavi',
            'city' => 'Cotonou',
            ...$overrides,
        ];
    }

    public function test_same_client_reference_creates_a_single_address(): void
    {
        $user = User::factory()->create(['type' => 'marchant']);
        Sanctum::actingAs($user);

        $payload = $this->payload(['client_reference' => 'form-1f0b7c3e']);

        $first = $this->postJson('/api/addresses', $payload);
        $replay = $this->postJson('/api/addresses', $payload);

        $first->assertCreated();
        // Rejeu (double tap ou retry reseau) : on renvoie l'adresse existante.
        $replay->assertOk();
        $replay->assertJsonPath('address.id', $first->json('address.id'));

        $this->assertSame(1, Address::query()->count());
    }

    public function test_client_reference_is_scoped_per_user(): void
    {
        $marchant = User::factory()->create(['type' => 'marchant']);
        $other = User::factory()->create(['type' => 'individual']);
        $payload = $this->payload(['client_reference' => 'form-1f0b7c3e']);

        Sanctum::actingAs($marchant);
        $this->postJson('/api/addresses', $payload)->assertCreated();

        Sanctum::actingAs($other);
        $this->postJson('/api/addresses', $payload)->assertCreated();

        $this->assertSame(2, Address::query()->count());
    }

    public function test_addresses_without_client_reference_still_allow_duplicates(): void
    {
        $user = User::factory()->create(['type' => 'marchant']);
        Sanctum::actingAs($user);

        // Le web n'envoie pas de reference : deux enregistrements volontaires
        // de la meme adresse restent possibles (comportement inchange).
        $this->postJson('/api/addresses', $this->payload())->assertCreated();
        $this->postJson('/api/addresses', $this->payload())->assertCreated();

        $this->assertSame(2, Address::query()->count());
    }
}
