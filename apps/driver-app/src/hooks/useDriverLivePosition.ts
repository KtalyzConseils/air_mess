import { useEffect, useState } from 'react'
import { AppState } from 'react-native'
import * as Location from 'expo-location'

interface Position {
  latitude: number
  longitude: number
  updatedAt: number
}

/**
 * Suivi de position LOCAL (uniquement pour rafraîchir la carte de l'écran actif).
 *
 * Complémentaire de `useDriverLocationTracker` (qui envoie au serveur toutes les 15s).
 * Ici on rafraîchit ~toutes les 3s côté client pour que le marker driver soit fluide
 * sur la carte. Ne consomme rien réseau — juste le GPS déjà allumé par le tracker.
 *
 * S'arrête automatiquement quand l'app passe en arrière-plan (économie batterie).
 */
export function useDriverLivePosition(enabled: boolean = true): Position | null {
  const [position, setPosition] = useState<Position | null>(null)

  useEffect(() => {
    if (!enabled) return
    let sub: Location.LocationSubscription | null = null
    let cancelled = false

    async function start() {
      const perm = await Location.getForegroundPermissionsAsync()
      if (perm.status !== 'granted') return
      if (cancelled) return
      sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 3000,
          distanceInterval: 5,
        },
        (loc) => {
          setPosition({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            updatedAt: loc.timestamp,
          })
        },
      )
    }

    function stop() {
      if (sub) {
        sub.remove()
        sub = null
      }
    }

    if (AppState.currentState === 'active') void start()

    const appSub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && !sub) void start()
      if (state !== 'active') stop()
    })

    return () => {
      cancelled = true
      stop()
      appSub.remove()
    }
  }, [enabled])

  return position
}
