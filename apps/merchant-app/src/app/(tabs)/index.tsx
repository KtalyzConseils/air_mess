import { View, Text, Pressable, RefreshControl, ScrollView, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuthStore } from '../../stores/authStore'
import { fetchCourses } from '../../api/courses'
import { fetchWallet } from '../../api/wallet'

export default function DashboardScreen() {
  const user = useAuthStore((s) => s.user)
  const router = useRouter()

  const { data: courses, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['courses', 'dashboard'],
    queryFn: () => fetchCourses({ per_page: 5 }),
    refetchInterval: 20_000,
  })

  const { data: wallet } = useQuery({
    queryKey: ['wallet'],
    queryFn: fetchWallet,
    refetchInterval: 30_000,
  })

  const displayName =
    user?.type === 'marchant'
      ? user.marchant?.raison_sociale ?? user.name
      : user?.individual
        ? `${user.individual.first_name} ${user.individual.last_name}`
        : user?.name

  const pendingValidation =
    user?.type === 'marchant' && !user.marchant?.validated_at

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={['top']}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#1A1614" />
        }
      >
        <Text className="text-warm-500 text-xs font-bold uppercase tracking-widest">
          {user?.type === 'marchant' ? 'Marchand' : 'Particulier'}
        </Text>
        <Text className="text-3xl font-extrabold text-ink mt-1">{displayName}</Text>

        {pendingValidation && (
          <View className="mt-4 bg-warning/15 border border-warning/40 rounded-2xl p-4">
            <Text className="text-ink font-bold">Compte en validation</Text>
            <Text className="text-warm-500 text-sm mt-1">
              Tu peux explorer l’app, mais la création de courses sera disponible après validation
              commerciale.
            </Text>
          </View>
        )}

        <View className="flex-row gap-3 mt-5">
          <View className="flex-1 bg-airmess-dark rounded-3xl p-4">
            <Text className="text-airmess-yellow text-[10px] font-extrabold uppercase tracking-widest">
              Solde
            </Text>
            <Text className="text-white text-2xl font-extrabold mt-1">
              {wallet ? wallet.available.toLocaleString('fr-FR') : '—'}
            </Text>
            <Text className="text-warm-400 text-xs">FCFA dispo</Text>
          </View>
          <View className="flex-1 bg-off-white border border-warm-200 rounded-3xl p-4">
            <Text className="text-warm-500 text-[10px] font-extrabold uppercase tracking-widest">
              Courses
            </Text>
            <Text className="text-ink text-2xl font-extrabold mt-1">
              {courses?.total ?? '—'}
            </Text>
            <Text className="text-warm-500 text-xs">au total</Text>
          </View>
        </View>

        <Pressable
          onPress={() => router.push('/new-course')}
          disabled={pendingValidation}
          className={`mt-5 rounded-2xl py-4 items-center flex-row justify-center ${
            pendingValidation ? 'bg-warm-200 opacity-60' : 'bg-airmess-yellow'
          }`}
        >
          <Ionicons name="add-circle" size={22} color="#1A1614" />
          <Text className="text-ink font-extrabold text-base ml-2">Nouvelle course</Text>
        </Pressable>

        <Text className="text-lg font-extrabold text-ink mt-8 mb-3">Dernières courses</Text>
        {isLoading ? (
          <ActivityIndicator color="#1A1614" />
        ) : (courses?.data?.length ?? 0) === 0 ? (
          <Text className="text-warm-500">Aucune course pour le moment.</Text>
        ) : (
          courses!.data.map((c) => (
            <Pressable
              key={c.id}
              onPress={() => router.push(`/course/${c.id}`)}
              className="bg-off-white border border-warm-200 rounded-2xl p-4 mb-3 active:opacity-80"
            >
              <View className="flex-row justify-between items-start">
                <Text className="font-bold text-ink">{c.reference}</Text>
                <Text className="text-xs text-warm-500">{c.status_label ?? c.status}</Text>
              </View>
              <Text className="text-sm text-warm-500 mt-1" numberOfLines={1}>
                {c.origin_quartier} → {c.destination_quartier}
              </Text>
            </Pressable>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
