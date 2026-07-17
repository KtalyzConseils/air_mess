import { useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { AxiosError } from 'axios'
import {
  fetchWallet,
  requestTopUp,
  requestWithdraw,
  cancelWithdrawRequest,
  type WalletTransactionItem,
  type WalletTransactionType,
} from '../../api/wallet'
import BottomSheet from '../../components/ui/BottomSheet'
import Button from '../../components/ui/Button'
import FedapayCheckoutSheet, {
  type FedapayCheckoutOutcome,
} from '../../components/FedapayCheckoutSheet'

/**
 * Wallet driver — caution + gains + retraits.
 *
 * Hiérarchie visuelle :
 *   1. Header "Ma caution" + baseline
 *   2. Hero balance (dark card + yellow stripe signature)
 *   3. Row 2 boutons Recharger / Retirer
 *   4. Bandeau retrait en attente si présent (warning)
 *   5. Info seuil min si en dessous
 *   6. Liste dernières opérations
 *
 * Modals passent tous les deux par BottomSheet — cohérence multi-app.
 */

const TX_META: Record<
  WalletTransactionType,
  { icon: keyof typeof Ionicons.glyphMap }
> = {
  deposit:           { icon: 'add-outline' },
  earning:           { icon: 'cube-outline' },
  withdraw:          { icon: 'arrow-down-outline' },
  pickup_debit:      { icon: 'shield-outline' },
  refund:            { icon: 'refresh-outline' },
  adjustment_credit: { icon: 'add-circle-outline' },
  adjustment_debit:  { icon: 'remove-circle-outline' },
}

/** Titre riche d'une opération, façon mockup (type + course quand pertinent). */
function txTitle(tx: WalletTransactionItem): string {
  switch (tx.type) {
    case 'deposit':
      return 'Recharge caution'
    case 'earning':
      return tx.course_id ? `Course #${tx.course_id} — Livrée` : 'Gain de course'
    case 'withdraw':
      return 'Retrait'
    case 'pickup_debit':
      return tx.course_id ? `Caution bloquée · course #${tx.course_id}` : 'Caution bloquée'
    case 'refund':
      return 'Remboursement'
    case 'adjustment_credit':
      return 'Ajustement crédit'
    case 'adjustment_debit':
      return 'Ajustement débit'
    default:
      return 'Opération'
  }
}

function fcfa(n: number): string {
  return n.toLocaleString('fr-FR') + ' FCFA'
}

/** 120 000 → "120k" ; 900 → "900". */
function formatK(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k'
  return String(n)
}

/** Montant signé sans suffixe FCFA : +25 000 / -2 000. */
function signedAmount(n: number): string {
  const sign = n > 0 ? '+' : n < 0 ? '-' : ''
  return sign + Math.abs(n).toLocaleString('fr-FR')
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  const date = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  return `${date}, ${time}`
}

export default function WalletScreen() {
  const queryClient = useQueryClient()
  const [topUpVisible, setTopUpVisible] = useState(false)
  const [withdrawVisible, setWithdrawVisible] = useState(false)
  // URL Fedapay à afficher dans la WebView plein écran. Non nulle → la sheet est ouverte.
  // Portée par le parent car TopUpModal se ferme AVANT d'ouvrir le checkout, et il faut
  // survivre à cette transition.
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null)

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['wallet'],
    queryFn: fetchWallet,
    refetchInterval: 15_000,
  })

  function handleCheckoutDone(outcome: FedapayCheckoutOutcome) {
    setCheckoutUrl(null)
    // Refetch immédiat + un rappel à +4s pour laisser le webhook Fedapay atterrir
    // (typiquement 1-3s en sandbox, jusqu'à 30s en prod). L'utilisateur voit son solde
    // se mettre à jour de lui-même sans avoir à pull-to-refresh.
    queryClient.invalidateQueries({ queryKey: ['wallet'] })
    setTimeout(() => queryClient.invalidateQueries({ queryKey: ['wallet'] }), 4_000)

    if (outcome === 'approved') {
      Alert.alert('Paiement reçu', 'Ton solde va être mis à jour dans quelques secondes.')
    } else if (outcome === 'declined') {
      Alert.alert('Paiement refusé', "Fedapay a refusé la transaction. Essaie avec un autre moyen.")
    } else if (outcome === 'canceled') {
      Alert.alert('Paiement annulé', 'Aucun débit effectué.')
    }
    // outcome === 'closed' → silencieux : l'user a peut-être fermé alors que le paiement passe
    // en tâche de fond ; le refetch suffit à afficher la vérité côté serveur.
  }

  const cancelMutation = useMutation({
    mutationFn: cancelWithdrawRequest,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wallet'] }),
    onError: (err) => {
      const msg =
        err instanceof AxiosError
          ? (err.response?.data as { message?: string })?.message ?? 'Erreur'
          : 'Erreur'
      Alert.alert('Annulation impossible', msg)
    },
  })

  function handleCancelPending(id: number) {
    Alert.alert('Annuler la demande ?', 'Tu pourras en refaire une plus tard.', [
      { text: 'Non', style: 'cancel' },
      { text: 'Oui, annuler', style: 'destructive', onPress: () => cancelMutation.mutate(id) },
    ])
  }

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-cream items-center justify-center">
        <ActivityIndicator color="#1A1614" />
      </SafeAreaView>
    )
  }
  if (!data) {
    return (
      <SafeAreaView className="flex-1 bg-cream items-center justify-center p-6">
        <Ionicons name="cloud-offline-outline" size={40} color="#8A7E68" />
        <Text className="text-warm-500 mt-3 text-center">Erreur de chargement du wallet.</Text>
      </SafeAreaView>
    )
  }

  // Cooldown : en mode instant, si next_withdraw_allowed_at est dans le futur,
  // on désactive le bouton et on affiche un message d'attente clair.
  const cooldownActive =
    data.payout_mode === 'instant' &&
    data.next_withdraw_allowed_at !== null &&
    new Date(data.next_withdraw_allowed_at).getTime() > Date.now()

  const canWithdraw =
    data.balance >= data.min_withdraw_fcfa &&
    !data.pending_withdraw_request &&
    !cooldownActive

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingTop: 12, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#1A1614" />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="flex-row items-center mb-4">
          <Ionicons name="wallet" size={20} color="#1A1614" />
          <Text className="text-2xl font-jk-extrabold text-ink ml-2">Wallet & Caution</Text>
        </View>

        {/* Carte caution (hero sombre) — solde + cumuls + actions */}
        <View className="bg-airmess-dark rounded-3xl p-5">
          <View className="flex-row items-center">
            <Ionicons name="shield-checkmark" size={14} color="#FFCC00" />
            <Text className="text-airmess-yellow text-[11px] font-jk-extrabold uppercase tracking-[2px] ml-1.5">
              Caution disponible
            </Text>
          </View>
          <Text className="text-white text-[40px] leading-[46px] font-jk-extrabold mt-2">
            {data.balance.toLocaleString('fr-FR')}
          </Text>
          <Text className="text-warm-400 text-xs font-jk-bold">FCFA</Text>

          {/* Tuiles cumul */}
          <View className="flex-row gap-2 mt-4">
            <CautionTile
              icon="trending-up"
              iconColor="#16A34A"
              label="Cumul déposé"
              value={formatK(data.total_deposited)}
            />
            <CautionTile
              icon="trending-down"
              iconColor="#D40511"
              label="Cumul retiré"
              value={formatK(data.total_withdrawn)}
            />
          </View>

          {/* Actions */}
          <View className="flex-row gap-2 mt-4">
            <Pressable
              onPress={() => setTopUpVisible(true)}
              className="flex-1 h-12 rounded-2xl bg-airmess-yellow items-center justify-center flex-row"
              style={({ pressed }) => (pressed ? { opacity: 0.9 } : undefined)}
            >
              <Ionicons name="add" size={18} color="#1A1614" />
              <Text className="text-ink font-jk-extrabold ml-1.5">Recharger</Text>
            </Pressable>
            <Pressable
              onPress={() => setWithdrawVisible(true)}
              disabled={!canWithdraw}
              className="flex-1 h-12 rounded-2xl bg-white/10 items-center justify-center flex-row"
              style={({ pressed }) => [
                !canWithdraw ? { opacity: 0.4 } : undefined,
                pressed ? { opacity: 0.8 } : undefined,
              ]}
            >
              <Ionicons name="arrow-down-outline" size={17} color="#FDFCF9" />
              <Text className="text-off-white font-jk-bold ml-1.5">Retirer</Text>
            </Pressable>
          </View>
        </View>

        {/* Retrait en attente */}
        {data.pending_withdraw_request && (
          <View className="mt-4 bg-warning-bg border-2 border-warning/40 rounded-2xl p-4">
            <View className="flex-row items-start">
              <View className="w-9 h-9 rounded-full bg-warning items-center justify-center mr-3">
                <Ionicons name="hourglass-outline" size={16} color="#ffffff" />
              </View>
              <View className="flex-1">
                <Text className="text-[10px] uppercase text-warm-600 tracking-widest font-jk-extrabold">
                  Retrait en attente
                </Text>
                <Text className="text-lg font-jk-extrabold text-ink mt-0.5">
                  {fcfa(data.pending_withdraw_request.amount_fcfa)}
                </Text>
                <Text className="text-xs text-warm-600 mt-0.5 font-jk-medium">
                  vers{' '}
                  {data.pending_withdraw_request.target_method === 'momo' ? 'MoMo' : 'Banque'}
                  {' · '}
                  {formatDate(data.pending_withdraw_request.created_at)}
                </Text>
              </View>
              <Pressable
                onPress={() => handleCancelPending(data.pending_withdraw_request!.id)}
                className="px-3 py-2 bg-off-white border border-warm-300 rounded-xl"
                hitSlop={6}
              >
                <Text className="text-xs font-jk-bold text-ink">Annuler</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Info seuil min */}
        {data.balance < data.min_withdraw_fcfa && !data.pending_withdraw_request && (
          <View className="mt-3 flex-row items-center bg-info-bg border border-info/30 rounded-xl px-3 py-2.5">
            <Ionicons name="information-circle" size={16} color="#0284C7" />
            <Text className="text-xs text-info ml-2 flex-1 font-jk-semibold">
              Retrait possible dès {fcfa(data.min_withdraw_fcfa)} de caution.
            </Text>
          </View>
        )}

        {/* Cooldown mode instant : prochain retrait autorisé plus tard */}
        {cooldownActive && data.next_withdraw_allowed_at && (
          <View className="mt-3 flex-row items-center bg-warning-bg border border-warning/30 rounded-xl px-3 py-2.5">
            <Ionicons name="time-outline" size={16} color="#B45309" />
            <Text className="text-xs text-warm-700 ml-2 flex-1 font-jk-semibold">
              Prochain retrait autorisé le{' '}
              {new Date(data.next_withdraw_allowed_at).toLocaleString('fr-FR', {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              })}
              .
            </Text>
          </View>
        )}

        {/* Historique */}
        <Text className="text-base font-jk-extrabold text-ink mt-6 mb-3">
          Historique des opérations
        </Text>

        {data.recent_transactions.length === 0 ? (
          <View className="bg-off-white border border-warm-200 rounded-2xl p-8 items-center">
            <Ionicons name="receipt-outline" size={32} color="#B8AF9F" />
            <Text className="text-warm-500 mt-2 text-sm font-jk">
              Aucune opération pour l'instant.
            </Text>
          </View>
        ) : (
          data.recent_transactions.map((t: WalletTransactionItem) => (
            <TxRow key={t.id} tx={t} />
          ))
        )}
      </ScrollView>

      <TopUpModal
        visible={topUpVisible}
        onClose={() => setTopUpVisible(false)}
        minAmount={data.min_withdraw_fcfa}
        onCheckoutReady={(url) => setCheckoutUrl(url)}
      />

      <FedapayCheckoutSheet
        visible={checkoutUrl !== null}
        checkoutUrl={checkoutUrl}
        onDone={handleCheckoutDone}
      />

      <WithdrawModal
        visible={withdrawVisible}
        onClose={() => setWithdrawVisible(false)}
        minAmount={data.min_withdraw_fcfa}
        maxAmount={data.balance}
        payoutMode={data.payout_mode}
      />
    </SafeAreaView>
  )
}

function CautionTile({
  icon,
  iconColor,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap
  iconColor: string
  label: string
  value: string
}) {
  return (
    <View className="flex-1 bg-white/5 rounded-2xl px-3 py-3">
      <View className="flex-row items-center">
        <Ionicons name={icon} size={12} color={iconColor} />
        <Text className="text-warm-400 text-[9px] font-jk-bold uppercase tracking-wide ml-1">
          {label}
        </Text>
      </View>
      <Text className="text-white text-lg font-jk-extrabold mt-1">{value}</Text>
      <Text className="text-warm-500 text-[10px] font-jk-medium">FCFA</Text>
    </View>
  )
}

function TxRow({ tx }: { tx: WalletTransactionItem }) {
  const icon = TX_META[tx.type]?.icon ?? 'help-circle-outline'
  const isPositive = tx.amount_fcfa > 0
  return (
    <View className="bg-off-white border border-warm-200 rounded-2xl px-4 py-3 mb-2 flex-row items-center">
      <View
        className="w-10 h-10 rounded-full items-center justify-center mr-3"
        style={{ backgroundColor: isPositive ? '#DCFCE7' : '#FEE2E2' }}
      >
        <Ionicons name={icon} size={18} color={isPositive ? '#16A34A' : '#D40511'} />
      </View>
      <View className="flex-1 pr-2">
        <Text className="text-ink font-jk-bold text-[13px]" numberOfLines={1}>
          {txTitle(tx)}
        </Text>
        <Text className="text-warm-500 text-xs font-jk-medium mt-0.5">
          {formatDate(tx.created_at)}
        </Text>
      </View>
      <Text
        className="font-jk-extrabold text-[15px]"
        style={{ color: isPositive ? '#16A34A' : '#D40511' }}
      >
        {signedAmount(tx.amount_fcfa)}
      </Text>
    </View>
  )
}

// ============== Modal top-up (BottomSheet) ==============

function TopUpModal({
  visible,
  onClose,
  minAmount,
  onCheckoutReady,
}: {
  visible: boolean
  onClose: () => void
  minAmount: number
  onCheckoutReady: (checkoutUrl: string) => void
}) {
  const [amount, setAmount] = useState('')

  const mutation = useMutation({
    mutationFn: (n: number) => requestTopUp(n),
    onSuccess: (data) => {
      // On ferme d'abord notre bottom-sheet, puis le parent ouvre la WebView Fedapay
      // plein écran. L'utilisateur reste dans l'app tout du long.
      handleClose()
      onCheckoutReady(data.checkout_url)
    },
    onError: (err) => {
      const msg =
        err instanceof AxiosError
          ? (err.response?.data as { message?: string })?.message ??
            'Erreur lors de la création du paiement.'
          : 'Erreur inattendue.'
      Alert.alert('Recharge impossible', msg)
    },
  })

  function handleClose() {
    setAmount('')
    onClose()
  }

  function handleSubmit() {
    const n = parseInt(amount, 10)
    if (Number.isNaN(n) || n < minAmount) {
      Alert.alert('Montant invalide', `Le minimum est ${fcfa(minAmount)}.`)
      return
    }
    mutation.mutate(n)
  }

  const suggestions = [5000, 10000, 25000, 50000]

  return (
    <BottomSheet
      visible={visible}
      onClose={handleClose}
      title="Recharger la caution"
      subtitle="Paiement MoMo / Moov via Fedapay."
      footer={
        <View className="flex-row gap-2">
          <View className="flex-1">
            <Button variant="outline" size="md" onPress={handleClose} disabled={mutation.isPending}>
              Annuler
            </Button>
          </View>
          <View className="flex-[2]">
            <Button
              variant="primary"
              size="md"
              onPress={handleSubmit}
              loading={mutation.isPending}
              rightIcon={<Ionicons name="arrow-forward" size={16} color="#1A1614" />}
            >
              Continuer
            </Button>
          </View>
        </View>
      }
    >
      <Text className="text-[10px] uppercase text-warm-500 tracking-widest font-extrabold mb-1.5">
        Montant (FCFA)
      </Text>
      <TextInput
        value={amount}
        onChangeText={setAmount}
        keyboardType="number-pad"
        placeholder={`Min ${minAmount.toLocaleString('fr-FR')}`}
        placeholderTextColor="#B8AF9F"
        className="border-2 border-warm-200 rounded-2xl px-4 h-14 text-2xl font-extrabold text-ink bg-off-white"
      />

      <Text className="text-[10px] uppercase text-warm-500 tracking-widest font-extrabold mt-4 mb-2">
        Suggestions
      </Text>
      <View className="flex-row flex-wrap gap-2 mb-2">
        {suggestions.map((s) => (
          <Pressable
            key={s}
            onPress={() => setAmount(String(s))}
            className="px-4 py-2 rounded-full bg-off-white border border-warm-300"
          >
            <Text className="text-sm font-bold text-ink">{s.toLocaleString('fr-FR')}</Text>
          </Pressable>
        ))}
      </View>
    </BottomSheet>
  )
}

// ============== Modal demande retrait (BottomSheet) ==============

function WithdrawModal({
  visible,
  onClose,
  minAmount,
  maxAmount,
  payoutMode,
}: {
  visible: boolean
  onClose: () => void
  minAmount: number
  maxAmount: number
  payoutMode: 'admin_approval' | 'instant'
}) {
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<'momo' | 'bank'>('momo')
  const [account, setAccount] = useState('')
  const queryClient = useQueryClient()

  const isInstant = payoutMode === 'instant'

  const mutation = useMutation({
    mutationFn: () =>
      requestWithdraw({
        amount: parseInt(amount, 10),
        target_method: method,
        target_account: account.trim(),
      }),
    onSuccess: () => {
      handleClose()
      queryClient.invalidateQueries({ queryKey: ['wallet'] })
      Alert.alert(
        isInstant ? 'Retrait en cours' : 'Demande envoyée',
        isInstant
          ? 'Le virement a été lancé. Tu seras notifié dès sa réception sur ton MoMo.'
          : 'Un administrateur va la traiter. Tu seras notifié.',
      )
    },
    onError: (err) => {
      const msg =
        err instanceof AxiosError
          ? (err.response?.data as { message?: string })?.message ?? 'Erreur'
          : 'Erreur inattendue.'
      Alert.alert('Demande impossible', msg)
    },
  })

  function handleClose() {
    setAmount('')
    setAccount('')
    onClose()
  }

  function handleSubmit() {
    const n = parseInt(amount, 10)
    if (Number.isNaN(n) || n < minAmount) {
      Alert.alert('Montant invalide', `Le minimum est ${fcfa(minAmount)}.`)
      return
    }
    if (n > maxAmount) {
      Alert.alert('Solde insuffisant', `Tu ne peux retirer que ${fcfa(maxAmount)} max.`)
      return
    }
    if (account.trim().length < 5) {
      Alert.alert('Compte invalide', 'Renseigne ton numéro MoMo ou IBAN.')
      return
    }
    mutation.mutate()
  }

  return (
    <BottomSheet
      visible={visible}
      onClose={handleClose}
      title={isInstant ? 'Retirer maintenant' : 'Demander un retrait'}
      subtitle={
        isInstant
          ? 'Virement automatique sur ton MoMo. Vérifie bien le numéro.'
          : 'Un admin validera dans les heures qui suivent.'
      }
      footer={
        <View className="flex-row gap-2">
          <View className="flex-1">
            <Button variant="outline" size="md" onPress={handleClose} disabled={mutation.isPending}>
              Annuler
            </Button>
          </View>
          <View className="flex-[2]">
            <Button
              variant="dark"
              size="md"
              onPress={handleSubmit}
              loading={mutation.isPending}
              rightIcon={<Ionicons name="paper-plane" size={14} color="#ffffff" />}
            >
              {isInstant ? 'Retirer maintenant' : 'Envoyer la demande'}
            </Button>
          </View>
        </View>
      }
    >
      <Text className="text-[10px] uppercase text-warm-500 tracking-widest font-extrabold mb-1.5">
        Montant (FCFA)
      </Text>
      <TextInput
        value={amount}
        onChangeText={setAmount}
        keyboardType="number-pad"
        placeholder={`${minAmount.toLocaleString('fr-FR')} — ${maxAmount.toLocaleString('fr-FR')}`}
        placeholderTextColor="#B8AF9F"
        className="border-2 border-warm-200 rounded-2xl px-4 h-14 text-2xl font-extrabold text-ink bg-off-white"
      />

      <Text className="text-[10px] uppercase text-warm-500 tracking-widest font-extrabold mt-4 mb-2">
        Méthode
      </Text>
      <View className="flex-row gap-2">
        <MethodChip
          active={method === 'momo'}
          onPress={() => setMethod('momo')}
          icon="phone-portrait-outline"
          label="MoMo"
        />
        <MethodChip
          active={method === 'bank'}
          onPress={() => setMethod('bank')}
          icon="business-outline"
          label="Banque"
        />
      </View>

      <Text className="text-[10px] uppercase text-warm-500 tracking-widest font-extrabold mt-4 mb-1.5">
        {method === 'momo' ? 'Numéro MoMo' : 'IBAN / numéro'}
      </Text>
      <TextInput
        value={account}
        onChangeText={setAccount}
        placeholder={method === 'momo' ? '+229 ...' : 'BJ06...'}
        placeholderTextColor="#B8AF9F"
        autoCapitalize="none"
        className="border-2 border-warm-200 rounded-2xl px-4 h-14 text-base text-ink bg-off-white mb-2"
      />
    </BottomSheet>
  )
}

function MethodChip({
  active,
  onPress,
  icon,
  label,
}: {
  active: boolean
  onPress: () => void
  icon: keyof typeof Ionicons.glyphMap
  label: string
}) {
  return (
    <Pressable
      onPress={onPress}
      className={[
        'flex-1 flex-row items-center justify-center py-3.5 rounded-2xl border-2',
        active ? 'bg-airmess-yellow/15 border-airmess-yellow' : 'bg-off-white border-warm-200',
      ].join(' ')}
      style={({ pressed }) => (pressed ? { opacity: 0.85 } : undefined)}
    >
      <Ionicons name={icon} size={16} color="#1A1614" />
      <Text
        className={[
          'ml-2 text-base',
          active ? 'font-extrabold text-ink' : 'font-semibold text-ink',
        ].join(' ')}
      >
        {label}
      </Text>
    </Pressable>
  )
}
