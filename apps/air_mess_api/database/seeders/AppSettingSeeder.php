<?php

namespace Database\Seeders;

use App\Models\AppSetting;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Cache;

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
                'label'       => '[DEPRECATED] Tarif course standard (FCFA)',
                'description' => 'Déprécié depuis le 2026-07-22 : remplacé par la formule linéaire ' .
                                 'price_per_km × distance + price_min. Conservé pour compat rétro ' .
                                 '(fallback si PriceCalculator échoue) — ne PAS utiliser dans un nouveau code.',
                'group'       => 'pricing',
            ],
            [
                'key'         => 'express_delivery_fee_fcfa',
                'value'       => '2500',
                'type'        => 'number',
                'label'       => '[DEPRECATED] Tarif course express (FCFA)',
                'description' => 'Déprécié depuis le 2026-07-22 : remplacé par ' .
                                 '(formule standard) × price_express_multiplier. Conservé pour compat.',
                'group'       => 'pricing',
            ],
            // ===== Nouveau modèle : tarification linéaire y = a × x + b =====
            // Formule appliquée par App\Services\PriceCalculator :
            //   distance_km = haversine(origine, destination) × price_detour_factor
            //   fee_raw    = price_per_km_fcfa × distance_km + price_min_fcfa
            //   fee_urgent = fee_raw × price_express_multiplier (si urgency=express)
            //   fee       = round_up(fee_urgent, 100), clamp entre price_min et price_max
            [
                'key'         => 'price_per_km_fcfa',
                'value'       => '400',
                'type'        => 'number',
                'label'       => 'Tarif par km (FCFA)',
                'description' => 'Coefficient "a" de la formule y = ax + b. Prix appliqué à chaque kilomètre parcouru par le livreur entre origine et destination (distance vol d\'oiseau × facteur détour).',
                'group'       => 'pricing',
            ],
            [
                'key'         => 'price_min_fcfa',
                'value'       => '800',
                'type'        => 'number',
                'label'       => 'Prix minimum course (FCFA)',
                'description' => 'Terme "b" de la formule y = ax + b. Plancher qui protège le livreur sur les micro-trajets (moins de 1 km). C\'est aussi le prix affiché quand la distance vaut 0.',
                'group'       => 'pricing',
            ],
            [
                'key'         => 'price_max_fcfa',
                'value'       => '5000',
                'type'        => 'number',
                'label'       => 'Prix maximum course (FCFA)',
                'description' => 'Plafond haut de la formule. Sur les longs trajets (>10 km), on plafonne pour rester compétitif face au taxi. Passer à 0 pour désactiver le plafond.',
                'group'       => 'pricing',
            ],
            [
                'key'         => 'price_express_multiplier',
                'value'       => '1.5',
                'type'        => 'number',
                'label'       => 'Multiplicateur express (×)',
                'description' => 'Coefficient appliqué au fee standard quand urgency=express. Par défaut 1.5 (course express = 50% plus chère que standard).',
                'group'       => 'pricing',
            ],
            [
                'key'         => 'price_detour_factor',
                'value'       => '1.35',
                'type'        => 'number',
                'label'       => 'Facteur détour (×)',
                'description' => 'Distance réelle routière ≈ vol d\'oiseau × ce facteur. 1.35 est une bonne moyenne pour Cotonou (rues en damier + pas d\'autoroute intra-muros). Ajuster à la hausse si les feedback drivers signalent des trajets sous-payés.',
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
                'key'         => 'high_value_threshold_fcfa',
                'value'       => '30000',
                'type'        => 'number',
                'label'       => 'Seuil "course premium" (FCFA)',
                'description' => 'Au-delà de MAX(encaissement, valeur déclarée) ≥ ce seuil, la course sort du pool driver public et bascule en prise en charge manuelle par les admins (livreur premium dédié). Protège les drivers à faible caution ET Air Mess du risque financier > caution.',
                'group'       => 'general',
            ],
            [
                'key'         => 'dispute_window_days',
                'value'       => '7',
                'type'        => 'number',
                'label'       => 'Fenêtre de contestation (jours)',
                'description' => 'Nombre de jours après la livraison pendant lesquels le marchand ou le destinataire peut signaler un problème (mauvais destinataire, colis perdu constaté après). Au-delà, la livraison est définitivement acquise.',
                'group'       => 'general',
            ],
            [
                'key'         => 'sos_hotline_phone',
                'value'       => '118',
                'type'        => 'string',
                'label'       => 'Numéro d\'urgence livreur (SOS)',
                'description' => 'Numéro composé automatiquement quand un livreur active le SOS depuis l\'app (accident, danger). Par défaut 118 (police secours Bénin). Peut être remplacé par une hotline Air Mess dédiée.',
                'group'       => 'general',
            ],
            [
                'key'         => 'user_wallet_min_recommended_fcfa',
                'value'       => '5000',
                'type'        => 'number',
                'label'       => 'Solde wallet recommandé (FCFA)',
                'description' => 'Montant en dessous duquel on affiche un bandeau "rechargez votre wallet" au marchand/particulier.',
                'group'       => 'wallet',
            ],
            // ===== Mode de payout driver (retrait de caution) =====
            // Deux modes :
            //  - admin_approval : historique, chaque demande créée en `pending` attend qu'un admin
            //    la valide et effectue le virement (le débit wallet a lieu à l'approbation).
            //  - instant        : le driver retire sans admin. Le débit wallet + l'appel Fedapay
            //    ont lieu immédiatement. Le webhook confirme (paid) ou fait un refund (failed).
            //  Défaut MVP : admin_approval — passer en instant quand la clé Fedapay Payout est
            //  active et que l'ops est confortable avec l'automatisation.
            [
                'key'         => 'driver_payout_mode',
                'value'       => 'admin_approval',
                'type'        => 'string',
                'label'       => 'Mode de retrait driver',
                'description' => 'Bascule entre validation admin manuelle et retrait automatique. Passer en "instant" quand la clé Fedapay Payout est active et que l\'ops est confortable avec l\'automatisation.',
                'choices'     => [
                    [
                        'value'       => 'admin_approval',
                        'label'       => 'Validation admin',
                        'description' => 'Chaque demande de retrait apparaît en attente d\'approbation. Un admin la valide et déclenche le virement manuellement.',
                    ],
                    [
                        'value'       => 'instant',
                        'label'       => 'Retrait instantané',
                        'description' => 'Le driver retire depuis son app sans intervention admin. Débit wallet immédiat + appel Fedapay Payout automatique (webhook confirme ou refund).',
                    ],
                ],
                'group'       => 'wallet',
            ],
            [
                'key'         => 'driver_payout_cooldown_hours',
                'value'       => '24',
                'type'        => 'number',
                'label'       => 'Cooldown entre retraits (heures)',
                'description' => 'Délai minimal en heures entre deux demandes de retrait par un même driver (compte à partir de la dernière demande, quel que soit son statut). Ignore les demandes cancelled/rejected pour ne pas pénaliser un driver qui s\'est trompé de numéro.',
                'group'       => 'wallet',
            ],
            // ===== Mode de payout wallet marchand/particulier =====
            // Miroir de driver_payout_mode pour les utilisateurs (marchant + individual).
            // Le wallet user peut accumuler du solde via des remboursements, des refunds
            // de courses annulées, ou d'anciens top-ups non consommés — d'où le besoin
            // d'un retrait, avec les mêmes 2 modes qu'un driver.
            [
                'key'         => 'user_payout_mode',
                'value'       => 'admin_approval',
                'type'        => 'string',
                'label'       => 'Mode de retrait marchand/particulier',
                'description' => 'Bascule entre validation admin manuelle et retrait automatique. Passer en "instant" quand la clé Fedapay Payout est active et que l\'ops est confortable avec l\'automatisation.',
                'choices'     => [
                    [
                        'value'       => 'admin_approval',
                        'label'       => 'Validation admin',
                        'description' => 'Chaque demande de retrait apparaît en attente d\'approbation. Un admin la valide et déclenche le virement manuellement.',
                    ],
                    [
                        'value'       => 'instant',
                        'label'       => 'Retrait instantané',
                        'description' => 'Le marchand/particulier retire depuis son wallet sans intervention admin. Débit immédiat + appel Fedapay Payout automatique (webhook confirme ou refund).',
                    ],
                ],
                'group'       => 'wallet',
            ],
            [
                'key'         => 'user_payout_cooldown_hours',
                'value'       => '24',
                'type'        => 'number',
                'label'       => 'Cooldown retrait marchand/particulier (heures)',
                'description' => 'Délai minimal en heures entre deux demandes de retrait par un même marchand/particulier (anti double-clic en mode instant). Miroir de driver_payout_cooldown_hours.',
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
            // ===== Contacts support (exposés côté public via /support-contact) =====
            [
                'key'         => 'support_phone',
                'value'       => '',
                'type'        => 'string',
                'label'       => 'Téléphone support',
                'description' => 'Numéro téléphone du support Air Mess (format international, ex. +229XXXXXXXX). Utilisé par le bouton "Appeler" dans les modales de contact des 3 apps. Laisser vide pour masquer l\'option.',
                'group'       => 'support',
            ],
            [
                'key'         => 'support_whatsapp_number',
                'value'       => '',
                'type'        => 'string',
                'label'       => 'WhatsApp support (E.164 sans +)',
                'description' => 'Numéro WhatsApp Business (format E.164 sans le +, ex. 229XXXXXXXX). Utilisé pour construire les liens wa.me. Laisser vide pour masquer l\'option.',
                'group'       => 'support',
            ],
            [
                'key'         => 'support_email',
                'value'       => '',
                'type'        => 'string',
                'label'       => 'Email support',
                'description' => 'Adresse email du support (ex. support@airmess-logistics.com). Utilisée par le bouton "Écrire" via mailto:. Laisser vide pour masquer l\'option.',
                'group'       => 'support',
            ],
        ];

        foreach ($settings as $s) {
            AppSetting::updateOrCreate(['key' => $s['key']], $s);
            // Invalide le cache — sinon un AppSetting::get() antérieur au seeder
            // (ex. default retourné avant que la ligne n'existe) reste en cache 1h.
            Cache::forget('app_setting:' . $s['key']);
        }
    }
}
