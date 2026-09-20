/**
 * Fiche Google Play officielle de l'application livreur.
 * Utilisé par la bannière du formulaire d'inscription driver et la page succès.
 */
export const DRIVER_APP_URL =
  'https://play.google.com/store/apps/details?id=com.anonymous.driver&pcampaignid=web_share'
/**
 * Marques de véhicules les plus courantes au Bénin, par type — suggestions
 * du champ "Marque" (datalist) du formulaire driver. Saisie libre possible :
 * le candidat peut taper une marque absente de la liste.
 */
export const VEHICLE_BRANDS: Record<'moto' | 'scooter' | 'voiture' | 'velo', string[]> = {
  moto: ['Bajaj', 'TVS', 'Haojue', 'Apsonic', 'Honda', 'Yamaha', 'Suzuki', 'Senke', 'Sanya', 'Kymco'],
  scooter: ['Yamaha', 'Honda', 'Kymco', 'Sym', 'Haojue', 'Vespa', 'Peugeot', 'Suzuki'],
  voiture: ['Toyota', 'Hyundai', 'Kia', 'Peugeot', 'Renault', 'Nissan', 'Mercedes-Benz', 'Volkswagen', 'Mitsubishi', 'Suzuki'],
  velo: ['BTwin', 'Giant', 'Trek', 'Scott'],
}
