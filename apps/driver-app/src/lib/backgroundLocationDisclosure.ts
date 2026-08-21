import { Platform } from 'react-native'
import * as SecureStore from 'expo-secure-store'

const DISCLOSURE_ACCEPTED_KEY = 'airmess_background_location_disclosure_v1'

type DisclosureListener = (visible: boolean) => void

let visible = false
let pendingResolve: ((accepted: boolean) => void) | null = null
const listeners = new Set<DisclosureListener>()

function emit(nextVisible: boolean) {
  visible = nextVisible
  listeners.forEach((listener) => listener(visible))
}

export function subscribeBackgroundLocationDisclosure(listener: DisclosureListener) {
  listeners.add(listener)
  listener(visible)
  return () => listeners.delete(listener)
}

export async function hasAcceptedBackgroundLocationDisclosure(): Promise<boolean> {
  if (Platform.OS !== 'android') return true
  return (await SecureStore.getItemAsync(DISCLOSURE_ACCEPTED_KEY)) === '1'
}

export async function requestBackgroundLocationDisclosure(): Promise<boolean> {
  if (Platform.OS !== 'android') return true
  if (await hasAcceptedBackgroundLocationDisclosure()) return true

  if (pendingResolve) {
    return new Promise((resolve) => {
      const previousResolve = pendingResolve
      pendingResolve = (accepted) => {
        previousResolve?.(accepted)
        resolve(accepted)
      }
    })
  }

  emit(true)

  return new Promise((resolve) => {
    pendingResolve = resolve
  })
}

export async function acceptBackgroundLocationDisclosure() {
  await markBackgroundLocationDisclosureAccepted()
  pendingResolve?.(true)
  pendingResolve = null
  emit(false)
}

export async function markBackgroundLocationDisclosureAccepted() {
  await SecureStore.setItemAsync(DISCLOSURE_ACCEPTED_KEY, '1')
}

export function deferBackgroundLocationDisclosure() {
  pendingResolve?.(false)
  pendingResolve = null
  emit(false)
}
