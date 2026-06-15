<?php

namespace App\Services;

class MapsLinkParser
{
    /**
     * Extrait (lat, lng) d'un lien Google Maps.
     * Retourne null si non parsable.
     */
    public static function parse(?string $link): ?array
    {
        if (! $link) return null;
        $link = trim($link);

        $patterns = [
            '/@(-?\d+\.\d+),(-?\d+\.\d+)/',          // /@lat,lng,zoom
            '/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/',     // ?q=lat,lng
            '/^(-?\d+\.\d+),\s*(-?\d+\.\d+)$/',      // "lat,lng" brut
        ];

        foreach ($patterns as $re) {
            if (preg_match($re, $link, $m)) {
                $lat = (float) $m[1];
                $lng = (float) $m[2];
                if (abs($lat) <= 90 && abs($lng) <= 180) {
                    return ['lat' => $lat, 'lng' => $lng];
                }
            }
        }
        return null;
    }
}
