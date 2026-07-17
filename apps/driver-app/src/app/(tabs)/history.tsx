import { useCallback, useMemo, useState } from 'react'
import { View, Text, FlatList, RefreshControl, ActivityIndicator, Pressable } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import {
  fetchDriverHistory,
  fetchDriverStats,
  type CourseHistoryItem,
} from '../../api/driver'

type FilterKey = 'all' | 'delivered' | 'failed' | 'cancelled'

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all',       label: 'Toutes' },
  { key: 'delivered', label: 'Livrées' },
  { key: 'failed',    label: 'Incidents' },
  { key: 'cancelled', label: 'Annulées' },
]

const STATUS_META: Record<
  string,
  {
    label: string
    icon: keyof typeof Ionicons.glyphMap
    color: string
    bg: string // couleur de fond du badge
  }
> = {
  delivered: { label: 'Livrée',  icon: 'checkmark-circle', color: '#16A34A', bg: '#DCFCE7' },
  failed:    { label: 'Incident', icon: 'warning',          color: '#B45309', bg: '#FEF3C7' },
  cancelled: { label: 'Annulée',  icon: 'close-circle',     color: '#D40511', bg: '#FEE2E2' },
}

function formatK(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k'
  return String(n)
}

/**
 * Historique des courses clôturées + gains cumulés.
 */
export default function HistoryScreen() {
  const [filter, setFilter] = useState<FilterKey>('all')

  const {
    data,
    isLoading,
    isRefetching,
    refetch,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['driver-history'],
    queryFn: ({ pageParam = 1 }) => fetchDriverHistory(pageParam as number),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.current_page < last.last_page ? last.current_page + 1 : undefined,
    refetchOnMount: 'always',
    staleTime: 0,
  })

  const { data: stats } = useQuery({ queryKey: ['driver-stats'], queryFn: fetchDriverStats })

  useFocusEffect(
    useCallback(() => {
      refetch()
    }, [refetch]),
  )

  const allItems = useMemo(() => {
    return (data?.pages.flatMap((p) => p?.data ?? []) ?? []).filter(
      (c): c is CourseHistoryItem => c != null && c.id != null,
    )
  }, [data])

  const filteredItems = useMemo(() => {
    if (filter === 'all') return allItems
    return allItems.filter((c) => c.status === filter)
  }, [allItems, filter])

  const header = (
    <View className="pt-3 pb-1">
      <Text className="text-3xl font-jk-extrabold text-ink">Historique</Text>
      <Text className="text-sm text-warm-500 mt-0.5 font-jk">
        Tes courses passées et gains cumulés.
      </Text>

      {/* Carte gains cumulés (hero sombre) */}
      <View className="bg-airmess-dark rounded-3xl p-5 mt-4">
        <Text className="text-warm-400 text-[11px] font-jk-bold uppercase tracking-[1.5px]">
          Gains cumulés (historique)
        </Text>
        <Text className="text-airmess-yellow text-[32px] leading-9 font-jk-extrabold mt-1">
          {(stats?.all_time.earnings ?? 0).toLocaleString('fr-FR')}
        </Text>
        <Text className="text-warm-400 text-xs font-jk-bold">FCFA</Text>

        <View className="flex-row gap-2 mt-4">
          <StatTile
            icon="cube-outline"
            label="Courses livrées"
            value={String(stats?.all_time.courses ?? 0)}
          />
          <StatTile
            icon="calendar-outline"
            label="Cette semaine"
            value={formatK(stats?.last_7.earnings ?? 0)}
            unit="FCFA"
          />
        </View>
      </View>

      {/* Chips filtre */}
      <View className="flex-row gap-2 mt-4 mb-1 flex-wrap">
        {FILTERS.map((f) => {
          const active = f.key === filter
          return (
            <Pressable
              key={f.key}
              onPress={() => setFilter(f.key)}
              className={[
                'px-4 py-2 rounded-full border',
                active ? 'bg-ink border-ink' : 'bg-off-white border-warm-200',
              ].join(' ')}
              style={({ pressed }) => (pressed ? { opacity: 0.85 } : undefined)}
            >
              <Text
                className="text-xs"
                style={{
                  color: active ? '#FFCC00' : '#1A1614',
                  fontFamily: active ? 'PlusJakartaSans_800ExtraBold' : 'PlusJakartaSans_600SemiBold',
                }}
              >
                {f.label}
              </Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  )

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-cream" edges={['top', 'left', 'right']}>
        <View className="px-5">{header}</View>
        <View className="bg-danger-bg border-2 border-airmess-red/30 rounded-2xl p-6 m-5 items-center">
          <View className="w-10 h-10 rounded-full bg-airmess-red items-center justify-center mb-3">
            <Ionicons name="alert" size={18} color="#ffffff" />
          </View>
          <Text className="text-airmess-red font-jk-extrabold text-center mb-1">
            Erreur de chargement
          </Text>
          <Pressable onPress={() => refetch()} className="bg-ink rounded-2xl px-5 py-3 mt-2">
            <Text className="text-white text-sm font-jk-bold">Réessayer</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={['top', 'left', 'right']}>
      <FlatList
        data={filteredItems}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => <HistoryCard course={item} />}
        ListHeaderComponent={header}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#1A1614" />
        }
        onEndReached={() => hasNextPage && !isFetchingNextPage && fetchNextPage()}
        onEndReachedThreshold={0.5}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator color="#1A1614" size="large" style={{ marginTop: 40 }} />
          ) : (
            <View className="bg-off-white border border-warm-200 rounded-2xl p-8 items-center mt-4">
              <Ionicons name="file-tray-outline" size={32} color="#B8AF9F" />
              <Text className="text-warm-500 text-sm mt-2 text-center font-jk">
                {filter === 'all'
                  ? "Aucune course clôturée pour l'instant."
                  : `Aucune course ${FILTERS.find((f) => f.key === filter)?.label.toLowerCase()}.`}
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          isFetchingNextPage ? (
            <ActivityIndicator color="#1A1614" style={{ marginVertical: 20 }} />
          ) : null
        }
      />
    </SafeAreaView>
  )
}

function StatTile({
  icon,
  label,
  value,
  unit,
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  value: string
  unit?: string
}) {
  return (
    <View className="flex-1 bg-white/5 rounded-2xl px-3 py-3">
      <View className="flex-row items-center">
        <Ionicons name={icon} size={12} color="#B8AF9F" />
        <Text className="text-warm-400 text-[9px] font-jk-bold uppercase tracking-wide ml-1">
          {label}
        </Text>
      </View>
      <Text className="text-white text-lg font-jk-extrabold mt-1">
        {value}
        {unit ? <Text className="text-warm-500 text-[11px] font-jk-medium"> {unit}</Text> : null}
      </Text>
    </View>
  )
}

function HistoryCard({ course }: { course: CourseHistoryItem }) {
  const meta = STATUS_META[course.status] ?? {
    label: course.status,
    icon: 'ellipse' as const,
    color: '#8A7E68',
    bg: '#F4EFE4',
  }
  const isExpress = course.urgency === 'express'
  const isDelivered = course.status === 'delivered'
  const isCancelled = course.status === 'cancelled'

  const d = new Date(course.delivered_at ?? course.created_at)
  const datePart = d
    .toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
    .toUpperCase()
  const timePart = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

  const origin = course.origin_name
    ? `${course.origin_name} — ${course.origin_quartier}`
    : course.origin_quartier

  // Couleur du gain selon l'issue.
  const amountColor = isDelivered ? '#16A34A' : isCancelled ? '#B8AF9F' : '#B45309'

  return (
    <View className="bg-off-white border border-warm-200 rounded-2xl p-4 mb-2.5">
      {/* Ligne du haut : badges | prix */}
      <View className="flex-row items-start justify-between">
        <View className="flex-1 flex-row flex-wrap items-center pr-2" style={{ gap: 6 }}>
          <View
            className="flex-row items-center px-2 py-1 rounded-md"
            style={{ backgroundColor: meta.bg }}
          >
            <Ionicons name={meta.icon} size={11} color={meta.color} />
            <Text className="text-[10px] font-jk-extrabold ml-1" style={{ color: meta.color }}>
              {meta.label}
            </Text>
          </View>
          {isExpress && (
            <View className="flex-row items-center bg-airmess-red px-2 py-1 rounded-md">
              <Ionicons name="flash" size={10} color="#ffffff" />
              <Text className="text-white text-[10px] font-jk-extrabold ml-1">Express</Text>
            </View>
          )}
        </View>
        <View className="items-end">
          <Text className="text-lg font-jk-extrabold leading-5" style={{ color: amountColor }}>
            {isCancelled ? '—' : course.driver_earnings.toLocaleString('fr-FR')}
          </Text>
          <Text className="text-[10px] font-jk-bold" style={{ color: amountColor }}>
            FCFA
          </Text>
        </View>
      </View>

      {/* Date */}
      <Text className="text-warm-500 text-[11px] font-jk-bold uppercase tracking-wide mt-2">
        {datePart} · {timePart}
      </Text>

      {/* Trajet */}
      <Text className="text-ink text-[13px] font-jk-bold mt-1" numberOfLines={1}>
        {origin}
      </Text>
      <View className="flex-row items-center mt-0.5">
        <Ionicons name="location" size={11} color="#D40511" />
        <Text className="text-warm-500 text-xs font-jk-medium ml-1 flex-1" numberOfLines={1}>
          {course.destination_quartier}
          {course.destination_city ? ` — ${course.destination_city}` : ''}
        </Text>
      </View>
    </View>
  )
}
