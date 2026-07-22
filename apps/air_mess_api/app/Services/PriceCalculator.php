<?php

namespace App\Services;

use App\Models\AppSetting;

/**
 * Calcule le prix d'une course selon la formule linéaire y = a × x + b.
 *
 * Cinq réglages admin pilotent la formule (settings de la catégorie "pricing") :
 *   - price_per_km_fcfa       (a)      — coefficient par kilomètre
 *   - price_min_fcfa          (b)      — plancher (aussi prix quand distance = 0)
 *   - price_max_fcfa          — plafond haut (0 = désactivé)
 *   - price_express_multiplier — × appliqué au fee standard pour urgency=express
 *   - price_detour_factor      — distance réelle ≈ Haversine × ce facteur
 *
 * Les anciens forfaits `standard_delivery_fee_fcfa` / `express_delivery_fee_fcfa`
 * ne sont plus utilisés (dépréciés dans le seeder), le service est la seule
 * source de vérité pour le prix d'une course.
 */
class PriceCalculator
{
    /** Rayon terrestre moyen en km — constante utilisée par la formule de Haversine. */
    private const EARTH_RADIUS_KM = 6371.0;

    /**
     * Distance vol d'oiseau entre 2 coordonnées, en kilomètres.
     * Formule de Haversine — précise sur les courtes distances (< 100 km).
     */
    public function haversineKm(
        float $lat1,
        float $lng1,
        float $lat2,
        float $lng2,
    ): float {
        $lat1Rad = deg2rad($lat1);
        $lat2Rad = deg2rad($lat2);
        $dLat    = deg2rad($lat2 - $lat1);
        $dLng    = deg2rad($lng2 - $lng1);

        $a = sin($dLat / 2) ** 2
           + cos($lat1Rad) * cos($lat2Rad) * sin($dLng / 2) ** 2;
        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));

        return self::EARTH_RADIUS_KM * $c;
    }

    /**
     * Calcule le prix + fournit un breakdown complet des paramètres appliqués.
     *
     * @param string $urgency 'standard' ou 'express'
     * @return array<string, mixed> {
     *   distance_km, raw_haversine_km, detour_factor,
     *   per_km, min, max, multiplier,
     *   fee_before_round, fee, capped
     * }
     */
    public function estimate(
        float $originLat,
        float $originLng,
        float $destLat,
        float $destLng,
        string $urgency = 'standard',
    ): array {
        // Settings — castés en float pour supporter les valeurs non-entières (multiplier=1.5).
        $perKm      = (float) AppSetting::get('price_per_km_fcfa', 400);
        $min        = (float) AppSetting::get('price_min_fcfa', 800);
        $max        = (float) AppSetting::get('price_max_fcfa', 5000);
        $multiplier = (float) AppSetting::get('price_express_multiplier', 1.5);
        $detour     = (float) AppSetting::get('price_detour_factor', 1.35);

        // Coordonnées manquantes → distance nulle. Le prix retombe sur le plancher.
        $rawKm = 0.0;
        if ($originLat != 0 && $originLng != 0 && $destLat != 0 && $destLng != 0) {
            $rawKm = $this->haversineKm($originLat, $originLng, $destLat, $destLng);
        }
        $distanceKm = round($rawKm * $detour, 3);

        // Formule linéaire de base y = a × x + b
        $base = ($perKm * $distanceKm) + $min;

        // Multiplicateur d'urgence (standard = 1.0, express = 1.5 par défaut).
        $urgencyMult = $urgency === 'express' ? $multiplier : 1.0;
        $rawFee      = $base * $urgencyMult;

        // Arrondi au 100 FCFA supérieur — affichage plus propre côté marchand.
        $rounded = (int) (ceil($rawFee / 100) * 100);

        // Clamp entre min et max (max=0 → pas de plafond).
        $capped = false;
        if ($max > 0 && $rounded > $max) {
            $rounded = (int) $max;
            $capped  = true;
        }
        if ($rounded < $min) {
            $rounded = (int) $min;
        }

        return [
            'distance_km'      => $distanceKm,
            'raw_haversine_km' => round($rawKm, 3),
            'detour_factor'    => $detour,
            'per_km'           => (int) $perKm,
            'min'              => (int) $min,
            'max'              => (int) $max,
            'multiplier'       => $urgencyMult,
            'urgency'          => $urgency,
            'fee_before_round' => (int) round($rawFee),
            'fee'              => $rounded,
            'capped'           => $capped,
        ];
    }
}
