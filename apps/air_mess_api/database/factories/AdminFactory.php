<?php

namespace Database\Factories;

use App\Models\Admin;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Admin>
 */
class AdminFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */

     protected $model = Admin::class ;

    public function definition(): array
    {
        return [
            'user_id' => User::factory()->state(['type' => 'admin']),
            'first_name' => fake()->firstName(),
            'last_name' => fake()->lastName(),
            'sub_role' => fake()->randomElement(['super', 'ops', 'commercial', 'support']),
        ];
    }
}
