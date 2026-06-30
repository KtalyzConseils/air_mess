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
            [
                'key'         => 'driver_min_withdraw_fcfa',
                'value'       => '500',
                'type'        => 'number',
                'label'       => 'Montant minimum de retrait (FCFA)',
                'description' => 'Seuil en dessous duquel un livreur ne peut pas demander un retrait de sa caution.',
                'group'       => 'wallet',
            ],
            [
                'key'         => 'user_wallet_min_recommended_fcfa',
                'value'       => '5000',
                'type'        => 'number',
                'label'       => 'Solde wallet recommandé (FCFA)',
                'description' => 'Montant en dessous duquel on affiche un bandeau "rechargez votre wallet" au marchand/particulier.',
                'group'       => 'wallet',
            ],
            // ===== Plafonds anti-abus des retraits driver (cap rolling 24h / 7j) =====
            [
                'key'         => 'driver_withdraw_max_per_day_count',
                'value'       => '2',
                'type'        => 'number',
                'label'       => 'Max demandes de retrait / 24h',
                'description' => 'Nombre maximum de demandes de retrait qu\'un driver peut soumettre sur les 24 dernières heures (tous statuts confondus, anti-spam).',
                'group'       => 'wallet',
            ],
            [
                'key'         => 'driver_withdraw_max_per_week_count',
                'value'       => '5',
                'type'        => 'number',
                'label'       => 'Max demandes de retrait / 7j',
                'description' => 'Nombre maximum de demandes de retrait qu\'un driver peut soumettre sur les 7 derniers jours (tous statuts).',
                'group'       => 'wallet',
            ],
            [
                'key'         => 'driver_withdraw_max_per_day_fcfa',
                'value'       => '30000',
                'type'        => 'number',
                'label'       => 'Max retraits / 24h (FCFA)',
                'description' => 'Montant total cumulé maximum qu\'un driver peut retirer sur les 24 dernières heures (statuts pending + approved).',
                'group'       => 'wallet',
            ],
            [
                'key'         => 'driver_withdraw_max_per_week_fcfa',
                'value'       => '100000',
                'type'        => 'number',
                'label'       => 'Max retraits / 7j (FCFA)',
                'description' => 'Montant total cumulé maximum qu\'un driver peut retirer sur les 7 derniers jours (statuts pending + approved).',
                'group'       => 'wallet',
            ],
        ];

        foreach ($settings as $s) {
            AppSetting::updateOrCreate(['key' => $s['key']], $s);
        }
    }
}
