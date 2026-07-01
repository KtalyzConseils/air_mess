import { useCallback, useMemo, useState } from 'react'
import { View, Text, SectionList, RefreshControl, ActivityIndicator, Pressable } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { fetchDriverHistory, type CourseHistoryItem } from '../../api/driver'

type FilterKey = 'all' | 'delivered' | 'failed'

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all',       label: 'Tout' },
  { key: 'delivered', label: 'Livrées' },
  { key: 'failed',    label: 'Échouées' },
]

const STATUS_META: Record<
  string,
  {
    label: string
    icon: keyof typeof Ionicons.glyphMap
    dotColor: string
    textClass: string
    bgClass: string
  }
> = {
  delivered: {
    label: 'Livrée',
    icon: 'checkmark',
    dotColor: '#16A34A',
    textClass: 'text-success',
    bgClass: 'bg-success-bg',
  },
  failed: {
    label: 'Échouée',
    icon: 'close',
    dotColor: '#D40511',
    textClass: 'text-airmess-red',
    bgClass: 'bg-danger-bg',
  },
}

/**
 * Historique des courses clôturées.
 *
 *   Header sticky : titre + trio stats (Livrées / Échouées / Gains dark) + filter chips
 *   SectionList : bucket "Aujourd'hui / Hier / Cette semaine / Plus ancien"
 *   Item : reference + trajet timeline + status pill + gain ou 0 FCFA barré
 */
export default function HistoryScreen() {
  const [filter, setFilter] = useState<FilterKey>('all')
  const [nowMs] = useState(() => Date.now())

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

  const stats = useMemo(() => {
    const delivered = allItems.filter((c) => c.status === 'delivered')
    const failed = allItems.filter((c) => c.status === 'failed')
    const earnings = delivered.reduce((sum, c) => sum + c.driver_earnings, 0)
    return { delivered: delivered.length, failed: failed.length, earnings }
  }, [allItems])

  const sections = useMemo(() => {
    const buckets: Record<string, CourseHistoryItem[]> = {}
    for (const c of filteredItems) {
      const key = bucketOf(c.delivered_at ?? c.created_at, nowMs)
      if (!buckets[key]) buckets[key] = []
      buckets[key].push(c)
    }
    const order = ["Aujourd'hui", 'Hier', 'Cette semaine', 'Plus ancien']
    return order
      .filter((k) => buckets[k]?.length > 0)
      .map((k) => ({ title: k, data: buckets[k] }))
  }, [filteredItems, nowMs])

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={['top', 'left', 'right']}>
      {/* Header — hors ScrollView pour rester en haut */}
      <View className="bg-off-white border-b border-warm-200 px-5 pt-3 pb-4">
        <Text className="text-3xl font-extrabold text-ink">Historique</Text>
        <Text className="text-sm text-warm-500 mt-0.5">
          Tes courses clôturées (livrées ou échouées).
        </Text>

        {/* Trio stats */}
        <View className="flex-row gap-2 mt-4">
          <StatCell
            label="Livrées"
            value={String(stats.delivered)}
            icon="checkmark-circle-outline"
            tone="success"
          />
          <StatCell
            label="Échouées"
            value={String(stats.failed)}
            icon="close-circle-outline"
            tone="danger"
          />
          {/* Gains : signature dark + stripe jaune */}
          <View className="flex-[1.5] bg-airmess-dark rounded-2xl overflow-hidden flex-row">
            <View className="w-1 bg-airmess-yellow" />
            <View className="flex-1 px-3 py-2.5">
              <Text className="text-[9px] uppercase text-airmess-yellow tracking-widest font-extrabold">
                Gains
              </Text>
              <Text className="text-lg font-extrabold text-white mt-0.5" numberOfLines={1}>
                {stats.earnings.toLocaleString('fr-FR')}
                <Text className="text-[10px] font-bold text-warm-400"> FCFA</Text>
              </Text>
            </View>
          </View>
        </View>

        {/* Chips filtre */}
        <View className="flex-row gap-2 mt-3">
          {FILTERS.map((f) => {
            const active = f.key === filter
            return (
              <Pressable
                key={f.key}
                onPress={() => setFilter(f.key)}
                className={[
                  'px-3.5 py-1.5 rounded-full border-2',
                  active
                    ? 'bg-ink border-ink'
                    : 'bg-off-white border-warm-200',
                ].join(' ')}
                style={({ pressed }) => (pressed ? { opacity: 0.85 } : undefined)}
              >
                <Text
                  className={[
                    'text-xs',
                    active ? 'text-airmess-yellow font-extrabold' : 'text-ink font-semibold',
                  ].join(' ')}
                >
                  {f.label}
                </Text>
              </Pressable>
            )
          })}
        </View>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#1A1614" size="large" />
        </View>
      ) : error ? (
        <View className="bg-danger-bg border-2 border-airmess-red/30 rounded-2xl p-6 m-5 items-center">
          <View className="w-10 h-10 rounded-full bg-airmess-red items-center justify-center mb-3">
            <Ionicons name="alert" size={18} color="#ffffff" />
          </View>
          <Text className="text-airmess-red font-extrabold text-center mb-1">
            Erreur de chargement
          </Text>
          <Text className="text-airmess-red text-xs text-center mb-4">
            {error instanceof Error ? error.message : 'Réessaie dans un instant.'}
          </Text>
          <Pressable onPress={() => refetch()} className="bg-ink rounded-2xl px-5 py-3">
            <Text className="text-white text-sm font-bold">Réessayer</Text>
          </Pressable>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => <HistoryItem course={item} />}
          renderSectionHeader={({ section: { title } }) => (
            <View className="flex-row items-center mt-5 mb-2">
              <View className="w-1 h-3 rounded-full bg-airmess-yellow mr-2" />
              <Text className="text-[10px] uppercase font-extrabold text-warm-500 tracking-widest">
                {title}
              </Text>
            </View>
          )}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 24 }}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#1A1614" />
          }
          onEndReached={() => hasNextPage && !isFetchingNextPage && fetchNextPage()}
          onEndReachedThreshold={0.5}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View className="bg-off-white border border-warm-200 rounded-2xl p-8 items-center mt-6">
              <Ionicons name="file-tray-outline" size={32} color="#B8AF9F" />
              <Text className="text-warm-500 text-sm mt-2 text-center">
                {filter === 'all'
                  ? "Aucune course clôturée pour l'instant."
                  : `Aucune course ${FILTERS.find((f) => f.key === filter)?.label.toLowerCase()}.`}
              </Text>
            </View>
          }
          ListFooterComponent={
            isFetchingNextPage ? (
              <ActivityIndicator color="#1A1614" style={{ marginVertical: 20 }} />
            ) : null
          }
        />
      )}
    </SafeAreaView>
  )
}

function StatCell({
  label,
  value,
  icon,
  tone,
}: {
  label: string
  value: string
  icon: keyof typeof Ionicons.glyphMap
  tone: 'success' | 'danger'
}) {
  const bg = tone === 'success' ? 'bg-success-bg' : 'bg-danger-bg'
  const iconColor = tone === 'success' ? '#16A34A' : '#D40511'
  const textColor = tone === 'success' ? 'text-success' : 'text-airmess-red'
  return (
    <View className={`flex-1 ${bg} rounded-2xl px-3 py-2.5`}>
      <View className="flex-row items-center">
        <Ionicons name={icon} size={12} color={iconColor} />
        <Text
          className={`text-[9px] uppercase ${textColor} tracking-widest font-extrabold ml-1`}
        >
          {label}
        </Text>
      </View>
      <Text className={`text-lg font-extrabold ${textColor} mt-0.5`}>{value}</Text>
    </View>
  )
}

function HistoryItem({ course }: { course: CourseHistoryItem }) {
  const meta = STATUS_META[course.status] ?? {
    label: course.status,
    icon: 'help-circle' as const,
    dotColor: '#8A7E68',
    textClass: 'text-warm-600',
    bgClass: 'bg-warm-100',
  }
  const time = new Date(course.delivered_at ?? course.created_at).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <View className="bg-off-white border border-warm-200 rounded-2xl p-4 mb-2.5">
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-[10px] font-mono text-warm-400">{course.reference}</Text>
        <View className={`flex-row items-center px-2 py-1 rounded-full ${meta.bgClass}`}>
          <Ionicons name={meta.icon} size={10} color={meta.dotColor} />
          <Text className={`text-[10px] font-extrabold ml-1 ${meta.textClass}`}>{meta.label}</Text>
        </View>
      </View>

      {/* Trajet dots */}
      <View>
        <View className="flex-row items-center">
          <View className="w-2 h-2 rounded-full bg-success mr-2.5" />
          <Text className="text-sm font-extrabold text-ink flex-1" numberOfLines={1}>
            {course.origin_quartier}
          </Text>
        </View>
        <View className="ml-[3px] my-0.5">
          <View className="w-0.5 h-2.5 bg-warm-300" />
        </View>
        <View className="flex-row items-center">
          <View className="w-2 h-2 rounded-full bg-airmess-red mr-2.5" />
          <Text className="text-sm font-extrabold text-ink flex-1" numberOfLines={1}>
            {course.destination_quartier}
            {course.destination_city ? (
              <Text className="text-xs text-warm-500 font-medium"> · {course.destination_city}</Text>
            ) : null}
          </Text>
        </View>
      </View>

      {/* Footer time + gain */}
      <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-warm-200">
        <View className="flex-row items-center">
          <Ionicons name="time-outline" size={11} color="#8A7E68" />
          <Text className="text-xs text-warm-500 font-semibold ml-1">{time}</Text>
        </View>
        {course.status === 'delivered' ? (
          <Text className="text-sm font-extrabold text-success">
            +{course.driver_earnings.toLocaleString('fr-FR')}
            <Text className="text-[10px] font-bold text-success/80"> FCFA</Text>
          </Text>
        ) : (
          <Text className="text-sm font-bold text-warm-400 line-through">0 FCFA</Text>
        )}
      </View>
    </View>
  )
}

function bucketOf(iso: string | null, nowMs: number): string {
  if (!iso) return 'Plus ancien'
  const date = new Date(iso)
  const today = new Date(nowMs)
  today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today.getTime() - 86_400_000)
  const weekAgo = new Date(today.getTime() - 7 * 86_400_000)

  if (date >= today) return "Aujourd'hui"
  if (date >= yesterday) return 'Hier'
  if (date >= weekAgo) return 'Cette semaine'
  return 'Plus ancien'
}
