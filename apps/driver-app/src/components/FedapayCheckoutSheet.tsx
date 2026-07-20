import { useRef, useState } from 'react'
import { ActivityIndicator, Modal, Pressable, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { WebView } from 'react-native-webview'
import type { WebViewNavigation } from 'react-native-webview'
import { Ionicons } from '@expo/vector-icons'

/**
 * Ouvre le checkout Fedapay DANS l'app plutôt que via Linking.openURL().
 *
 * Objectif : le livreur ne quitte plus l'app pour payer sa caution → moins de
 * frottement (pas d'onglet Chrome, pas de switcher d'app), et surtout on
 * détecte la fin du paiement pour rafraîchir le wallet et fermer la modale.
 *
 * Détection de fin : Fedapay redirige le navigateur vers la callback URL
 * (`/billing/return?…&status=approved|declined|canceled`). Dès qu'on voit
 * cette URL, on appelle `onDone(status)` — même si le webhook backend n'est
 * pas encore arrivé, le refetch du wallet suivra le débit dès sa confirmation.
 *
 * L'utilisateur peut aussi fermer manuellement via la croix (top-left) —
 * dans ce cas on renvoie `onDone('closed')` : l'appelant refetch le wallet
 * malgré tout (le webhook peut avoir été délivré même sans redirection).
 */

export type FedapayCheckoutOutcome = 'approved' | 'declined' | 'canceled' | 'closed'

type Props = {
  visible: boolean
  checkoutUrl: string | null
  /**
   * Sous-chaîne à détecter dans la navigation pour considérer que Fedapay a fini.
   * Par défaut `/billing/return` — aligné sur DriverController::topUpWallet.
   */
  returnUrlMatch?: string
  onDone: (outcome: FedapayCheckoutOutcome) => void
}

function extractStatus(url: string): FedapayCheckoutOutcome {
  try {
    const parsed = new URL(url)
    const status = parsed.searchParams.get('status')?.toLowerCase() ?? ''
    if (status === 'approved') return 'approved'
    if (status === 'declined') return 'declined'
    if (status === 'canceled' || status === 'cancelled') return 'canceled'
  } catch {
    /* URL invalide → on redevient neutre */
  }
  return 'closed'
}

export default function FedapayCheckoutSheet({
  visible,
  checkoutUrl,
  returnUrlMatch = '/billing/return',
  onDone,
}: Props) {
  const [loading, setLoading] = useState(true)
  const settledRef = useRef(false)

  // Reset au (re)ouverture d'une session
  function handleShow() {
    settledRef.current = false
    setLoading(true)
  }

  function handleNavStateChange(navState: WebViewNavigation) {
    if (settledRef.current) return
    if (navState.url.includes(returnUrlMatch)) {
      settledRef.current = true
      onDone(extractStatus(navState.url))
    }
  }

  function handleClose() {
    if (settledRef.current) return
    settledRef.current = true
    onDone('closed')
  }

  return (
    <Modal
      visible={visible}
      onShow={handleShow}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleClose}
    >
      <SafeAreaView className="flex-1 bg-cream" edges={['top', 'left', 'right']}>
        {/* Header : croix + titre. Volontairement sobre pour laisser le checkout Fedapay
            occuper l'écran — on n'ajoute pas de progression ou de URL bar, ça brouillerait
            la lecture du montant final avant paiement. */}
        <View className="flex-row items-center px-4 py-3 border-b border-warm-200 bg-off-white">
          <Pressable
            onPress={handleClose}
            hitSlop={12}
            className="w-9 h-9 items-center justify-center rounded-full bg-cream"
          >
            <Ionicons name="close" size={20} color="#1A1614" />
          </Pressable>
          <View className="flex-1 ml-3">
            <Text className="text-xs uppercase tracking-widest font-extrabold text-warm-500">
              Paiement sécurisé
            </Text>
            <Text className="text-base font-extrabold text-ink -mt-0.5">Fedapay</Text>
          </View>
          <View className="flex-row items-center bg-success-bg px-2 py-1 rounded-full">
            <Ionicons name="lock-closed" size={11} color="#16A34A" />
            <Text className="text-[10px] font-extrabold text-success ml-1">HTTPS</Text>
          </View>
        </View>

        <View className="flex-1 bg-white">
          {checkoutUrl ? (
            <WebView
              source={{ uri: checkoutUrl }}
              onLoadStart={() => setLoading(true)}
              onLoadEnd={() => setLoading(false)}
              onNavigationStateChange={handleNavStateChange}
              startInLoadingState
              javaScriptEnabled
              domStorageEnabled
              sharedCookiesEnabled
              thirdPartyCookiesEnabled
              setSupportMultipleWindows={false}
              originWhitelist={['*']}
              style={{ flex: 1 }}
            />
          ) : (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator color="#1A1614" />
            </View>
          )}

          {loading && checkoutUrl && (
            <View className="absolute inset-0 items-center justify-center bg-white/70 pointer-events-none">
              <ActivityIndicator color="#1A1614" size="large" />
              <Text className="text-warm-500 text-sm mt-3 font-semibold">
                Chargement du paiement…
              </Text>
            </View>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  )
}
