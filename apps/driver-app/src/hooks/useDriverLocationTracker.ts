import { useEffect, useRef } from 'react'
import * as Location from 'expo-location'
import { updatePosition, type Availability } from '../api/driver'

interface Options {
  availability: Availability | 'busy'
  intervalMs?: number  // fréquence d'envoi au serveur
  distanceM?: number   // distance minimale de déplacement avant nouvel envoi
}

export function useDriverLocationTracker({ availability, intervalMs = 15_000, distanceM = 20 }: Options) {
  const watchRef = useRef<Location.LocationSubscription | null>(null)
  const lastSentRef = useRef<number>(0)

  useEffect(() => {
    // Conditions de tracking : disponible ou en course
    const shouldTrack = availability === 'available' || availability === 'busy'

    if (!shouldTrack) {
      stopWatching()
      return
    }

    let cancelled = false

    async function startWatching() {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        console.warn('Permission GPS refusée')
        return
      }
      if (cancelled) return

      watchRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: intervalMs,
          distanceInterval: distanceM,
        },
        async (loc) => {
          // Throttle supplémentaire côté JS pour éviter de spammer l'API
          const now = Date.now()
          if (now - lastSentRef.current < intervalMs) return
          lastSentRef.current = now

          try {
            await updatePosition(loc.coords.latitude, loc.coords.longitude)
            console.log('📍 Position envoyée:', loc.coords.latitude, loc.coords.longitude)
          } catch (err) {
            console.warn('Échec envoi position:', err)
          }
        },
      )
    }

    startWatching()

    return () => {
      cancelled = true
      stopWatching()
    }
  }, [availability, intervalMs, distanceM])

  function stopWatching() {
    watchRef.current?.remove()
    watchRef.current = null
  }
}
