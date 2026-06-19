import { View, Text, FlatList, RefreshControl, Pressable, ActivityIndicator } from 'react-native'
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchNotifications, markNotificationRead, type NotificationItem } from '../../api/notifications'

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

  return (
    <Pressable
      onPress={() => !isRead && mut.mutate()}
      className={`p-4 rounded-xl mb-2 ${isRead ? 'bg-white' : 'bg-airmess-yellow/20 border border-airmess-yellow'}`}
    >
      <View className="flex-row justify-between">
        <Text className={`flex-1 ${isRead ? 'font-medium' : 'font-bold'} text-airmess-dark`}>
          {item.title}
        </Text>
        {!isRead && <View className="w-2 h-2 rounded-full bg-airmess-red mt-1 ml-2" />}
      </View>
      <Text className="text-sm text-gray-600 mt-1">{item.body}</Text>
      <Text className="text-xs text-gray-400 mt-2">
        {new Date(item.created_at).toLocaleString('fr-FR', {
          day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
        })}
      </Text>
    </Pressable>
  )
}

export default function NotificationsScreen() {
  const {
    data, isLoading, isRefetching, refetch,
    fetchNextPage, hasNextPage, isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['notifications'],
    queryFn: ({ pageParam = 1 }) => fetchNotifications(pageParam as number),
    initialPageParam: 1,
    getNextPageParam: (last) => last.current_page < last.last_page ? last.current_page + 1 : undefined,
    refetchInterval: 20_000,
  })

  const items = (data?.pages.flatMap((p) => p?.data ?? []) ?? []).filter(Boolean)

  return (
    <View className="flex-1 bg-gray-100">
      <View className="p-4 pt-12">
        <Text className="text-2xl font-bold text-airmess-dark">Notifications 🔔</Text>
        <Text className="text-sm text-gray-500 mt-0.5">
          {data?.pages[0]?.total ?? 0} au total
        </Text>
      </View>

      {isLoading ? (
        <ActivityIndicator color="#FFC300" size="large" />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(n) => n.id.toString()}
          renderItem={({ item }) => <NotificationRow item={item} />}
          contentContainerStyle={{ padding: 16, paddingTop: 0 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
          onEndReached={() => hasNextPage && !isFetchingNextPage && fetchNextPage()}
          ListEmptyComponent={
            <View className="bg-white rounded-xl p-6 items-center mt-4">
              <Text className="text-gray-500 text-center">Aucune notification pour le moment.</Text>
            </View>
          }
          ListFooterComponent={isFetchingNextPage ? <ActivityIndicator color="#FFC300" /> : null}
        />
      )}
    </View>
  )
}
