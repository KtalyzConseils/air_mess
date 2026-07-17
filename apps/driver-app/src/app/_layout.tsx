import '../global.css'
import { useEffect, useState } from 'react'
import { Stack, useRouter, useSegments } from 'expo-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { KeyboardProvider } from 'react-native-keyboard-controller'
import notifee, { EventType } from '../lib/notifeeSafe'
import { AppState } from 'react-native'
import { useAuthStore } from '../stores/authStore'
import {
  handleNotifeeEvent,
  getRingQueue,
  enqueueCourseFromPush,
} from '../lib/registerBackgroundNotifications'
import { initNotifications, IS_EXPO_GO } from '../lib/notifications'
import { usePushTokenRegistration } from '../hooks/usePushTokenRegistration'
import BrandSplash from '../components/BrandSplash'
import {
  useFonts,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans'

const queryClient = new QueryClient()

/**
 * Durée minimum d'affichage du BrandSplash — assure que la marque a le temps
 * d'être vue même si l'hydratation du store est instantanée (cas fréquent).
 */
const MIN_SPLASH_MS = 1200

export default function RootLayout() {
  const { user, hydrated, hydrate } = useAuthStore()
  const router = useRouter()
  const segments = useSegments()
  const [minElapsed, setMinElapsed] = useState(false)
  // course_id d'une "course entrante" à ouvrir dès que l'app est prête + connectée.
  const [pendingCourseId, setPendingCourseId] = useState<number | null>(null)

  // Police de marque (Plus Jakarta Sans) — on garde le splash tant qu'elle charge.
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  })

  // Setup du handler (lazy : noop en Expo Go)
  useEffect(() => { initNotifications() }, [])

  // Listener tap sur notif : lazy import pour ne pas charger expo-notifications en Expo Go
  useEffect(() => {
    if (IS_EXPO_GO) return
    let sub: { remove: () => void } | null = null
    import('expo-notifications').then((Notifications) => {
      sub = Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data as any
        if (data?.course_id) {
          router.push('/(tabs)/notifications')
        }
      })
    })
    return () => sub?.remove()
  }, [router])

  usePushTokenRegistration()

  // ── Course entrante : détection de l'événement qui doit ouvrir l'écran d'appel ──

  // 1. Cold start : l'app a été lancée par le full-screen intent Notifee.
  useEffect(() => {
    if (IS_EXPO_GO) return
    notifee.getInitialNotification().then((initial) => {
      const data = initial?.notification?.data as any
      if (data?.type === 'course.offered' && data?.course_id != null) {
        setPendingCourseId(Number(data.course_id))
      }
    })
  }, [])

  // 1bis. Navigation ROBUSTE : la tâche de fond empile les courses entrantes dans une
  // file ; à chaque ouverture / retour au premier plan, on ouvre l'écran d'appel sur la
  // TÊTE de file (course la plus ancienne non traitée). Indépendant des events Notifee
  // (capricieux au réveil). La file est vidée par l'écran d'appel au fil des actions.
  useEffect(() => {
    if (IS_EXPO_GO) return
    async function checkQueue() {
      try {
        const items = await getRingQueue()
        const head = items[0]
        if (head) setPendingCourseId(head.course_id)
      } catch {
        /* ignore */
      }
    }
    checkQueue()
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') checkQueue()
    })
    return () => sub.remove()
  }, [])

  // 2. App vivante : notif full-screen pressée / délivrée (événement Notifee).
  useEffect(() => {
    if (IS_EXPO_GO) return
    return notifee.onForegroundEvent(async (event) => {
      handleNotifeeEvent(event) // boutons Accepter/Refuser pressés app ouverte
      const { type, detail } = event
      const data = detail.notification?.data as any
      if (
        type !== EventType.DISMISSED &&
        data?.type === 'course.offered' &&
        data?.course_id != null
      ) {
        const head = await enqueueCourseFromPush(data)
        setPendingCourseId(head ?? Number(data.course_id))
      }
    })
  }, [])

  // 3. App au premier plan : un push data "course.offered" arrive.
  useEffect(() => {
    if (IS_EXPO_GO) return
    let sub: { remove: () => void } | null = null
    import('expo-notifications').then((Notifications) => {
      sub = Notifications.addNotificationReceivedListener(async (notif) => {
        const data = notif.request.content.data as any
        if (data?.type === 'course.offered' && data?.course_id != null) {
          const head = await enqueueCourseFromPush(data)
          setPendingCourseId(head ?? Number(data.course_id))
        }
      })
    })
    return () => sub?.remove()
  }, [])

  // Ouvre l'écran d'appel dès que le store est hydraté et qu'un livreur est connecté.
  useEffect(() => {
    if (pendingCourseId == null) return
    // Déjà sur l'écran d'appel → on ignore (évite le double-empilement).
    if (segments[0] === 'incoming-course') {
      setPendingCourseId(null)
      return
    }
    if (hydrated && user) {
      const id = pendingCourseId
      setPendingCourseId(null)
      router.push({ pathname: '/incoming-course', params: { course_id: String(id) } })
    }
  }, [pendingCourseId, hydrated, user, router, segments])

  useEffect(() => { hydrate() }, [hydrate])

  // Timer pour la durée minimum du BrandSplash
  useEffect(() => {
    const t = setTimeout(() => setMinElapsed(true), MIN_SPLASH_MS)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    // Routes publiques accessibles sans être connecté : login + inscription.
    const inAuthRoute = segments[0] === 'login' || segments[0] === 'register'
    if (!user && !inAuthRoute) {
      router.replace('/login')
    } else if (user && inAuthRoute) {
      router.replace('/')
    }
  }, [hydrated, user, segments, router])

  // Splash React tant que : store pas hydraté OU durée minimum pas écoulée OU police pas prête
  if (!hydrated || !minElapsed || !fontsLoaded) {
    return <BrandSplash />
  }

  return (
    <KeyboardProvider>
      <QueryClientProvider client={queryClient}>
        <Stack screenOptions={{ headerShown: false }} />
      </QueryClientProvider>
    </KeyboardProvider>
  )
}
