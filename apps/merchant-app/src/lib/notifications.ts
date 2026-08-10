import Constants from 'expo-constants'
import { Platform } from 'react-native'

export const IS_EXPO_GO = Constants.executionEnvironment === 'storeClient'

/** Canal Android unique de l'app marchand (créé une seule fois, cf. initNotifications). */
export const DEFAULT_CHANNEL = 'default'

/**
 * Destination d'un tap sur une notification.
 * Le payload push de l'API (NotificationService) porte `course_id` dès que la
 * notif concerne une course ; sinon on retombe sur l'onglet Notifications.
 */
export function routeForNotification(data: Record<string, any> | null | undefined): string {
  const courseId = data?.course_id
  if (courseId !== null && courseId !== undefined && courseId !== '') {
    return `/course/${courseId}`
  }
  return '/(tabs)/notifications'
}

export async function initNotifications(): Promise<void> {
  if (IS_EXPO_GO) {
    console.log('[notifs] Expo Go detecte, init skip')
    return
  }
  const Notifications = await import('expo-notifications')
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  })

  // NB : Android verrouille les réglages d'un canal après sa 1re création. Ce canal
  // ne doit donc être déclaré qu'ICI — le redéclarer ailleurs avec d'autres options
  // n'a aucun effet et fait croire à tort que le réglage a changé.
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(DEFAULT_CHANNEL, {
      name: 'Notifications',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 100, 250],
      lightColor: '#FFC300',
    })
  }
}

/** Remet le compteur de l'icône de l'app à zéro (iOS surtout). */
export async function clearBadge(): Promise<void> {
  if (IS_EXPO_GO) return
  try {
    const Notifications = await import('expo-notifications')
    await Notifications.setBadgeCountAsync(0)
  } catch {
    /* pas de badge sur ce device : sans conséquence */
  }
}
