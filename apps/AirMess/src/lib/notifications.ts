import { Platform } from 'react-native'
import Constants, { ExecutionEnvironment } from 'expo-constants'
import * as Device from 'expo-device'
import { router } from 'expo-router'
import * as SecureStore from 'expo-secure-store'
import api from '../api/client'

const PUSH_TOKEN_KEY = 'airmess_push_token'
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient
const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId

// expo-notifications throws on import for Android push features when running in Expo Go,
// so it must only be required (not statically imported) once we know we're in a dev build.
const Notifications: typeof import('expo-notifications') | null = isExpoGo
  ? null
  : require('expo-notifications')

if (Notifications) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  })
}

export async function registerPushNotifications() {
  if (!Notifications) return null
  if (!Device.isDevice || (Platform.OS !== 'android' && Platform.OS !== 'ios')) return null

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Notifications importantes',
      description: 'Courses, paiements et retraits AirMess',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 150, 250],
      lightColor: '#FFCC00',
    })
  }

  const existing = await Notifications.getPermissionsAsync()
  const permission = existing.status === 'granted'
    ? existing
    : await Notifications.requestPermissionsAsync()

  if (permission.status !== 'granted') return null

  if (!projectId) {
    console.warn('[push] Project ID Expo introuvable, token non enregistre.')
    return null
  }

  const expoToken = await Notifications.getExpoPushTokenAsync({ projectId })
  const token = expoToken.data

  await api.post('/device-tokens', { token, platform: Platform.OS })
  await SecureStore.setItemAsync(PUSH_TOKEN_KEY, token)
  return token
}

export function installNotificationRouting() {
  if (!Notifications) return () => undefined

  const openFromData = (data: Record<string, unknown> | null | undefined) => {
    if (!data) {
      router.push('/(tabs)/notifications')
      return
    }

    const notificationId = getString(data.notification_id)
    if (notificationId) {
      void api.post(`/notifications/${notificationId}/read`).catch(() => undefined)
    }

    const courseId = getString(data.course_id)
    if (courseId) {
      router.push({ pathname: '/courses/[id]', params: { id: courseId } })
      return
    }

    if (data.screen === 'wallet') {
      router.push('/(tabs)/wallet')
      return
    }

    router.push('/(tabs)/notifications')
  }

  const lastResponsePromise = Notifications.getLastNotificationResponseAsync()
  void lastResponsePromise.then((response) => {
    if (response) {
      openFromData(response.notification.request.content.data)
    }
  })

  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    openFromData(response.notification.request.content.data)
  })

  return () => subscription.remove()
}

export async function unregisterPushNotifications() {
  const token = await SecureStore.getItemAsync(PUSH_TOKEN_KEY)
  if (!token) return
  await api.delete('/device-tokens', { data: { token } }).catch(() => undefined)
  await SecureStore.deleteItemAsync(PUSH_TOKEN_KEY)
}

function getString(value: unknown) {
  if (typeof value === 'string' && value.length > 0) return value
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return null
}
