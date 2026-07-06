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

            // ===== Payout marchand/particulier (retrait du wallet payeur) =====
            // Volumes typiquement supérieurs aux drivers (collections encaissées
            // accumulées) → plafonds plus larges. Le count anti-spam reste identique.
            [
                'key'         => 'user_min_withdraw_fcfa',
                'value'       => '1000',
                'type'        => 'number',
                'label'       => 'Retrait minimum marchand/particulier (FCFA)',
                'description' => 'Seuil en dessous duquel un marchand ou particulier ne peut pas demander un retrait de son wallet.',
                'group'       => 'wallet',
            ],
            [
                'key'         => 'user_withdraw_max_per_day_count',
                'value'       => '2',
                'type'        => 'number',
                'label'       => 'Max demandes de retrait marchand / 24h',
                'description' => 'Nombre maximum de demandes de retrait qu\'un marchand/particulier peut soumettre sur les 24 dernières heures (tous statuts).',
                'group'       => 'wallet',
            ],
            [
                'key'         => 'user_withdraw_max_per_week_count',
                'value'       => '5',
                'type'        => 'number',
                'label'       => 'Max demandes de retrait marchand / 7j',
                'description' => 'Nombre maximum de demandes de retrait qu\'un marchand/particulier peut soumettre sur les 7 derniers jours (tous statuts).',
                'group'       => 'wallet',
            ],
            [
                'key'         => 'user_withdraw_max_per_day_fcfa',
                'value'       => '100000',
                'type'        => 'number',
                'label'       => 'Max retraits marchand / 24h (FCFA)',
                'description' => 'Montant total cumulé maximum qu\'un marchand/particulier peut retirer sur les 24 dernières heures (pending + approved).',
                'group'       => 'wallet',
            ],
            [
                'key'         => 'user_withdraw_max_per_week_fcfa',
                'value'       => '300000',
                'type'        => 'number',
                'label'       => 'Max retraits marchand / 7j (FCFA)',
                'description' => 'Montant total cumulé maximum qu\'un marchand/particulier peut retirer sur les 7 derniers jours (pending + approved).',
                'group'       => 'wallet',
            ],

            // ===== Pourcentages d'arbitrage des incidents de course =====
            // Lus par l'endpoint /admin/incidents/{id}/no-show-partial (Cas 3, 4, 6)
            // et proposés en pré-remplissage dans le panneau d'arbitrage.
            [
                'key'         => 'conflicts_no_show_marchand_refund_percent',
                'value'       => '50',
                'type'        => 'number',
                'label'       => 'No-show — % remboursé au marchand',
                'description' => 'Cas 3 : quand le client est injoignable, on capture (100 − X)% des frais de livraison et on rembourse X% au marchand.',
                'group'       => 'conflicts',
            ],
            [
                'key'         => 'conflicts_no_show_driver_earnings_percent',
                'value'       => '50',
                'type'        => 'number',
                'label'       => 'No-show — % de gains versés au livreur',
                'description' => 'Cas 3 : part des gains prévus versée au livreur qui a fait le trajet pour rien (client injoignable confirmé par l\'ops).',
                'group'       => 'conflicts',
            ],
            [
                'key'         => 'conflicts_package_lost_driver_responsibility_percent',
                'value'       => '100',
                'type'        => 'number',
                'label'       => 'Colis perdu — % responsabilité livreur',
                'description' => 'Cas 2 : part de la valeur déclarée débitée sur la caution du livreur en cas de perte confirmée.',
                'group'       => 'conflicts',
            ],
            [
                'key'         => 'conflicts_package_damaged_driver_responsibility_percent',
                'value'       => '50',
                'type'        => 'number',
                'label'       => 'Colis endommagé — % responsabilité livreur',
                'description' => 'Cas 1 : part des frais (ou valeur déclarée) débitée sur la caution du livreur en cas de dommage confirmé.',
                'group'       => 'conflicts',
            ],
            [
                'key'         => 'conflicts_return_marchand_shipping_fee_percent',
                'value'       => '100',
                'type'        => 'number',
                'label'       => 'Retour marchand — % frais retour',
                'description' => 'Cas 4/6 : part des frais de livraison retenue quand le colis doit être ramené au marchand.',
                'group'       => 'conflicts',
            ],
            [
                'key'         => 'conflicts_return_driver_return_earnings_percent',
                'value'       => '50',
                'type'        => 'number',
                'label'       => 'Retour marchand — % gains livreur',
                'description' => 'Cas 4/6 : part des gains versée au livreur qui doit refaire le trajet retour vers le marchand.',
                'group'       => 'conflicts',
            ],
        ];

        foreach ($settings as $s) {
            AppSetting::updateOrCreate(['key' => $s['key']], $s);
        }
    }
}
