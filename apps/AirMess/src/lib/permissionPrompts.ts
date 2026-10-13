import * as Location from 'expo-location'
import * as SecureStore from 'expo-secure-store'
import { Linking } from 'react-native'
import {
  getNotificationPermission,
  requestNotificationPermission,
  type NotificationPermissionState,
} from './notifications'

/**
 * Demandes d'autorisation expliquees, dans l'esprit de l'app livreur.
 *
 * Regle : on n'affiche JAMAIS le prompt systeme sans avoir explique a quoi sert
 * la permission (voir PermissionSheet + usePermissionPrompt). Cette couche
 * centralise la lecture de l'etat, la demande et la memoire "deja explique".
 */
export type PermissionKind = 'notifications' | 'location'

export type PermissionState = NotificationPermissionState

const PROMPTED_PREFIX = 'airmess_permission_prompted_'

/** Vrai si l'utilisateur a deja vu l'ecran d'explication pour cette permission. */
export async function hasBeenExplained(kind: PermissionKind): Promise<boolean> {
  return (await SecureStore.getItemAsync(PROMPTED_PREFIX + kind)) === '1'
}

export async function markExplained(kind: PermissionKind): Promise<void> {
  await SecureStore.setItemAsync(PROMPTED_PREFIX + kind, '1').catch(() => undefined)
}

/** Etat courant, sans afficher de prompt. */
export async function readPermission(kind: PermissionKind): Promise<PermissionState> {
  if (kind === 'location') {
    const { status, canAskAgain } = await Location.getForegroundPermissionsAsync()
    return {
      granted: status === 'granted',
      canAskAgain,
      undetermined: status === 'undetermined',
    }
  }

  return getNotificationPermission()
}

/** Prompt systeme. Le caller doit avoir explique avant. */
export async function requestPermission(kind: PermissionKind): Promise<boolean> {
  if (kind === 'location') {
    const { status } = await Location.requestForegroundPermissionsAsync()
    return status === 'granted'
  }

  return requestNotificationPermission()
}

/** Fiche de l'app dans les reglages systeme (permission refusee definitivement). */
export async function openSystemSettings(): Promise<void> {
  await Linking.openSettings().catch(() => undefined)
}
