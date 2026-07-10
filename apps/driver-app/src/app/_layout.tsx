import '../global.css'
import { useEffect, useState } from 'react'
import { Stack, useRouter, useSegments } from 'expo-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { KeyboardProvider } from 'react-native-keyboard-controller'
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
