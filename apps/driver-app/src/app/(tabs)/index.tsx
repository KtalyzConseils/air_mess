import { View, Text, Pressable, RefreshControl, Linking } from 'react-native'
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller'
import { useQuery } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { StatusBar } from 'react-native'
import { useAuthStore } from '../../stores/authStore'
import AvailabilityToggle from '../../components/AvailabilityToggle'
import ActiveCourseCard from '../../components/ActiveCourseCard'
import OfferedCourseItem from '../../components/OfferedCourseItem'
import { useDriverLocationTracker } from '../../hooks/useDriverLocationTracker'
import { fetchOfferedCourses, fetchMyActiveCourses, type Availability } from '../../api/driver'
import api from '../../api/client'
import { useNewCourseAlert } from '../../hooks/useNewCourseAlert'
import TodayKpiBanner from '../../components/TodayKpiBanner'
import Card from '../../components/ui/Card'

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
  const { user, logout } = useAuthStore()
  const router = useRouter()

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
  const isBanned = me?.driver?.activation_status === 'banned'

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

  useNewCourseAlert(availability === 'available' ? (offeredQuery.data?.length ?? 0) : 0)

  function refreshAll() {
    meQuery.refetch()
    activeQuery.refetch()
    offeredQuery.refetch()
  }

  useDriverLocationTracker({ availability })

  const firstName = me?.driver?.first_name ?? me?.name ?? ''

  // Cas 7 — Driver banni : écran de blocage complet. Le back retourne 403 sur
  // toutes les actions (currentDriver refuse activation_status !== 'active'),
  // on masque quand même toute l'UI pour éviter la confusion.
  if (isBanned) {
    return (
      <SafeAreaView className="flex-1 bg-cream" edges={['top', 'left', 'right', 'bottom']}>
        <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
        <View className="flex-1 items-center justify-center px-6">
          <View className="w-20 h-20 rounded-full bg-airmess-red/10 items-center justify-center mb-5">
            <Ionicons name="alert-circle" size={44} color="#D40511" />
          </View>
          <Text className="text-2xl font-extrabold text-ink text-center">
            Compte banni
          </Text>
          <Text className="text-sm text-warm-600 text-center mt-3 leading-5">
            Votre compte a été banni suite à un signalement de fraude.
            Contactez le support pour toute réclamation.
          </Text>
          <View className="w-full mt-6 gap-2">
            <Pressable
              onPress={() => Linking.openURL('tel:118')}
              className="h-12 rounded-2xl bg-airmess-yellow items-center justify-center flex-row"
              style={({ pressed }) => (pressed ? { opacity: 0.85 } : undefined)}
            >
              <Ionicons name="call" size={18} color="#1A1614" />
              <Text className="text-ink font-extrabold ml-2">Contacter le support</Text>
            </Pressable>
            <Pressable
              onPress={() => useAuthStore.getState().logout()}
              className="h-12 rounded-2xl border-2 border-warm-300 items-center justify-center flex-row"
              style={({ pressed }) => (pressed ? { opacity: 0.85 } : undefined)}
            >
              <Ionicons name="log-out-outline" size={18} color="#6E6558" />
              <Text className="text-warm-600 font-bold ml-2">Se déconnecter</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <KeyboardAwareScrollView
        bottomOffset={16}
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={
          <RefreshControl
            refreshing={meQuery.isRefetching || activeQuery.isRefetching}
            onRefresh={refreshAll}
            tintColor="#1A1614"
          />
        }
      >
        {/* ============ HEADER : greeting + avatar ============ */}
        <View className="flex-row items-center mb-5">
          <View className="flex-1">
            <Text className="text-xs text-warm-500 font-medium">Salut 👋</Text>
            <Text className="text-2xl font-extrabold text-ink mt-0.5" numberOfLines={1}>
              {firstName}
            </Text>
          </View>
          <Pressable
            onPress={() => router.push('/(tabs)/profile')}
            className="w-12 h-12 rounded-full bg-airmess-yellow items-center justify-center"
            style={({ pressed }) => (pressed ? { opacity: 0.85 } : undefined)}
          >
            <Text className="text-ink font-extrabold text-base">
              {getInitials(firstName)}
            </Text>
          </Pressable>
        </View>

        {/* ============ STATE HERO : dispo toggle ============ */}
        <View className="mb-4">
          <AvailabilityToggle current={availability} />
        </View>

        {/* ============ KPI DU JOUR ============ */}
        <View className="mb-4">
          <TodayKpiBanner />
        </View>

        {/* ============ COURSE ACTIVE (si busy) ============ */}
        {activeCourse && (
          <View className="mb-4">
            <SectionLabel icon="navigate" color="text-airmess-red">
              Course active
            </SectionLabel>
            <ActiveCourseCard course={activeCourse} />
          </View>
        )}

        {/* ============ PROPOSITIONS (si dispo & pas de course) ============ */}
        {!activeCourse && availability === 'available' && (
          <View className="mb-4">
            <SectionLabel icon="cube" color="text-ink">
              Courses proposées
            </SectionLabel>

            {offeredQuery.isLoading && (
              <Card variant="default" padding="lg">
                <Text className="text-center text-warm-500 text-sm">Chargement…</Text>
              </Card>
            )}

            {!offeredQuery.isLoading && (offeredQuery.data?.length ?? 0) === 0 && (
              <EmptyStateSearching />
            )}

            {(() => {
              const list = offeredQuery.data ?? []
              const express = list.filter((c) => c.urgency === 'express')
              const standard = list.filter((c) => c.urgency !== 'express')
              return (
                <>
                  {express.length > 0 && (
                    <View className="mb-3">
                      <View className="flex-row items-center mb-2">
                        <Ionicons name="flash" size={12} color="#D40511" />
                        <Text className="text-[10px] uppercase font-extrabold text-airmess-red ml-1 tracking-widest">
                          Express ({express.length})
                        </Text>
                      </View>
                      {express.map((c) => (
                        <OfferedCourseItem key={c.id} course={c} />
                      ))}
                    </View>
                  )}
                  {standard.length > 0 && (
                    <View>
                      <Text className="text-[10px] uppercase font-extrabold text-warm-500 mb-2 tracking-widest">
                        Standard ({standard.length})
                      </Text>
                      {standard.map((c) => (
                        <OfferedCourseItem key={c.id} course={c} />
                      ))}
                    </View>
                  )}
                </>
              )
            })()}
          </View>
        )}

        {/* ============ EMPTY STATE : hors-ligne ============ */}
        {!activeCourse && availability !== 'available' && availability !== 'busy' && (
          <EmptyStateOffline availability={availability} />
        )}
      </KeyboardAwareScrollView>
    </SafeAreaView>
  )
}

/* ============================================================
   Sous-composants — label de section, empty states
   ============================================================ */

function SectionLabel({
  icon,
  color = 'text-ink',
  children,
}: {
  icon: keyof typeof Ionicons.glyphMap
  color?: string
  children: React.ReactNode
}) {
  return (
    <View className="flex-row items-center mb-2">
      <Ionicons name={icon} size={14} color="#1A1614" />
      <Text className={`text-[10px] uppercase font-extrabold ml-1.5 tracking-widest ${color}`}>
        {children}
      </Text>
    </View>
  )
}

function EmptyStateSearching() {
  return (
    <Card variant="default" padding="lg" className="items-center">
      <View className="w-16 h-16 rounded-full bg-warm-100 items-center justify-center mb-3">
        <Ionicons name="bicycle-outline" size={32} color="#8A7E68" />
      </View>
      <Text className="text-base font-bold text-ink text-center">
        Aucune proposition
      </Text>
      <Text className="text-sm text-warm-500 text-center mt-1.5 leading-relaxed">
        Reste à l'écoute, ça va arriver.{'\n'}On scanne la zone toutes les 8 s.
      </Text>
      <View className="flex-row items-center gap-2 mt-4 bg-success-bg px-3 py-1.5 rounded-full">
        <View className="w-1.5 h-1.5 rounded-full bg-success" />
        <Text className="text-xs text-success font-bold">Recherche active</Text>
      </View>
    </Card>
  )
}

function EmptyStateOffline({ availability }: { availability: string }) {
  const isPause = availability === 'on_break'
  return (
    <Card variant="default" padding="lg" className="items-center">
      <View className="w-16 h-16 rounded-full bg-warm-100 items-center justify-center mb-3">
        <Ionicons
          name={isPause ? 'cafe-outline' : 'moon-outline'}
          size={32}
          color="#8A7E68"
        />
      </View>
      <Text className="text-base font-bold text-ink text-center">
        {isPause ? 'Tu es en pause' : 'Tu es hors service'}
      </Text>
      <Text className="text-sm text-warm-500 text-center mt-1.5 leading-relaxed">
        Passe en{' '}
        <Text className="font-bold text-ink">Disponible</Text>
        {'\n'}pour recevoir des propositions.
      </Text>
    </Card>
  )
}
