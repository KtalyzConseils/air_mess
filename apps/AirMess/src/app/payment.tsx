import { useRef, useState } from 'react'
import { ActivityIndicator, Pressable, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQueryClient } from '@tanstack/react-query'
import { WebView } from 'react-native-webview'
import { getPaymentCallbackUrl, waitForPaymentConfirmation } from '../lib/payment'

export default function PaymentScreen() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const finishing = useRef(false)
  const { checkoutUrl, context = 'wallet', paymentId } = useLocalSearchParams<{
    checkoutUrl?: string
    context?: 'course' | 'wallet'
    paymentId?: string
  }>()
  const [loading, setLoading] = useState(true)
  const [confirmationError, setConfirmationError] = useState<string | null>(null)

  const callbackBaseUrl = getPaymentCallbackUrl(context).split('?')[0]

  const finishPayment = async () => {
    if (finishing.current) return
    finishing.current = true
    setLoading(true)
    setConfirmationError(null)

    try {
      const id = Number(paymentId)
      if (!id) throw new Error('Identifiant de paiement manquant.')

      const confirmation = await waitForPaymentConfirmation(id)
      if (confirmation.status !== 'paid') {
        throw new Error('Le paiement est encore en cours de confirmation.')
      }

      await queryClient.invalidateQueries()
      router.replace(context === 'course' ? '/courses' : '/wallet')
    } catch (error) {
      finishing.current = false
      setLoading(false)
      setConfirmationError(error instanceof Error ? error.message : 'Confirmation impossible.')
    }
  }

  const shouldLoad = (url: string) => {
    if (url.startsWith(callbackBaseUrl) || url.startsWith('airmess://billing/return')) {
      void finishPayment()
      return false
    }
    return true
  }

  if (!checkoutUrl) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-cream px-6">
        <Text className="text-center text-base font-bold text-airmess-red">Lien de paiement invalide.</Text>
        <Pressable onPress={() => router.back()} className="mt-5 rounded-2xl bg-airmess-yellow px-5 py-4">
          <Text className="font-extrabold text-ink">Revenir</Text>
        </Pressable>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-cream">
      <View className="h-14 flex-row items-center border-b border-warm-200 px-4">
        <Pressable onPress={() => router.back()} className="h-10 w-10 items-center justify-center" accessibilityLabel="Fermer le paiement">
          <Ionicons name="close" size={25} color="#1A1614" />
        </Pressable>
        <Text className="flex-1 text-center text-base font-extrabold text-ink">Paiement sécurisé</Text>
        <View className="h-10 w-10 items-center justify-center">
          {loading ? <ActivityIndicator size="small" color="#1A1614" /> : null}
        </View>
      </View>

      <WebView
        source={{ uri: checkoutUrl }}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onShouldStartLoadWithRequest={(request) => shouldLoad(request.url)}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
      />

      {confirmationError ? (
        <View className="absolute bottom-0 left-0 right-0 border-t border-warm-200 bg-cream p-5">
          <Text className="text-center text-sm font-bold text-airmess-red">{confirmationError}</Text>
          <Pressable onPress={() => void finishPayment()} className="mt-3 items-center rounded-2xl bg-airmess-yellow px-5 py-4">
            <Text className="font-extrabold text-ink">Vérifier à nouveau</Text>
          </Pressable>
        </View>
      ) : null}
    </SafeAreaView>
  )
}
