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
import { useRouter } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { AxiosError } from 'axios'
import {
  fetchWallet,
  requestTopUp,
  requestWithdraw,
  cancelWithdraw,
  type WalletTransaction,
  type WalletTransactionType,
} from '../../api/wallet'
import BottomSheet from '../../components/ui/BottomSheet'
import Button from '../../components/ui/Button'

const TX_META: Partial<Record<WalletTransactionType, keyof typeof Ionicons.glyphMap>> = {
  deposit: 'add-outline',
  course_charge: 'cube-outline',
  withdraw: 'arrow-down-outline',
  refund: 'refresh-outline',
  adjustment_credit: 'add-circle-outline',
  adjustment_debit: 'remove-circle-outline',
  collection_credit: 'cash-outline',
  adjustment_incident: 'warning-outline',
}

function fcfa(n: number): string {
  return n.toLocaleString('fr-FR') + ' FCFA'
}

function txTitle(tx: WalletTransaction): string {
  switch (tx.type) {
    case 'deposit':
      return 'Recharge'
    case 'course_charge':
      return tx.course ? `Course ${tx.course.reference}` : 'Frais de course'
    case 'withdraw':
      return 'Retrait'
    case 'refund':
      return 'Remboursement'
    default:
      return 'Opération'
  }
}

export default function WalletScreen() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const [topUpVisible, setTopUpVisible] = useState(false)
  const [withdrawVisible, setWithdrawVisible] = useState(false)
  const [amount, setAmount] = useState('5000')
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [account, setAccount] = useState('')
  const [topUpLoading, setTopUpLoading] = useState(false)

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['wallet'],
    queryFn: fetchWallet,
    refetchInterval: 15_000,
  })

  const cancelMutation = useMutation({
    mutationFn: cancelWithdraw,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wallet'] }),
    onError: (err) => {
      const msg =
        err instanceof AxiosError
          ? ((err.response?.data as { message?: string })?.message ?? 'Erreur')
          : 'Erreur'
      Alert.alert('Annulation impossible', msg)
    },
  })

  async function handleTopUp() {
    const n = Number(amount.replace(/\s/g, ''))
    if (!Number.isFinite(n) || n < 500) {
      Alert.alert('Montant invalide', 'Minimum 500 FCFA.')
      return
    }
    setTopUpLoading(true)
    try {
      const base = (process.env.EXPO_PUBLIC_API_BASE_URL ?? '').replace(/\/+$/, '')
      const checkout = await requestTopUp(n, `${base}/payments/return-to-app`)
      setTopUpVisible(false)
      router.push({
        pathname: '/payment',
        params: {
          url: checkout.checkout_url,
          amount: String(checkout.amount),
          payment_id: String(checkout.payment_id),
        },
      })
    } catch (err) {
      const msg =
        err instanceof AxiosError
          ? ((err.response?.data as { message?: string })?.message ?? 'Erreur')
          : 'Erreur'
      Alert.alert('Recharge impossible', msg)
    } finally {
      setTopUpLoading(false)
    }
  }

  async function handleWithdraw() {
    const n = Number(withdrawAmount.replace(/\s/g, ''))
    if (!data || !Number.isFinite(n) || n < data.min_withdraw_fcfa) {
      Alert.alert('Montant invalide', `Minimum ${data?.min_withdraw_fcfa ?? 0} FCFA.`)
      return
    }
    if (!account.trim()) {
      Alert.alert('Compte requis', 'Indique ton numéro MoMo.')
      return
    }
    try {
      await requestWithdraw({
        amount: n,
        target_method: 'momo',
        target_account: account.trim(),
      })
      setWithdrawVisible(false)
      queryClient.invalidateQueries({ queryKey: ['wallet'] })
      Alert.alert('Demande envoyée', 'Un opérateur traitera ton retrait.')
    } catch (err) {
      const msg =
        err instanceof AxiosError
          ? ((err.response?.data as { message?: string })?.message ?? 'Erreur')
          : 'Erreur'
      Alert.alert('Retrait impossible', msg)
    }
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
        <Text className="text-warm-500">Erreur de chargement du wallet.</Text>
      </SafeAreaView>
    )
  }

  const canWithdraw =
    data.available >= data.min_withdraw_fcfa && !data.pending_withdraw_request

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#1A1614" />
        }
      >
        <Text className="text-2xl font-extrabold text-ink mb-4">Wallet</Text>

        <View className="bg-airmess-dark rounded-3xl p-5">
          <Text className="text-airmess-yellow text-[11px] font-extrabold uppercase tracking-[2px]">
            Disponible
          </Text>
          <Text className="text-white text-[40px] leading-[46px] font-extrabold mt-2">
            {data.available.toLocaleString('fr-FR')}
          </Text>
          <Text className="text-warm-400 text-xs font-bold">FCFA</Text>
          {data.pending_reserved > 0 && (
            <Text className="text-warm-400 text-xs mt-2">
              {fcfa(data.pending_reserved)} réservés sur courses en cours
            </Text>
          )}

          <View className="flex-row gap-2 mt-5">
            <Pressable
              onPress={() => setTopUpVisible(true)}
              className="flex-1 bg-airmess-yellow rounded-2xl py-3 items-center"
            >
              <Text className="font-extrabold text-ink">Recharger</Text>
            </Pressable>
            <Pressable
              onPress={() => canWithdraw && setWithdrawVisible(true)}
              disabled={!canWithdraw}
              className={`flex-1 rounded-2xl py-3 items-center border border-white/20 ${
                canWithdraw ? 'bg-white/10' : 'opacity-40'
              }`}
            >
              <Text className="font-extrabold text-white">Retirer</Text>
            </Pressable>
          </View>
        </View>

        {data.is_low && (
          <View className="mt-4 bg-warning/15 border border-warning/40 rounded-2xl p-3">
            <Text className="text-ink text-sm font-semibold">
              Solde bas — recommande {fcfa(data.min_recommended_fcfa)} minimum.
            </Text>
          </View>
        )}

        {data.pending_withdraw_request && (
          <View className="mt-4 bg-off-white border border-warm-200 rounded-2xl p-4">
            <Text className="font-bold text-ink">Retrait en attente</Text>
            <Text className="text-warm-500 text-sm mt-1">
              {fcfa(data.pending_withdraw_request.amount_fcfa)} →{' '}
              {data.pending_withdraw_request.target_account}
            </Text>
            <Pressable
              onPress={() =>
                Alert.alert('Annuler ?', '', [
                  { text: 'Non', style: 'cancel' },
                  {
                    text: 'Oui',
                    style: 'destructive',
                    onPress: () => cancelMutation.mutate(data.pending_withdraw_request!.id),
                  },
                ])
              }
              className="mt-2"
            >
              <Text className="text-airmess-red font-bold text-sm">Annuler la demande</Text>
            </Pressable>
          </View>
        )}

        <Text className="text-lg font-extrabold text-ink mt-8 mb-3">Opérations</Text>
        {data.recent_transactions.length === 0 ? (
          <Text className="text-warm-500">Aucune opération récente.</Text>
        ) : (
          data.recent_transactions.map((tx) => (
            <View
              key={tx.id}
              className="flex-row items-center bg-off-white border border-warm-200 rounded-2xl p-3 mb-2"
            >
              <View className="w-10 h-10 rounded-full bg-warm-200 items-center justify-center mr-3">
                <Ionicons name={TX_META[tx.type] ?? 'ellipse-outline'} size={18} color="#1A1614" />
              </View>
              <View className="flex-1">
                <Text className="font-bold text-ink">{txTitle(tx)}</Text>
                <Text className="text-xs text-warm-500">
                  {new Date(tx.created_at).toLocaleString('fr-FR')}
                </Text>
              </View>
              <Text
                className={`font-extrabold ${tx.amount_fcfa >= 0 ? 'text-success' : 'text-airmess-red'}`}
              >
                {tx.amount_fcfa > 0 ? '+' : ''}
                {tx.amount_fcfa.toLocaleString('fr-FR')}
              </Text>
            </View>
          ))
        )}
      </ScrollView>

      <BottomSheet visible={topUpVisible} onClose={() => setTopUpVisible(false)} title="Recharger">
        <Text className="text-warm-500 text-sm mb-3">Montant (FCFA)</Text>
        <TextInput
          value={amount}
          onChangeText={setAmount}
          keyboardType="number-pad"
          className="border-2 border-warm-200 rounded-2xl px-4 h-14 text-base text-ink bg-off-white mb-4"
        />
        <Button variant="primary" size="lg" loading={topUpLoading} onPress={handleTopUp}>
          Continuer vers Fedapay
        </Button>
      </BottomSheet>

      <BottomSheet
        visible={withdrawVisible}
        onClose={() => setWithdrawVisible(false)}
        title="Demander un retrait"
      >
        <Text className="text-warm-500 text-sm mb-3">Montant (min {fcfa(data.min_withdraw_fcfa)})</Text>
        <TextInput
          value={withdrawAmount}
          onChangeText={setWithdrawAmount}
          keyboardType="number-pad"
          className="border-2 border-warm-200 rounded-2xl px-4 h-14 text-base text-ink bg-off-white mb-3"
        />
        <Text className="text-warm-500 text-sm mb-3">Numéro MoMo</Text>
        <TextInput
          value={account}
          onChangeText={setAccount}
          keyboardType="phone-pad"
          className="border-2 border-warm-200 rounded-2xl px-4 h-14 text-base text-ink bg-off-white mb-4"
        />
        <Button variant="primary" size="lg" onPress={handleWithdraw}>
          Envoyer la demande
        </Button>
      </BottomSheet>
    </SafeAreaView>
  )
}
