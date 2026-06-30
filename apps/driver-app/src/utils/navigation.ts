import { Linking, Alert, Platform } from 'react-native'

/**
 * Ouvre Google Maps avec un itinéraire vers (lat, lng).
 * - On utilise UNIQUEMENT la lat/lng comme destination (pas de place_id, qui exige
 *   un vrai Google Place ID type ChIJxxxx, pas un nom libre).
 * - `dir_action=navigate` demande à Maps de basculer direct en mode navigation
 *   (pas d'écran de prévisualisation intermédiaire).
 * - Sur Android, on tente d'abord l'intent natif `google.navigation:q=` qui
 *   ouvre TOUJOURS sur le bon point sans détour.
 */
export async function openGoogleMaps(lat: number, lng: number, _label?: string) {
  if (Platform.OS === 'android') {
    const intentUrl = `google.navigation:q=${lat},${lng}&mode=d`
    try {
      const ok = await Linking.canOpenURL(intentUrl)
      if (ok) {
        await Linking.openURL(intentUrl)
        return
      }
    } catch {
      // on retombe sur l'URL universelle ci-dessous
    }
  }

  const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving&dir_action=navigate`
  Linking.openURL(url).catch(() => Alert.alert('Erreur', 'Impossible d\'ouvrir Google Maps.'))
}

