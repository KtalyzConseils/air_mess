import { useState } from 'react'
import { View, Text, ScrollView, RefreshControl, ActivityIndicator, Pressable } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import {
  fetchDriverStats,
  fetchDriverBalance,
  fetchDriverEarnings,
  fetchDriverPayouts,
  type StatPeriod,
  type EarningItem,
  type PayoutItem,
} from '../../api/driver'

const PERIODS: { key: StatPeriod; label: string }[] = [
  { key: 'today',    label: "Aujourd'hui" },
  { key: 'last_7',   label: '7 derniers jours' },
  { key: 'last_30',  label: '30 derniers jours' },
  { key: 'all_time', label: 'Depuis le début' },
]

type Tab = 'stats' | 'earnings' | 'payouts'
const TABS: { key: Tab; label: string }[] = [
  { key: 'stats',    label: 'Stats' },
  { key: 'earnings', label: 'Gains' },
  { key: 'payouts',  label: 'Versements' },
]

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function EarningsScreen() {
  const [tab, setTab] = useState<Tab>('stats')
  const [selected, setSelected] = useState<StatPeriod>('all_time')

  const balanceQ = useQuery({
    queryKey: ['driver-balance'],
    queryFn: fetchDriverBalance,
    refetchInterval: 30_000,
  })

  return (
    <ScrollView
      className="flex-1 bg-gray-100"
      contentContainerStyle={{ padding: 16, paddingTop: 50, paddingBottom: 80 }}
      refreshControl={<RefreshControl refreshing={balanceQ.isRefetching} onRefresh={balanceQ.refetch} />}
    >
      <Text className="text-2xl font-bold text-airmess-dark mb-1">Mes gains 💰</Text>

      {/* SOLDE EN ATTENTE */}
      <View className="bg-airmess-yellow rounded-2xl p-5 mt-4 mb-2">
        <Text className="text-xs uppercase font-bold text-airmess-dark tracking-wider">
          Solde en attente
        </Text>
        {balanceQ.data ? (
          <>
            <Text className="text-4xl font-bold text-airmess-dark mt-2">
              {balanceQ.data.pending_balance_fcfa.toLocaleString('fr-FR')}
              <Text className="text-lg font-normal"> FCFA</Text>
            </Text>
            <Text className="text-xs text-airmess-dark/70 mt-1">
              {balanceQ.data.pending_count} course{balanceQ.data.pending_count > 1 ? 's' : ''} à régler
            </Text>
          </>
        ) : (
          <ActivityIndicator color="#0F172A" />
        )}
      </View>

      {balanceQ.data && balanceQ.data.total_paid_out_fcfa > 0 && (
        <View className="bg-white rounded-xl p-3 border border-gray-200 mb-4">
          <Text className="text-xs text-gray-500 uppercase">Total versé depuis le début</Text>
          <Text className="text-lg font-bold text-airmess-dark mt-0.5">
            {balanceQ.data.total_paid_out_fcfa.toLocaleString('fr-FR')} FCFA
          </Text>
        </View>
      )}

      {/* Tabs */}
      <View className="flex-row gap-2 mt-4 mb-3">
        {TABS.map((t) => {
          const active = t.key === tab
          return (
            <Pressable
              key={t.key}
              onPress={() => setTab(t.key)}
              className={`flex-1 py-2 rounded-lg border ${
                active ? 'bg-airmess-dark border-airmess-dark' : 'bg-white border-gray-300'
              }`}
            >
              <Text className={`text-center text-xs font-semibold ${active ? 'text-white' : 'text-gray-700'}`}>
                {t.label}
              </Text>
            </Pressable>
          )
        })}
      </View>

      {tab === 'stats'    && <StatsView selected={selected} setSelected={setSelected} />}
      {tab === 'earnings' && <EarningsList />}
      {tab === 'payouts'  && <PayoutsList />}
    </ScrollView>
  )
}

// ===== Sous-vues =====

function StatsView({ selected, setSelected }: { selected: StatPeriod; setSelected: (s: StatPeriod) => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ['driver-stats'],
    queryFn: fetchDriverStats,
    refetchInterval: 30_000,
  })
  const current = data?.[selected]
  const avg = current && current.courses > 0 ? Math.round(current.earnings / current.courses) : 0

  if (isLoading || !data) return <ActivityIndicator color="#FFC300" />

  return (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingVertical: 4, gap: 8 }}
        className="mb-3"
      >
        {PERIODS.map((p) => {
          const active = p.key === selected
          return (
            <Pressable
              key={p.key}
              onPress={() => setSelected(p.key)}
              className={`px-4 py-2 rounded-full border ${
                active ? 'bg-airmess-yellow border-airmess-yellow' : 'bg-white border-gray-300'
              }`}
            >
              <Text className={`text-xs ${active ? 'font-bold text-airmess-dark' : 'text-gray-700'}`}>
                {p.label}
              </Text>
            </Pressable>
          )
        })}
      </ScrollView>

      <View className="bg-airmess-dark rounded-2xl p-6">
        <Text className="text-xs uppercase text-airmess-yellow font-semibold tracking-wider">
          {PERIODS.find((p) => p.key === selected)?.label}
        </Text>
        <Text className="text-4xl font-bold text-white mt-3">
          {current?.earnings.toLocaleString('fr-FR') ?? '0'}
          <Text className="text-lg text-gray-400"> FCFA</Text>
        </Text>
        <View className="flex-row gap-6 mt-4 pt-4 border-t border-gray-700">
          <View>
            <Text className="text-xs text-gray-400 uppercase">Courses</Text>
            <Text className="text-white font-bold text-lg mt-1">{current?.courses ?? 0}</Text>
          </View>
          <View>
            <Text className="text-xs text-gray-400 uppercase">Moyenne</Text>
            <Text className="text-white font-bold text-lg mt-1">
              {avg > 0 ? `${avg.toLocaleString('fr-FR')} FCFA` : '—'}
            </Text>
          </View>
        </View>
      </View>
    </View>
  )
}

function EarningsList() {
  const { data, isLoading } = useQuery({
    queryKey: ['driver-earnings'],
    queryFn: () => fetchDriverEarnings(1),
  })

  if (isLoading || !data) return <ActivityIndicator color="#FFC300" />

  if (data.data.length === 0) {
    return <Text className="text-center text-gray-400 mt-6">Aucun gain pour le moment.</Text>
  }

  return (
    <View>
      {data.data.map((e: EarningItem) => (
        <View key={e.id} className="bg-white rounded-xl p-3 border border-gray-200 mb-2">
          <View className="flex-row justify-between items-start">
            <View className="flex-1">
              <Text className="text-sm font-semibold text-airmess-dark">
                {e.course?.origin_quartier ?? '?'} → {e.course?.destination_quartier ?? '?'}
              </Text>
              <Text className="text-xs text-gray-500 mt-0.5">
                {e.course?.reference} · {formatDate(e.credited_at)}
              </Text>
            </View>
            <View className="items-end">
              <Text className="text-base font-bold text-airmess-dark">
                +{e.amount_fcfa.toLocaleString('fr-FR')} <Text className="text-xs">FCFA</Text>
              </Text>
              <StatusBadge status={e.status} />
            </View>
          </View>
        </View>
      ))}
    </View>
  )
}

function PayoutsList() {
  const { data, isLoading } = useQuery({
    queryKey: ['driver-payouts'],
    queryFn: () => fetchDriverPayouts(1),
  })

  if (isLoading || !data) return <ActivityIndicator color="#FFC300" />

  if (data.data.length === 0) {
    return <Text className="text-center text-gray-400 mt-6">Aucun versement pour le moment.</Text>
  }

  return (
    <View>
      {data.data.map((p: PayoutItem) => (
        <View key={p.id} className="bg-white rounded-xl p-3 border border-gray-200 mb-2">
          <View className="flex-row justify-between items-start">
            <View className="flex-1">
              <Text className="text-base font-bold text-airmess-dark">
                {p.total_amount_fcfa.toLocaleString('fr-FR')} FCFA
              </Text>
              <Text className="text-xs text-gray-500 mt-0.5">
                {p.earnings_count} course{p.earnings_count > 1 ? 's' : ''} ·{' '}
                {formatDate(p.period_start)} → {formatDate(p.period_end)}
              </Text>
              <Text className="text-xs text-gray-400 mt-0.5 capitalize">
                Méthode : {p.method.replace('_', ' ')}
              </Text>
            </View>
            <StatusBadge status={p.status} />
          </View>
        </View>
      ))}
    </View>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    pending: { bg: 'bg-amber-100',  text: 'text-amber-800',  label: 'En attente' },
    paid:    { bg: 'bg-green-100',  text: 'text-green-800',  label: 'Versé' },
    void:    { bg: 'bg-gray-100',   text: 'text-gray-500',   label: 'Annulé' },
    failed:  { bg: 'bg-red-100',    text: 'text-red-700',    label: 'Échoué' },
  }
  const cfg = map[status] ?? map.pending
  return (
    <View className={`px-2 py-0.5 rounded ${cfg.bg} mt-1`}>
      <Text className={`text-[10px] font-bold uppercase ${cfg.text}`}>{cfg.label}</Text>
    </View>
  )
}
