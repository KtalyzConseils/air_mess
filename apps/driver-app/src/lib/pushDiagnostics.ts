import { Platform } from 'react-native'
import * as SecureStore from 'expo-secure-store'
import api from '../api/client'
import { INCOMING_CHANNEL } from './registerBackgroundNotifications'
import { IS_EXPO_GO } from './notifications'

export type PushDiagnostic = {
  permission: string
  tokenStored: boolean
  tokenRegistered: boolean
  incomingChannelEnabled: boolean | null
  lastSync: string | null
}

export async function inspectPushConfiguration(): Promise<PushDiagnostic> {
  if (IS_EXPO_GO) {
    return {
      permission: 'expo-go', tokenStored: false, tokenRegistered: false,
      incomingChannelEnabled: null, lastSync: null,
    }
  }

  const Notifications = await import('expo-notifications')
  const permission = await Notifications.getPermissionsAsync()
  const token = await SecureStore.getItemAsync('airmess_push_token')
  const lastSync = await SecureStore.getItemAsync('airmess_push_last_sync')
  let tokenRegistered = false
  if (token) {
    try {
      const { data } = await api.post('/device-tokens/check', { token })
      tokenRegistered = data.registered === true
    } catch {
      tokenRegistered = false
    }
  }

  let incomingChannelEnabled: boolean | null = null
  if (Platform.OS === 'android') {
    const channel = await Notifications.getNotificationChannelAsync(INCOMING_CHANNEL)
    incomingChannelEnabled = channel != null && channel.importance > Notifications.AndroidImportance.NONE
  }

  return {
    permission: permission.status,
    tokenStored: Boolean(token),
    tokenRegistered,
    incomingChannelEnabled,
    lastSync,
  }
}

export async function showLocalPushTest(): Promise<void> {
  const Notifications = await import('expo-notifications')
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Test Air Mess',
      body: 'Les notifications locales fonctionnent sur ce téléphone.',
      sound: 'default',
    },
    trigger: null,
  })
}
