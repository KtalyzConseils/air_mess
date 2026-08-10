import { useEffect } from 'react'
import { Platform } from 'react-native'
import Constants from 'expo-constants'
import api from '../api/client'
import { useAuthStore } from '../stores/authStore'
import { usePushStore, type PushState } from '../stores/pushStore'
import { IS_EXPO_GO } from '../lib/notifications'

/**
 * Placeholder posé à la création du projet. Tant qu'il est là, Expo ne peut pas
 * émettre de token : `eas init` dans apps/merchant-app doit le remplacer.
 */
const PLACEHOLDER_PROJECT_ID = 'REPLACE_WITH_EAS_PROJECT_ID'

function resolveProjectId(): string | null {
  const id =
    Constants.expoConfig?.extra?.eas?.projectId ?? (Constants as any).easConfig?.projectId
  if (!id || id === PLACEHOLDER_PROJECT_ID) return null
  return id as string
}

/**
 * Enregistre le token push Expo du device auprès de l'API.
 *
 * Chaque cause d'échec est remontée dans `pushStore` (et pas seulement loguée) :
 * sans ça, l'absence de notifications système est indiscernable d'un serveur
 * silencieux — les notifs continuent d'arriver dans l'onglet, qui lui est
 * alimenté par l'API et non par le push.
 */
export function usePushTokenRegistration() {
  const user = useAuthStore((s: any) => s.user)
  const attempt = usePushStore((s: PushState) => s.attempt)
  const setStatus = usePushStore((s: PushState) => s.setStatus)

  useEffect(() => {
    if (!user) return

    if (IS_EXPO_GO) {
      // Depuis le SDK 53, expo-notifications ne délivre plus aucun push en Expo Go.
      setStatus('expo_go')
      console.log('[push] Expo Go : aucun push système possible, dev build/APK requis')
      return
    }

    const projectId = resolveProjectId()
    if (!projectId) {
      setStatus(
        'no_project_id',
        "app.json > extra.eas.projectId n'est pas renseigné. Lancer `eas init` dans apps/merchant-app.",
      )
      console.warn('[push] projectId EAS manquant/placeholder : enregistrement impossible')
      return
    }

    let cancelled = false

    async function register() {
      try {
        const Notifications = await import('expo-notifications')
        const Device = await import('expo-device')

        // Le canal Android est créé par initNotifications() (_layout) : ne pas le
        // redéclarer ici, Android ignore toute redéfinition après la 1re création.

        if (!Device.isDevice) {
          if (!cancelled) setStatus('no_device')
          return
        }

        const { status: existing } = await Notifications.getPermissionsAsync()
        let finalStatus = existing
        if (existing !== 'granted') {
          const { status: asked } = await Notifications.requestPermissionsAsync()
          finalStatus = asked
        }
        if (finalStatus !== 'granted') {
          if (!cancelled) setStatus('denied')
          return
        }

        const tokenData = await Notifications.getExpoPushTokenAsync({ projectId: projectId! })

        await api.post('/device-tokens', {
          token: tokenData.data,
          platform: Platform.OS,
        })
        const { setSecureItem } = await import('../lib/tokenStorage')
        await setSecureItem('airmess_push_token', tokenData.data)

        if (!cancelled) setStatus('registered')
        console.log('[push] token enregistré', tokenData.data)
      } catch (err) {
        // Causes fréquentes : credentials FCM absentes du projet EAS (Android),
        // projectId inconnu d'Expo, ou /device-tokens en erreur.
        const msg = (err as Error)?.message ?? String(err)
        if (!cancelled) setStatus('error', msg)
        console.warn('[push] enregistrement échoué :', msg)
      }
    }

    register()
    return () => {
      cancelled = true
    }
  }, [user, attempt, setStatus])
}
