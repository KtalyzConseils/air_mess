<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $settings = [
            'driver_commission_percent' => [
                'value' => '87',
                'type' => 'number',
                'label' => 'Part livreur (%)',
                'description' => 'Pourcentage du delivery_fee reverse au livreur. AirMess garde le reste comme commission.',
                'group' => 'pricing',
            ],
            'price_per_km_fcfa' => [
                'value' => '20',
                'type' => 'number',
                'label' => 'Tarif par km (FCFA)',
                'description' => 'Coefficient "a" de la formule y = ax + b.',
                'group' => 'pricing',
            ],
            'price_min_fcfa' => [
                'value' => '250',
                'type' => 'number',
                'label' => 'Base fixe course (FCFA)',
                'description' => 'Terme "b" de la formule y = ax + b.',
                'group' => 'pricing',
            ],
            'price_floor_fcfa' => [
                'value' => '400',
                'type' => 'number',
                'label' => 'Prix plancher course (FCFA)',
                'description' => 'Montant minimum final apres calcul et arrondi.',
                'group' => 'pricing',
            ],
            'price_max_fcfa' => [
                'value' => '0',
                'type' => 'number',
                'label' => 'Prix maximum course (FCFA)',
                'description' => 'Plafond haut de la formule. 0 signifie sans plafond.',
                'group' => 'pricing',
            ],
        ];

        foreach ($settings as $key => $setting) {
            $exists = DB::table('app_settings')->where('key', $key)->exists();
            if ($exists) {
                DB::table('app_settings')->where('key', $key)->update(array_merge($setting, [
                    'updated_at' => now(),
                ]));
            } else {
                DB::table('app_settings')->insert(array_merge(['key' => $key], $setting, [
                    'choices' => null,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]));
            }
            Cache::forget('app_setting:' . $key);
        }
    }

    public function down(): void
    {
        $settings = [
            'driver_commission_percent' => '75',
            'price_per_km_fcfa' => '400',
            'price_min_fcfa' => '800',
            'price_max_fcfa' => '5000',
        ];

        foreach ($settings as $key => $value) {
            DB::table('app_settings')->where('key', $key)->update([
                'value' => $value,
                'updated_at' => now(),
            ]);
            Cache::forget('app_setting:' . $key);
        }

        DB::table('app_settings')->where('key', 'price_floor_fcfa')->delete();
        Cache::forget('app_setting:price_floor_fcfa');
    }
};
