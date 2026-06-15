<?php

namespace Database\Factories;

use App\Models\Address;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class AddressFactory extends Factory
{
    protected $model = Address::class;

    public function definition(): array
    {
        // Coordonnées approximatives autour de Cotonou
        $baseLat = 6.3703;
        $baseLng = 2.3912;

        $quartiers = [
            'Cadjèhoun', 'Akpakpa', 'Fidjrossè', 'Cotonou Centre',
            'Ganhi', 'Godomey', 'Calavi Kpota', 'Haie-Vive',
            'Agla', 'Vodjè', 'Sainte-Rita', 'Zogbo',
        ];

        return [
            'user_id'         => User::factory(),
            'label'           => fake()->randomElement(['Maison', 'Bureau', 'Magasin', null]),
            'recipient_name'  => fake()->name(),
            'recipient_phone' => '9' . fake()->numerify('#######'),
            'street'          => fake()->streetAddress(),
            'landmark'        => fake()->randomElement([
                'Après la pharmacie La Grâce',
                'Devant l\'école Notre Dame',
                'Maison à portail bleu',
                'À côté de la station Total',
                null,
            ]),
            'quartier'        => fake()->randomElement($quartiers),
            'city'            => fake()->randomElement(['Cotonou', 'Abomey-Calavi']),
            'lat'             => $baseLat + fake()->randomFloat(4, -0.1, 0.1),
            'lng'             => $baseLng + fake()->randomFloat(4, -0.1, 0.1),
            'instructions'    => fake()->optional()->sentence(),
            'is_default'      => false,
            'usage_count'     => fake()->numberBetween(0, 15),
        ];
    }
}
