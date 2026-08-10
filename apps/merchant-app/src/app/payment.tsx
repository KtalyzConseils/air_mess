import { useCallback, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Linking,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { WebView } from 'react-native-webview'
import type { WebViewNavigation } from 'react-native-webview'
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router'
import { useQueryClient } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'

const INK = '#1A1614'
const YELLOW = '#FFCC00'
const RETURN_PATTERNS = [/\/payments\/return-to-app/i, /\/billing\/return/i]

function isReturnUrl(url: string): boolean {
  return RETURN_PATTERNS.some((re) => re.test(url))
}

function hostOf(url: string): string {
  const m = /^[a-z]+:\/\/([^/?#]+)/i.exec(url)
  return m ? m[1] : ''
}

/**
 * Paiement Fedapay in-app (même pattern que driver-app).
 * Wallet marchand : pas d’endpoint confirm — on invalide le cache + poll.
 */
export default function PaymentScreen() {
  const { url, amount } = useLocalSearchParams<{
    url: string
    amount?: string
    payment_id?: string
  }>()
  const router = useRouter()
  const queryClient = useQueryClient()

  const [loading, setLoading] = useState(true)
  const [host, setHost] = useState(() => hostOf(url ?? ''))
  const canGoBackRef = useRef(false)
  const webRef = useRef<WebView>(null)
  const firstPaintRef = useRef(false)
  const doneRef = useRef(false)

  const revealPage = useCallback(() => {
    firstPaintRef.current = true
    setLoading(false)
  }, [])

  useFocusEffect(
    useCallback(() => {
      const t = setTimeout(revealPage, 8000)
      return () => clearTimeout(t)
    }, [revealPage]),
  )

  const finish = useCallback(() => {
    if (doneRef.current) return
    doneRef.current = true
    const refresh = () => queryClient.invalidateQueries({ queryKey: ['wallet'] })
    refresh()
    setTimeout(refresh, 3000)
    setTimeout(refresh, 9000)
    router.replace('/(tabs)/wallet')
  }, [queryClient, router])

  const confirmQuit = useCallback(() => {
    if (doneRef.current) return
    Alert.alert(
      'Quitter le paiement ?',
      'Si tu as déjà validé le paiement, ton solde sera crédité automatiquement dans quelques instants.',
      [
        { text: 'Continuer le paiement', style: 'cancel' },
        { text: 'Quitter', style: 'destructive', onPress: finish },
      ],
    )
  }, [finish])

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        if (canGoBackRef.current) {
          webRef.current?.goBack()
          return true
        }
        confirmQuit()
        return true
      })
      return () => sub.remove()
    }, [confirmQuit]),
  )

  function onNav(nav: WebViewNavigation) {
    canGoBackRef.current = nav.canGoBack
    if (nav.url) setHost(hostOf(nav.url))
    if (nav.url && isReturnUrl(nav.url)) finish()
  }

  if (!url) {
    return (
      <SafeAreaView className="flex-1 bg-cream items-center justify-center p-6">
        <Text className="text-warm-500">URL de paiement manquante.</Text>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-airmess-dark" edges={['top', 'left', 'right']}>
      <StatusBar style="light" />
      <View className="flex-row items-center px-4 py-3 border-b border-white/10">
        <TouchableOpacity onPress={confirmQuit} hitSlop={12} className="p-1">
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
        <View className="flex-1 ml-3">
          <Text className="text-white font-bold">Paiement</Text>
          <Text className="text-warm-400 text-xs" numberOfLines={1}>
            {amount ? `${Number(amount).toLocaleString('fr-FR')} FCFA · ` : ''}
            {host}
          </Text>
        </View>
        <View
          style={{
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: YELLOW,
          }}
        />
      </View>

      <View className="flex-1 bg-white">
        <WebView
          ref={webRef}
          source={{ uri: url }}
          onLoadEnd={revealPage}
          onNavigationStateChange={onNav}
          onShouldStartLoadWithRequest={(req) => {
            if (isReturnUrl(req.url)) {
              finish()
              return false
            }
            if (!/^https?:/i.test(req.url)) {
              Linking.openURL(req.url).catch(() => {})
              return false
            }
            return true
          }}
          style={{ flex: 1, opacity: loading ? 0 : 1 }}
        />
        {loading && (
          <View className="absolute inset-0 items-center justify-center bg-cream">
            <ActivityIndicator color={INK} size="large" />
            <Text className="text-warm-500 mt-3">Ouverture du paiement…</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  )
}
