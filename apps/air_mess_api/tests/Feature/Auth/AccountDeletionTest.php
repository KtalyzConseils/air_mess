<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use App\Models\Driver;
use App\Models\Course;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AccountDeletionTest extends TestCase
{
    use RefreshDatabase;

    /**
     * API: Un utilisateur connecté (driver) peut supprimer son compte si aucune course n'est active.
     */
    public function test_authenticated_user_can_delete_their_account_via_api(): void
    {
        $user = User::factory()->create([
            'type' => User::TYPE_DRIVER,
        ]);
        $driver = Driver::factory()->create([
            'user_id' => $user->id,
        ]);

        Sanctum::actingAs($user);

        $response = $this->deleteJson('/api/auth/me');

        $response->assertStatus(200);
        $response->assertJson([
            'message' => 'Votre compte a été supprimé avec succès.',
        ]);

        $this->assertDatabaseMissing('users', ['id' => $user->id]);
        $this->assertDatabaseMissing('drivers', ['id' => $driver->id]);
    }

    /**
     * API: Un livreur ne peut pas supprimer son compte s'il a des courses en cours.
     */
    public function test_authenticated_user_cannot_delete_their_account_via_api_if_has_active_courses(): void
    {
        $user = User::factory()->create([
            'type' => User::TYPE_DRIVER,
        ]);
        $driver = Driver::factory()->create([
            'user_id' => $user->id,
        ]);

        // Course active affectée
        Course::factory()->create([
            'driver_id' => $driver->id,
            'status' => Course::STATUS_ASSIGNED,
        ]);

        Sanctum::actingAs($user);

        $response = $this->deleteJson('/api/auth/me');

        $response->assertStatus(422);
        $response->assertJsonFragment([
            'message' => 'Suppression impossible : vous avez des livraisons en cours.',
        ]);

        $this->assertDatabaseHas('users', ['id' => $user->id]);
        $this->assertDatabaseHas('drivers', ['id' => $driver->id]);
    }

    /**
     * WEB: Accès à la page de suppression.
     */
    public function test_user_can_access_web_deletion_page(): void
    {
        $response = $this->get('/delete-account');

        $response->assertStatus(200);
        $response->assertSee('Suppression de votre compte');
    }

    /**
     * WEB: Suppression réussie avec identifiants valides.
     */
    public function test_user_can_delete_account_via_web_page_with_valid_credentials(): void
    {
        $user = User::factory()->create([
            'email' => 'delete.me@example.com',
            'password' => bcrypt('secretPassword123'),
        ]);

        $response = $this->post('/delete-account', [
            'email' => 'delete.me@example.com',
            'password' => 'secretPassword123',
            'confirm_deletion' => '1',
        ]);

        $response->assertRedirect('/delete-account');
        $response->assertSessionHas('success');

        $this->assertDatabaseMissing('users', ['id' => $user->id]);
    }

    /**
     * WEB: Échec de suppression avec mauvais mot de passe.
     */
    public function test_user_cannot_delete_account_via_web_page_with_invalid_credentials(): void
    {
        $user = User::factory()->create([
            'email' => 'keep.me@example.com',
            'password' => bcrypt('secretPassword123'),
        ]);

        $response = $this->post('/delete-account', [
            'email' => 'keep.me@example.com',
            'password' => 'wrongPassword',
            'confirm_deletion' => '1',
        ]);

        $response->assertSessionHasErrors(['email']);
        $this->assertDatabaseHas('users', ['id' => $user->id]);
    }

    /**
     * WEB: Échec de suppression si le marchand a des courses en cours.
     */
    public function test_user_cannot_delete_account_via_web_page_if_has_active_courses(): void
    {
        $user = User::factory()->create([
            'email' => 'marchant.delete@example.com',
            'password' => bcrypt('secretPassword123'),
            'type' => User::TYPE_MARCHANT,
        ]);

        // Course en cours créée par ce marchand
        Course::factory()->create([
            'sender_id' => $user->id,
            'status' => Course::STATUS_AWAITING,
        ]);

        $response = $this->post('/delete-account', [
            'email' => 'marchant.delete@example.com',
            'password' => 'secretPassword123',
            'confirm_deletion' => '1',
        ]);

        $response->assertSessionHasErrors(['error']);
        $this->assertDatabaseHas('users', ['id' => $user->id]);
    }
}
