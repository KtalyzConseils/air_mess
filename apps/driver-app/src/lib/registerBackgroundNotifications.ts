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
 * Alerte "course entrante" façon appel entrant (Yango/Uber), avec FILE SÉQUENTIELLE.
 *
 * Flux : l'API envoie un push DATA-ONLY (type=course.offered) → cette tâche de fond
 * se réveille (même app tuée/verrouillée) → Notifee affiche une notif "appel" :
 *   - full-screen intent (réveille l'écran),
 *   - SONNERIE LONGUE (~28s) portée par le canal → sonne en continu même écran verrouillé,
 *   - boutons Accepter / Refuser directement sur la notif (agir sans déverrouiller).
 *
 * PLUSIEURS COURSES : une seule sonne à la fois. Les courses reçues pendant qu'une
 * autre sonne sont EMPILÉES dans une file (SecureStore). Dès qu'une course est traitée
 * (Accepter / Refuser / expiration), la suivante de la file sonne aussitôt. Jamais deux
 * sonneries superposées. Accepter vide toute la file (le livreur devient occupé).
 *
 * IMPORTANT : ce module tourne en SCOPE MODULE au démarrage (importé par index.js),
 * sinon rien n'est défini quand l'app est tuée (contexte headless).
 */
export const INCOMING_TASK = 'AIRMESS-INCOMING-COURSE-TASK'
export const INCOMING_CHANNEL = 'incoming-call' // canal avec la sonnerie longue
export const INCOMING_NOTIF_ID = 'incoming-course-alert'

/** File d'attente des courses entrantes à faire sonner (une à la fois). */
const RING_QUEUE_KEY = 'airmess_ring_queue'
/** Marqueur de la course qui sonne actuellement (évite de re-sonner la tête à chaque push). */
const RINGING_KEY = 'airmess_ringing'
/** Une course entrante n'est plus pertinente au-delà de ce délai. */
const RING_TTL_MS = 45_000
/** Durée de la sonnerie/notif active (aligné sur timeoutAfter + timer 30s). */
const RING_ACTIVE_MS = 32_000

export type RingItem = {
  course_id: number
  ts: number
  payload: Record<string, any>
}

/** Récupère notre payload quel que soit le "wrapping" expo-notifications (remote/headless). */
export function extractCoursePayload(data: any): Record<string, any> | null {
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

// ── File d'attente (SecureStore) ─────────────────────────────────────────────

async function readQueueRaw(): Promise<RingItem[]> {
  try {
    const raw = await SecureStore.getItemAsync(RING_QUEUE_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr)) return []
    const now = Date.now()
    return arr.filter(
      (it: any) => it && it.course_id != null && now - it.ts < RING_TTL_MS,
    )
  } catch {
    return []
  }
}

async function writeQueue(items: RingItem[]): Promise<void> {
  try {
    await SecureStore.setItemAsync(RING_QUEUE_KEY, JSON.stringify(items))
  } catch {
    /* ignore */
  }
}

/** File courante (courses non traitées, TTL appliqué), tête = plus ancienne. */
export async function getRingQueue(): Promise<RingItem[]> {
  return readQueueRaw()
}

/** Ajoute une course à la file (dédup par id). Retourne la file à jour. */
async function enqueue(payload: Record<string, any>): Promise<RingItem[]> {
  const courseId = Number(payload.course_id)
  if (!courseId) return readQueueRaw()
  const items = await readQueueRaw()
  if (!items.some((it) => it.course_id === courseId)) {
    items.push({ course_id: courseId, ts: Date.now(), payload })
  }
  await writeQueue(items)
  return items
}

/** Retire une course de la file. Retourne la nouvelle tête (ou null si file vide). */
export async function dequeueRing(courseId: number): Promise<RingItem | null> {
  const items = (await readQueueRaw()).filter(
    (it) => it.course_id !== Number(courseId),
  )
  await writeQueue(items)
  return items[0] ?? null
}

/** Vide toute la file (ex : une course acceptée → livreur occupé). */
export async function clearRingQueue(): Promise<void> {
  await writeQueue([])
  await clearRinging()
}

async function readRinging(): Promise<{ course_id: number; ts: number } | null> {
  try {
    const raw = await SecureStore.getItemAsync(RINGING_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

async function setRinging(courseId: number): Promise<void> {
  try {
    await SecureStore.setItemAsync(
      RINGING_KEY,
      JSON.stringify({ course_id: courseId, ts: Date.now() }),
    )
  } catch {
    /* ignore */
  }
}

async function clearRinging(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(RINGING_KEY)
  } catch {
    /* ignore */
  }
}

// ── Affichage de la notif "appel" ────────────────────────────────────────────

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

/** Affiche/rafraîchit la notif "appel" (full-screen + boutons) pour une course donnée. */
async function displayRingNotification(item: RingItem): Promise<void> {
  const payload = item.payload
  const data: Record<string, string> = {}
  for (const [k, v] of Object.entries(payload)) {
    data[k] = v == null ? '' : String(v)
  }
  // Nombre de courses en attente derrière celle-ci (pour le sous-titre).
  const waiting = Math.max(0, (await readQueueRaw()).length - 1)

  await ensureIncomingChannel()
  await notifee.displayNotification({
    id: INCOMING_NOTIF_ID,
    title: '📦 Nouvelle course',
    body:
      notifBody(payload) +
      (waiting > 0 ? `  ·  +${waiting} en attente` : ''),
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
      timeoutAfter: RING_ACTIVE_MS, // se retire seul (> timer 30s)
      actions: [
        { title: '✖ Refuser', pressAction: { id: 'decline' } },
        { title: '✔ Accepter', pressAction: { id: 'accept', launchActivity: 'default' } },
      ],
    },
  })
}

/**
 * Point d'entrée FOND (app tuée/verrouillée) : empile la course puis sonne la TÊTE
 * de file. Si la tête sonne déjà, la nouvelle course attend simplement (pas de
 * sonnerie superposée). Retourne le course_id qui sonne (tête).
 */
export async function showIncomingCourseNotification(
  payload: Record<string, any>,
): Promise<number | null> {
  const items = await enqueue(payload)
  const head = items[0]
  if (!head) return null

  const ring = await readRinging()
  const headAlreadyRinging =
    ring && ring.course_id === head.course_id && Date.now() - ring.ts < RING_ACTIVE_MS
  if (headAlreadyRinging) {
    // La tête sonne déjà : la nouvelle course attend simplement en file (le badge
    // "+N en attente" est porté par l'écran d'appel in-app). On NE re-sonne PAS la tête.
    return head.course_id
  }

  await displayRingNotification(head)
  await setRinging(head.course_id)
  return head.course_id
}

/**
 * Point d'entrée PREMIER PLAN (app ouverte) : empile la course reçue et retourne la
 * tête de file. L'app (in-app) affiche l'écran d'appel — pas de notif système ici.
 */
export async function enqueueCourseFromPush(rawData: any): Promise<number | null> {
  const payload = extractCoursePayload(rawData)
  if (!payload || payload.type !== 'course.offered') return null
  const items = await enqueue(payload)
  return items[0]?.course_id ?? null
}

/** Fait sonner la course suivante de la file, s'il y en a une. Retourne son id. */
export async function ringNextInQueue(): Promise<number | null> {
  const items = await readQueueRaw()
  const head = items[0]
  await clearRinging()
  if (!head) {
    await notifee.cancelNotification(INCOMING_NOTIF_ID).catch(() => {})
    return null
  }
  await displayRingNotification(head)
  await setRinging(head.course_id)
  return head.course_id
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
    // Course prise → livreur occupé : plus aucune course ne doit sonner.
    await clearRingQueue()
    await notifee.cancelNotification(INCOMING_NOTIF_ID).catch(() => {})
  } else if (id === 'decline') {
    try {
      await declineCourse(courseId, 'personal')
    } catch {
      /* ignore */
    }
    // Retire de la file et fait sonner la suivante s'il y en a une.
    await dequeueRing(courseId)
    await ringNextInQueue()
  }
}

// ── Enregistrements en scope module (démarrage, y compris headless) ──────────────
if (!IS_EXPO_GO) {
  // REQUIS par Notifee pour afficher/gérer des notifs en arrière-plan.
  notifee.onBackgroundEvent(handleNotifeeEvent)

  TaskManager.defineTask(INCOMING_TASK, async ({ data, error }: any) => {
    if (error) return
    try {
      // Garde : si aucun livreur n'est connecté sur CE device (déconnecté), on ne sonne
      // pas — même si le serveur a encore ce token push (nettoyage éventuellement en retard).
      const authToken = await SecureStore.getItemAsync('airmess_token')
      if (!authToken) return

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
