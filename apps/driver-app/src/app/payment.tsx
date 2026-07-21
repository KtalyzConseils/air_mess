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
import { confirmTopUp } from '../api/wallet'

const INK = '#1A1614'
const YELLOW = '#FFCC00'

/**
 * URLs qui signifient « le parcours de paiement est terminé, reviens à l'app ».
 * On les intercepte AVANT chargement : la page n'a donc pas besoin d'exister.
 * - `payments/return-to-app` : le callback qu'on fournit nous-mêmes à Fedapay.
 * - `billing/return`         : le callback par défaut de l'API (site web) — filet
 *                              de sécurité si le paiement part sans notre callback.
 */
const RETURN_PATTERNS = [/\/payments\/return-to-app/i, /\/billing\/return/i]

function isReturnUrl(url: string): boolean {
  return RETURN_PATTERNS.some((re) => re.test(url))
}

/** `https://checkout.fedapay.com/...` → `checkout.fedapay.com` */
function hostOf(url: string): string {
  const m = /^[a-z]+:\/\/([^/?#]+)/i.exec(url)
  return m ? m[1] : ''
}

/**
 * Écran de paiement intégré.
 *
 * Pourquoi une WebView plutôt qu'un onglet Chrome (Custom Tab) : Android interdit de
 * refermer un Custom Tab par programme. Le livreur restait donc bloqué sur la page web
 * après avoir payé. Ici l'app pilote la navigation : dès que l'URL de retour apparaît,
 * on ferme et on ramène sur le wallet.
 *
 * Le solde est crédité par le WEBHOOK Fedapay côté serveur, jamais par ce retour :
 * fermer trop tôt ne fait donc pas perdre d'argent, le montant arrive de lui-même.
 */
export default function PaymentScreen() {
  const { url, amount, payment_id: paymentId } = useLocalSearchParams<{
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
  // Le voile de chargement ne doit couvrir QUE la toute première ouverture. Le parcours
  // Fedapay enchaîne les redirections (checkout → process → opérateur) : re-couvrir à
  // chaque étape donnait un spinner qui semblait tourner à l'infini par-dessus une page
  // déjà affichée.
  const firstPaintRef = useRef(false)
  // Garde-fou : la détection de retour peut se déclencher deux fois (interception +
  // changement d'état de navigation). On ne veut fermer qu'une seule fois.
  const doneRef = useRef(false)

  /** Retire le voile — définitivement. */
  const revealPage = useCallback(() => {
    firstPaintRef.current = true
    setLoading(false)
  }, [])

  // Filet de sécurité : quoi qu'il arrive, le voile ne survit pas à 8 s. Sans ça, un
  // seul événement manquant (`onLoadEnd` ne revient pas sur certaines redirections
  // Fedapay) laisse le livreur devant un spinner éternel.
  useFocusEffect(
    useCallback(() => {
      const t = setTimeout(revealPage, 8000)
      return () => clearTimeout(t)
    }, [revealPage]),
  )

  /** Ferme l'écran, fait confirmer le paiement au serveur, puis rafraîchit le wallet. */
  const finish = useCallback(() => {
    if (doneRef.current) return
    doneRef.current = true

    const refresh = () => queryClient.invalidateQueries({ queryKey: ['wallet'] })
    const id = Number(paymentId)

    if (Number.isFinite(id) && id > 0) {
      // On n'attend pas passivement le webhook : on demande au serveur d'aller vérifier
      // le statut réel auprès de Fedapay. Plusieurs tentatives espacées, car une
      // transaction mobile money peut rester quelques secondes en `pending` après la
      // validation par le livreur.
      void (async () => {
        for (const delay of [0, 3000, 8000]) {
          if (delay) await new Promise((r) => setTimeout(r, delay))
          try {
            const res = await confirmTopUp(id)
            refresh()
            if (res.status === 'paid') return
          } catch {
            refresh() // serveur injoignable : le webhook reste le filet
          }
        }
      })()
    } else {
      refresh()
      setTimeout(refresh, 3000)
      setTimeout(refresh, 9000)
    }

    router.replace('/(tabs)/wallet')
  }, [paymentId, queryClient, router])

  /** Abandon volontaire — on confirme, un paiement peut être en cours. */
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

  // Bouton retour Android : navigue dans la WebView si possible, sinon propose de quitter.
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

  /**
   * Filtre de navigation. Deux rôles :
   *  1. intercepter l'URL de retour (la page ne se charge jamais) ;
   *  2. sortir de la WebView pour les schémas non-http (`tel:`, `mtn://`, apps
   *     mobile money…) — une WebView ne sait pas les ouvrir, il faut passer par le
   *     système, sinon le parcours se bloque sur une page blanche.
   */
  function handleRequest(req: { url: string }): boolean {
    const target = req.url
    if (isReturnUrl(target)) {
      finish()
      return false
    }
    if (!/^https?:/i.test(target) && !/^about:blank$/i.test(target)) {
      Linking.openURL(target).catch(() => {
        Alert.alert(
          'Application manquante',
          "Le paiement veut ouvrir une autre application qui n'est pas installée sur ce téléphone.",
        )
      })
      return false
    }
    return true
  }

  /**
   * Second filet : sur Android, `onShouldStartLoadWithRequest` ne se déclenche pas pour
   * certaines redirections (notamment celles côté serveur). On revérifie donc ici.
   */
  function handleNavState(nav: WebViewNavigation) {
    canGoBackRef.current = nav.canGoBack
    setHost(hostOf(nav.url))
    if (isReturnUrl(nav.url)) finish()
    else if (!nav.loading) revealPage()
  }

  if (!url) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-cream px-8">
        <Text className="text-center font-jk-semibold text-ink">
          Lien de paiement introuvable.
        </Text>
        <TouchableOpacity className="mt-4" onPress={() => router.replace('/(tabs)/wallet')}>
          <Text className="font-jk-bold text-warm-600">Retour au wallet</Text>
        </TouchableOpacity>
      </SafeAreaView>
    )
  }

  return (
    <View className="flex-1 bg-ink">
      <StatusBar style="light" />
      <SafeAreaView edges={['top']} className="bg-ink">
        <View className="flex-row items-center gap-3 px-4 pb-3 pt-1">
          <TouchableOpacity
            onPress={confirmQuit}
            hitSlop={12}
            className="h-9 w-9 items-center justify-center rounded-full bg-white/10"
          >
            <Ionicons name="close" size={20} color="#FFFFFF" />
          </TouchableOpacity>

          <View className="flex-1">
            <Text className="font-jk-bold text-[15px] text-white">
              Paiement sécurisé
            </Text>
            {/* On affiche le vrai domaine : une WebView n'a pas de barre d'adresse,
                le livreur doit pouvoir vérifier chez qui il paie. */}
            <View className="mt-0.5 flex-row items-center gap-1">
              <Ionicons name="lock-closed" size={10} color={YELLOW} />
              <Text className="font-jk-medium text-[11px] text-warm-400" numberOfLines={1}>
                {host}
              </Text>
            </View>
          </View>

          {amount ? (
            <View className="rounded-full bg-airmess-yellow px-3 py-1.5">
              <Text className="font-jk-extrabold text-[13px] text-ink">
                {Number(amount).toLocaleString('fr-FR')} F
              </Text>
            </View>
          ) : null}
        </View>
      </SafeAreaView>

      <View className="flex-1 bg-white">
        <WebView
          ref={webRef}
          source={{ uri: url }}
          onShouldStartLoadWithRequest={handleRequest}
          onNavigationStateChange={handleNavState}
          // On ne re-couvre JAMAIS après le premier affichage : les étapes suivantes du
          // parcours se chargent sous les yeux du livreur, comme dans un navigateur.
          onLoadStart={() => {
            if (!firstPaintRef.current) setLoading(true)
          }}
          onLoadEnd={revealPage}
          // `onLoadEnd` peut ne jamais arriver sur une redirection : la progression, elle,
          // remonte toujours. Dès que la page est majoritairement peinte, on découvre.
          onLoadProgress={({ nativeEvent }) => {
            if (nativeEvent.progress > 0.6) revealPage()
          }}
          onError={() => {
            revealPage()
            Alert.alert(
              'Page inaccessible',
              'La page de paiement n\'a pas pu se charger. Vérifie ta connexion et réessaie.',
            )
          }}
          // Le parcours mobile money ouvre parfois une fenêtre pop-up : sans ceci elle
          // se perd et l'écran reste blanc.
          setSupportMultipleWindows={false}
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState={false}
        />

        {loading && (
          <View className="absolute inset-0 items-center justify-center bg-white">
            <ActivityIndicator size="large" color={INK} />
            <Text className="mt-3 font-jk-medium text-[13px] text-warm-500">
              Ouverture du paiement…
            </Text>
          </View>
        )}
      </View>
    </View>
  )
}
