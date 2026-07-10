import { useEffect } from 'react'
import { Platform } from 'react-native'
import Constants from 'expo-constants'
import api from '../api/client'
import { useAuthStore } from '../stores/authStore'
import { IS_EXPO_GO } from '../lib/notifications'

export function usePushTokenRegistration() {
  const user = useAuthStore((s) => s.user)

  useEffect(() => {
    if (!user) return
    if (IS_EXPO_GO) {
      console.log('[push] Expo Go detecte, registration skip (dev build requis)')
      return
    }

    async function register() {
      try {
        // Lazy import : expo-notifications ne doit JAMAIS etre charge en Expo Go
        const Notifications = await import('expo-notifications')
        const Device = await import('expo-device')

        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'Default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FFC300',
          })
        }

        const { status: existing } = await Notifications.getPermissionsAsync()
        let finalStatus = existing
        if (existing !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync()
          finalStatus = status
        }
        if (finalStatus !== 'granted') {
          console.warn('Permission notif refusee')
          return
        }

        if (!Device.isDevice) {
          console.warn('Push: pas un vrai device, token non recupere')
          return
        }

        const projectId =
          Constants.expoConfig?.extra?.eas?.projectId ??
          Constants.easConfig?.projectId
        const tokenData = await Notifications.getExpoPushTokenAsync(
          projectId ? { projectId } : undefined,
        )

        await api.post('/device-tokens', {
          token: tokenData.data,
          platform: Platform.OS,
        })
        console.log('🔔 Push token enregistre:', tokenData.data)

        // Android 14+ : inviter à activer les notifications plein écran (une fois),
        // sinon l'alerte "course entrante" ne réveille pas l'écran verrouillé.
        const { promptFullScreenIntentIfNeeded } = await import('../lib/fullScreenPermission')
        await promptFullScreenIntentIfNeeded()
      } catch (err) {
        console.warn('Push registration failed:', err)
      }
    }

    register()
  }, [user])
}
