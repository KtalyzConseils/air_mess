import { useEffect } from 'react'
import { Platform } from 'react-native'
import { useRouter } from 'expo-router'
import api from '../api/client'
import { useAuthStore } from '../stores/authStore'
import { IS_EXPO_GO } from '../lib/notifications'
import { declineCourse } from '../api/driver'

/**
 * Appel entrant iOS via CallKit + VoIP push (PushKit).
 *
 * Pendant iOS du full-screen intent Android : sur iPhone, seul un push VoIP réveille
 * l'app (fermée/verrouillée) pour présenter un appel. Le natif (cf. plugins/withIosVoip
 * → AppDelegate) enregistre le registre PushKit et, à la réception d'un push VoIP,
 * signale IMMÉDIATEMENT l'appel à CallKit (obligatoire iOS 13+). Ce hook fait le reste
 * côté JS : envoyer le token VoIP au backend, et réagir aux actions de l'utilisateur
 * sur l'UI CallKit native (répondre / raccrocher).
 *
 * No-op hors iOS et en Expo Go (les modules natifs n'existent pas).
 */
export function useIosVoipCall() {
  const user = useAuthStore((s) => s.user)
  const router = useRouter()

  useEffect(() => {
    if (Platform.OS !== 'ios' || IS_EXPO_GO || !user) return

    let cleanup: (() => void) | undefined
    let cancelled = false
    // Dernière course reçue par push VoIP : sert à corréler l'action CallKit
    // (répondre/raccrocher) avec la course concernée.
    let pendingCourseId: number | null = null

    async function setup() {
      // Imports paresseux : ces modules natifs ne doivent jamais être chargés en Expo Go.
      const RNCallKeep = (await import('react-native-callkeep')).default
      const VoipPushNotification = (await import('react-native-voip-push-notification')).default
      if (cancelled) return

      // Configuration CallKit (nom affiché sur l'écran d'appel natif).
      try {
        await RNCallKeep.setup({
          ios: {
            appName: 'Air Mess',
            supportsVideo: false,
            maximumCallGroups: '1',
            maximumCallsPerCallGroup: '1',
          },
          android: {
            // Non utilisé (Android passe par Notifee), mais setup() l'exige.
            alertTitle: 'Permissions requises',
            alertDescription: '',
            cancelButton: 'Annuler',
            okButton: 'OK',
            additionalPermissions: [],
          },
        })
      } catch {
        /* setup peut échouer si déjà initialisé : sans gravité */
      }

      /** Récupère le course_id depuis un payload VoIP (souple sur la forme). */
      const courseIdFrom = (payload: any): number | null => {
        const raw = payload?.course_id ?? payload?.data?.course_id
        const n = Number(raw)
        return Number.isFinite(n) && n > 0 ? n : null
      }

      // Envoie le token VoIP au backend (canal séparé du token Expo : platform 'ios-voip').
      // Idempotent côté serveur (updateOrCreate sur le token).
      const sendVoipToken = (token: string) => {
        if (typeof token === 'string' && token.length > 0) {
          api.post('/device-tokens', { token, platform: 'ios-voip' }).catch(() => {})
        }
      }

      // Token VoIP fraîchement émis par iOS.
      VoipPushNotification.addEventListener('register', (token: string) => {
        sendVoipToken(token)
      })

      // Push VoIP reçu (l'appel CallKit est déjà présenté par le natif) : on retient la
      // course pour savoir quoi accepter/refuser quand l'utilisateur agit.
      VoipPushNotification.addEventListener('notification', (payload: any) => {
        const id = courseIdFrom(payload)
        if (id) pendingCourseId = id
      })

      // Cold start : événements VoIP survenus AVANT que le JS soit prêt. C'est le cas le
      // plus fréquent pour le TOKEN : iOS l'émet dès le démarrage (AppDelegate), bien
      // avant que ce hook s'abonne. Sans ce rattrapage, le token n'est jamais envoyé.
      VoipPushNotification.addEventListener('didLoadWithEvents', (events: any[]) => {
        for (const e of events ?? []) {
          if (e?.name === 'RNVoipPushRemoteNotificationsRegisteredEvent') {
            sendVoipToken(e?.data)
          } else if (e?.name === 'RNVoipPushRemoteNotificationReceivedEvent') {
            const id = courseIdFrom(e?.data)
            if (id) pendingCourseId = id
          }
        }
      })

      // L'utilisateur RÉPOND sur l'UI CallKit → on ouvre l'écran de course (détails +
      // confirmation), comme l'écran d'appel Android.
      RNCallKeep.addEventListener('answerCall', ({ callUUID }: { callUUID: string }) => {
        RNCallKeep.endCall(callUUID) // on ferme l'UI CallKit, l'app prend le relais
        if (pendingCourseId) {
          router.push({
            pathname: '/incoming-course',
            params: { course_id: String(pendingCourseId) },
          })
        }
      })

      // L'utilisateur RACCROCHE / refuse sur l'UI CallKit → on refuse la course.
      RNCallKeep.addEventListener('endCall', () => {
        const id = pendingCourseId
        pendingCourseId = null
        if (id) declineCourse(id, 'personal').catch(() => {})
      })

      VoipPushNotification.registerVoipToken()

      cleanup = () => {
        VoipPushNotification.removeEventListener('register')
        VoipPushNotification.removeEventListener('notification')
        VoipPushNotification.removeEventListener('didLoadWithEvents')
        RNCallKeep.removeEventListener('answerCall')
        RNCallKeep.removeEventListener('endCall')
      }
    }

    void setup()

    return () => {
      cancelled = true
      cleanup?.()
    }
  }, [user, router])
}
