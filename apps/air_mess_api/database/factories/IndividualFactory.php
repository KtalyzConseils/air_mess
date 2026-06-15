<?php

namespace Database\Factories;

use App\Models\Individual;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Individual>
 */
class IndividualFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */

     protected $model = Individual::class ;

    public function definition(): array
    {
        return [
            'user_id' => User::factory()->state(['type' => 'individual']),
            'first_name' => fake()->firstName(),
            'last_name' => fake()->lastName(),
            'gender' => fake()->randomElement(['M', 'F']),
            'birth_date' => fake()->dateTimeBetween('-60 years', '-18 years'),
            'monthly_courses_used' => fake()->numberBetween(0, 15),
            'monthly_courses_limit' => 20,
            'monthly_period_started_at' => now()->startOfMonth(),
        ];
    }
}
