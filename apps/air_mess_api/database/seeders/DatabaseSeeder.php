<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {

        // 1. Données de référence (en premier)
        $this->call([
            PackageCategorySeeder::class,
        ]);
        // 2 super-admin connu (pour login rapide)
        $superAdminUser = \App\Models\User::factory()->create([
            'name' => 'Sufyane Ramseyn',
            'email' => 'admin@sufyane.com',
            'phone' => '97000000',
            'type' => 'admin',
        ]);
        \App\Models\Admin::factory()->create([
            'user_id' => $superAdminUser->id,
            'first_name' => 'Sufyane',
            'last_name' => 'Ramseyn',
            'sub_role' => 'super',
        ]);

        // 3 autres admins variés
        \App\Models\Admin::factory()->count(3)->create();

       // 4. Marchands avec quelques adresses dans leur carnet
        \App\Models\Marchant::factory()->count(5)->create()->each(function ($marchant) {
            \App\Models\Address::factory()->count(3)->create([
                'user_id' => $marchant->user_id,
            ]);
        });

        // 5. Livreurs
        \App\Models\Driver::factory()->count(10)->create();

        // 6. Particuliers avec leurs adresses fréquentes
        \App\Models\Individual::factory()->count(15)->create()->each(function ($individual) {
            \App\Models\Address::factory()->count(2)->create([
                'user_id' => $individual->user_id,
            ]);
        });

    }

}
