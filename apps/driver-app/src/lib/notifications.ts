import Constants from 'expo-constants'
import { Platform } from 'react-native'

export const IS_EXPO_GO = Constants.executionEnvironment === 'storeClient'

/**
 * Canal Android dédié aux nouvelles courses (son + vibration personnalisés).
 * Doit correspondre au channelId envoyé par l'API (NotificationService).
 */
export const NEW_COURSE_CHANNEL = 'new-course'

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

  // Sur Android, le son d'une notif provient du CANAL, pas du champ `sound` du push.
  // On crée un canal dédié aux nouvelles courses avec le son bundlé (app.json > sounds).
  // NB : Android verrouille les réglages d'un canal après sa 1re création — un
  // changement de son ultérieur nécessite une désinstallation/réinstallation.
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(NEW_COURSE_CHANNEL, {
      name: 'Nouvelles courses',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'new_course.wav', // basename du fichier bundlé (avec extension)
      vibrationPattern: [0, 250, 100, 250],
    })
  }
}
