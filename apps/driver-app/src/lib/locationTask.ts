import * as TaskManager from 'expo-task-manager'
import * as Location from 'expo-location'
import { updatePosition } from '../api/driver'
import { IS_EXPO_GO } from './notifications'

/**
 * Tâche de fond de localisation (Niveau 2 — fiabilité prod).
 *
 * Alimentée par expo-location `startLocationUpdatesAsync` qui tourne dans un
 * FOREGROUND SERVICE tant que le livreur est en ligne. Deux effets :
 *   1. la position est envoyée au serveur en continu (même app en arrière-plan),
 *   2. le service de premier plan GARDE L'APP VIVANTE → l'OEM ne la tue plus,
 *      donc les push "course entrante" arrivent de façon fiable.
 *
 * Doit être définie en scope module au démarrage (importée par index.js).
 */
export const LOCATION_TASK = 'AIRMESS-LOCATION-TASK'

const MIN_INTERVAL_MS = 15_000
let lastSent = 0

/**
 * Arrête le service de premier plan de localisation (notif "en ligne").
 * Appelé à la déconnexion : sinon le FGS reste actif et le device continue
 * d'apparaître "en ligne" alors que le livreur s'est déconnecté.
 */
export async function stopLocationTracking(): Promise<void> {
  if (IS_EXPO_GO) return
  try {
    const started = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK).catch(
      () => false,
    )
    if (started) await Location.stopLocationUpdatesAsync(LOCATION_TASK)
  } catch {
    /* ignore */
  }
}

if (!IS_EXPO_GO) {
  TaskManager.defineTask(LOCATION_TASK, async ({ data, error }: any) => {
    if (error) return
    const locations = data?.locations as Array<{ coords: { latitude: number; longitude: number } }> | undefined
    if (!locations?.length) return

    const now = Date.now()
    if (now - lastSent < MIN_INTERVAL_MS) return
    lastSent = now

    const loc = locations[locations.length - 1]
    try {
      await updatePosition(loc.coords.latitude, loc.coords.longitude)
    } catch {
      /* réseau indispo : on réessaiera au prochain point */
    }
  })
}
