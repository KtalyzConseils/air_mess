import '../global.css'
import { useEffect, useState } from 'react'
import { Stack, useRouter, useSegments } from 'expo-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { KeyboardProvider } from 'react-native-keyboard-controller'
import notifee, { EventType } from '@notifee/react-native'
import { useAuthStore } from '../stores/authStore'
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

  // 2. App vivante : notif full-screen pressée / délivrée (événement Notifee).
  useEffect(() => {
    if (IS_EXPO_GO) return
    return notifee.onForegroundEvent(({ type, detail }) => {
      const data = detail.notification?.data as any
      // On ouvre l'écran d'appel pour tout événement SAUF un rejet explicite
      // (DISMISSED = l'utilisateur a balayé la notif). Couvre le réveil depuis
      // l'arrière-plan/verrouillage où le type peut être UNKNOWN(0).
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
    </KeyboardProvider>
  )
}
