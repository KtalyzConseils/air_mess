<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ChangePasswordTest extends TestCase
{
    use RefreshDatabase;

    private function marchand(string $password = 'secret123'): User
    {
        return User::factory()->create([
            'email'           => 'marchand@example.com',
            'password'        => $password,
            'password_set_at' => now(),
            'is_active'       => true,
        ]);
    }

    private function payload(array $overrides = []): array
    {
        return array_merge([
            'current_password'      => 'secret123',
            'password'              => 'nouveau123',
            'password_confirmation' => 'nouveau123',
        ], $overrides);
    }

    private function token(User $user, string $name = 'session'): string
    {
        return $user->createToken($name)->plainTextToken;
    }

    public function test_user_can_change_password_and_sign_in_with_the_new_one(): void
    {
        $user = $this->marchand();

        $this->withToken($this->token($user))
            ->postJson('/api/auth/password/change', $this->payload())
            ->assertOk();

        // L'ancien mot de passe ne fonctionne plus.
        $this->postJson('/api/auth/login', [
            'email'    => 'marchand@example.com',
            'password' => 'secret123',
        ])->assertStatus(401);

        // Le nouveau fonctionne.
        $this->postJson('/api/auth/login', [
            'email'    => 'marchand@example.com',
            'password' => 'nouveau123',
        ])->assertOk();

        $this->assertNotNull($user->fresh()->password_set_at);
    }

    public function test_change_password_requires_the_current_password(): void
    {
        $user = $this->marchand();

        $this->withToken($this->token($user))
            ->postJson('/api/auth/password/change', $this->payload(['current_password' => 'mauvais123']))
            ->assertStatus(422)
            ->assertJsonValidationErrors(['current_password']);

        // Le mot de passe n'a pas bouge.
        $this->postJson('/api/auth/login', [
            'email'    => 'marchand@example.com',
            'password' => 'secret123',
        ])->assertOk();
    }

    public function test_change_password_rejects_short_mismatched_or_identical_password(): void
    {
        $user = $this->marchand();
        $token = $this->token($user);

        $this->withToken($token)
            ->postJson('/api/auth/password/change', $this->payload([
                'password'              => 'court',
                'password_confirmation' => 'court',
            ]))
            ->assertStatus(422)
            ->assertJsonValidationErrors(['password']);

        $this->withToken($token)
            ->postJson('/api/auth/password/change', $this->payload([
                'password_confirmation' => 'autre123',
            ]))
            ->assertStatus(422)
            ->assertJsonValidationErrors(['password']);

        $this->withToken($token)
            ->postJson('/api/auth/password/change', $this->payload([
                'password'              => 'secret123',
                'password_confirmation' => 'secret123',
            ]))
            ->assertStatus(422)
            ->assertJsonValidationErrors(['password']);
    }

    public function test_change_password_closes_other_sessions_but_keeps_the_current_one(): void
    {
        $user = $this->marchand();
        $current = $this->token($user, 'session-courante');
        $other = $this->token($user, 'autre-appareil');

        $this->withToken($current)
            ->postJson('/api/auth/password/change', $this->payload())
            ->assertOk();

        $this->assertDatabaseCount('personal_access_tokens', 1);

        // Le guard memorise l'utilisateur resolu entre deux requetes : on le
        // vide pour verifier reellement ce que vaut chaque token.
        $this->app['auth']->forgetGuards();

        // La session qui a change le mot de passe reste ouverte.
        $this->withToken($current)->getJson('/api/auth/me')->assertOk();

        $this->app['auth']->forgetGuards();

        // Les autres sessions sont fermees.
        $this->withToken($other)->getJson('/api/auth/me')->assertUnauthorized();
    }

    public function test_change_password_requires_authentication(): void
    {
        $this->marchand();

        $this->postJson('/api/auth/password/change', $this->payload())->assertUnauthorized();
    }
}
