import { IS_EXPO_GO } from './notifications'

/**
 * Wrapper Notifee tolérant à Expo Go.
 *
 * Notifee n'a PAS de module natif en Expo Go depuis SDK 53 : importer
 * `@notifee/react-native` en statique déclenche un crash "Notifee native module
 * not found" au chargement du module. Ce fichier fait un require() SYNC
 * conditionnel : le vrai Notifee en dev build (où tout marche), un stub no-op
 * en Expo Go (pour que l'app démarre au moins). Les push/full-screen restent
 * non-fonctionnels en Expo Go — par design.
 */
type NotifeeLike = {
  createChannel: (opts: any) => Promise<string>
  displayNotification: (opts: any) => Promise<string>
  cancelNotification: (id: string) => Promise<void>
  onBackgroundEvent: (handler: (event: any) => Promise<void>) => void
  onForegroundEvent: (handler: (event: any) => void) => () => void
  getInitialNotification: () => Promise<any>
}

const stub: NotifeeLike = {
  createChannel: async () => 'stub',
  displayNotification: async () => 'stub',
  cancelNotification: async () => {},
  onBackgroundEvent: () => {},
  onForegroundEvent: () => () => {},
  getInitialNotification: async () => null,
}

let notifee: NotifeeLike = stub
let EventType: any = { ACTION_PRESS: 2, PRESS: 1, DELIVERED: 3, DISMISSED: 0 }
let AndroidImportance: any = { NONE: 0, MIN: 1, LOW: 2, DEFAULT: 3, HIGH: 4 }
let AndroidCategory: any = { CALL: 'call', MESSAGE: 'msg', ALARM: 'alarm' }
let AndroidVisibility: any = { PRIVATE: 0, PUBLIC: 1, SECRET: -1 }

if (!IS_EXPO_GO) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('@notifee/react-native')
  notifee = mod.default ?? mod
  EventType = mod.EventType
  AndroidImportance = mod.AndroidImportance
  AndroidCategory = mod.AndroidCategory
  AndroidVisibility = mod.AndroidVisibility
}

export default notifee
export { EventType, AndroidImportance, AndroidCategory, AndroidVisibility }
