<?php

namespace Database\Factories;

use App\Models\Marchant;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Marchant>
 */
class MarchantFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */

    protected $model = Marchant::class ;

    public function definition(): array
    {
        return [
            'user_id' => User::factory()->state(['type' => 'marchant']),
            'raison_sociale' => fake()->company(),
            'ifu_rccm' => 'RCCM/COT/2024/B/' . fake()->numberBetween(1000, 9999),
            'secteur_activite' => fake()->randomElement([
                'supermarche', 'restaurant', 'boutique',
                'pharmacie', 'ecommerce', 'autre',
            ]),
            'subscription_plan' => fake()->randomElement(['trial', 'starter', 'pro']),
            'subscription_status' => 'active',
            'subscription_started_at' => now()->subDays(fake()->numberBetween(1, 90)),
            'validated_at' => now()->subDays(fake()->numberBetween(1, 60)),
        ];
    }
}
