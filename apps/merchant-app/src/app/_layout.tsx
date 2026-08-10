import '../global.css'
import { useEffect, useState } from 'react'
import { Stack, useRouter, useSegments } from 'expo-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { KeyboardProvider } from 'react-native-keyboard-controller'
import * as Font from 'expo-font'
import { Ionicons } from '@expo/vector-icons'
import { useAuthStore } from '../stores/authStore'
import { initNotifications, IS_EXPO_GO, routeForNotification } from '../lib/notifications'
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
const MIN_SPLASH_MS = 1200

/** Écrans accessibles sans session — le garde de redirection les laisse passer. */
const AUTH_ROUTES = ['login', 'register', 'forgot-password']

export default function RootLayout() {
  const { user, hydrated, hydrate } = useAuthStore()
  const router = useRouter()
  const segments = useSegments()
  const [minElapsed, setMinElapsed] = useState(false)

  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  })

  // Ionicons : load non-bloquant (évite splash bloqué si Metro renvoie un TTF vide sous Windows).
  useEffect(() => {
    Font.loadAsync(Ionicons.font).catch(() => {})
  }, [])

  useEffect(() => {
    initNotifications()
  }, [])

  // Tap sur une notification → on ouvre la course concernée (ou l'onglet Notifications).
  // On ne route qu'une fois la session hydratée, sinon le garde d'authentification
  // ci-dessous renverrait aussitôt sur /login.
  useEffect(() => {
    if (IS_EXPO_GO || !hydrated || !user) return
    let sub: { remove: () => void } | null = null
    let cancelled = false

    import('expo-notifications').then(async (Notifications) => {
      if (cancelled) return

      const open = (data: Record<string, any> | null | undefined) => {
        queryClient.invalidateQueries({ queryKey: ['notifications'] })
        queryClient.invalidateQueries({ queryKey: ['notifications-unread'] })
        router.push(routeForNotification(data) as never)
      }

      // App relancée depuis un état tué : le listener arrive trop tard pour cette
      // réponse-là, on la récupère explicitement.
      const last = await Notifications.getLastNotificationResponseAsync()
      if (last && !cancelled) {
        open(last.notification.request.content.data as Record<string, any>)
      }

      sub = Notifications.addNotificationResponseReceivedListener((response) => {
        open(response.notification.request.content.data as Record<string, any>)
      })
    })

    return () => {
      cancelled = true
      sub?.remove()
    }
  }, [router, hydrated, user])

  // Notification reçue app ouverte : rafraîchit la liste et la pastille de l'onglet.
  useEffect(() => {
    if (IS_EXPO_GO || !user) return
    let sub: { remove: () => void } | null = null
    import('expo-notifications').then((Notifications) => {
      sub = Notifications.addNotificationReceivedListener(() => {
        queryClient.invalidateQueries({ queryKey: ['notifications'] })
        queryClient.invalidateQueries({ queryKey: ['notifications-unread'] })
      })
    })
    return () => sub?.remove()
  }, [user])

  usePushTokenRegistration()

  useEffect(() => {
    hydrate()
  }, [hydrate])

  useEffect(() => {
    const t = setTimeout(() => setMinElapsed(true), MIN_SPLASH_MS)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    const inAuthRoute = AUTH_ROUTES.includes(segments[0] as string)
    if (!user && !inAuthRoute) {
      router.replace('/login')
    } else if (user && inAuthRoute) {
      router.replace('/')
    }
  }, [hydrated, user, segments, router])

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
