<?php

namespace Database\Factories;

use App\Models\Driver;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Driver>
 */
class DriverFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */

     protected $model = Driver::class ;

    public function definition(): array
    {
        // Coordonnées GPS approximatives autour de Cotonou
        $cotonouLat = 6.3703;
        $cotonouLng = 2.3912;

        return [
            'user_id' => User::factory()->state(['type' => 'driver']),
            'first_name' => fake()->firstName('male'),
            'last_name' => fake()->lastName(),
            'gender' => 'M',
            'birth_date' => fake()->dateTimeBetween('-50 years', '-21 years'),
            'photo_url' => null,
            'vehicle_type' => fake()->randomElement(['scooter', 'moto', 'voiture']),
            'vehicle_plate' => 'BJ-' . fake()->numerify('####') . '-' . fake()->randomLetter() . fake()->randomLetter(),
            'vehicle_color' => fake()->safeColorName(),
            'equipment' => [
                'isothermal_bag' => fake()->boolean(70),
                'top_case' => fake()->boolean(50),
                'refrigerated_bag' => fake()->boolean(20),
            ],
            'emergency_contact_name' => fake()->name(),
            'emergency_contact_phone' => '9' . fake()->numerify('#######'),
            'activation_status' => 'active',
            'availability_status' => fake()->randomElement(['offline', 'available', 'busy']),
            'current_lat' => $cotonouLat + (fake()->randomFloat(4, -0.1, 0.1)),
            'current_lng' => $cotonouLng + (fake()->randomFloat(4, -0.1, 0.1)),
            'last_position_at' => now()->subMinutes(fake()->numberBetween(0, 30)),
            'acceptance_rate' => fake()->randomFloat(2, 75, 100),
            'incidents_count' => fake()->numberBetween(0, 3),
        ];
    }
}
