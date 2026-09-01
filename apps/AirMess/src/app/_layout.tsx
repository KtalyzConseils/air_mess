import '../global.css'
import { useEffect, useState } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { KeyboardProvider } from 'react-native-keyboard-controller'
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/plus-jakarta-sans'
import BrandSplash from '../components/BrandSplash'
import { useAuthStore } from '../stores/authStore'
import { useLanguageStore } from '../stores/languageStore'
import { useThemeStore } from '../stores/themeStore'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

const MIN_SPLASH_MS = 1200

export default function RootLayout() {
  const hydrate = useAuthStore((state) => state.hydrate)
  const hydrated = useAuthStore((state) => state.hydrated)
  const hydrateLanguage = useLanguageStore((state) => state.hydrate)
  const languageHydrated = useLanguageStore((state) => state.hydrated)
  const hydrateTheme = useThemeStore((state) => state.hydrate)
  const themeHydrated = useThemeStore((state) => state.hydrated)
  const theme = useThemeStore((state) => state.theme)
  const [minElapsed, setMinElapsed] = useState(false)
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  })

  useEffect(() => {
    hydrate()
  }, [hydrate])

  useEffect(() => {
    hydrateLanguage()
  }, [hydrateLanguage])

  useEffect(() => {
    hydrateTheme()
  }, [hydrateTheme])

  useEffect(() => {
    const timer = setTimeout(() => setMinElapsed(true), MIN_SPLASH_MS)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    // L'ancien development build peut ne pas encore embarquer ce module natif.
    // L'import dynamique évite de bloquer toute l'app avant le prochain build Android.
    void import('expo-navigation-bar')
      .then(({ NavigationBar }) => NavigationBar.setStyle(theme === 'dark' ? 'dark' : 'light'))
      .catch(() => undefined)
  }, [theme])

  if (!hydrated || !languageHydrated || !themeHydrated || !minElapsed || !fontsLoaded) {
    return <BrandSplash />
  }

  return (
    <KeyboardProvider>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} animated />
      <QueryClientProvider client={queryClient}>
        <Stack screenOptions={{ headerShown: false }} />
      </QueryClientProvider>
    </KeyboardProvider>
  )
}
