import { useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { AxiosError } from 'axios'
import {
  fetchWallet,
  requestTopUp,
  requestWithdraw,
  cancelWithdrawRequest,
  type WalletTransactionItem,
} from '../../api/wallet'

const TX_META: Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  deposit:      { label: 'Dépôt',         icon: 'arrow-down-circle', color: '#16a34a' },
  earning:      { label: 'Gain de course', icon: 'trophy',           color: '#16a34a' },
  withdraw:     { label: 'Retrait',       icon: 'arrow-up-circle',   color: '#dc2626' },
  pickup_debit: { label: 'Encaissement',  icon: 'cube',              color: '#d97706' },
  refund:       { label: 'Remboursement', icon: 'refresh',           color: '#2563eb' },
}

function fcfa(n: number): string {
  return n.toLocaleString('fr-FR') + ' FCFA'
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  })
}

export default function WalletScreen() {
  const queryClient = useQueryClient()
  const [topUpVisible, setTopUpVisible] = useState(false)
  const [withdrawVisible, setWithdrawVisible] = useState(false)

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['wallet'],
    queryFn: fetchWallet,
    refetchInterval: 15_000, // auto-refresh toutes les 15s pour voir l'effet du webhook
  })

  const cancelMutation = useMutation({
    mutationFn: cancelWithdrawRequest,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wallet'] }),
    onError: (err) => {
      const msg = err instanceof AxiosError
        ? (err.response?.data as { message?: string })?.message ?? 'Erreur'
        : 'Erreur'
      Alert.alert('Annulation impossible', msg)
    },
  })

  function handleCancelPending(id: number) {
    Alert.alert('Annuler la demande ?', 'Vous pourrez en refaire une plus tard.', [
      { text: 'Non', style: 'cancel' },
      { text: 'Oui, annuler', style: 'destructive', onPress: () => cancelMutation.mutate(id) },
    ])
  }

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator />
      </View>
    )
  }
  if (!data) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 p-6">
        <Text className="text-gray-500">Erreur de chargement du wallet.</Text>
      </View>
    )
  }

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingTop: 60 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        <Text className="text-2xl font-bold text-gray-900">Ma caution</Text>
        <Text className="text-sm text-gray-500 mt-1">
          Garantit les courses avec encaissement client.
        </Text>

        {/* Carte balance */}
        <View className="bg-airmess-dark mt-4 rounded-2xl p-5">
          <Text className="text-gray-300 text-xs uppercase tracking-wider">Caution disponible</Text>
          <Text className="text-white text-3xl font-bold mt-2">{fcfa(data.balance)}</Text>
          <View className="flex-row justify-between mt-4 pt-3 border-t border-white/10">
            <View>
              <Text className="text-gray-400 text-xs">Cumul déposé</Text>
              <Text className="text-white font-semibold">{fcfa(data.total_deposited)}</Text>
            </View>
            <View>
              <Text className="text-gray-400 text-xs">Cumul retiré</Text>
              <Text className="text-white font-semibold">{fcfa(data.total_withdrawn)}</Text>
            </View>
          </View>
        </View>

        {/* Actions */}
        <View className="flex-row gap-3 mt-4">
          <Pressable
            onPress={() => setTopUpVisible(true)}
            className="flex-1 bg-airmess-yellow rounded-xl py-3 items-center"
          >
            <Ionicons name="arrow-down-circle" size={22} color="#0F172A" />
            <Text className="font-bold text-airmess-dark mt-1">Recharger</Text>
          </Pressable>
          <Pressable
            onPress={() => setWithdrawVisible(true)}
            disabled={data.balance < data.min_withdraw_fcfa || !!data.pending_withdraw_request}
            className={`flex-1 rounded-xl py-3 items-center ${
              data.balance < data.min_withdraw_fcfa || data.pending_withdraw_request
                ? 'bg-gray-200'
                : 'bg-white border-2 border-airmess-dark'
            }`}
          >
            <Ionicons
              name="arrow-up-circle"
              size={22}
              color={data.balance < data.min_withdraw_fcfa || data.pending_withdraw_request ? '#9CA3AF' : '#0F172A'}
            />
            <Text className={`font-bold mt-1 ${
              data.balance < data.min_withdraw_fcfa || data.pending_withdraw_request ? 'text-gray-400' : 'text-airmess-dark'
            }`}>
              Retirer
            </Text>
          </Pressable>
        </View>

        {/* Demande de retrait en attente */}
        {data.pending_withdraw_request && (
          <View className="mt-4 bg-amber-50 border-2 border-amber-300 rounded-xl p-4">
            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <Text className="font-bold text-amber-900">⏳ Retrait en attente</Text>
                <Text className="text-sm text-amber-800 mt-1">
                  {fcfa(data.pending_withdraw_request.amount_fcfa)} vers{' '}
                  {data.pending_withdraw_request.target_method === 'momo' ? 'MoMo' : 'Banque'}
                </Text>
                <Text className="text-xs text-amber-700 mt-0.5">
                  Demandé le {formatDate(data.pending_withdraw_request.created_at)}
                </Text>
              </View>
              <Pressable
                onPress={() => handleCancelPending(data.pending_withdraw_request!.id)}
                className="px-3 py-1.5 bg-amber-200 rounded-lg"
              >
                <Text className="text-xs font-bold text-amber-900">Annuler</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Info caution insuffisante */}
        {data.balance < data.min_withdraw_fcfa && !data.pending_withdraw_request && (
          <Text className="text-xs text-gray-500 mt-2 px-1">
            ℹ️ Retrait possible à partir de {fcfa(data.min_withdraw_fcfa)} de caution.
          </Text>
        )}

        {/* Historique transactions */}
        <Text className="text-lg font-bold text-gray-900 mt-6 mb-2">Dernières opérations</Text>
        {data.recent_transactions.length === 0 ? (
          <View className="bg-white rounded-xl p-6 items-center">
            <Text className="text-gray-400">Aucune opération.</Text>
          </View>
        ) : (
          <View className="bg-white rounded-xl overflow-hidden">
            {data.recent_transactions.map((t: WalletTransactionItem, idx: number) => {
              const meta = TX_META[t.type] ?? { label: t.type, icon: 'help-circle' as const, color: '#6B7280' }
              const isPositive = t.amount_fcfa > 0
              return (
                <View
                  key={t.id}
                  className={`flex-row items-center px-4 py-3 ${idx > 0 ? 'border-t border-gray-100' : ''}`}
                >
                  <Ionicons name={meta.icon} size={26} color={meta.color} />
                  <View className="flex-1 ml-3">
                    <Text className="font-semibold text-gray-900">{meta.label}</Text>
                    <Text className="text-xs text-gray-500">{formatDate(t.created_at)}</Text>
                  </View>
                  <View className="items-end">
                    <Text className={`font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                      {isPositive ? '+' : ''}{fcfa(t.amount_fcfa)}
                    </Text>
                    <Text className="text-xs text-gray-400">après: {fcfa(t.balance_after)}</Text>
                  </View>
                </View>
              )
            })}
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
    </View>
  )
}

// ============== Modal top-up ==============

function TopUpModal({ visible, onClose, minAmount }: { visible: boolean; onClose: () => void; minAmount: number }) {
  const [amount, setAmount] = useState('')
  const queryClient = useQueryClient()

  const mutation = useMutation({
    // Pas de callback_url passé : le backend utilise config('app.frontend_url')/billing/return
    mutationFn: (n: number) => requestTopUp(n),
    onSuccess: async (data) => {
      onClose()
      setAmount('')
      // Ouvrir Fedapay dans le navigateur du téléphone
      const supported = await Linking.canOpenURL(data.checkout_url)
      if (supported) {
        Linking.openURL(data.checkout_url)
        // Au retour de l'utilisateur, on rafraîchira via le poll auto (15s) ou pull-to-refresh
      } else {
        Alert.alert('Erreur', 'Impossible d\'ouvrir la page de paiement.')
      }
      queryClient.invalidateQueries({ queryKey: ['wallet'] })
    },
    onError: (err) => {
      const msg = err instanceof AxiosError
        ? (err.response?.data as { message?: string })?.message ?? 'Erreur lors de la création du paiement.'
        : 'Erreur inattendue.'
      Alert.alert('Recharge impossible', msg)
    },
  })

  function handleSubmit() {
    const n = parseInt(amount, 10)
    if (Number.isNaN(n) || n < minAmount) {
      Alert.alert('Montant invalide', `Le minimum est ${fcfa(minAmount)}.`)
      return
    }
    mutation.mutate(n)
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-white rounded-t-3xl p-6 pb-10">
          <Text className="text-xl font-bold text-gray-900">Recharger ma caution</Text>
          <Text className="text-sm text-gray-500 mt-1">
            Vous serez redirigé(e) vers Fedapay pour payer en MoMo / Moov.
          </Text>

          <Text className="text-sm font-medium text-gray-700 mt-4 mb-1">Montant (FCFA)</Text>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            keyboardType="number-pad"
            placeholder={`Min ${minAmount}`}
            className="border border-gray-300 rounded-lg px-4 py-3 text-base"
          />

          <View className="flex-row gap-3 mt-5">
            <Pressable
              onPress={onClose}
              className="flex-1 py-3 rounded-xl border border-gray-300 items-center"
            >
              <Text className="font-semibold text-gray-700">Annuler</Text>
            </Pressable>
            <Pressable
              onPress={handleSubmit}
              disabled={mutation.isPending}
              className="flex-1 py-3 rounded-xl bg-airmess-yellow items-center"
            >
              <Text className="font-bold text-airmess-dark">
                {mutation.isPending ? '...' : 'Continuer vers Fedapay'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  )
}

// ============== Modal demande retrait ==============

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
    mutationFn: () => requestWithdraw({
      amount: parseInt(amount, 10),
      target_method: method,
      target_account: account.trim(),
    }),
    onSuccess: () => {
      onClose()
      setAmount('')
      setAccount('')
      queryClient.invalidateQueries({ queryKey: ['wallet'] })
      Alert.alert('Demande envoyée', 'Un administrateur va la traiter. Vous serez notifié(e).')
    },
    onError: (err) => {
      const msg = err instanceof AxiosError
        ? (err.response?.data as { message?: string })?.message ?? 'Erreur'
        : 'Erreur inattendue.'
      Alert.alert('Demande impossible', msg)
    },
  })

  function handleSubmit() {
    const n = parseInt(amount, 10)
    if (Number.isNaN(n) || n < minAmount) {
      Alert.alert('Montant invalide', `Le minimum est ${fcfa(minAmount)}.`)
      return
    }
    if (n > maxAmount) {
      Alert.alert('Solde insuffisant', `Vous ne pouvez retirer que ${fcfa(maxAmount)} max.`)
      return
    }
    if (account.trim().length < 5) {
      Alert.alert('Compte invalide', 'Renseignez votre numéro MoMo ou IBAN.')
      return
    }
    mutation.mutate()
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-white rounded-t-3xl p-6 pb-10">
          <Text className="text-xl font-bold text-gray-900">Demander un retrait</Text>
          <Text className="text-sm text-gray-500 mt-1">
            Un admin validera votre demande sous peu. L'argent partira sur votre compte.
          </Text>

          <Text className="text-sm font-medium text-gray-700 mt-4 mb-1">Montant (FCFA)</Text>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            keyboardType="number-pad"
            placeholder={`Entre ${minAmount} et ${maxAmount}`}
            className="border border-gray-300 rounded-lg px-4 py-3 text-base"
          />

          <Text className="text-sm font-medium text-gray-700 mt-4 mb-1">Méthode</Text>
          <View className="flex-row gap-2">
            <Pressable
              onPress={() => setMethod('momo')}
              className={`flex-1 py-3 rounded-xl items-center border-2 ${method === 'momo' ? 'border-airmess-yellow bg-yellow-50' : 'border-gray-200'}`}
            >
              <Text className={method === 'momo' ? 'font-bold text-airmess-dark' : 'text-gray-600'}>📱 MoMo</Text>
            </Pressable>
            <Pressable
              onPress={() => setMethod('bank')}
              className={`flex-1 py-3 rounded-xl items-center border-2 ${method === 'bank' ? 'border-airmess-yellow bg-yellow-50' : 'border-gray-200'}`}
            >
              <Text className={method === 'bank' ? 'font-bold text-airmess-dark' : 'text-gray-600'}>🏦 Banque</Text>
            </Pressable>
          </View>

          <Text className="text-sm font-medium text-gray-700 mt-4 mb-1">
            {method === 'momo' ? 'Numéro MoMo' : 'IBAN / numéro de compte'}
          </Text>
          <TextInput
            value={account}
            onChangeText={setAccount}
            placeholder={method === 'momo' ? '+229...' : 'BJ06...'}
            className="border border-gray-300 rounded-lg px-4 py-3 text-base"
          />

          <View className="flex-row gap-3 mt-5">
            <Pressable
              onPress={onClose}
              className="flex-1 py-3 rounded-xl border border-gray-300 items-center"
            >
              <Text className="font-semibold text-gray-700">Annuler</Text>
            </Pressable>
            <Pressable
              onPress={handleSubmit}
              disabled={mutation.isPending}
              className="flex-1 py-3 rounded-xl bg-airmess-dark items-center"
            >
              <Text className="font-bold text-white">
                {mutation.isPending ? '...' : 'Envoyer la demande'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  )
}
