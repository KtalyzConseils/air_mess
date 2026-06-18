<?php

namespace Database\Seeders;

use App\Models\AppSetting;
use Illuminate\Database\Seeder;

class AppSettingSeeder extends Seeder
{
    public function run(): void
    {
        $settings = [
            [
                'key'         => 'driver_commission_percent',
                'value'       => '75',
                'type'        => 'number',
                'label'       => 'Part livreur (%)',
                'description' => 'Pourcentage du delivery_fee reversé au livreur. RMess garde le reste comme commission.',
                'group'       => 'pricing',
            ],
            [
                'key'         => 'individual_monthly_courses_limit',
                'value'       => '20',
                'type'        => 'number',
                'label'       => 'Quota mensuel particulier',
                'description' => 'Nombre de courses gratuites par mois pour les particuliers. Au-delà, paiement à la course.',
                'group'       => 'quotas',
            ],
            [
                'key'         => 'standard_delivery_fee_fcfa',
                'value'       => '1500',
                'type'        => 'number',
                'label'       => 'Tarif course standard (FCFA)',
                'description' => 'Prix d\'une course en livraison standard.',
                'group'       => 'pricing',
            ],
            [
                'key'         => 'express_delivery_fee_fcfa',
                'value'       => '2500',
                'type'        => 'number',
                'label'       => 'Tarif course express (FCFA)',
                'description' => 'Prix d\'une course en livraison express.',
                'group'       => 'pricing',
            ],
        ];

        foreach ($settings as $s) {
            AppSetting::updateOrCreate(['key' => $s['key']], $s);
        }
    }
}
