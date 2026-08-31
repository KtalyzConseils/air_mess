import { useState } from 'react'
import { ActivityIndicator, Alert, Linking, Modal, Pressable, Text, TextInput, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import Card from '../../components/ui/Card'
import Screen from '../../components/ui/Screen'
import {
  cancelWithdraw,
  fetchWallet,
  requestTopUp,
  requestWithdraw,
  type WalletTransaction,
  type WalletState,
  type WithdrawMethod,
} from '../../api/wallet'

const TOP_UP_AMOUNTS = [5_000, 10_000, 25_000, 50_000]
const EMPTY_WALLET: WalletState = {
  balance: 0,
  pending_reserved: 0,
  available: 0,
  total_deposited: 0,
  total_spent: 0,
  min_recommended_fcfa: 5_000,
  min_withdraw_fcfa: 1_000,
  is_low: false,
  recent_transactions: [],
  pending_withdraw_request: null,
  withdraw_limits: {
    max_per_day_count: 0,
    max_per_week_count: 0,
    max_per_day_fcfa: 0,
    max_per_week_fcfa: 0,
    used: { count_24h: 0, count_7d: 0, amount_24h: 0, amount_7d: 0 },
  },
}

export default function WalletScreen() {
  const queryClient = useQueryClient()
  const [topUpOpen, setTopUpOpen] = useState(false)
  const [topUpAmount, setTopUpAmount] = useState('5000')
  const [withdrawOpen, setWithdrawOpen] = useState(false)
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [withdrawMethod, setWithdrawMethod] = useState<WithdrawMethod>('momo')
  const [withdrawAccount, setWithdrawAccount] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['me', 'wallet'],
    queryFn: () => fetchWallet().catch(() => EMPTY_WALLET),
    refetchInterval: 30_000,
  })

  const topUpMutation = useMutation({
    mutationFn: (amount: number) => requestTopUp(amount),
    onSuccess: async (result) => {
      setTopUpOpen(false)
      await queryClient.invalidateQueries({ queryKey: ['me', 'wallet'] })
      await Linking.openURL(result.checkout_url)
    },
    onError: (error) => {
      Alert.alert('Recharge impossible', getApiErrorMessage(error))
    },
  })

  const withdrawMutation = useMutation({
    mutationFn: () =>
      requestWithdraw({
        amount: Number.parseInt(withdrawAmount, 10),
        target_method: withdrawMethod,
        target_account: withdrawAccount.trim(),
      }),
    onSuccess: async (result) => {
      setWithdrawOpen(false)
      setWithdrawAmount('')
      setWithdrawAccount('')
      await queryClient.invalidateQueries({ queryKey: ['me', 'wallet'] })
      Alert.alert('Retrait envoye', result.message ?? 'Ton retrait est en cours de traitement.')
    },
    onError: () => {
      Alert.alert('Retrait impossible', 'Verifie les informations puis reessaie.')
    },
  })

  const cancelWithdrawMutation = useMutation({
    mutationFn: cancelWithdraw,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['me', 'wallet'] })
    },
    onError: () => {
      Alert.alert('Annulation impossible', 'Reessaie dans un instant.')
    },
  })

  function submitTopUp() {
    const amount = Number.parseInt(topUpAmount, 10)
    if (!amount || amount < 500) {
      Alert.alert('Montant invalide', 'Le montant minimum est 500 FCFA.')
      return
    }
    topUpMutation.mutate(amount)
  }

  function submitWithdraw() {
    if (!data) return
    const amount = Number.parseInt(withdrawAmount, 10)
    if (!amount || amount < data.min_withdraw_fcfa) {
      Alert.alert('Montant invalide', `Le montant minimum est ${formatMoney(data.min_withdraw_fcfa)}.`)
      return
    }
    if (amount > data.available) {
      Alert.alert('Solde insuffisant', `Solde disponible : ${formatMoney(data.available)}.`)
      return
    }
    if (!withdrawAccount.trim()) {
      Alert.alert('Compte requis', 'Renseigne le numero mobile money ou le compte bancaire.')
      return
    }
    withdrawMutation.mutate()
  }

  return (
    <Screen scroll py={18} className="px-5">
      <View className="mb-5 flex-row items-center justify-between">
        <View>
          <Text className="text-xs font-extrabold uppercase tracking-widest text-airmess-red">
            AirMess Pay
          </Text>
          <Text className="mt-1 text-3xl font-extrabold text-ink">Wallet</Text>
        </View>
        <View className="h-12 w-12 items-center justify-center rounded-full bg-off-white border border-warm-200">
          <Ionicons name="wallet-outline" size={23} color="#1A1614" />
        </View>
      </View>

      {isLoading ? (
        <Card className="items-center py-10">
          <ActivityIndicator color="#1A1614" />
        </Card>
      ) : (
        <>
          {data?.is_low ? (
            <Card variant="warning" className="mb-4 flex-row items-start">
              <Ionicons name="warning-outline" size={22} color="#F59E0B" />
              <View className="ml-3 flex-1">
                <Text className="font-extrabold text-ink">Solde faible</Text>
                <Text className="mt-1 text-sm leading-5 text-warm-600">
                  Recharge recommandee : {formatMoney(data.min_recommended_fcfa)}.
                </Text>
              </View>
            </Card>
          ) : null}

          <Card variant="dark" padding="lg" className="mb-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-xs font-extrabold uppercase tracking-widest text-warm-400">
                Solde disponible
              </Text>
              <Ionicons name="card-outline" size={22} color="#FFCC00" />
            </View>
            <Text className="mt-4 text-5xl font-extrabold text-white" numberOfLines={1}>
              {formatMoney(data?.available)}
            </Text>
            <Text className="mt-2 text-sm font-semibold text-warm-300">
              Solde total {formatMoney(data?.balance)} - Reserve {formatMoney(data?.pending_reserved)}
            </Text>

            <View className="mt-5 flex-row gap-3 border-t border-warm-600/40 pt-5">
              <Pressable
                onPress={() => setTopUpOpen(true)}
                className="h-14 flex-1 flex-row items-center justify-center rounded-2xl bg-airmess-yellow"
                accessibilityRole="button"
              >
                <Ionicons name="add-circle-outline" size={18} color="#1A1614" />
                <Text className="ml-2 text-base font-extrabold text-ink">Recharger</Text>
              </Pressable>
              <Pressable
                onPress={() => setWithdrawOpen(true)}
                disabled={(data?.available ?? 0) < (data?.min_withdraw_fcfa ?? 0) || !!data?.pending_withdraw_request}
                className={[
                  'h-14 flex-1 flex-row items-center justify-center rounded-2xl bg-off-white',
                  (data?.available ?? 0) < (data?.min_withdraw_fcfa ?? 0) || data?.pending_withdraw_request ? 'opacity-40' : '',
                ].join(' ')}
                accessibilityRole="button"
              >
                <Ionicons name="arrow-up-circle-outline" size={18} color="#1A1614" />
                <Text className="ml-2 text-base font-extrabold text-ink">Retirer</Text>
              </Pressable>
            </View>
          </Card>

          {data?.pending_withdraw_request ? (
            <PendingWithdrawCard
              amount={data.pending_withdraw_request.amount_fcfa}
              method={data.pending_withdraw_request.target_method}
              account={data.pending_withdraw_request.target_account}
              createdAt={data.pending_withdraw_request.created_at}
              cancelling={cancelWithdrawMutation.isPending}
              onCancel={() =>
                Alert.alert('Annuler le retrait ?', 'Cette demande de retrait sera annulee.', [
                  { text: 'Non', style: 'cancel' },
                  {
                    text: 'Annuler',
                    style: 'destructive',
                    onPress: () => cancelWithdrawMutation.mutate(data.pending_withdraw_request!.id),
                  },
                ])
              }
            />
          ) : null}

          <View className="mb-4 flex-row gap-3">
            <MiniBalance label="Depose" value={data?.total_deposited ?? 0} icon="arrow-down-circle" />
            <MiniBalance label="Depense" value={data?.total_spent ?? 0} icon="arrow-up-circle" />
          </View>

          <Text className="mb-3 text-xl font-extrabold text-ink">Transactions recentes</Text>
          {(data?.recent_transactions ?? []).length === 0 ? (
            <Card className="items-center py-8">
              <View className="mb-3 h-12 w-12 items-center justify-center rounded-full bg-warm-100">
                <Ionicons name="receipt-outline" size={22} color="#6B6250" />
              </View>
              <Text className="text-center text-base font-extrabold text-ink">Aucun mouvement</Text>
              <Text className="mt-1 text-center text-sm text-warm-600">
                Tes recharges et paiements de courses apparaitront ici.
              </Text>
            </Card>
          ) : (
            <Card padding="none">
              {(data?.recent_transactions ?? []).slice(0, 6).map((transaction, index, items) => (
                <View key={transaction.id}>
                  <TransactionRow transaction={transaction} />
                  {index < items.length - 1 ? <View className="ml-16 h-px bg-warm-200" /> : null}
                </View>
              ))}
            </Card>
          )}
        </>
      )}

      {data ? (
        <>
          <TopUpModal
            open={topUpOpen}
            amount={topUpAmount}
            loading={topUpMutation.isPending}
            onAmountChange={setTopUpAmount}
            onClose={() => setTopUpOpen(false)}
            onSubmit={submitTopUp}
          />
          <WithdrawModal
            open={withdrawOpen}
            amount={withdrawAmount}
            method={withdrawMethod}
            account={withdrawAccount}
            available={data.available}
            minWithdraw={data.min_withdraw_fcfa}
            loading={withdrawMutation.isPending}
            onAmountChange={setWithdrawAmount}
            onMethodChange={setWithdrawMethod}
            onAccountChange={setWithdrawAccount}
            onClose={() => setWithdrawOpen(false)}
            onSubmit={submitWithdraw}
          />
        </>
      ) : null}
    </Screen>
  )
}

function PendingWithdrawCard({
  amount,
  method,
  account,
  createdAt,
  cancelling,
  onCancel,
}: {
  amount: number
  method: WithdrawMethod
  account: string
  createdAt: string
  cancelling: boolean
  onCancel: () => void
}) {
  return (
    <Card variant="default" className="mb-4 bg-info-bg border-info/30">
      <View className="flex-row items-start">
        <View className="h-11 w-11 items-center justify-center rounded-full bg-off-white">
          <Ionicons name="time-outline" size={21} color="#0284C7" />
        </View>
        <View className="ml-3 flex-1">
          <Text className="text-base font-extrabold text-ink">Retrait en attente</Text>
          <Text className="mt-1 text-sm font-semibold text-warm-600">
            {formatMoney(amount)} vers {method.toUpperCase()} - {account}
          </Text>
          <Text className="mt-1 text-xs font-semibold text-warm-500">
            Cree le {formatDateTime(createdAt)}
          </Text>
          <Pressable
            onPress={onCancel}
            disabled={cancelling}
            className="mt-3 self-start rounded-full bg-off-white px-4 py-2"
            accessibilityRole="button"
          >
            <Text className="text-sm font-extrabold text-airmess-red">
              {cancelling ? 'Annulation...' : 'Annuler'}
            </Text>
          </Pressable>
        </View>
      </View>
    </Card>
  )
}

function TopUpModal({
  open,
  amount,
  loading,
  onAmountChange,
  onClose,
  onSubmit,
}: {
  open: boolean
  amount: string
  loading: boolean
  onAmountChange: (value: string) => void
  onClose: () => void
  onSubmit: () => void
}) {
  return (
    <Modal transparent visible={open} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-ink/60 px-5 pb-5">
        <Card padding="lg" className="bg-cream">
          <Text className="text-2xl font-extrabold text-ink">Recharger le wallet</Text>
          <Text className="mt-1 text-sm leading-5 text-warm-600">
            Choisis un montant puis continue vers le paiement securise.
          </Text>

          <View className="mt-5 flex-row flex-wrap gap-2">
            {TOP_UP_AMOUNTS.map((item) => (
              <Pressable
                key={item}
                onPress={() => onAmountChange(String(item))}
                className={[
                  'h-11 min-w-[104px] items-center justify-center rounded-2xl border px-4',
                  amount === String(item) ? 'bg-airmess-yellow border-airmess-yellow' : 'bg-off-white border-warm-200',
                ].join(' ')}
                accessibilityRole="button"
              >
                <Text className="text-sm font-extrabold text-ink">{formatMoney(item)}</Text>
              </Pressable>
            ))}
          </View>

          <Text className="mb-1.5 mt-5 text-xs font-extrabold uppercase tracking-widest text-warm-500">
            Montant personnalise
          </Text>
          <TextInput
            value={amount}
            onChangeText={onAmountChange}
            keyboardType="number-pad"
            placeholder="5000"
            placeholderTextColor="#B8AF9F"
            className="h-14 rounded-2xl border border-warm-200 bg-off-white px-4 text-base font-extrabold text-ink"
          />

          <ModalActions
            primaryLabel={loading ? 'Paiement...' : 'Payer'}
            disabled={loading}
            onCancel={onClose}
            onSubmit={onSubmit}
          />
        </Card>
      </View>
    </Modal>
  )
}

function WithdrawModal({
  open,
  amount,
  method,
  account,
  available,
  minWithdraw,
  loading,
  onAmountChange,
  onMethodChange,
  onAccountChange,
  onClose,
  onSubmit,
}: {
  open: boolean
  amount: string
  method: WithdrawMethod
  account: string
  available: number
  minWithdraw: number
  loading: boolean
  onAmountChange: (value: string) => void
  onMethodChange: (value: WithdrawMethod) => void
  onAccountChange: (value: string) => void
  onClose: () => void
  onSubmit: () => void
}) {
  return (
    <Modal transparent visible={open} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-ink/60 px-5 pb-5">
        <Card padding="lg" className="bg-cream">
          <Text className="text-2xl font-extrabold text-ink">Retirer du wallet</Text>
          <Text className="mt-1 text-sm leading-5 text-warm-600">
            Le retrait est envoye au service de paiement. Selon la configuration, il peut etre traite automatiquement.
          </Text>

          <Text className="mb-1.5 mt-5 text-xs font-extrabold uppercase tracking-widest text-warm-500">
            Montant - min {formatMoney(minWithdraw)}
          </Text>
          <TextInput
            value={amount}
            onChangeText={onAmountChange}
            keyboardType="number-pad"
            placeholder={String(minWithdraw)}
            placeholderTextColor="#B8AF9F"
            className="h-14 rounded-2xl border border-warm-200 bg-off-white px-4 text-base font-extrabold text-ink"
          />

          <Text className="mb-2 mt-4 text-xs font-extrabold uppercase tracking-widest text-warm-500">
            Methode
          </Text>
          <View className="flex-row gap-2">
            <MethodChip label="Mobile Money" active={method === 'momo'} onPress={() => onMethodChange('momo')} />
          </View>

          <Text className="mb-1.5 mt-4 text-xs font-extrabold uppercase tracking-widest text-warm-500">
            Numero mobile money
          </Text>
          <TextInput
            value={account}
            onChangeText={onAccountChange}
            placeholder="+229 90 12 34 56"
            placeholderTextColor="#B8AF9F"
            className="h-14 rounded-2xl border border-warm-200 bg-off-white px-4 text-base font-extrabold text-ink"
          />

          <Text className="mt-2 text-xs font-semibold text-warm-500">
            Solde disponible : {formatMoney(available)}
          </Text>

          <ModalActions
            primaryLabel={loading ? 'Envoi...' : 'Envoyer'}
            disabled={loading}
            onCancel={onClose}
            onSubmit={onSubmit}
          />
        </Card>
      </View>
    </Modal>
  )
}

function MethodChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className={[
        'h-12 flex-1 items-center justify-center rounded-2xl border',
        active ? 'bg-airmess-yellow border-airmess-yellow' : 'bg-off-white border-warm-200',
      ].join(' ')}
      accessibilityRole="button"
    >
      <Text className="text-sm font-extrabold text-ink">{label}</Text>
    </Pressable>
  )
}

function ModalActions({
  primaryLabel,
  disabled,
  onCancel,
  onSubmit,
}: {
  primaryLabel: string
  disabled: boolean
  onCancel: () => void
  onSubmit: () => void
}) {
  return (
    <View className="mt-6 flex-row gap-3">
      <Pressable
        onPress={onCancel}
        className="h-14 flex-1 items-center justify-center rounded-2xl bg-off-white border border-warm-200"
        accessibilityRole="button"
      >
        <Text className="text-base font-extrabold text-ink">Annuler</Text>
      </Pressable>
      <Pressable
        onPress={onSubmit}
        disabled={disabled}
        className={['h-14 flex-1 items-center justify-center rounded-2xl bg-airmess-dark', disabled ? 'opacity-60' : ''].join(' ')}
        accessibilityRole="button"
      >
        <Text className="text-base font-extrabold text-white">{primaryLabel}</Text>
      </Pressable>
    </View>
  )
}

function MiniBalance({
  label,
  value,
  icon,
}: {
  label: string
  value: number
  icon: keyof typeof Ionicons.glyphMap
}) {
  return (
    <Card className="flex-1">
      <Ionicons name={icon} size={22} color="#D40511" />
      <Text className="mt-3 text-lg font-extrabold text-ink" numberOfLines={1}>
        {formatCompactMoney(value)}
      </Text>
      <Text className="mt-1 text-xs font-bold uppercase tracking-widest text-warm-500">{label}</Text>
    </Card>
  )
}

function TransactionRow({ transaction }: { transaction: WalletTransaction }) {
  const isCredit = transaction.amount_fcfa >= 0

  return (
    <View className="min-h-20 flex-row items-center px-5 py-3">
      <View className={['h-11 w-11 items-center justify-center rounded-full', isCredit ? 'bg-success-bg' : 'bg-danger-bg'].join(' ')}>
        <Ionicons
          name={isCredit ? 'arrow-down' : 'arrow-up'}
          size={20}
          color={isCredit ? '#16A34A' : '#D40511'}
        />
      </View>
      <View className="ml-4 flex-1">
        <Text className="text-base font-extrabold text-ink">{transactionLabel(transaction.type)}</Text>
        <Text className="mt-0.5 text-xs font-semibold text-warm-500">
          {transaction.course?.reference ?? formatDate(transaction.created_at)}
        </Text>
      </View>
      <Text className={['text-base font-extrabold', isCredit ? 'text-success' : 'text-airmess-red'].join(' ')}>
        {isCredit ? '+' : '-'}{formatMoney(Math.abs(transaction.amount_fcfa))}
      </Text>
    </View>
  )
}

function transactionLabel(type: WalletTransaction['type']) {
  const labels: Record<WalletTransaction['type'], string> = {
    deposit: 'Recharge',
    course_charge: 'Paiement course',
    refund: 'Remboursement',
    adjustment_credit: 'Ajustement credit',
    adjustment_debit: 'Ajustement debit',
    withdraw: 'Retrait',
    collection_credit: 'Encaissement',
    adjustment_incident: 'Incident',
  }
  return labels[type] ?? type
}

function formatMoney(value?: number) {
  if (value == null) return '-- FCFA'
  return `${value.toLocaleString('fr-FR')} FCFA`
}

function formatCompactMoney(value: number) {
  if (value >= 1_000_000) return `${Math.round(value / 100_000) / 10}M`
  if (value >= 1_000) return `${Math.round(value / 1_000)}k`
  return value.toLocaleString('fr-FR')
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
  }).format(new Date(value))
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function getApiErrorMessage(error: unknown) {
  if (isAxiosError(error)) {
    const data = error.response?.data as { message?: string; errors?: Record<string, string[]> } | undefined
    return data?.message ?? Object.values(data?.errors ?? {})[0]?.[0] ?? 'Verifie ta connexion puis reessaie.'
  }

  return 'Verifie ta connexion puis reessaie.'
}
