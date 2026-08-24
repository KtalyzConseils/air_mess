<?php

namespace Tests\Feature\Auth;

use App\Models\Individual;
use App\Models\Marchant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UpdateProfileTest extends TestCase
{
    use RefreshDatabase;

    public function test_marchant_can_update_name_email_and_phone(): void
    {
        $marchant = Marchant::factory()->create();
        $user     = $marchant->user;

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/auth/profile', [
            'name'  => 'Nouveau Contact',
            'email' => 'nouveau@example.com',
            'phone' => '97000000',
        ]);

        $response->assertStatus(200);
        $response->assertJsonPath('user.email', 'nouveau@example.com');
        $response->assertJsonPath('user.phone', '97000000');
        $response->assertJsonPath('user.name', 'Nouveau Contact');

        $this->assertDatabaseHas('users', [
            'id'    => $user->id,
            'email' => 'nouveau@example.com',
            'phone' => '97000000',
            'name'  => 'Nouveau Contact',
        ]);
    }

    public function test_individual_can_update_first_last_name_and_derives_name(): void
    {
        $individual = Individual::factory()->create();
        $user       = $individual->user;

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/auth/profile', [
            'first_name' => 'Marie',
            'last_name'  => 'Dupont',
        ]);

        $response->assertStatus(200);
        $response->assertJsonPath('user.individual.first_name', 'Marie');
        $response->assertJsonPath('user.individual.last_name', 'Dupont');
        // Le name dérivé du User = "Prénom Nom"
        $response->assertJsonPath('user.name', 'Marie Dupont');

        $this->assertDatabaseHas('individuals', [
            'id'         => $individual->id,
            'first_name' => 'Marie',
            'last_name'  => 'Dupont',
        ]);
        $this->assertDatabaseHas('users', [
            'id'   => $user->id,
            'name' => 'Marie Dupont',
        ]);
    }

    public function test_email_must_be_unique_ignoring_self(): void
    {
        $marchant = Marchant::factory()->create();

        // Garder son propre email ne doit PAS lever d'erreur d'unicité.
        $response = $this->actingAs($marchant->user, 'sanctum')->postJson('/api/auth/profile', [
            'email' => $marchant->user->email,
        ]);
        $response->assertStatus(200);

        // Un email déjà pris par un autre utilisateur est refusé.
        $other     = User::factory()->create(['email' => 'pris@example.com']);
        $marchant2 = Marchant::factory()->create();

        $response = $this->actingAs($marchant2->user, 'sanctum')->postJson('/api/auth/profile', [
            'email' => 'pris@example.com',
        ]);
        $response->assertStatus(422);
    }

    public function test_unauthenticated_cannot_update_profile(): void
    {
        $response = $this->postJson('/api/auth/profile', [
            'name' => 'Hacker',
        ]);

        $response->assertStatus(401);
    }
}
