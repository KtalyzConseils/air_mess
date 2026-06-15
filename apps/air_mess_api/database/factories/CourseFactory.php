<?php

namespace Database\Factories;

use App\Models\Course;
use App\Models\Driver;
use App\Models\PackageCategory;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class CourseFactory extends Factory
{
    protected $model = Course::class;

    public function definition(): array
    {
        $baseLat = 6.3703;
        $baseLng = 2.3912;
        $quartiers = ['Cadjèhoun', 'Akpakpa', 'Fidjrossè', 'Cotonou Centre', 'Ganhi', 'Godomey', 'Calavi Kpota'];

        $hasCollection = fake()->boolean(60);

        return [
            'sender_id'           => User::where('type', 'marchant')->inRandomOrder()->first()?->id ?? User::factory(),
            'driver_id'           => fake()->boolean(70) ? Driver::inRandomOrder()->first()?->id : null,
            'package_category_id' => PackageCategory::where('code', 'standard')->first()?->id ?? PackageCategory::factory(),

            'status' => fake()->randomElement([
                'awaiting_assignment', 'assigned', 'picked_up',
                'delivered', 'delivered', 'delivered', // pondéré pour avoir + de livrées
            ]),

            'origin_name'        => fake()->company(),
            'origin_phone'       => '9' . fake()->numerify('#######'),
            'origin_street'      => fake()->streetAddress(),
            'origin_quartier'    => fake()->randomElement($quartiers),
            'origin_city'        => 'Cotonou',
            'origin_lat'         => $baseLat + fake()->randomFloat(4, -0.05, 0.05),
            'origin_lng'         => $baseLng + fake()->randomFloat(4, -0.05, 0.05),

            'destination_name'     => fake()->name(),
            'destination_phone'    => '9' . fake()->numerify('#######'),
            'destination_street'   => fake()->streetAddress(),
            'destination_quartier' => fake()->randomElement($quartiers),
            'destination_city'     => fake()->randomElement(['Cotonou', 'Abomey-Calavi']),
            'destination_lat'      => $baseLat + fake()->randomFloat(4, -0.1, 0.1),
            'destination_lng'      => $baseLng + fake()->randomFloat(4, -0.1, 0.1),

            'package_description'  => fake()->randomElement(['Pizzas', 'Sacs de courses', 'Document', 'Kit cosmétique', 'Médicaments']),
            'package_size'         => fake()->randomElement(['S', 'M', 'L']),

            'delivery_fee'         => fake()->numberBetween(800, 3000),
            'driver_earnings'      => fake()->numberBetween(600, 2500),

            'has_collection'       => $hasCollection,
            'collection_amount'    => $hasCollection ? fake()->numberBetween(2000, 60000) : null,
            'collection_method'    => $hasCollection ? fake()->randomElement(['cash', 'mobile_money']) : null,

            'pickup_code'          => Course::generateCode(),
            'delivery_code'        => Course::generateCode(),
        ];
    }

    public function configure(): static
    {
        return $this->afterMaking(function (\App\Models\Course $course) {
            if (empty($course->reference)) {
                $year = date('Y');
                $lastSeq = \App\Models\Course::whereYear('created_at', $year)->count() + 1;
                // Ajout d'un random pour éviter les collisions dans le seed massif
                $course->reference = sprintf('AM-%s-%05d', $year, $lastSeq + random_int(0, 99));
            }
            if (empty($course->tracking_token)) {
                $course->tracking_token = \Illuminate\Support\Str::random(10);
            }
        });
    }

}
