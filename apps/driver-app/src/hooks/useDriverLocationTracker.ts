import { useEffect } from 'react'
import * as Location from 'expo-location'
import { LOCATION_TASK } from '../lib/locationTask'
import { IS_EXPO_GO } from '../lib/notifications'
import type { Availability } from '../api/driver'

interface Options {
  availability: Availability | 'busy'
  intervalMs?: number
  distanceM?: number
}

/**
 * Suivi de position via FOREGROUND SERVICE (Niveau 2).
 *
 * Tant que le livreur est `available` ou `busy`, on lance un service de premier plan
 * (notification permanente "en ligne") qui :
 *   - envoie la position au serveur en continu (via LOCATION_TASK), même app en arrière-plan,
 *   - garde le process de l'app vivant → l'OEM ne le tue plus → push "course entrante" fiables.
 *
 * Le service s'arrête dès que le livreur repasse hors-ligne.
 */
export function useDriverLocationTracker({ availability, intervalMs = 15_000, distanceM = 20 }: Options) {
  useEffect(() => {
    if (IS_EXPO_GO) return // service de premier plan / background location indispo en Expo Go

    const shouldTrack = availability === 'available' || availability === 'busy'
    let cancelled = false

    async function start() {
      // 1. Permission foreground obligatoire
      const fg = await Location.requestForegroundPermissionsAsync()
      if (fg.status !== 'granted') {
        console.warn('Permission GPS (foreground) refusée')
        return
      }
      // 2. Permission background ("Toujours autoriser") — nécessaire au suivi en arrière-plan
      //    sur Android 10+. Si refusée, le service tourne quand même (garde l'app vivante),
      //    mais les positions ne remonteront pas quand l'écran est éteint.
      try {
        await Location.requestBackgroundPermissionsAsync()
      } catch {
        /* ignore */
      }
      if (cancelled) return

      const already = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK).catch(() => false)
      if (already || cancelled) return

      await Location.startLocationUpdatesAsync(LOCATION_TASK, {
        accuracy: Location.Accuracy.High,
        timeInterval: intervalMs,
        distanceInterval: distanceM,
        pausesUpdatesAutomatically: false,
        showsBackgroundLocationIndicator: true,
        foregroundService: {
          notificationTitle: 'Air Mess — en ligne',
          notificationBody: 'Vous recevez les courses à proximité',
          notificationColor: '#FFCC00',
        },
      })
    }

    async function stop() {
      const started = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK).catch(() => false)
      if (started) {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK).catch(() => {})
      }
    }

    if (shouldTrack) void start()
    else void stop()

    return () => {
      cancelled = true
    }
  }, [availability, intervalMs, distanceM])
}
