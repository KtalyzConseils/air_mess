<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Données de référence INDISPENSABLES, sûres en production.
     * Tous ces seeders sont idempotents (updateOrCreate) : rejouables sans doublon.
     *
     *   php artisan db:seed --force
     *
     * Les fausses données de démo (faux marchands/livreurs/admins) sont dans
     * DemoSeeder, à lancer UNIQUEMENT en local :
     *
     *   php artisan db:seed --class=DemoSeeder
     *
     * Le super-admin de production se crée via la commande dédiée :
     *
     *   php artisan airmess:make-admin
     */
    public function run(): void
    {
        $this->call([
            PackageCategorySeeder::class,
            SubscriptionPlanSeeder::class,
            AppSettingSeeder::class,
        ]);
    }
}
