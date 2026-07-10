import * as TaskManager from 'expo-task-manager'
import * as Notifications from 'expo-notifications'
import notifee, {
  AndroidImportance,
  AndroidCategory,
  AndroidVisibility,
} from '@notifee/react-native'
import { IS_EXPO_GO } from './notifications'

/**
 * Alerte "course entrante" façon appel entrant (Yango/Uber).
 *
 * Flux : l'API envoie un push DATA-ONLY (type=course.offered) → cette tâche de fond
 * se réveille (même app tuée/verrouillée sur Android) → Notifee affiche une notif
 * full-screen intent qui RÉVEILLE l'écran et OUVRE l'app sur l'écran /incoming-course.
 *
 * IMPORTANT : ce module doit tourner en SCOPE MODULE au démarrage (importé par index.js),
 * sinon la tâche n'est pas définie dans le contexte headless quand l'app est tuée.
 */
export const INCOMING_TASK = 'AIRMESS-INCOMING-COURSE-TASK'
export const INCOMING_CHANNEL = 'incoming-course'
/** id de la notif full-screen, pour pouvoir l'annuler quand le livreur répond. */
export const INCOMING_NOTIF_ID = 'incoming-course-alert'

/** Récupère notre payload quel que soit le "wrapping" expo-notifications (remote/headless). */
function extractCoursePayload(data: any): Record<string, any> | null {
  if (!data) return null

  // Cas tâche de fond Android (FCM) : le payload envoyé par l'API est sérialisé
  // dans data.data.dataString (ou .body) sous forme de JSON string.
  const inner = data?.data ?? data
  const raw = inner?.dataString ?? inner?.body
  let parsed: any = null
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw)
    } catch {
      /* pas du JSON, on ignore */
    }
  }

  const candidates = [
    parsed,
    data?.notification?.request?.content?.data,
    data?.notification?.data,
    data?.request?.content?.data,
    inner,
    data,
  ]
  for (const c of candidates) {
    if (c && (c.type === 'course.offered' || c.course_id != null)) return c
  }
  return null
}

async function ensureIncomingChannel(): Promise<void> {
  await notifee.createChannel({
    id: INCOMING_CHANNEL,
    name: 'Courses entrantes',
    importance: AndroidImportance.HIGH,
    sound: 'new_course', // res/raw/new_course.wav (nom sans extension)
    vibration: true,
    vibrationPattern: [300, 400, 300, 400],
    bypassDnd: true,
  })
}

/** Affiche la notif full-screen "course entrante". Réutilisée aussi en foreground. */
export async function showIncomingCourseNotification(
  payload: Record<string, any>,
): Promise<void> {
  // Notifee exige des valeurs `data` en string.
  const data: Record<string, string> = {}
  for (const [k, v] of Object.entries(payload)) {
    data[k] = v == null ? '' : String(v)
  }
  await ensureIncomingChannel()
  await notifee.displayNotification({
    id: INCOMING_NOTIF_ID,
    title: '📦 Nouvelle course',
    body: 'Course entrante — touchez pour répondre',
    data,
    android: {
      channelId: INCOMING_CHANNEL,
      category: AndroidCategory.CALL,
      importance: AndroidImportance.HIGH,
      visibility: AndroidVisibility.PUBLIC,
      // Ouvre l'app par-dessus le verrouillage et allume l'écran.
      fullScreenAction: { id: 'incoming-course', launchActivity: 'default' },
      pressAction: { id: 'default', launchActivity: 'default' },
      ongoing: true,
      autoCancel: false,
      // Filet : la notif se retire seule après ~35s (> timer de 30s de l'écran).
      timeoutAfter: 35_000,
    },
  })
}

// ── Définition + enregistrement de la tâche de fond (scope module) ──────────────
if (!IS_EXPO_GO) {
  TaskManager.defineTask(INCOMING_TASK, async ({ data, error }: any) => {
    if (error) return
    try {
      const payload = extractCoursePayload(data)
      if (payload?.type === 'course.offered') {
        await showIncomingCourseNotification(payload)
      }
    } catch (e) {
      console.warn('[bg-notif] handling failed:', String(e))
    }
  })

  Notifications.registerTaskAsync(INCOMING_TASK).catch((e) =>
    console.warn('[bg-notif] registerTaskAsync failed:', e),
  )
}
