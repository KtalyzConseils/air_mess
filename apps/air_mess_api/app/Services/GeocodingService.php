<?php

namespace App\Services;

/**
 * Résolution adresse texte → coordonnées GPS.
 *
 * Les vendeurs Gbandjo n'ont (pour l'instant) qu'une adresse écrite, alors que
 * le push livreurs a besoin du lat/lng du point de retrait. Ce service est un
 * point d'extension : par défaut il ne résout rien (la course part en
 * `awaiting_geo` et un admin pose le pin). On pourra y brancher Nominatim/OSM
 * ou Google Geocoding sans toucher au reste du flux.
 */
class GeocodingService
{
    /**
     * @return array{lat:float, lng:float}|null  null si non résolu.
     */
    public function geocode(?string $street, ?string $quartier, ?string $city): ?array
    {
        // TODO: brancher un provider (Nominatim/Google). Stub volontaire :
        // sans provider configuré, on ne devine pas de coordonnées.
        return null;
    }
}
