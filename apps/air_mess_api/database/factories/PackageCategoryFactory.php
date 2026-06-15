<?php

namespace Database\Factories;

use App\Models\PackageCategory;
use Illuminate\Database\Eloquent\Factories\Factory;

class PackageCategoryFactory extends Factory
{
    protected $model = PackageCategory::class;

    public function definition(): array
    {
        return [
            'code' => $this->faker->unique()->slug(2),  // ex: "hot-meal", "groceries"
            'name' => $this->faker->randomElement([
                'Repas chaud', 'Repas froid', 'Boissons', 'Épicerie', 'Documents', 'Vêtements',
            ]),
            'description'              => $this->faker->optional()->sentence(),
            'max_weight_kg'            => $this->faker->randomFloat(2, 1, 20),
            'requires_isothermal_bag'  => false,
            'requires_refrigeration'   => false,
            'max_delivery_minutes'     => 30,
            'is_active'                => true,
        ];
    }
}
