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

// Throttle au niveau module : plafonne les tentatives de démarrage même si l'effet
// re-run souvent (re-render). Persiste entre les montages.
let lastStartAttempt = 0
const START_THROTTLE_MS = 2500

/**
 * Suivi de position via FOREGROUND SERVICE (Niveau 2).
 *
 * Tant que le livreur est `available`/`busy`, un service de premier plan (notif permanente
 * "Air Mess — en ligne") garde l'app vivante (push fiables) + envoie la position.
 *
 * Fiabilité (leçons terrain) :
 *  - Android 12+ : le FGS ne peut démarrer QUE si l'app est au premier plan ('active').
 *  - `hasStartedLocationUpdatesAsync` N'EST PAS FIABLE : il renvoie "started" même quand le
 *    service a été tué (registre expo périmé). On ne s'en sert donc PAS pour décider s'il
 *    faut (re)démarrer — on rappelle TOUJOURS `startLocationUpdatesAsync` quand on doit
 *    tracker : ça ranime le service mort, ou met juste à jour les options s'il tourne.
 *  - Auto-guérison : ré-assert périodique tant qu'on est en ligne + au retour au premier plan.
 */
export function useDriverLocationTracker({ availability, intervalMs = 15_000, distanceM = 20 }: Options) {
  useEffect(() => {
    if (IS_EXPO_GO) return

    const shouldTrack = availability === 'available' || availability === 'busy'
    let cancelled = false

    async function ensureStarted() {
      if (cancelled || !shouldTrack) return
      // FGS interdit en arrière-plan : on retentera au retour 'active' / au prochain tick.
      if (AppState.currentState !== 'active') return
      const now = Date.now()
      if (now - lastStartAttempt < START_THROTTLE_MS) return
      lastStartAttempt = now
      try {
        let perm = await Location.getForegroundPermissionsAsync()
        if (perm.status !== 'granted') {
          perm = await Location.requestForegroundPermissionsAsync()
        }
        if (perm.status !== 'granted') return
        try {
          await Location.requestBackgroundPermissionsAsync()
        } catch {
          /* ignore */
        }
        if (cancelled || AppState.currentState !== 'active') return

        // stop PUIS start : `startLocationUpdatesAsync` seul ne ranime pas un service mort
        // dont le registre est périmé (il croit que ça tourne). Le stop nettoie le registre,
        // le start crée un service RÉELLEMENT frais → notif "en ligne" garantie.
        await Location.stopLocationUpdatesAsync(LOCATION_TASK).catch(() => {})
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
        // Refus transitoire (fenêtre foreground pas encore ouverte au démarrage) : le tick
        // périodique / le retour 'active' retentera.
        console.warn('[tracker] FGS ensure échec:', String(e))
      }
    }

    async function stop() {
      try {
        const started = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK).catch(
          () => false,
        )
        if (started) await Location.stopLocationUpdatesAsync(LOCATION_TASK)
      } catch {
        /* ignore */
      }
    }

    if (!shouldTrack) {
      void stop()
      return () => {
        cancelled = true
      }
    }

    void ensureStarted()
    // Auto-guérison au retour au premier plan (si l'OEM a tué le service en arrière-plan).
    // Pas d'intervalle périodique : éviterait un stop→start régulier = notif qui clignote.
    const sub = AppState.addEventListener('change', (s) => {
      if (!cancelled && s === 'active') void ensureStarted()
    })

    return () => {
      cancelled = true
      sub.remove()
    }
  }, [availability, intervalMs, distanceM])
}
