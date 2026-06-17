<?php

namespace Database\Seeders;

use App\Models\Address;
use App\Models\Admin;
use App\Models\Driver;
use App\Models\Individual;
use App\Models\Marchant;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DemoSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Fausses données pour le DÉVELOPPEMENT LOCAL uniquement.
     * NE JAMAIS lancer en production (crée de faux comptes).
     *
     *   php artisan db:seed --class=DemoSeeder
     */
    public function run(): void
    {
        // Super-admin connu pour login rapide en local.
        $superAdminUser = User::factory()->create([
            'name'  => 'Sufyane Ramseyn',
            'email' => 'admin@sufyane.com',
            'phone' => '97000000',
            'type'  => 'admin',
        ]);
        Admin::factory()->create([
            'user_id'    => $superAdminUser->id,
            'first_name' => 'Sufyane',
            'last_name'  => 'Ramseyn',
            'sub_role'   => 'super',
        ]);

        // Autres admins variés.
        Admin::factory()->count(3)->create();

        // Marchands avec quelques adresses dans leur carnet.
        Marchant::factory()->count(5)->create()->each(function ($marchant) {
            Address::factory()->count(3)->create(['user_id' => $marchant->user_id]);
        });

        // Livreurs.
        Driver::factory()->count(10)->create();

        // Particuliers avec leurs adresses fréquentes.
        Individual::factory()->count(15)->create()->each(function ($individual) {
            Address::factory()->count(2)->create(['user_id' => $individual->user_id]);
        });
    }
}
