<?php

namespace Database\Seeders;

use App\Models\PackageCategory;
use Illuminate\Database\Seeder;

class PackageCategorySeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            [
                'code' => 'standard',
                'name' => 'Standard',
                'description' => 'Colis ordinaire, pas de contrainte particulière.',
                'max_weight_kg' => 20.00,
                'requires_isothermal_bag' => false,
                'requires_refrigeration' => false,
                'max_delivery_minutes' => 30,
            ],
            [
                'code' => 'hot_meal',
                'name' => 'Repas chaud — fragile',
                'description' => 'Plats chauds, à transporter avec précaution. Cas Cotonou Pizza, VamiaDoo.',
                'max_weight_kg' => 5.00,
                'requires_isothermal_bag' => true,
                'requires_refrigeration' => false,
                'max_delivery_minutes' => 20,
                'driver_instructions' => 'Maintenir à plat, ne pas secouer. Sac isotherme obligatoire.',
            ],
            [
                'code' => 'pharmacy',
                'name' => 'Pharmacie',
                'description' => 'Médicaments et produits pharmaceutiques.',
                'max_weight_kg' => 3.00,
                'requires_isothermal_bag' => false,
                'requires_refrigeration' => false,
                'max_delivery_minutes' => 25,
                'driver_instructions' => 'Remise en main propre obligatoire. Vérifier l\'identité du destinataire.',
            ],
            [
                'code' => 'cold_chain',
                'name' => 'Chaîne du froid',
                'description' => 'Produits réfrigérés ou surgelés.',
                'max_weight_kg' => 10.00,
                'requires_isothermal_bag' => true,
                'requires_refrigeration' => true,
                'max_delivery_minutes' => 25,
                'driver_instructions' => 'Sac réfrigéré obligatoire. Livraison directe.',
            ],
            [
                'code' => 'document',
                'name' => 'Document',
                'description' => 'Plis, dossiers, courriers importants.',
                'max_weight_kg' => 2.00,
                'requires_isothermal_bag' => false,
                'requires_refrigeration' => false,
                'max_delivery_minutes' => 45,
                'driver_instructions' => 'Remise contre signature ou code de confirmation.',
            ],
            [
                'code' => 'fragile',
                'name' => 'Fragile',
                'description' => 'Objets cassables (verres, électronique, etc.).',
                'max_weight_kg' => 15.00,
                'requires_isothermal_bag' => false,
                'requires_refrigeration' => false,
                'max_delivery_minutes' => 35,
                'driver_instructions' => 'Manipulation délicate. Ne pas empiler.',
            ],
        ];

        foreach ($categories as $cat) {
            PackageCategory::updateOrCreate(
                ['code' => $cat['code']],
                $cat
            );
        }
    }
}
