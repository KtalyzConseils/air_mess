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
                'description'        => 'Découvre Air Mess pendant 14 jours sans engagement.',
                'features'           => ['email_support'],
                'sort_order'         => 0,
            ],
            [
                'code'               => SubscriptionPlan::CODE_STARTER,
                'name'               => 'Starter',
                'monthly_price_fcfa' => 5000,
                'included_courses'   => 30,
                'description'        => 'Parfait pour démarrer : boutiques, artisans, petits restaurants.',
                'features'           => ['email_support', 'tracking_pages'],
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
        ];

        foreach ($plans as $plan) {
            SubscriptionPlan::updateOrCreate(
                ['code' => $plan['code']],
                $plan,
            );
        }
    }
}
