<?php

namespace Database\Seeders;

use App\Models\SubscriptionPlan;
use Illuminate\Database\Seeder;

class SubscriptionPlanSeeder extends Seeder
{
    public function run(): void
    {
        $plans = [
            [
                'code'               => SubscriptionPlan::CODE_TRIAL,
                'name'               => 'Essai',
                'monthly_price_fcfa' => 0,
                'included_courses'   => 10,
                'description'        => 'Découvre RMess pendant 14 jours sans engagement.',
                'features'           => ['email_support'],
                'sort_order'         => 0,
            ],
            [
                'code'               => SubscriptionPlan::CODE_STARTER,
                'name'               => 'Starter',
                'monthly_price_fcfa' => 5000,
                'included_courses'   => 30,
                'description'        => 'Parfait pour démarrer : boutiques, artisans, petits restaurants.',
                'features'           => ['email_support', 'tracking_pages', 'api_access'],
                'sort_order'         => 1,
            ],
            [
                'code'               => SubscriptionPlan::CODE_PRO,
                'name'               => 'Pro',
                'monthly_price_fcfa' => 15000,
                'included_courses'   => 100,
                'description'        => 'Pour les marchands actifs avec plusieurs livraisons par jour.',
                'features'           => [
                    'whatsapp_support',
                    'tracking_pages',
                    'multi_user',
                    'advanced_stats',
                    'priority_matching',
                    'api_access',
                ],
                'sort_order'         => 2,
            ],
            [
                'code'               => SubscriptionPlan::CODE_BUSINESS,
                'name'               => 'Business',
                'monthly_price_fcfa' => 40000,
                'included_courses'   => 500,
                'description'        => 'Pour les grandes structures : chaînes, e-commerce, pharmacies.',
                'features'           => [
                    'whatsapp_support',
                    'tracking_pages',
                    'multi_user',
                    'advanced_stats',
                    'priority_matching',
                    'api_access',
                    'account_manager',
                    'sla',
                ],
                'sort_order'         => 3,
            ],

            // ─── Plans API dev ────────────────────────────────────────────
            // Distincts des plans marchand : `included_courses = 0` (n'ont
            // pas de quota de courses côté marchand), `api_requests_monthly`
            // porte la limite. Le paiement des courses créées reste sur le
            // wallet du user propriétaire de l'app.
            [
                'code'                 => SubscriptionPlan::CODE_API_STARTER,
                'name'                 => 'API Starter',
                'monthly_price_fcfa'   => 0,
                'included_courses'     => 0,
                'api_requests_monthly' => 15,
                'is_api_plan'          => true,
                'description'          => 'Découvre l’API Air Mess : 15 requêtes / mois pour tester ton intégration.',
                'features'             => ['email_support'],
                'sort_order'           => 10,
            ],
            [
                'code'                 => SubscriptionPlan::CODE_API_PRO,
                'name'                 => 'API Pro',
                'monthly_price_fcfa'   => 15000,
                'included_courses'     => 0,
                'api_requests_monthly' => 100,
                'is_api_plan'          => true,
                'description'          => 'Pour un site e-commerce en production : 100 requêtes / mois, support prioritaire.',
                'features'             => ['whatsapp_support', 'priority_support'],
                'sort_order'           => 11,
            ],
            [
                'code'                 => SubscriptionPlan::CODE_API_PREMIUM,
                'name'                 => 'API Premium',
                'monthly_price_fcfa'   => 45000,
                'included_courses'     => 0,
                'api_requests_monthly' => 500,
                'is_api_plan'          => true,
                'description'          => 'Volume élevé, SLA, account manager dédié.',
                'features'             => ['whatsapp_support', 'priority_support', 'account_manager', 'sla'],
                'sort_order'           => 12,
            ],
        ];

        foreach ($plans as $plan) {
            SubscriptionPlan::updateOrCreate(
                ['code' => $plan['code']],
                $plan,
            );
        }
    }
}
