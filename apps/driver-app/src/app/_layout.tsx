import '../global.css'
import { useEffect, useState } from 'react'
import { Stack, useRouter, useSegments } from 'expo-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { KeyboardProvider } from 'react-native-keyboard-controller'
import notifee, { EventType } from '../lib/notifeeSafe'
import { AppState, Alert, DeviceEventEmitter } from 'react-native'
import { useAuthStore } from '../stores/authStore'
import {
  handleNotifeeEvent,
  getRingQueue,
  enqueueCourseFromPush,
  isCallType,
  showIncomingCourseNotification,
  setActiveIncomingCourse,
  getActiveIncomingCourse,
  dismissUnavailableCourse,
  clearRingQueue,
} from '../lib/registerBackgroundNotifications'
import { initNotifications, IS_EXPO_GO } from '../lib/notifications'
import { usePushTokenRegistration } from '../hooks/usePushTokenRegistration'
import { acknowledgePushReceipt } from '../api/notifications'
import { fetchOfferedCourses, type DriverCourseSummary } from '../api/driver'
import { useIosVoipCall } from '../hooks/useIosVoipCall'
import BrandSplash from '../components/BrandSplash'
import BackgroundLocationDisclosure from '../components/BackgroundLocationDisclosure'
import api from '../api/client'
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
        if (isCallType(data?.type) && data?.course_id != null) {
          if (data.notification_id != null) {
            void acknowledgePushReceipt(data.notification_id).catch(() => {})
          }
          setPendingCourseId(Number(data.course_id))
        } else if (data?.course_id) {
          router.push('/(tabs)/notifications')
        }
      })
    })
    return () => sub?.remove()
  }, [router])

  usePushTokenRegistration()
  useIosVoipCall()

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('airmess-session-invalid', ({ token }) => {
      const auth = useAuthStore.getState()
      if (!token || auth.token !== token) return
      void auth.expireSession(token)
      setPendingCourseId(null)
      void queryClient.cancelQueries().then(() => queryClient.clear())
      void clearRingQueue().catch(() => {})
    })
    return () => sub.remove()
  }, [])

  // Même hors de l'accueil : vérifier la session au premier plan, sans push requis.
  useEffect(() => {
    if (!hydrated || !user) return
    const token = useAuthStore.getState().token
    const refresh = async () => {
      if (AppState.currentState !== 'active') return
      try {
        const data = await queryClient.fetchQuery({
          queryKey: ['me'],
          queryFn: async () => (await api.get('/auth/me')).data,
          staleTime: 0, retry: false,
        })
        if (useAuthStore.getState().token === token) useAuthStore.getState().setUser(data.user)
      } catch { /* Le client traite les 401 ; une panne réseau ne déconnecte pas. */ }
    }
    void refresh()
    const timer = setInterval(() => void refresh(), 15_000)
    const sub = AppState.addEventListener('change', (state) => { if (state === 'active') void refresh() })
    return () => { clearInterval(timer); sub.remove() }
  }, [hydrated, user?.id])

  useEffect(() => {
    if (IS_EXPO_GO || !hydrated || !user) return
    const prune = async () => {
      if (AppState.currentState !== 'active') return
      try {
        const items = await getRingQueue()
        if (!items.some((item) => item.payload.type === 'course.offered')) return
        const offered = await fetchOfferedCourses()
        for (const item of items) {
          if (item.payload.type === 'course.offered' && !offered.some((course) => course.id === item.course_id)) {
            await dismissUnavailableCourse(item.course_id)
          }
        }
      } catch { /* Une panne réseau ne signifie pas que l'offre a disparu. */ }
    }
    const timer = setInterval(() => void prune(), 3_000)
    return () => clearInterval(timer)
  }, [hydrated, user?.id])

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('airmess-incoming-course', ({ courseId }) => setPendingCourseId(courseId))
    return () => sub.remove()
  }, [])

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('airmess-course-action-completed', ({ courseId, action }) => {
      setPendingCourseId(null)
      if (action === 'decline') {
        // Annuler la lecture en vol avant de retirer la course : elle ne doit pas
        // réintroduire une réaffectation refusée au retour immédiat sur l'accueil.
        void queryClient.cancelQueries({ queryKey: ['my-active'] }, { revert: false })
        queryClient.setQueryData<DriverCourseSummary[]>(
          ['my-active'], (courses) => courses?.filter((course) => course.id !== courseId),
        )
      }
      void queryClient.invalidateQueries()
      if (action === 'accept') router.dismissTo('/(tabs)')
    })
    return () => sub.remove()
  }, [router, segments])

  // ── Course entrante : détection de l'événement qui doit ouvrir l'écran d'appel ──

  // 1. Cold start : l'app a été lancée par le full-screen intent Notifee.
  useEffect(() => {
    if (IS_EXPO_GO) return
    notifee.getInitialNotification().then((initial) => {
      const data = initial?.notification?.data as any
      if (data?.alert_mode === 'notification') return
      if (initial?.pressAction?.id === 'accept' || initial?.pressAction?.id === 'decline') return
      if (isCallType(data?.type) && data?.course_id != null) {
        setPendingCourseId(Number(data.course_id))
      }
    })
  }, [])

  // 1bis. Navigation ROBUSTE : la tâche de fond empile les courses entrantes dans une
  // file ; à chaque ouverture / retour au premier plan, on ouvre l'écran d'appel sur la
  // TÊTE de file (course la plus ancienne non traitée). Indépendant des events Notifee
  // (capricieux au réveil). La file est vidée par l'écran d'appel au fil des actions.
  useEffect(() => {
    if (IS_EXPO_GO || !hydrated || !user) return
    async function checkQueue() {
      try {
        const items = await getRingQueue()
        const head = items[0]
        if (head) {
          if (head.payload.type === 'course.offered') {
            const offered = await fetchOfferedCourses()
            if (!offered.some((course) => course.id === head.course_id)) return
          }
          setPendingCourseId(head.course_id)
        }
      } catch {
        /* ignore */
      }
    }
    checkQueue()
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') checkQueue()
    })
    return () => sub.remove()
  }, [hydrated, user?.id])

  // 2. App vivante : notif full-screen pressée / délivrée (événement Notifee).
  useEffect(() => {
    if (IS_EXPO_GO) return
    return notifee.onForegroundEvent(async (event) => {
      const { type, detail } = event
      if (type === EventType.ACTION_PRESS) {
        setPendingCourseId(null)
        try { await handleNotifeeEvent(event) }
        catch (error: any) {
          Alert.alert('Action impossible', error?.response?.data?.message ?? 'Vérifie ta connexion et réessaie.')
        }
        return
      }
      const data = detail.notification?.data as any
      if (
        type === EventType.PRESS &&
        (detail.pressAction?.id === 'incoming-course' || detail.pressAction?.id === 'default') &&
        isCallType(data?.type) &&
        data?.course_id != null
      ) {
        const head = await enqueueCourseFromPush(data)
        setPendingCourseId(head ?? Number(data.course_id))
      }
    })
  }, [])

  // 3. App au premier plan : un push data d'appel arrive (offre ou réaffectation).
  useEffect(() => {
    if (IS_EXPO_GO) return
    let sub: { remove: () => void } | null = null
    import('expo-notifications').then((Notifications) => {
      sub = Notifications.addNotificationReceivedListener(async (notif) => {
        const data = notif.request.content.data as any
        if (isCallType(data?.type) && data?.course_id != null) {
          if (data.notification_id != null) {
            void acknowledgePushReceipt(data.notification_id).catch(() => {})
          }
          if (AppState.currentState === 'active') {
            await showIncomingCourseNotification(data)
            void queryClient.invalidateQueries()
          }
        }
      })
    })
    return () => sub?.remove()
  }, [])

  // Ouvre l'écran d'appel dès que le store est hydraté et qu'un livreur est connecté.
  useEffect(() => {
    if (pendingCourseId == null) return
    // Déjà sur l'écran d'appel → on ignore (évite le double-empilement).
    if (segments[0] === 'incoming-course' || getActiveIncomingCourse() != null) {
      setPendingCourseId(null)
      return
    }
    if (hydrated && user) {
      const id = pendingCourseId
      setPendingCourseId(null)
      setActiveIncomingCourse(id)
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
    // Routes publiques accessibles sans être connecté : login, inscription, et
    // le flow mot-de-passe-oublié (le driver ne peut pas se connecter pour y accéder,
    // c'est justement le but). reset-password est ouvert via deep-link email.
    const first = segments[0] as string | undefined
    const inAuthRoute =
      first === 'login' ||
      first === 'register' ||
      first === 'forgot-password' ||
      first === 'reset-password'
    if (!user && !inAuthRoute) {
      router.replace('/login')
    } else if (user && (first === 'login' || first === 'register')) {
      // Un utilisateur connecté ne doit pas rester sur login/register, mais on
      // le LAISSE sur forgot/reset s'il a suivi un lien mail (cas rare mais valide).
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
        <BackgroundLocationDisclosure />
        <Stack screenOptions={{ headerShown: false }} />
      </QueryClientProvider>
    </KeyboardProvider>
  )
}
