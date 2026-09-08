import { useEffect } from 'react'
import { AppState, Platform } from 'react-native'
import Constants from 'expo-constants'
import api from '../api/client'
import { useAuthStore } from '../stores/authStore'
import { IS_EXPO_GO } from '../lib/notifications'

const RETRY_DELAYS_MS = [0, 3_000, 15_000, 60_000]
let registrationPromise: Promise<boolean> | null = null

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function syncPushToken(): Promise<boolean> {
  if (IS_EXPO_GO) return false
  if (registrationPromise) return registrationPromise

  registrationPromise = (async () => {
    try {
      const Notifications = await import('expo-notifications')
      const Device = await import('expo-device')

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Notifications importantes',
          description: 'Courses, paiements et alertes AirMess Driver',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 150, 250],
          lightColor: '#FFCC00',
        })
      }

      const { status: existing } = await Notifications.getPermissionsAsync()
      const finalStatus = existing === 'granted'
        ? existing
        : (await Notifications.requestPermissionsAsync()).status
      if (finalStatus !== 'granted') {
        console.warn('Permission notif refusee')
        return false
      }

      if (!Device.isDevice) {
        console.warn('Push: pas un vrai device, token non recupere')
        return false
      }

      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ??
        Constants.easConfig?.projectId
      if (!projectId) {
        console.warn('[push] Project ID Expo introuvable, token non enregistre.')
        return false
      }

      const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data
      await api.post('/device-tokens', {
        token,
        platform: Platform.OS,
        manufacturer: Device.manufacturer ?? null,
        model_name: Device.modelName ?? null,
        os_version: Device.osVersion ?? String(Platform.Version),
        app_version: Constants.expoConfig?.version ?? null,
      })

      const SecureStore = await import('expo-secure-store')
      await SecureStore.setItemAsync('airmess_push_token', token)
      await SecureStore.setItemAsync('airmess_push_last_sync', new Date().toISOString())
      console.log('Push token enregistre:', token)

      const { promptFullScreenIntentIfNeeded } = await import('../lib/fullScreenPermission')
      await promptFullScreenIntentIfNeeded()
      return true
    } catch (err) {
      console.warn('[push] synchronisation echouee:', err)
      return false
    } finally {
      registrationPromise = null
    }
  })()

  return registrationPromise
}

async function syncWithRetries(cancelled: () => boolean) {
  for (const delay of RETRY_DELAYS_MS) {
    if (cancelled()) return
    if (delay) await wait(delay)
    if (cancelled()) return
    if (await syncPushToken()) return
  }
}

export function usePushTokenRegistration() {
  const user = useAuthStore((s) => s.user)

  useEffect(() => {
    if (!user) return
    if (IS_EXPO_GO) {
      console.log('[push] Expo Go detecte, registration skip (dev build requis)')
      return
    }

    let cancelled = false
    const run = () => { void syncWithRetries(() => cancelled) }

    run()
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') run()
    })

    return () => {
      cancelled = true
      subscription.remove()
    }
  }, [user])
}
