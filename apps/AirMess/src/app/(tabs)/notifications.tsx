import { useMemo } from 'react'
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from 'react-native'
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import Screen from '../../components/ui/Screen'
import {
  fetchNotifications,
  markNotificationRead,
  type NotificationItem,
} from '../../api/notifications'
import { useLanguageStore } from '../../stores/languageStore'
import { useThemeStore } from '../../stores/themeStore'

const COPY = {
  fr: {
    title: 'Notifications',
    allRead: 'Tu es a jour',
    unread: (count: number) => `${count} non lue${count > 1 ? 's' : ''}`,
    markAll: 'Tout lire',
    emptyTitle: 'Rien de neuf',
    emptyBody: 'Les alertes importantes apparaitront ici.',
    now: "A l'instant",
    minutes: (count: number) => `Il y a ${count} min`,
    hours: (count: number) => `Il y a ${count} h`,
    yesterday: 'Hier',
    days: (count: number) => `Il y a ${count} j`,
  },
  en: {
    title: 'Notifications',
    allRead: 'You are up to date',
    unread: (count: number) => `${count} unread`,
    markAll: 'Mark all read',
    emptyTitle: 'Nothing new',
    emptyBody: 'Important alerts will appear here.',
    now: 'Just now',
    minutes: (count: number) => `${count} min ago`,
    hours: (count: number) => `${count} h ago`,
    yesterday: 'Yesterday',
    days: (count: number) => `${count} d ago`,
  },
} as const

export default function NotificationsScreen() {
  const queryClient = useQueryClient()
  const language = useLanguageStore((state) => state.language)
  const theme = useThemeStore((state) => state.theme)
  const copy = COPY[language]
  const isDark = theme === 'dark'
  const iconColor = isDark ? '#FDFCF9' : '#1A1614'

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
    refetchInterval: 30_000,
  })

  const items = useMemo(
    () => (data?.pages.flatMap((page) => page.data ?? []) ?? []).filter(Boolean),
    [data],
  )
  const unreadCount = items.filter((item) => item.read_at === null).length

  const markAll = useMutation({
    mutationFn: async () => {
      await Promise.all(items.filter((item) => item.read_at === null).map((item) => markNotificationRead(item.id)))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] })
    },
  })

  return (
    <Screen py={14} className="px-5">
      <View className="mb-4 flex-row items-center justify-between">
        <View className="flex-1">
          <Text className="text-3xl font-extrabold text-ink dark:text-white">{copy.title}</Text>
          <Text className="mt-1 text-sm font-semibold text-warm-500 dark:text-[#AEB6C5]">
            {unreadCount > 0 ? copy.unread(unreadCount) : copy.allRead}
          </Text>
        </View>
        {unreadCount > 0 && (
          <Pressable
            onPress={() => markAll.mutate()}
            disabled={markAll.isPending}
            className="min-h-10 flex-row items-center rounded-full bg-airmess-yellow px-4"
            accessibilityRole="button"
          >
            {markAll.isPending ? (
              <ActivityIndicator size="small" color="#1A1614" />
            ) : (
              <>
                <Ionicons name="checkmark-done" size={16} color="#1A1614" />
                <Text className="ml-1.5 text-xs font-extrabold text-ink">{copy.markAll}</Text>
              </>
            )}
          </Pressable>
        )}
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={iconColor} size="large" />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => <NotificationRow item={item} />}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={iconColor} />
          }
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) fetchNextPage()
          }}
          onEndReachedThreshold={0.5}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View className="h-3" />}
          contentContainerStyle={{ paddingBottom: 96 }}
          ListEmptyComponent={
            <View className="mt-16 items-center px-8">
              <View className="mb-3 h-16 w-16 items-center justify-center rounded-full bg-warm-100 dark:bg-[#181B24]">
                <Ionicons name="notifications-off-outline" size={30} color={isDark ? '#AEB6C5' : '#B8AF9F'} />
              </View>
              <Text className="text-center text-lg font-extrabold text-ink dark:text-white">{copy.emptyTitle}</Text>
              <Text className="mt-1 text-center text-sm font-semibold leading-5 text-warm-500 dark:text-[#AEB6C5]">
                {copy.emptyBody}
              </Text>
            </View>
          }
          ListFooterComponent={
            isFetchingNextPage ? (
              <ActivityIndicator color={iconColor} style={{ marginVertical: 20 }} />
            ) : null
          }
        />
      )}
    </Screen>
  )
}

function NotificationRow({ item }: { item: NotificationItem }) {
  const queryClient = useQueryClient()
  const language = useLanguageStore((state) => state.language)
  const theme = useThemeStore((state) => state.theme)
  const isDark = theme === 'dark'
  const isRead = item.read_at !== null
  const meta = iconMetaFor(item.type, item.title, item.body)

  const mutation = useMutation({
    mutationFn: () => markNotificationRead(item.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] })
    },
  })

  return (
    <Pressable
      onPress={() => {
        if (!isRead) mutation.mutate()
      }}
      className="overflow-hidden rounded-2xl border border-warm-200 bg-off-white dark:border-[#2A2F3A] dark:bg-[#181B24]"
      style={({ pressed }) => (pressed ? { opacity: 0.85 } : undefined)}
      accessibilityRole="button"
    >
      <View className="flex-row">
        {!isRead && <View className="w-1 bg-airmess-yellow" />}
        <View className="flex-1 flex-row items-start p-4">
          <View
            className="mr-3 h-10 w-10 items-center justify-center rounded-full"
            style={{ backgroundColor: isRead ? (isDark ? '#11141B' : '#F4EFE4') : meta.bg }}
          >
            <Ionicons name={meta.icon} size={18} color={isRead ? (isDark ? '#AEB6C5' : '#8A7E68') : meta.color} />
          </View>
          <View className="flex-1">
            <View className="flex-row items-start">
              <Text
                className="flex-1 text-[15px] text-ink dark:text-white"
                style={{ fontFamily: isRead ? 'PlusJakartaSans_600SemiBold' : 'PlusJakartaSans_800ExtraBold' }}
                numberOfLines={2}
              >
                {item.title}
              </Text>
              {!isRead && <View className="ml-2 mt-1.5 h-2.5 w-2.5 rounded-full bg-airmess-yellow" />}
            </View>
            <Text className="mt-1 text-[13px] font-semibold leading-5 text-warm-600 dark:text-[#AEB6C5]" numberOfLines={3}>
              {item.body}
            </Text>
            <Text className="mt-2 text-[11px] font-semibold text-warm-500 dark:text-[#8F98A8]">
              {formatRelative(item.created_at, language)}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  )
}

interface IconMeta {
  icon: keyof typeof Ionicons.glyphMap
  color: string
  bg: string
}

function iconMetaFor(type: string, title = '', body = ''): IconMeta {
  const text = `${type} ${title} ${body}`.toLowerCase()
  if (text.includes('wallet') || text.includes('paiement') || text.includes('payment')) {
    return { icon: 'wallet', color: '#0284C7', bg: '#E0F2FE' }
  }
  if (text.includes('course') || text.includes('livraison') || text.includes('delivery')) {
    return { icon: 'cube', color: '#1A1614', bg: 'rgba(255,204,0,0.25)' }
  }
  if (text.includes('valid') || text.includes('profil') || text.includes('account')) {
    return { icon: 'person-circle', color: '#0284C7', bg: '#E0F2FE' }
  }
  if (text.includes('alert') || text.includes('incident') || text.includes('warning')) {
    return { icon: 'warning', color: '#B45309', bg: '#FEF3C7' }
  }
  return { icon: 'notifications', color: '#1A1614', bg: '#F4EFE4' }
}

function formatRelative(iso: string, language: 'fr' | 'en'): string {
  const copy = COPY[language]
  const diffMs = Date.now() - new Date(iso).getTime()
  const min = Math.round(diffMs / 60_000)
  if (min < 1) return copy.now
  if (min < 60) return copy.minutes(min)
  const hours = Math.round(min / 60)
  if (hours < 24) return copy.hours(hours)
  const days = Math.round(hours / 24)
  if (days === 1) return copy.yesterday
  if (days < 7) return copy.days(days)
  return new Date(iso).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}
