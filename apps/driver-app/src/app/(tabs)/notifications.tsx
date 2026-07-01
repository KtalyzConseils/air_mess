import { useMemo, useState } from 'react'
import { View, Text, FlatList, RefreshControl, Pressable, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import {
  fetchNotifications,
  markNotificationRead,
  type NotificationItem,
} from '../../api/notifications'

type FilterKey = 'all' | 'unread'

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all',    label: 'Toutes' },
  { key: 'unread', label: 'Non lues' },
]

/**
 * Notifications driver.
 *
 *   Header : titre + total + chips "Toutes / Non lues"
 *   Item lu     : bg off-white, icône neutre warm-100
 *   Item non lu : bg cream + **stripe jaune 4px à gauche** + pastille rouge + icône colorée
 */
export default function NotificationsScreen() {
  const [filter, setFilter] = useState<FilterKey>('all')

  const {
    data,
    isLoading,
    isRefetching,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['notifications'],
    queryFn: ({ pageParam = 1 }) => fetchNotifications(pageParam as number),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.current_page < last.last_page ? last.current_page + 1 : undefined,
    refetchInterval: 20_000,
  })

  const items = useMemo(
    () => (data?.pages.flatMap((p) => p?.data ?? []) ?? []).filter(Boolean),
    [data],
  )
  const filteredItems = useMemo(
    () => (filter === 'unread' ? items.filter((n) => n.read_at === null) : items),
    [items, filter],
  )
  const unreadCount = useMemo(() => items.filter((n) => n.read_at === null).length, [items])
  const total = data?.pages[0]?.total ?? 0

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={['top', 'left', 'right']}>
      {/* Header */}
      <View className="bg-off-white border-b border-warm-200 px-5 pt-3 pb-4">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-3xl font-extrabold text-ink">Notifications</Text>
            <Text className="text-sm text-warm-500 mt-0.5">
              {total} au total
              {unreadCount > 0 ? (
                <Text className="text-airmess-red font-bold"> · {unreadCount} non lue{unreadCount > 1 ? 's' : ''}</Text>
              ) : null}
            </Text>
          </View>
          <View className="w-12 h-12 rounded-2xl bg-airmess-yellow/15 items-center justify-center">
            <Ionicons name="notifications-outline" size={22} color="#1A1614" />
          </View>
        </View>

        {/* Chips filtre */}
        <View className="flex-row gap-2 mt-4">
          {FILTERS.map((f) => {
            const active = f.key === filter
            const showUnreadBadge = f.key === 'unread' && unreadCount > 0
            return (
              <Pressable
                key={f.key}
                onPress={() => setFilter(f.key)}
                className={[
                  'flex-row items-center px-3.5 py-1.5 rounded-full border-2',
                  active ? 'bg-ink border-ink' : 'bg-off-white border-warm-200',
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
                {showUnreadBadge && (
                  <View
                    className={[
                      'ml-2 min-w-[18px] h-[18px] rounded-full items-center justify-center px-1',
                      active ? 'bg-airmess-yellow' : 'bg-airmess-red',
                    ].join(' ')}
                  >
                    <Text
                      className={[
                        'text-[10px] font-extrabold',
                        active ? 'text-ink' : 'text-white',
                      ].join(' ')}
                    >
                      {unreadCount}
                    </Text>
                  </View>
                )}
              </Pressable>
            )
          })}
        </View>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#1A1614" size="large" />
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(n) => n.id.toString()}
          renderItem={({ item }) => <NotificationRow item={item} />}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24 }}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#1A1614" />
          }
          onEndReached={() => hasNextPage && !isFetchingNextPage && fetchNextPage()}
          onEndReachedThreshold={0.5}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={
            <View className="bg-off-white border border-warm-200 rounded-2xl p-8 items-center mt-6">
              <Ionicons name="notifications-off-outline" size={32} color="#B8AF9F" />
              <Text className="text-warm-500 text-sm mt-2 text-center">
                {filter === 'unread'
                  ? 'Tu as tout lu. Beau travail.'
                  : 'Aucune notification pour le moment.'}
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

function NotificationRow({ item }: { item: NotificationItem }) {
  const queryClient = useQueryClient()
  const mut = useMutation({
    mutationFn: () => markNotificationRead(item.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] })
    },
  })

  const isRead = item.read_at !== null
  const meta = iconMetaFor(item.type)

  return (
    <Pressable
      onPress={() => !isRead && mut.mutate()}
      style={({ pressed }) => (pressed ? { opacity: 0.85 } : undefined)}
      className={[
        'rounded-2xl overflow-hidden flex-row',
        isRead
          ? 'bg-off-white border border-warm-200'
          : 'bg-airmess-yellow/10 border-2 border-airmess-yellow/40',
      ].join(' ')}
    >
      {/* Stripe jaune signature à gauche quand non lu */}
      {!isRead && <View className="w-1 bg-airmess-yellow" />}

      <View className="flex-1 flex-row items-start p-4">
        {/* Icône dans pastille */}
        <View
          className={[
            'w-10 h-10 rounded-xl items-center justify-center mr-3',
            isRead ? 'bg-warm-100' : meta.bgClass,
          ].join(' ')}
        >
          <Ionicons
            name={meta.icon}
            size={18}
            color={isRead ? '#6B6250' : meta.iconColor}
          />
        </View>

        {/* Contenu */}
        <View className="flex-1">
          <View className="flex-row items-start justify-between">
            <Text
              className={[
                'flex-1 text-base',
                isRead ? 'font-semibold text-ink' : 'font-extrabold text-ink',
              ].join(' ')}
              numberOfLines={2}
            >
              {item.title}
            </Text>
            {!isRead && (
              <View className="w-2 h-2 rounded-full bg-airmess-red mt-2 ml-2" />
            )}
          </View>
          <Text className="text-sm text-warm-600 mt-1" numberOfLines={3}>
            {item.body}
          </Text>
          <Text className="text-[11px] text-warm-500 mt-2 font-semibold">
            {formatRelative(item.created_at)}
          </Text>
        </View>
      </View>
    </Pressable>
  )
}

interface IconMeta {
  icon: keyof typeof Ionicons.glyphMap
  iconColor: string
  bgClass: string
}

/**
 * Déduit l'icône + tone de la notification à partir de son type.
 * Fallback bell si le type est inconnu.
 */
function iconMetaFor(type: string): IconMeta {
  if (type.includes('course')) {
    if (type.includes('assigned') || type.includes('new')) {
      return { icon: 'flash', iconColor: '#D40511', bgClass: 'bg-danger-bg' }
    }
    if (type.includes('delivered')) {
      return { icon: 'checkmark-circle', iconColor: '#16A34A', bgClass: 'bg-success-bg' }
    }
    if (type.includes('failed') || type.includes('cancelled')) {
      return { icon: 'close-circle', iconColor: '#D40511', bgClass: 'bg-danger-bg' }
    }
    return { icon: 'cube-outline', iconColor: '#1A1614', bgClass: 'bg-airmess-yellow/20' }
  }
  if (type.includes('wallet') || type.includes('payment') || type.includes('withdraw')) {
    return { icon: 'wallet', iconColor: '#1A1614', bgClass: 'bg-airmess-yellow/20' }
  }
  if (type.includes('incident') || type.includes('alert')) {
    return { icon: 'warning', iconColor: '#F59E0B', bgClass: 'bg-warning-bg' }
  }
  if (type.includes('account') || type.includes('profile') || type.includes('kyc')) {
    return { icon: 'person-circle', iconColor: '#0284C7', bgClass: 'bg-info-bg' }
  }
  return { icon: 'notifications', iconColor: '#1A1614', bgClass: 'bg-warm-100' }
}

function formatRelative(iso: string): string {
  const now = Date.now()
  const then = new Date(iso).getTime()
  const diffMs = now - then
  const min = Math.round(diffMs / 60_000)
  if (min < 1) return "à l'instant"
  if (min < 60) return `il y a ${min} min`
  const h = Math.round(min / 60)
  if (h < 24) return `il y a ${h} h`
  const d = Math.round(h / 24)
  if (d < 7) return `il y a ${d} j`
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}
