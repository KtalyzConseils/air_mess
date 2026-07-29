<?php

namespace Database\Seeders;

use App\Models\Address;
use App\Models\Driver;
use App\Models\DriverWallet;
use App\Models\Individual;
use App\Models\Marchant;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DemoNoAdminSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Fausses données pour le DÉVELOPPEMENT LOCAL uniquement.
     * Variante de DemoSeeder qui NE crée AUCUN admin (l'utilisateur en crée un
     * lui-même via `php artisan airmess:make-admin` pour garder ses credentials).
     *
     * Contient aussi un driver spécifique connu (olamidetade07@gmail.com) pour
     * les tests du flow "mot de passe oublié" — mot de passe par défaut : `password`.
     *
     *   php artisan db:seed --class=DemoNoAdminSeeder
     */
    public function run(): void
    {
        // Sécurité : assure la présence des données de référence indispensables
        // (categories de colis, plans, settings). Idempotent, safe à rejouer.
        $this->call([
            PackageCategorySeeder::class,
            SubscriptionPlanSeeder::class,
            AppSettingSeeder::class,
        ]);

        // ─── Driver spécifique pour tests forgot-password ────────────────────
        // Créé en 1er pour garantir sa présence même si l'exécution échoue plus loin.
        // Password : `password` (comme les autres factory users).
        $olamideUser = User::updateOrCreate(
            ['email' => 'olamidetade07@gmail.com'],
            [
                'name'              => 'Olamide Tade',
                'phone'             => '99887766',
                'password'          => Hash::make('password'),
                'email_verified_at' => now(),
                'phone_verified_at' => now(),
                'type'              => 'driver',
                'is_active'         => true,
            ],
        );

        $olamideDriver = Driver::updateOrCreate(
            ['user_id' => $olamideUser->id],
            [
                'first_name'              => 'Olamide',
                'last_name'               => 'Tade',
                'gender'                  => 'M',
                'birth_date'              => '1995-03-15',
                'vehicle_type'            => 'moto',
                'vehicle_plate'           => 'BJ-1234-AB',
                'vehicle_brand'           => 'Bajaj',
                'equipment'               => [
                    'isothermal_bag'   => true,
                    'top_case'         => true,
                    'refrigerated_bag' => false,
                ],
                'emergency_contact_name'  => 'Contact urgence',
                'emergency_contact_phone' => '97001122',
                'activation_status'       => 'active',
                'availability_status'     => 'available',
                'current_lat'             => 6.3703,
                'current_lng'             => 2.3912,
                'last_position_at'        => now(),
                'acceptance_rate'         => 95.0,
                'incidents_count'         => 0,
            ],
        );

        // Wallet caution — indispensable pour que l'écran profil ne crashe pas
        // (le back fait firstOrCreate au /wallet mais si le driver s'y rend jamais,
        // les données de démo doivent être cohérentes dès le seed).
        DriverWallet::firstOrCreate(
            ['driver_id' => $olamideDriver->id],
            ['balance' => 5000, 'total_deposited' => 5000, 'total_withdrawn' => 0],
        );

        // ─── Autres drivers ──────────────────────────────────────────────────
        // Chacun reçoit son wallet en parallèle pour éviter le même piège UI.
        Driver::factory()
            ->count(10)
            ->create()
            ->each(fn ($driver) => DriverWallet::firstOrCreate(
                ['driver_id' => $driver->id],
                ['balance' => 0, 'total_deposited' => 0, 'total_withdrawn' => 0],
            ));

        // ─── Marchands + carnet d'adresses ───────────────────────────────────
        Marchant::factory()->count(5)->create()->each(function ($marchant) {
            Address::factory()->count(3)->create(['user_id' => $marchant->user_id]);
        });

        // ─── Particuliers + adresses fréquentes ──────────────────────────────
        Individual::factory()->count(15)->create()->each(function ($individual) {
            Address::factory()->count(2)->create(['user_id' => $individual->user_id]);
        });
    }
}
