import Constants from 'expo-constants'
import { Platform } from 'react-native'

export const IS_EXPO_GO = Constants.executionEnvironment === 'storeClient'

/**
 * Token push Expo de CE device (null en Expo Go / si indisponible).
 * Sert à la fois à l'enregistrement et à la SUPPRESSION du token à la déconnexion.
 */
export async function getDeviceExpoPushToken(): Promise<string | null> {
  if (IS_EXPO_GO) return null
  try {
    const Notifications = await import('expo-notifications')
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      (Constants as any).easConfig?.projectId
    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    )
    return tokenData.data
  } catch {
    return null
  }
}

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
    handleNotification: async (notification) => {
      const data = (notification?.request?.content?.data ?? {}) as Record<string, any>
      // Course entrante (offre OU réaffectation admin) : l'ÉCRAN D'APPEL in-app prend
      // entièrement le relais (affichage + sonnerie). On supprime donc la bannière/son
      // système, sinon le livreur voit une notification ET l'appel en même temps, avec
      // double son.
      if (data.type === 'course.offered' || data.type === 'course.assigned_to_you') {
        return {
          shouldShowBanner: false,
          shouldShowList:   false,
          shouldPlaySound:  false,
          shouldSetBadge:   false,
        }
      }
      return {
        shouldShowBanner: true,
        shouldShowList:   true,
        shouldPlaySound:  true,
        shouldSetBadge:   true,
      }
    },
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
