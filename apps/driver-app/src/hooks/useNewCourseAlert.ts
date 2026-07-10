import { useEffect, useRef } from 'react'
import { Vibration, Platform } from 'react-native'
import { createAudioPlayer, type AudioPlayer } from 'expo-audio'

const VIBRATION_PATTERN = Platform.OS === 'android' ? [0, 250, 100, 250] : [0, 250, 100, 250]

/**
 * Déclenche un son + vibration quand le nombre de propositions augmente.
 * Pas de bip si la liste se vide (course acceptée) ou reste stable.
 */
export function useNewCourseAlert(count: number) {
  const prevCountRef = useRef<number>(count)
  const playerRef = useRef<AudioPlayer | null>(null)

  // Charge le player une seule fois
  useEffect(() => {
    try {
      playerRef.current = createAudioPlayer(require('../../assets/sounds/new_course.wav'))
    } catch (e) {
      console.warn('Impossible de charger le son d\'alerte:', e)
    }
    return () => {
      playerRef.current?.release()
      playerRef.current = null
    }
  }, [])

  // Détecte une augmentation du nombre de propositions
  useEffect(() => {
    const prev = prevCountRef.current
    if (count > prev) {
      // Vibration
      Vibration.vibrate(VIBRATION_PATTERN)

      // Son
      try {
        if (playerRef.current) {
          playerRef.current.seekTo(0)
          playerRef.current.play()
        }
      } catch (e) {
        console.warn('Échec de lecture du son:', e)
      }
    }
    prevCountRef.current = count
  }, [count])
}
