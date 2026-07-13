import '../global.css'
import { useEffect, useState } from 'react'
import { Stack, useRouter, useSegments } from 'expo-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { KeyboardProvider } from 'react-native-keyboard-controller'
import notifee, { EventType } from '@notifee/react-native'
import { AppState, View, StatusBar } from 'react-native'
import * as SecureStore from 'expo-secure-store'
import { useAuthStore } from '../stores/authStore'
import { handleNotifeeEvent, PENDING_COURSE_KEY } from '../lib/registerBackgroundNotifications'
import { initNotifications, IS_EXPO_GO } from '../lib/notifications'
import { usePushTokenRegistration } from '../hooks/usePushTokenRegistration'
import BrandSplash from '../components/BrandSplash'

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

  // 1bis. Navigation ROBUSTE : la tâche de fond mémorise la course entrante ; à chaque
  // ouverture / retour au premier plan, on ouvre l'écran d'appel si une course fraîche
  // est en attente. Indépendant des events Notifee (capricieux au réveil).
  useEffect(() => {
    if (IS_EXPO_GO) return
    async function checkPending() {
      try {
        const raw = await SecureStore.getItemAsync(PENDING_COURSE_KEY)
        if (!raw) return
        const { course_id, ts } = JSON.parse(raw)
        await SecureStore.deleteItemAsync(PENDING_COURSE_KEY)
        if (course_id != null && Date.now() - ts < 45_000) {
          setPendingCourseId(Number(course_id))
        }
      } catch {
        /* ignore */
      }
    }
    checkPending()
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') checkPending()
    })
    return () => sub.remove()
  }, [])

  // 2. App vivante : notif full-screen pressée / délivrée (événement Notifee).
  useEffect(() => {
    if (IS_EXPO_GO) return
    return notifee.onForegroundEvent((event) => {
      handleNotifeeEvent(event) // boutons Accepter/Refuser pressés app ouverte
      const { type, detail } = event
      const data = detail.notification?.data as any
      if (
        type !== EventType.DISMISSED &&
        data?.type === 'course.offered' &&
        data?.course_id != null
      ) {
        setPendingCourseId(Number(data.course_id))
      }
    })
  }, [])

  // 3. App au premier plan : un push data "course.offered" arrive.
  useEffect(() => {
    if (IS_EXPO_GO) return
    let sub: { remove: () => void } | null = null
    import('expo-notifications').then((Notifications) => {
      sub = Notifications.addNotificationReceivedListener((notif) => {
        const data = notif.request.content.data as any
        if (data?.type === 'course.offered' && data?.course_id != null) {
          setPendingCourseId(Number(data.course_id))
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
    const inLogin = segments[0] === 'login'
    if (!user && !inLogin) {
      router.replace('/login')
    } else if (user && inLogin) {
      router.replace('/')
    }
  }, [hydrated, user, segments, router])

  // Splash React tant que : store pas hydraté OU durée minimum pas écoulée
  if (!hydrated || !minElapsed) {
    return <BrandSplash />
  }

  return (
    <KeyboardProvider>
      <QueryClientProvider client={queryClient}>
        <Stack screenOptions={{ headerShown: false }} />
      </QueryClientProvider>
      {/* Bandeau sombre derrière la barre de statut : les icônes système (blanches)
          restent visibles sur TOUS les écrans, sans dépendre du contrôle JS des icônes
          (inopérant en edge-to-edge sur cet OEM). */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: StatusBar.currentHeight ?? 28,
          backgroundColor: '#1A1614',
          zIndex: 100,
        }}
      />
    </KeyboardProvider>
  )
}
