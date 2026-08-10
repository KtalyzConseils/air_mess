import { Platform } from 'react-native'
import * as SecureStore from 'expo-secure-store'

/**
 * SecureStore n'est pas fiable sur web (Expo Go web) — fallback localStorage.
 * Sur native : SecureStore (comme driver-app).
 */
const isWeb = Platform.OS === 'web'

export async function getSecureItem(key: string): Promise<string | null> {
  if (isWeb) {
    try {
      return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null
    } catch {
      return null
    }
  }
  return SecureStore.getItemAsync(key)
}

export async function setSecureItem(key: string, value: string): Promise<void> {
  if (isWeb) {
    try {
      localStorage.setItem(key, value)
    } catch {
      /* ignore */
    }
    return
  }
  await SecureStore.setItemAsync(key, value)
}

export async function deleteSecureItem(key: string): Promise<void> {
  if (isWeb) {
    try {
      localStorage.removeItem(key)
    } catch {
      /* ignore */
    }
    return
  }
  await SecureStore.deleteItemAsync(key).catch(() => {})
}
