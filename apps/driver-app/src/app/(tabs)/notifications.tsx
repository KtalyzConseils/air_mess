import { useMemo } from 'react'
import { View, Text, FlatList, RefreshControl, Pressable, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import {
  fetchNotifications,
  markNotificationRead,
  type NotificationItem,
} from '../../api/notifications'

/**
 * Notifications driver.
 *
 *   Header : titre + nb non lues + "Tout lire"
 *   Carte non lue : liseré jaune à gauche + pastille jaune + icône colorée (selon le sens)
 *   Carte lue     : sobre, icône grise
 */
export default function NotificationsScreen() {
  const queryClient = useQueryClient()

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
  const unreadCount = useMemo(() => items.filter((n) => n.read_at === null).length, [items])

  // "Tout lire" : marque toutes les notifs non lues déjà chargées.
  const markAll = useMutation({
    mutationFn: async () => {
      const unread = items.filter((n) => n.read_at === null)
      await Promise.all(unread.map((n) => markNotificationRead(n.id)))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] })
    },
  })

  const header = (
    <View className="pt-3 pb-1">
      <View className="flex-row items-center justify-between">
        <View className="flex-1">
          <Text className="text-3xl font-jk-extrabold text-ink">Notifications</Text>
          <Text className="text-sm mt-0.5 font-jk" style={{ color: unreadCount > 0 ? '#B45309' : '#8A7E68' }}>
            {unreadCount > 0
              ? `${unreadCount} non lue${unreadCount > 1 ? 's' : ''}`
              : 'Tu es à jour ✨'}
          </Text>
        </View>
        {unreadCount > 0 && (
          <Pressable
            onPress={() => markAll.mutate()}
            disabled={markAll.isPending}
            className="flex-row items-center bg-airmess-yellow/15 px-3.5 py-2 rounded-full"
            style={({ pressed }) => (pressed ? { opacity: 0.8 } : undefined)}
          >
            {markAll.isPending ? (
              <ActivityIndicator size="small" color="#1A1614" />
            ) : (
              <>
                <Ionicons name="checkmark-done" size={15} color="#1A1614" />
                <Text className="text-ink text-xs font-jk-bold ml-1.5">Tout lire</Text>
              </>
            )}
          </Pressable>
        )}
      </View>
    </View>
  )

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={['top', 'left', 'right']}>
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#1A1614" size="large" />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(n) => n.id.toString()}
          renderItem={({ item }) => <NotificationRow item={item} />}
          ListHeaderComponent={header}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#1A1614" />
          }
          onEndReached={() => hasNextPage && !isFetchingNextPage && fetchNextPage()}
          onEndReachedThreshold={0.5}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={
            <View className="items-center mt-16 px-8">
              <View className="w-16 h-16 rounded-full bg-warm-100 items-center justify-center mb-3">
                <Ionicons name="notifications-off-outline" size={30} color="#B8AF9F" />
              </View>
              <Text className="text-ink font-jk-bold text-center">Rien de neuf</Text>
              <Text className="text-warm-500 text-sm mt-1 text-center font-jk">
                On te préviendra dès qu'une course ou un bonus arrive. Bonne route 🛵
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
  const meta = iconMetaFor(item.type, item.title, item.body)

  return (
    <Pressable
      onPress={() => !isRead && mut.mutate()}
      style={({ pressed }) => (pressed ? { opacity: 0.85 } : undefined)}
      className="rounded-2xl overflow-hidden flex-row bg-off-white border border-warm-200"
    >
      {/* Liseré jaune signature à gauche quand non lu */}
      {!isRead && <View className="w-1 bg-airmess-yellow" />}

      <View className="flex-1 flex-row items-start p-4">
        {/* Icône (colorée selon le sens si non lu, grise si lu) */}
        <View
          className="w-10 h-10 rounded-full items-center justify-center mr-3"
          style={{ backgroundColor: isRead ? '#F4EFE4' : meta.bg }}
        >
          <Ionicons name={meta.icon} size={18} color={isRead ? '#8A7E68' : meta.color} />
        </View>

        {/* Contenu */}
        <View className="flex-1">
          <View className="flex-row items-start justify-between">
            <Text
              className="flex-1 text-[15px] text-ink"
              style={{
                fontFamily: isRead
                  ? 'PlusJakartaSans_600SemiBold'
                  : 'PlusJakartaSans_800ExtraBold',
              }}
              numberOfLines={2}
            >
              {item.title}
            </Text>
            {!isRead && <View className="w-2.5 h-2.5 rounded-full bg-airmess-yellow mt-1.5 ml-2" />}
          </View>
          <Text className="text-[13px] text-warm-600 mt-1 font-jk leading-5" numberOfLines={3}>
            {item.body}
          </Text>
          <Text className="text-[11px] text-warm-500 mt-2 font-jk-semibold">
            {formatRelative(item.created_at)}
          </Text>
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

/**
 * Icône + couleur d'une notif — déduites du type ET du contenu (titre/corps),
 * pour toujours coller au sens même quand le `type` back est générique.
 */
function iconMetaFor(type: string, title = '', body = ''): IconMeta {
  const t = `${type} ${title} ${body}`.toLowerCase()

  if (t.includes('course') || t.includes('livraison') || t.includes('retrait colis')) {
    if (t.includes('express') || t.includes('disponible') || t.includes('offered') || t.includes('nouvelle') || t.includes('assigned')) {
      return { icon: 'flash', color: '#D40511', bg: '#FEE2E2' }
    }
    if (t.includes('livr') || t.includes('delivered')) {
      return { icon: 'checkmark-circle', color: '#16A34A', bg: '#DCFCE7' }
    }
    if (t.includes('annul') || t.includes('cancel') || t.includes('échou') || t.includes('fail')) {
      return { icon: 'close-circle', color: '#D40511', bg: '#FEE2E2' }
    }
    return { icon: 'cube', color: '#1A1614', bg: 'rgba(255,204,0,0.2)' }
  }
  if (t.includes('caution') || t.includes('wallet') || t.includes('débloqu') || t.includes('restitu') || t.includes('dépôt') || t.includes('depot')) {
    return { icon: 'shield-checkmark', color: '#16A34A', bg: '#DCFCE7' }
  }
  if (t.includes('prime') || t.includes('bonus') || t.includes('promo') || t.includes('pointe') || t.includes('offert') || t.includes('cadeau')) {
    return { icon: 'gift', color: '#0284C7', bg: '#E0F2FE' }
  }
  if (t.includes('paiement') || t.includes('payout') || t.includes('payment') || t.includes('hebdo') || t.includes('récap') || t.includes('recap') || t.includes('virement')) {
    return { icon: 'cash', color: '#0284C7', bg: '#E0F2FE' }
  }
  if (t.includes('sac') || t.includes('isotherme') || t.includes('équip') || t.includes('equip') || t.includes('matériel')) {
    return { icon: 'pricetag', color: '#6B6250', bg: '#F4EFE4' }
  }
  if (t.includes('incident') || t.includes('alert') || t.includes('sos')) {
    return { icon: 'warning', color: '#B45309', bg: '#FEF3C7' }
  }
  if (t.includes('compte') || t.includes('profil') || t.includes('valid') || t.includes('kyc') || t.includes('document')) {
    return { icon: 'person-circle', color: '#0284C7', bg: '#E0F2FE' }
  }
  return { icon: 'notifications', color: '#1A1614', bg: '#F4EFE4' }
}

function formatRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const min = Math.round(diffMs / 60_000)
  if (min < 1) return "À l'instant"
  if (min < 60) return `Il y a ${min} min`
  const h = Math.round(min / 60)
  if (h < 24) return `Il y a ${h} h`
  const d = Math.round(h / 24)
  if (d === 1) return 'Hier'
  if (d < 7) return `Il y a ${d} j`
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}
