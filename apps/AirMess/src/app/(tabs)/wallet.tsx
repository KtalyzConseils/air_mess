import { useState } from 'react'
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { KeyboardAvoidingView, KeyboardProvider } from 'react-native-keyboard-controller'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Card from '../../components/ui/Card'
import Screen from '../../components/ui/Screen'
import { getPaymentCallbackUrl } from '../../lib/payment'
import { useLanguageStore, type AppLanguage } from '../../stores/languageStore'
import { getApiErrorMessage } from '../../lib/apiError'
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

const WALLET_COPY = {
  fr: {
    locale: 'fr-FR',
    brand: 'AirMess Pay',
    title: 'Wallet',
    lowBalance: 'Solde faible',
    lowBalanceSubtitle: (amount: string) => `Recharge recommandee : ${amount}.`,
    availableBalance: 'Solde disponible',
    totalBalance: (total: string, reserved: string) => `Solde total ${total} - Reserve ${reserved}`,
    topUp: 'Recharger',
    withdraw: 'Retirer',
    pendingWithdraw: 'Retrait en attente',
    pendingWithdrawSubtitle: (amount: string, method: string, account: string) => `${amount} vers ${method} - ${account}`,
    createdOn: 'Cree le',
    cancelling: 'Annulation...',
    cancel: 'Annuler',
    deposited: 'Depose',
    spent: 'Depense',
    recentTransactions: 'Transactions recentes',
    noMovement: 'Aucun mouvement',
    noMovementSubtitle: 'Tes recharges et paiements de courses apparaitront ici.',
    topUpAlertTitle: 'Recharge impossible',
    withdrawAlertTitle: 'Retrait impossible',
    withdrawAlertBody: 'Verifie les informations puis reessaie.',
    withdrawSentTitle: 'Retrait envoye',
    withdrawSentBody: 'Ton retrait est en cours de traitement.',
    cancelAlertTitle: 'Annulation impossible',
    cancelAlertBody: 'Reessaie dans un instant.',
    invalidAmountTitle: 'Montant invalide',
    minAmountBody: 'Le montant minimum est 500 FCFA.',
    minWithdrawBody: (amount: string) => `Le montant minimum est ${amount}.`,
    insufficientBalanceTitle: 'Solde insuffisant',
    insufficientBalanceBody: (amount: string) => `Solde disponible : ${amount}.`,
    accountRequiredTitle: 'Compte requis',
    accountRequiredBody: 'Renseigne le numero mobile money ou le compte bancaire.',
    confirmCancelTitle: 'Annuler le retrait ?',
    confirmCancelBody: 'Cette demande de retrait sera annulee.',
    no: 'Non',
    topUpTitle: 'Recharger le wallet',
    topUpSubtitle: 'Choisis un montant puis continue vers le paiement securise.',
    customAmount: 'Montant personnalise',
    paying: 'Paiement...',
    pay: 'Payer',
    withdrawTitle: 'Retirer du wallet',
    withdrawSubtitle: 'Le retrait est envoye au service de paiement. Selon la configuration, il peut etre traite automatiquement.',
    amountMin: (min: string) => `Montant - min ${min}`,
    method: 'Methode',
    mobileMoney: 'Mobile Money',
    mobileMoneyNumber: 'Numero mobile money',
    availableBalanceLine: (amount: string) => `Solde disponible : ${amount}`,
    sending: 'Envoi...',
    send: 'Envoyer',
    transactionLabels: {
      deposit: 'Recharge',
      course_charge: 'Paiement course',
      refund: 'Remboursement',
      adjustment_credit: 'Ajustement credit',
      adjustment_debit: 'Ajustement debit',
      withdraw: 'Retrait',
      collection_credit: 'Encaissement',
      adjustment_incident: 'Incident',
    } as Record<WalletTransaction['type'], string>,
  },
  en: {
    locale: 'en-US',
    brand: 'AirMess Pay',
    title: 'Wallet',
    lowBalance: 'Low balance',
    lowBalanceSubtitle: (amount: string) => `Recommended top-up: ${amount}.`,
    availableBalance: 'Available balance',
    totalBalance: (total: string, reserved: string) => `Total balance ${total} - Reserved ${reserved}`,
    topUp: 'Top up',
    withdraw: 'Withdraw',
    pendingWithdraw: 'Withdrawal pending',
    pendingWithdrawSubtitle: (amount: string, method: string, account: string) => `${amount} to ${method} - ${account}`,
    createdOn: 'Created on',
    cancelling: 'Cancelling...',
    cancel: 'Cancel',
    deposited: 'Deposited',
    spent: 'Spent',
    recentTransactions: 'Recent transactions',
    noMovement: 'No activity yet',
    noMovementSubtitle: 'Your top-ups and delivery payments will appear here.',
    topUpAlertTitle: 'Top-up failed',
    withdrawAlertTitle: 'Withdrawal failed',
    withdrawAlertBody: 'Check the details and try again.',
    withdrawSentTitle: 'Withdrawal sent',
    withdrawSentBody: 'Your withdrawal is being processed.',
    cancelAlertTitle: 'Cancellation failed',
    cancelAlertBody: 'Try again in a moment.',
    invalidAmountTitle: 'Invalid amount',
    minAmountBody: 'The minimum amount is 500 FCFA.',
    minWithdrawBody: (amount: string) => `The minimum amount is ${amount}.`,
    insufficientBalanceTitle: 'Insufficient balance',
    insufficientBalanceBody: (amount: string) => `Available balance: ${amount}.`,
    accountRequiredTitle: 'Account required',
    accountRequiredBody: 'Enter the mobile money number or bank account.',
    confirmCancelTitle: 'Cancel this withdrawal?',
    confirmCancelBody: 'This withdrawal request will be cancelled.',
    no: 'No',
    topUpTitle: 'Top up your wallet',
    topUpSubtitle: 'Choose an amount then continue to the secure payment.',
    customAmount: 'Custom amount',
    paying: 'Processing...',
    pay: 'Pay',
    withdrawTitle: 'Withdraw from wallet',
    withdrawSubtitle: 'The withdrawal is sent to the payment service. Depending on the setup, it may be processed automatically.',
    amountMin: (min: string) => `Amount - min ${min}`,
    method: 'Method',
    mobileMoney: 'Mobile Money',
    mobileMoneyNumber: 'Mobile money number',
    availableBalanceLine: (amount: string) => `Available balance: ${amount}`,
    sending: 'Sending...',
    send: 'Send',
    transactionLabels: {
      deposit: 'Top-up',
      course_charge: 'Delivery payment',
      refund: 'Refund',
      adjustment_credit: 'Credit adjustment',
      adjustment_debit: 'Debit adjustment',
      withdraw: 'Withdrawal',
      collection_credit: 'Collection',
      adjustment_incident: 'Incident',
    } as Record<WalletTransaction['type'], string>,
  },
} as const

type WalletCopy = (typeof WALLET_COPY)[AppLanguage]

export default function WalletScreen() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const language = useLanguageStore((state) => state.language)
  const copy = WALLET_COPY[language]
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
    mutationFn: (amount: number) => requestTopUp(amount, getPaymentCallbackUrl('wallet')),
    onSuccess: (result) => {
      setTopUpOpen(false)
      router.push({
        pathname: '/payment',
        params: {
          checkoutUrl: result.checkout_url,
          context: 'wallet',
          paymentId: String(result.payment_id),
        },
      })
    },
    onError: (error) => {
      Alert.alert(copy.topUpAlertTitle, getApiErrorMessage(error, language))
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
      Alert.alert(copy.withdrawSentTitle, result.message ?? copy.withdrawSentBody)
    },
    onError: () => {
      Alert.alert(copy.withdrawAlertTitle, copy.withdrawAlertBody)
    },
  })

  const cancelWithdrawMutation = useMutation({
    mutationFn: cancelWithdraw,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['me', 'wallet'] })
    },
    onError: () => {
      Alert.alert(copy.cancelAlertTitle, copy.cancelAlertBody)
    },
  })

  function submitTopUp() {
    const amount = Number.parseInt(topUpAmount, 10)
    if (!amount || amount < 500) {
      Alert.alert(copy.invalidAmountTitle, copy.minAmountBody)
      return
    }
    topUpMutation.mutate(amount)
  }

  function submitWithdraw() {
    if (!data) return
    const amount = Number.parseInt(withdrawAmount, 10)
    if (!amount || amount < data.min_withdraw_fcfa) {
      Alert.alert(copy.invalidAmountTitle, copy.minWithdrawBody(formatMoney(data.min_withdraw_fcfa, copy.locale)))
      return
    }
    if (amount > data.available) {
      Alert.alert(copy.insufficientBalanceTitle, copy.insufficientBalanceBody(formatMoney(data.available, copy.locale)))
      return
    }
    if (!withdrawAccount.trim()) {
      Alert.alert(copy.accountRequiredTitle, copy.accountRequiredBody)
      return
    }
    withdrawMutation.mutate()
  }

  return (
    <Screen scroll py={18} className="px-5">
      <View className="mb-5 flex-row items-center justify-between">
        <View>
          <Text className="text-xs font-extrabold uppercase tracking-widest text-airmess-red">
            {copy.brand}
          </Text>
          <Text className="mt-1 text-3xl font-extrabold text-ink">{copy.title}</Text>
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
                <Text className="font-extrabold text-ink">{copy.lowBalance}</Text>
                <Text className="mt-1 text-sm leading-5 text-warm-600">
                  {copy.lowBalanceSubtitle(formatMoney(data.min_recommended_fcfa, copy.locale))}
                </Text>
              </View>
            </Card>
          ) : null}

          <Card variant="dark" padding="lg" className="mb-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-xs font-extrabold uppercase tracking-widest text-warm-400">
                {copy.availableBalance}
              </Text>
              <Ionicons name="card-outline" size={22} color="#FFCC00" />
            </View>
            <Text className="mt-4 text-5xl font-extrabold text-white" numberOfLines={1}>
              {formatMoney(data?.available, copy.locale)}
            </Text>
            <Text className="mt-2 text-sm font-semibold text-warm-300">
              {copy.totalBalance(formatMoney(data?.balance, copy.locale), formatMoney(data?.pending_reserved, copy.locale))}
            </Text>

            <View className="mt-5 flex-row gap-3 border-t border-warm-600/40 pt-5">
              <Pressable
                onPress={() => setTopUpOpen(true)}
                className="h-14 flex-1 flex-row items-center justify-center rounded-2xl bg-airmess-yellow"
                accessibilityRole="button"
              >
                <Ionicons name="add-circle-outline" size={18} color="#1A1614" />
                <Text className="ml-2 text-base font-extrabold text-ink">{copy.topUp}</Text>
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
                <Text className="ml-2 text-base font-extrabold text-ink">{copy.withdraw}</Text>
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
              copy={copy}
              onCancel={() =>
                Alert.alert(copy.confirmCancelTitle, copy.confirmCancelBody, [
                  { text: copy.no, style: 'cancel' },
                  {
                    text: copy.cancel,
                    style: 'destructive',
                    onPress: () => cancelWithdrawMutation.mutate(data.pending_withdraw_request!.id),
                  },
                ])
              }
            />
          ) : null}

          <View className="mb-4 flex-row gap-3">
            <MiniBalance label={copy.deposited} value={data?.total_deposited ?? 0} icon="arrow-down-circle" locale={copy.locale} />
            <MiniBalance label={copy.spent} value={data?.total_spent ?? 0} icon="arrow-up-circle" locale={copy.locale} />
          </View>

          <Text className="mb-3 text-xl font-extrabold text-ink">{copy.recentTransactions}</Text>
          {(data?.recent_transactions ?? []).length === 0 ? (
            <Card className="items-center py-8">
              <View className="mb-3 h-12 w-12 items-center justify-center rounded-full bg-warm-100">
                <Ionicons name="receipt-outline" size={22} color="#6B6250" />
              </View>
              <Text className="text-center text-base font-extrabold text-ink">{copy.noMovement}</Text>
              <Text className="mt-1 text-center text-sm text-warm-600">
                {copy.noMovementSubtitle}
              </Text>
            </Card>
          ) : (
            <Card padding="none">
              {(data?.recent_transactions ?? []).slice(0, 6).map((transaction, index, items) => (
                <View key={transaction.id}>
                  <TransactionRow transaction={transaction} copy={copy} />
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
            copy={copy}
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
            copy={copy}
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
  copy,
  onCancel,
}: {
  amount: number
  method: WithdrawMethod
  account: string
  createdAt: string
  cancelling: boolean
  copy: WalletCopy
  onCancel: () => void
}) {
  return (
    <Card variant="default" className="mb-4 bg-info-bg border-info/30">
      <View className="flex-row items-start">
        <View className="h-11 w-11 items-center justify-center rounded-full bg-off-white">
          <Ionicons name="time-outline" size={21} color="#0284C7" />
        </View>
        <View className="ml-3 flex-1">
          <Text className="text-base font-extrabold text-ink">{copy.pendingWithdraw}</Text>
          <Text className="mt-1 text-sm font-semibold text-warm-600">
            {copy.pendingWithdrawSubtitle(formatMoney(amount, copy.locale), method.toUpperCase(), account)}
          </Text>
          <Text className="mt-1 text-xs font-semibold text-warm-500">
            {copy.createdOn} {formatDateTime(createdAt, copy.locale)}
          </Text>
          <Pressable
            onPress={onCancel}
            disabled={cancelling}
            className="mt-3 self-start rounded-full bg-off-white px-4 py-2"
            accessibilityRole="button"
          >
            <Text className="text-sm font-extrabold text-airmess-red">
              {cancelling ? copy.cancelling : copy.cancel}
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
  copy,
  onAmountChange,
  onClose,
  onSubmit,
}: {
  open: boolean
  amount: string
  loading: boolean
  copy: WalletCopy
  onAmountChange: (value: string) => void
  onClose: () => void
  onSubmit: () => void
}) {
  return (
    <Modal transparent visible={open} animationType="slide" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <KeyboardProvider navigationBarTranslucent statusBarTranslucent>
        <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
          <View className="flex-1 justify-end bg-ink/60 px-5 pb-5">
            <Card padding="lg" className="max-h-[88%] bg-cream">
              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingBottom: 24 }}
              >
          <Text className="text-2xl font-extrabold text-ink">{copy.topUpTitle}</Text>
          <Text className="mt-1 text-sm leading-5 text-warm-600">
            {copy.topUpSubtitle}
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
                <Text className="text-sm font-extrabold text-ink">{formatMoney(item, copy.locale)}</Text>
              </Pressable>
            ))}
          </View>

          <Text className="mb-1.5 mt-5 text-xs font-extrabold uppercase tracking-widest text-warm-500">
            {copy.customAmount}
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
            primaryLabel={loading ? copy.paying : copy.pay}
            cancelLabel={copy.cancel}
            disabled={loading}
            onCancel={onClose}
            onSubmit={onSubmit}
          />
              </ScrollView>
            </Card>
          </View>
        </KeyboardAvoidingView>
      </KeyboardProvider>
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
  copy,
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
  copy: WalletCopy
  onAmountChange: (value: string) => void
  onMethodChange: (value: WithdrawMethod) => void
  onAccountChange: (value: string) => void
  onClose: () => void
  onSubmit: () => void
}) {
  return (
    <Modal transparent visible={open} animationType="slide" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <KeyboardProvider navigationBarTranslucent statusBarTranslucent>
        <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
          <View className="flex-1 justify-end bg-ink/60 px-5 pb-5">
            <Card padding="lg" className="max-h-[88%] bg-cream">
              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingBottom: 24 }}
              >
          <Text className="text-2xl font-extrabold text-ink">{copy.withdrawTitle}</Text>
          <Text className="mt-1 text-sm leading-5 text-warm-600">
            {copy.withdrawSubtitle}
          </Text>

          <Text className="mb-1.5 mt-5 text-xs font-extrabold uppercase tracking-widest text-warm-500">
            {copy.amountMin(formatMoney(minWithdraw, copy.locale))}
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
            {copy.method}
          </Text>
          <View className="flex-row gap-2">
            <MethodChip label={copy.mobileMoney} active={method === 'momo'} onPress={() => onMethodChange('momo')} />
          </View>

          <Text className="mb-1.5 mt-4 text-xs font-extrabold uppercase tracking-widest text-warm-500">
            {copy.mobileMoneyNumber}
          </Text>
          <TextInput
            value={account}
            onChangeText={onAccountChange}
            placeholder="+229 90 12 34 56"
            placeholderTextColor="#B8AF9F"
            className="h-14 rounded-2xl border border-warm-200 bg-off-white px-4 text-base font-extrabold text-ink"
          />

          <Text className="mt-2 text-xs font-semibold text-warm-500">
            {copy.availableBalanceLine(formatMoney(available, copy.locale))}
          </Text>

          <ModalActions
            primaryLabel={loading ? copy.sending : copy.send}
            cancelLabel={copy.cancel}
            disabled={loading}
            onCancel={onClose}
            onSubmit={onSubmit}
          />
              </ScrollView>
            </Card>
          </View>
        </KeyboardAvoidingView>
      </KeyboardProvider>
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
  cancelLabel,
  disabled,
  onCancel,
  onSubmit,
}: {
  primaryLabel: string
  cancelLabel: string
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
        <Text className="text-base font-extrabold text-ink">{cancelLabel}</Text>
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
  locale,
}: {
  label: string
  value: number
  icon: keyof typeof Ionicons.glyphMap
  locale: string
}) {
  return (
    <Card className="flex-1">
      <Ionicons name={icon} size={22} color="#D40511" />
      <Text className="mt-3 text-lg font-extrabold text-ink" numberOfLines={1}>
        {formatCompactMoney(value, locale)}
      </Text>
      <Text className="mt-1 text-xs font-bold uppercase tracking-widest text-warm-500">{label}</Text>
    </Card>
  )
}

function TransactionRow({ transaction, copy }: { transaction: WalletTransaction; copy: WalletCopy }) {
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
        <Text className="text-base font-extrabold text-ink">{copy.transactionLabels[transaction.type] ?? transaction.type}</Text>
        <Text className="mt-0.5 text-xs font-semibold text-warm-500">
          {transaction.course?.reference ?? formatDate(transaction.created_at, copy.locale)}
        </Text>
      </View>
      <Text className={['text-base font-extrabold', isCredit ? 'text-success' : 'text-airmess-red'].join(' ')}>
        {isCredit ? '+' : '-'}{formatMoney(Math.abs(transaction.amount_fcfa), copy.locale)}
      </Text>
    </View>
  )
}

function formatMoney(value: number | undefined, locale: string) {
  if (value == null) return '-- FCFA'
  return `${value.toLocaleString(locale)} FCFA`
}

function formatCompactMoney(value: number, locale: string) {
  if (value >= 1_000_000) return `${Math.round(value / 100_000) / 10}M`
  if (value >= 1_000) return `${Math.round(value / 1_000)}k`
  return value.toLocaleString(locale)
}

function formatDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
  }).format(new Date(value))
}

function formatDateTime(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}
