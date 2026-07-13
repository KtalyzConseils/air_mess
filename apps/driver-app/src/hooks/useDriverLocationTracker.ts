import { useEffect } from 'react'
import { AppState } from 'react-native'
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
 * (notification permanente "en ligne") qui garde l'app vivante (push fiables) + envoie
 * la position. Il s'arrête dès le passage hors-ligne.
 *
 * IMPORTANT (Android 12+) : un service de premier plan ne peut être démarré QUE si
 * l'app est au premier plan ("active"). À l'ouverture, l'effet peut tourner avant que
 * l'app soit active → on diffère alors le démarrage au listener AppState 'active'.
 * (Sans ça : "Foreground service cannot be started when the application is in the
 * background" en boucle, et la notif "en ligne" n'apparaissait pas.)
 */
export function useDriverLocationTracker({ availability, intervalMs = 15_000, distanceM = 20 }: Options) {
  useEffect(() => {
    if (IS_EXPO_GO) return

    const shouldTrack = availability === 'available' || availability === 'busy'
    let cancelled = false

    async function start() {
      // On ne démarre le FGS que si l'app est réellement au premier plan.
      if (AppState.currentState !== 'active') return
      try {
        const fg = await Location.requestForegroundPermissionsAsync()
        if (fg.status !== 'granted') return
        try {
          await Location.requestBackgroundPermissionsAsync()
        } catch {
          /* ignore */
        }
        if (cancelled || AppState.currentState !== 'active') return

        const already = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK).catch(() => false)
        if (already) return

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
      } catch (e) {
        // FGS refusé (app pas encore au premier plan, etc.) : on retentera au prochain
        // passage 'active'. On NE laisse PAS la promesse rejeter (sinon spam d'erreurs).
        console.warn('[tracker] démarrage service différé:', String(e))
      }
    }

    async function stop() {
      try {
        const started = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK).catch(() => false)
        if (started) await Location.stopLocationUpdatesAsync(LOCATION_TASK)
      } catch {
        /* ignore */
      }
    }

    if (shouldTrack) void start()
    else void stop()

    // Démarre/relance le service quand l'app (re)passe au premier plan — couvre
    // l'ouverture de l'app où le démarrage immédiat est refusé.
    const sub = AppState.addEventListener('change', (s) => {
      if (cancelled) return
      if (s === 'active' && shouldTrack) void start()
    })

    return () => {
      cancelled = true
      sub.remove()
    }
  }, [availability, intervalMs, distanceM])
}
