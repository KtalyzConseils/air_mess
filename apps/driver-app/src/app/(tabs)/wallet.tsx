import { useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Linking,
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
  { label: string; icon: keyof typeof Ionicons.glyphMap; positive: boolean }
> = {
  deposit:      { label: 'Dépôt',          icon: 'arrow-down-outline', positive: true },
  earning:      { label: 'Gain de course', icon: 'trophy-outline',     positive: true },
  withdraw:     { label: 'Retrait',        icon: 'arrow-up-outline',   positive: false },
  pickup_debit: { label: 'Encaissement',   icon: 'cube-outline',       positive: false },
  refund:       { label: 'Remboursement',  icon: 'refresh-outline',    positive: true },
}

function fcfa(n: number): string {
  return n.toLocaleString('fr-FR') + ' FCFA'
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function WalletScreen() {
  const queryClient = useQueryClient()
  const [topUpVisible, setTopUpVisible] = useState(false)
  const [withdrawVisible, setWithdrawVisible] = useState(false)

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['wallet'],
    queryFn: fetchWallet,
    refetchInterval: 15_000,
  })

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

  const canWithdraw = data.balance >= data.min_withdraw_fcfa && !data.pending_withdraw_request

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
        <Text className="text-3xl font-extrabold text-ink">Ma caution</Text>
        <Text className="text-sm text-warm-500 mt-1">
          Garantit tes courses avec encaissement client.
        </Text>

        {/* Hero balance — dark card + stripe jaune signature */}
        <View className="bg-airmess-dark mt-5 rounded-3xl overflow-hidden flex-row">
          <View className="w-1.5 bg-airmess-yellow" />
          <View className="flex-1 p-5">
            <View className="flex-row items-center">
              <Text className="text-[10px] uppercase text-airmess-yellow tracking-widest font-extrabold">
                Caution disponible
              </Text>
            </View>
            <Text className="text-white text-4xl font-extrabold mt-2">{fcfa(data.balance)}</Text>
            <View className="flex-row mt-5 pt-4 border-t border-white/10">
              <View className="flex-1">
                <Text className="text-warm-400 text-[10px] uppercase tracking-widest font-bold">
                  Cumul déposé
                </Text>
                <Text className="text-white font-bold mt-1">{fcfa(data.total_deposited)}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-warm-400 text-[10px] uppercase tracking-widest font-bold">
                  Cumul retiré
                </Text>
                <Text className="text-white font-bold mt-1">{fcfa(data.total_withdrawn)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Actions Recharger / Retirer */}
        <View className="flex-row gap-3 mt-4">
          <View className="flex-1">
            <Button
              variant="primary"
              size="lg"
              onPress={() => setTopUpVisible(true)}
              leftIcon={<Ionicons name="add-circle-outline" size={18} color="#1A1614" />}
            >
              Recharger
            </Button>
          </View>
          <View className="flex-1">
            <Button
              variant="outline"
              size="lg"
              onPress={() => setWithdrawVisible(true)}
              disabled={!canWithdraw}
              leftIcon={<Ionicons name="arrow-up-outline" size={18} color="#1A1614" />}
            >
              Retirer
            </Button>
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
                <Text className="text-[10px] uppercase text-warm-600 tracking-widest font-extrabold">
                  Retrait en attente
                </Text>
                <Text className="text-lg font-extrabold text-ink mt-0.5">
                  {fcfa(data.pending_withdraw_request.amount_fcfa)}
                </Text>
                <Text className="text-xs text-warm-600 mt-0.5">
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
                <Text className="text-xs font-bold text-ink">Annuler</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Info seuil min */}
        {data.balance < data.min_withdraw_fcfa && !data.pending_withdraw_request && (
          <View className="mt-3 flex-row items-center bg-info-bg border border-info/30 rounded-xl px-3 py-2.5">
            <Ionicons name="information-circle" size={16} color="#0284C7" />
            <Text className="text-xs text-info ml-2 flex-1 font-semibold">
              Retrait possible dès {fcfa(data.min_withdraw_fcfa)} de caution.
            </Text>
          </View>
        )}

        {/* Historique */}
        <View className="mt-7 mb-2 flex-row items-center">
          <Ionicons name="time-outline" size={14} color="#8A7E68" />
          <Text className="text-[10px] uppercase text-warm-500 tracking-widest font-extrabold ml-1.5">
            Dernières opérations
          </Text>
        </View>

        {data.recent_transactions.length === 0 ? (
          <View className="bg-off-white border border-warm-200 rounded-2xl p-8 items-center">
            <Ionicons name="receipt-outline" size={32} color="#B8AF9F" />
            <Text className="text-warm-500 mt-2 text-sm">Aucune opération pour l'instant.</Text>
          </View>
        ) : (
          <View className="bg-off-white border border-warm-200 rounded-2xl overflow-hidden">
            {data.recent_transactions.map((t: WalletTransactionItem, idx: number) => (
              <TxRow key={t.id} tx={t} isFirst={idx === 0} />
            ))}
          </View>
        )}
      </ScrollView>

      <TopUpModal
        visible={topUpVisible}
        onClose={() => setTopUpVisible(false)}
        minAmount={data.min_withdraw_fcfa}
      />

      <WithdrawModal
        visible={withdrawVisible}
        onClose={() => setWithdrawVisible(false)}
        minAmount={data.min_withdraw_fcfa}
        maxAmount={data.balance}
      />
    </SafeAreaView>
  )
}

function TxRow({ tx, isFirst }: { tx: WalletTransactionItem; isFirst: boolean }) {
  const meta = TX_META[tx.type] ?? {
    label: tx.type,
    icon: 'help-circle-outline' as const,
    positive: false,
  }
  const isPositive = tx.amount_fcfa > 0
  return (
    <View
      className={[
        'flex-row items-center px-4 py-3.5',
        isFirst ? '' : 'border-t border-warm-200',
      ].join(' ')}
    >
      <View
        className={[
          'w-10 h-10 rounded-full items-center justify-center mr-3',
          meta.positive ? 'bg-success-bg' : 'bg-warm-100',
        ].join(' ')}
      >
        <Ionicons name={meta.icon} size={18} color={meta.positive ? '#16A34A' : '#6B6250'} />
      </View>
      <View className="flex-1">
        <Text className="font-bold text-ink">{meta.label}</Text>
        <Text className="text-xs text-warm-500 mt-0.5">{formatDate(tx.created_at)}</Text>
      </View>
      <View className="items-end">
        <Text
          className={[
            'font-extrabold',
            isPositive ? 'text-success' : 'text-airmess-red',
          ].join(' ')}
        >
          {isPositive ? '+' : ''}
          {fcfa(tx.amount_fcfa)}
        </Text>
        <Text className="text-[10px] text-warm-400 mt-0.5">Solde {fcfa(tx.balance_after)}</Text>
      </View>
    </View>
  )
}

// ============== Modal top-up (BottomSheet) ==============

function TopUpModal({
  visible,
  onClose,
  minAmount,
}: {
  visible: boolean
  onClose: () => void
  minAmount: number
}) {
  const [amount, setAmount] = useState('')
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (n: number) => requestTopUp(n),
    onSuccess: async (data) => {
      handleClose()
      const supported = await Linking.canOpenURL(data.checkout_url)
      if (supported) {
        Linking.openURL(data.checkout_url)
      } else {
        Alert.alert('Erreur', "Impossible d'ouvrir la page de paiement.")
      }
      queryClient.invalidateQueries({ queryKey: ['wallet'] })
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
}: {
  visible: boolean
  onClose: () => void
  minAmount: number
  maxAmount: number
}) {
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<'momo' | 'bank'>('momo')
  const [account, setAccount] = useState('')
  const queryClient = useQueryClient()

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
      Alert.alert('Demande envoyée', 'Un administrateur va la traiter. Tu seras notifié.')
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
      title="Demander un retrait"
      subtitle="Un admin validera dans les heures qui suivent."
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
              Envoyer la demande
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
