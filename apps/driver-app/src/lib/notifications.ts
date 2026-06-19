import Constants from 'expo-constants'

export const IS_EXPO_GO = Constants.executionEnvironment === 'storeClient'

/**
 * Setup le handler de notifications.
 * NO-OP en Expo Go : depuis SDK 53, expo-notifications a des side-effects
 * (auto-registration push) qui PLANTENT en Expo Go. On charge le module
 * dynamiquement uniquement en dev build.
 */
export async function initNotifications(): Promise<void> {
  if (IS_EXPO_GO) {
    console.log('[notifs] Expo Go detecte, init skip (push non supporte)')
    return
  }
  const Notifications = await import('expo-notifications')
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList:   true,
      shouldPlaySound:  true,
      shouldSetBadge:   true,
    }),
  })
}
