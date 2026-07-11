import * as TaskManager from 'expo-task-manager'
import * as Notifications from 'expo-notifications'
import * as SecureStore from 'expo-secure-store'
import notifee, {
  AndroidImportance,
  AndroidCategory,
  AndroidVisibility,
  EventType,
} from '@notifee/react-native'
import { IS_EXPO_GO } from './notifications'
import { acceptCourse, declineCourse } from '../api/driver'

/**
 * Alerte "course entrante" façon appel entrant (Yango/Uber).
 *
 * Flux : l'API envoie un push DATA-ONLY (type=course.offered) → cette tâche de fond
 * se réveille (même app tuée/verrouillée) → Notifee affiche une notif "appel" :
 *   - full-screen intent (réveille l'écran),
 *   - SONNERIE LONGUE (~28s) portée par le canal → sonne en continu même écran verrouillé,
 *   - boutons Accepter / Refuser directement sur la notif (agir sans déverrouiller).
 * En parallèle on mémorise la course entrante (SecureStore) : à sa prochaine ouverture,
 * l'app affiche l'écran d'appel riche (/incoming-course) — navigation robuste, indépendante
 * des events Notifee.
 *
 * IMPORTANT : ce module tourne en SCOPE MODULE au démarrage (importé par index.js),
 * sinon rien n'est défini quand l'app est tuée (contexte headless).
 */
export const INCOMING_TASK = 'AIRMESS-INCOMING-COURSE-TASK'
export const INCOMING_CHANNEL = 'incoming-call' // canal avec la sonnerie longue
export const INCOMING_NOTIF_ID = 'incoming-course-alert'
/** Clé SecureStore : course entrante à ouvrir dès que l'app passe au premier plan. */
export const PENDING_COURSE_KEY = 'airmess_pending_course'

/** Récupère notre payload quel que soit le "wrapping" expo-notifications (remote/headless). */
function extractCoursePayload(data: any): Record<string, any> | null {
  if (!data) return null
  const inner = data?.data ?? data
  const raw = inner?.dataString ?? inner?.body
  let parsed: any = null
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw)
    } catch {
      /* pas du JSON */
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
    name: 'Appels de course',
    importance: AndroidImportance.HIGH,
    sound: 'new_course_ring', // res/raw/new_course_ring.wav (sonnerie ~28s)
    vibration: true,
    vibrationPattern: [500, 800, 500, 800],
    bypassDnd: true,
  })
}

/** Corps de la notif : trajet + gains si fournis par le serveur, sinon générique. */
function notifBody(p: Record<string, any>): string {
  const from = p.origin ?? p.origin_quartier
  const to = p.destination ?? p.destination_quartier
  const earn = p.earnings ?? p.driver_earnings
  if (from && to) {
    return `${from} → ${to}${earn ? ` · ${earn} FCFA` : ''}`
  }
  return 'Nouvelle course à proximité — réponds vite'
}

/** Affiche la notif "appel" full-screen + boutons. Réutilisée aussi en foreground. */
export async function showIncomingCourseNotification(
  payload: Record<string, any>,
): Promise<void> {
  const data: Record<string, string> = {}
  for (const [k, v] of Object.entries(payload)) {
    data[k] = v == null ? '' : String(v)
  }
  // Mémorise la course pour que l'app ouvre /incoming-course à son réveil.
  try {
    await SecureStore.setItemAsync(
      PENDING_COURSE_KEY,
      JSON.stringify({ course_id: payload.course_id, ts: Date.now() }),
    )
  } catch {
    /* ignore */
  }

  await ensureIncomingChannel()
  await notifee.displayNotification({
    id: INCOMING_NOTIF_ID,
    title: '📦 Nouvelle course',
    body: notifBody(payload),
    data,
    android: {
      channelId: INCOMING_CHANNEL,
      category: AndroidCategory.CALL,
      importance: AndroidImportance.HIGH,
      visibility: AndroidVisibility.PUBLIC,
      fullScreenAction: { id: 'incoming-course', launchActivity: 'default' },
      pressAction: { id: 'default', launchActivity: 'default' },
      ongoing: true,
      autoCancel: false,
      timeoutAfter: 32_000, // se retire seul (> timer 30s)
      actions: [
        { title: '✖ Refuser', pressAction: { id: 'decline' } },
        { title: '✔ Accepter', pressAction: { id: 'accept', launchActivity: 'default' } },
      ],
    },
  })
}

/** Traite l'appui sur un bouton de la notif (accept/decline) — commun bg/fg. */
export async function handleNotifeeEvent({ type, detail }: any): Promise<void> {
  const id = detail?.pressAction?.id
  const courseId = Number(detail?.notification?.data?.course_id)
  if (type !== EventType.ACTION_PRESS || !courseId) return

  if (id === 'accept') {
    try {
      await acceptCourse(courseId)
    } catch {
      /* déjà prise / erreur : l'app gérera à l'ouverture */
    }
    await notifee.cancelNotification(INCOMING_NOTIF_ID).catch(() => {})
  } else if (id === 'decline') {
    try {
      await declineCourse(courseId, 'personal')
    } catch {
      /* ignore */
    }
    await SecureStore.deleteItemAsync(PENDING_COURSE_KEY).catch(() => {})
    await notifee.cancelNotification(INCOMING_NOTIF_ID).catch(() => {})
  }
}

// ── Enregistrements en scope module (démarrage, y compris headless) ──────────────
if (!IS_EXPO_GO) {
  // REQUIS par Notifee pour afficher/gérer des notifs en arrière-plan.
  notifee.onBackgroundEvent(handleNotifeeEvent)

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
