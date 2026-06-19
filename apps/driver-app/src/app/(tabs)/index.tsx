import { View, Text, ScrollView, Pressable, RefreshControl } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useAuthStore } from '../../stores/authStore'
import AvailabilityToggle from '../../components/AvailabilityToggle'
import ActiveCourseCard from '../../components/ActiveCourseCard'
import OfferedCourseItem from '../../components/OfferedCourseItem'
import { useDriverLocationTracker } from '../../hooks/useDriverLocationTracker'
import { fetchOfferedCourses, fetchMyActiveCourses, type Availability } from '../../api/driver'
import api from '../../api/client'
import { useNewCourseAlert } from '../../hooks/useNewCourseAlert'
import TodayKpiBanner from '../../components/TodayKpiBanner'


function getInitials(name: string): string {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('') || '?'
  )
}

export default function DriverDashboard() {
  const { user } = useAuthStore()
  const router = useRouter()

  // Refetch périodique du user pour récupérer availability_status à jour
  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const { data } = await api.get('/auth/me')
      return data.user
    },
    refetchInterval: 15_000,
  })

  const me = meQuery.data ?? user
  const availability = (me?.driver?.availability_status ?? 'offline') as Availability | 'busy'

  const activeQuery = useQuery({
    queryKey: ['my-active'],
    queryFn: fetchMyActiveCourses,
    refetchInterval: 10_000,
  })

  const activeCourse = activeQuery.data?.[0]

  const offeredQuery = useQuery({
    queryKey: ['offered-courses'],
    queryFn: fetchOfferedCourses,
    enabled: availability === 'available' && !activeCourse,
    refetchInterval: 8_000,
  })

  // le son pour la notification
  useNewCourseAlert(availability === 'available' ? (offeredQuery.data?.length ?? 0) : 0)

  function refreshAll() {
    meQuery.refetch()
    activeQuery.refetch()
    offeredQuery.refetch()
  }

  useDriverLocationTracker({ availability })

  return (
    <ScrollView
      className="flex-1 bg-gray-100"
      contentContainerStyle={{ padding: 16, paddingTop: 50 }}
      refreshControl={
        <RefreshControl refreshing={meQuery.isRefetching || activeQuery.isRefetching} onRefresh={refreshAll} />
      }
    >
      {/* Header */}
      <View className="flex-row justify-between items-center mb-4">
        <View className="flex-1">
          <Text className="text-xs text-gray-500">Bonjour 👋</Text>
          <Text className="text-xl font-bold text-airmess-dark">
            {me?.driver?.first_name ?? me?.name}
          </Text>
        </View>
        <Pressable
          onPress={() => router.push('/(tabs)/profile')}
          className="w-12 h-12 rounded-full bg-airmess-yellow items-center justify-center active:opacity-80"
        >
          <Text className="text-airmess-dark font-bold text-base">
            {getInitials(me?.driver?.first_name ?? me?.name ?? '?')}
          </Text>
        </Pressable>
      </View>

      {/* Toggle disponibilité */}
      <View className="mb-4">
        <AvailabilityToggle current={availability} />
      </View>

      {/* Banner stats du jour */}
      <TodayKpiBanner />

      {/* Course active */}
      {activeCourse && (
        <View className="mb-4">
          <Text className="text-xs uppercase text-gray-500 font-semibold mb-2">
            🎯 Course active
          </Text>
          <ActiveCourseCard course={activeCourse} />
        </View>
      )}

      {/* Propositions */}
      {!activeCourse && availability === 'available' && (
        <View className="mb-4">
          <Text className="text-xs uppercase text-gray-500 font-semibold mb-2">
            📦 Courses proposées
          </Text>
          {offeredQuery.isLoading && (
            <Text className="text-center text-gray-500 py-8">Chargement...</Text>
          )}
          {!offeredQuery.isLoading && (offeredQuery.data?.length ?? 0) === 0 && (
            <View className="bg-white rounded-2xl p-8 items-center">
              <View className="w-20 h-20 rounded-full bg-gray-100 items-center justify-center mb-4">
                <Ionicons name="bicycle-outline" size={44} color="#9CA3AF" />
              </View>
              <Text className="text-base font-semibold text-airmess-dark text-center">
                Aucune proposition pour l'instant
              </Text>
              <Text className="text-sm text-gray-500 text-center mt-2 leading-relaxed">
                Reste à l'écoute, ça va arriver.{'\n'}On scanne la zone toutes les 8 secondes.
              </Text>
              <View className="flex-row items-center gap-2 mt-4 bg-gray-50 px-3 py-1.5 rounded-full">
                <View className="w-2 h-2 rounded-full bg-green-500" />
                <Text className="text-xs text-gray-600 font-medium">Recherche active</Text>
              </View>
            </View>
          )}
         {(() => {
            const list = offeredQuery.data ?? []
            const express = list.filter(c => c.urgency === 'express')
            const standard = list.filter(c => c.urgency !== 'express')
            return (
                <>
                {express.length > 0 && (
                    <>
                    <Text className="text-xs uppercase font-bold text-orange-600 mb-2">
                        ⚡ Express ({express.length})
                    </Text>
                    {express.map(c => <OfferedCourseItem key={c.id} course={c} />)}
                    </>
                )}
                {standard.length > 0 && (
                    <>
                    <Text className="text-xs uppercase font-bold text-gray-500 mt-3 mb-2">
                        Standard ({standard.length})
                    </Text>
                    {standard.map(c => <OfferedCourseItem key={c.id} course={c} />)}
                    </>
                )}
                </>
            )
            })()}
        </View>
      )}

      {!activeCourse && availability !== 'available' && (
        <View className="bg-white rounded-2xl p-8 items-center">
          <View className="w-20 h-20 rounded-full bg-gray-100 items-center justify-center mb-4">
            <Ionicons name="moon-outline" size={44} color="#9CA3AF" />
          </View>
          <Text className="text-base font-semibold text-airmess-dark text-center">
            Tu es hors ligne
          </Text>
          <Text className="text-sm text-gray-500 text-center mt-2 leading-relaxed">
            Active "Disponible" en haut{'\n'}pour recevoir des propositions de courses.
          </Text>
        </View>
      )}
    </ScrollView>
  )
}
