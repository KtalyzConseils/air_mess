import { Platform } from 'react-native'
import Constants, { ExecutionEnvironment } from 'expo-constants'
import * as Device from 'expo-device'
import * as SecureStore from 'expo-secure-store'
import api from '../api/client'

const PUSH_TOKEN_KEY = 'airmess_push_token'
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient

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

  const nativeToken = await Notifications.getDevicePushTokenAsync()
  const token = String(nativeToken.data)

  await api.post('/device-tokens', { token, platform: Platform.OS })
  await SecureStore.setItemAsync(PUSH_TOKEN_KEY, token)
  return token
}

export async function unregisterPushNotifications() {
  const token = await SecureStore.getItemAsync(PUSH_TOKEN_KEY)
  if (!token) return
  await api.delete('/device-tokens', { data: { token } }).catch(() => undefined)
  await SecureStore.deleteItemAsync(PUSH_TOKEN_KEY)
}
