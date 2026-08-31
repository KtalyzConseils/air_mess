import { ActivityIndicator, Pressable, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchNotifications, markNotificationRead, type AppNotification } from '../../api/notifications'
import Card from '../../components/ui/Card'
import Screen from '../../components/ui/Screen'

export default function NotificationsScreen() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: ['notifications', 'list'],
    queryFn: fetchNotifications,
    refetchInterval: 30_000,
  })
  const readMutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const openNotification = (notification: AppNotification) => {
    if (!notification.read_at) readMutation.mutate(notification.id)
    if (notification.course_id) {
      router.push({ pathname: '/courses/[id]', params: { id: String(notification.course_id) } })
    }
  }

  return (
    <Screen scroll py={18} className="px-5">
      <Text className="text-xs font-extrabold uppercase tracking-widest text-airmess-red">Activité</Text>
      <Text className="mb-5 mt-1 text-3xl font-extrabold text-ink">Notifications</Text>

      {query.isLoading ? (
        <ActivityIndicator color="#1A1614" />
      ) : (query.data ?? []).length === 0 ? (
        <Card className="items-center py-10">
          <Ionicons name="notifications-off-outline" size={32} color="#8A7E68" />
          <Text className="mt-3 text-base font-extrabold text-ink">Aucune notification</Text>
          <Text className="mt-1 text-center text-sm text-warm-500">
            Les événements importants apparaîtront ici.
          </Text>
        </Card>
      ) : (
        <View className="gap-3">
          {(query.data ?? []).map((notification) => (
            <Pressable key={notification.id} onPress={() => openNotification(notification)}>
              <Card className={notification.read_at ? 'opacity-70' : 'border-airmess-yellow'}>
                <View className="flex-row items-start">
                  <View className="h-11 w-11 items-center justify-center rounded-full bg-warm-100">
                    <Ionicons name={notificationIcon(notification.type)} size={21} color="#1A1614" />
                  </View>
                  <View className="ml-3 flex-1">
                    <View className="flex-row items-center">
                      <Text className="flex-1 text-base font-extrabold text-ink">{notification.title}</Text>
                      {!notification.read_at ? <View className="ml-2 h-2.5 w-2.5 rounded-full bg-airmess-red" /> : null}
                    </View>
                    <Text className="mt-1 text-sm leading-5 text-warm-600">{notification.body}</Text>
                    <Text className="mt-2 text-xs font-semibold text-warm-400">{formatDate(notification.created_at)}</Text>
                  </View>
                </View>
              </Card>
            </Pressable>
          ))}
        </View>
      )}
    </Screen>
  )
}

function notificationIcon(type: string): keyof typeof Ionicons.glyphMap {
  if (type.startsWith('course.')) return 'cube-outline'
  if (type.includes('withdraw')) return 'arrow-up-circle-outline'
  if (type.includes('wallet')) return 'wallet-outline'
  return 'notifications-outline'
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}
