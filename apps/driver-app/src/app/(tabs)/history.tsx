import { useCallback, useMemo, useState } from 'react'
import { View, Text, SectionList, RefreshControl, ActivityIndicator, Pressable } from 'react-native'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useFocusEffect } from 'expo-router'
import { fetchDriverHistory, type CourseHistoryItem } from '../../api/driver'

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  delivered: { label: '✅ Livrée',   color: 'text-green-700' },
  failed:    { label: '❌ Échouée', color: 'text-red-700' },
}

type FilterKey = 'all' | 'delivered' | 'failed'

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all',       label: 'Tout' },
  { key: 'delivered', label: 'Livrées' },
  { key: 'failed',    label: 'Échouées' },
]

function HistoryItem({ course }: { course: CourseHistoryItem }) {
  const s = STATUS_LABEL[course.status] ?? { label: course.status, color: 'text-gray-700' }

  return (
    <View className="bg-white rounded-xl p-4 mb-3">
      <View className="flex-row justify-between items-start">
        <View className="flex-1">
          <Text className="text-xs font-mono text-gray-400">{course.reference}</Text>
          <Text className="text-base font-bold text-airmess-dark mt-1" numberOfLines={1}>
            {course.origin_quartier} → {course.destination_quartier}
          </Text>
          <Text className="text-xs text-gray-500 mt-0.5">{course.destination_city}</Text>
        </View>
        <Text className={`text-xs font-semibold ${s.color}`}>{s.label}</Text>
      </View>
      <View className="flex-row justify-between items-center mt-3 pt-3 border-t border-gray-100">
        <Text className="text-xs text-gray-500">
          {new Date(course.delivered_at ?? course.created_at).toLocaleTimeString('fr-FR', {
            hour: '2-digit', minute: '2-digit',
          })}
        </Text>
        {course.status === 'delivered' ? (
          <Text className="text-sm font-bold text-green-600">
            +{course.driver_earnings.toLocaleString('fr-FR')} FCFA
          </Text>
        ) : (
          <Text className="text-sm font-bold text-gray-400 line-through">0 FCFA</Text>
        )}
      </View>
    </View>
  )
}

// Renvoie le bucket de date d'un ISO : "Aujourd'hui", "Hier", "Cette semaine", "Plus ancien"
function bucketOf(iso: string | null, nowMs: number): string {
  if (!iso) return 'Plus ancien'
  const date = new Date(iso)
  const today = new Date(nowMs)
  today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today.getTime() - 86_400_000)
  const weekAgo = new Date(today.getTime() - 7 * 86_400_000)

  if (date >= today)     return "Aujourd'hui"
  if (date >= yesterday) return 'Hier'
  if (date >= weekAgo)   return 'Cette semaine'
  return 'Plus ancien'
}

export default function HistoryScreen() {
  const [filter, setFilter] = useState<FilterKey>('all')
  const [nowMs] = useState(() => Date.now())

  const {
    data, isLoading, isRefetching, refetch, error,
    fetchNextPage, hasNextPage, isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['driver-history'],
    queryFn: ({ pageParam = 1 }) => fetchDriverHistory(pageParam as number),
    initialPageParam: 1,
    getNextPageParam: (last) => last.current_page < last.last_page ? last.current_page + 1 : undefined,
    refetchOnMount: 'always',
    staleTime: 0,
  })

  // Refetch automatique chaque fois que la tab redevient active
  useFocusEffect(
    useCallback(() => {
      refetch()
    }, [refetch])
  )

  // Items aplatis + filtre + déduplication défensive
  const allItems = useMemo(() => {
    return (data?.pages.flatMap((p) => p?.data ?? []) ?? [])
      .filter((c): c is CourseHistoryItem => c != null && c.id != null)
  }, [data])

  const filteredItems = useMemo(() => {
    if (filter === 'all') return allItems
    return allItems.filter((c) => c.status === filter)
  }, [allItems, filter])

  // Stats résumées (sur les items reçus, pas tous les items du backend)
  const stats = useMemo(() => {
    const delivered = allItems.filter((c) => c.status === 'delivered')
    const failed = allItems.filter((c) => c.status === 'failed')
    const earnings = delivered.reduce((sum, c) => sum + c.driver_earnings, 0)
    return { delivered: delivered.length, failed: failed.length, earnings }
  }, [allItems])

  // Groupement par bucket pour SectionList
  const sections = useMemo(() => {
    const buckets: Record<string, CourseHistoryItem[]> = {}
    for (const c of filteredItems) {
      const key = bucketOf(c.delivered_at ?? c.created_at, nowMs)
      if (!buckets[key]) buckets[key] = []
      buckets[key].push(c)
    }
    // Ordre fixe et cohérent
    const order = ["Aujourd'hui", 'Hier', 'Cette semaine', 'Plus ancien']
    return order
      .filter((k) => buckets[k]?.length > 0)
      .map((k) => ({ title: k, data: buckets[k] }))
  }, [filteredItems, nowMs])

  return (
    <View className="flex-1 bg-gray-100">
      <View className="p-4 pt-12 bg-white border-b border-gray-100">
        <Text className="text-2xl font-bold text-airmess-dark">Historique 🕓</Text>

        {/* Stats résumées */}
        <View className="flex-row gap-2 mt-3">
          <View className="flex-1 bg-green-50 rounded-lg p-2.5">
            <Text className="text-xs text-gray-500 uppercase">Livrées</Text>
            <Text className="text-lg font-bold text-green-700">{stats.delivered}</Text>
          </View>
          <View className="flex-1 bg-red-50 rounded-lg p-2.5">
            <Text className="text-xs text-gray-500 uppercase">Échouées</Text>
            <Text className="text-lg font-bold text-red-700">{stats.failed}</Text>
          </View>
          <View className="flex-[1.4] bg-airmess-dark rounded-lg p-2.5">
            <Text className="text-xs text-airmess-yellow uppercase">Gains</Text>
            <Text className="text-lg font-bold text-white">
              {stats.earnings.toLocaleString('fr-FR')}
              <Text className="text-xs text-gray-400 font-normal"> FCFA</Text>
            </Text>
          </View>
        </View>

        {/* Pills de filtre */}
        <View className="flex-row gap-2 mt-3">
          {FILTERS.map((f) => {
            const active = f.key === filter
            return (
              <Pressable
                key={f.key}
                onPress={() => setFilter(f.key)}
                className={`px-3 py-1.5 rounded-full border ${
                  active ? 'bg-airmess-yellow border-airmess-yellow' : 'bg-white border-gray-300'
                }`}
              >
                <Text className={`text-xs ${active ? 'font-bold text-airmess-dark' : 'text-gray-700'}`}>
                  {f.label}
                </Text>
              </Pressable>
            )
          })}
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator color="#FFC300" size="large" style={{ marginTop: 40 }} />
      ) : error ? (
        <View className="bg-red-50 rounded-xl p-6 m-4 items-center">
          <Text className="text-red-700 font-semibold text-center mb-2">
            Erreur de chargement
          </Text>
          <Text className="text-red-600 text-xs text-center mb-3">
            {error instanceof Error ? error.message : 'Réessaie dans un instant.'}
          </Text>
          <Pressable
            onPress={() => refetch()}
            className="bg-airmess-dark rounded-lg px-4 py-2"
          >
            <Text className="text-white text-sm font-semibold">Réessayer</Text>
          </Pressable>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => <HistoryItem course={item} />}
          renderSectionHeader={({ section: { title } }) => (
            <Text className="text-xs uppercase font-bold text-gray-500 tracking-wider mt-4 mb-2 px-1">
              {title}
            </Text>
          )}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={{ padding: 16, paddingTop: 8 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
          onEndReached={() => hasNextPage && !isFetchingNextPage && fetchNextPage()}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            <View className="bg-white rounded-xl p-6 items-center mt-4">
              <Text className="text-gray-500 text-center">
                {filter === 'all'
                  ? 'Aucune course clôturée pour le moment.'
                  : `Aucune course "${FILTERS.find((f) => f.key === filter)?.label.toLowerCase()}".`}
              </Text>
            </View>
          }
          ListFooterComponent={
            isFetchingNextPage
              ? <ActivityIndicator color="#FFC300" style={{ marginVertical: 16 }} />
              : null
          }
        />
      )}
    </View>
  )
}
