import { useState } from 'react'
import { View, Text, Pressable, RefreshControl } from 'react-native'
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller'
import { useQuery } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuthStore } from '../../stores/authStore'
import AvailabilityToggle from '../../components/AvailabilityToggle'
import ActiveCourseCard from '../../components/ActiveCourseCard'
import OfferedCourseItem from '../../components/OfferedCourseItem'
import SupportContactSheet from '../../components/SupportContactSheet'
import AcceptTermsSheet from '../../components/AcceptTermsSheet'
import { useDriverLocationTracker } from '../../hooks/useDriverLocationTracker'
import { fetchOfferedCourses, fetchMyActiveCourses, type Availability } from '../../api/driver'
import api from '../../api/client'
import { useNewCourseAlert } from '../../hooks/useNewCourseAlert'
import TodayKpiBanner from '../../components/TodayKpiBanner'
import Card from '../../components/ui/Card'

function initials(first?: string, last?: string, fallback?: string): string {
  const res = `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase()
  return res || fallback?.[0]?.toUpperCase() || '?'
}

export default function DriverDashboard() {
  const { user } = useAuthStore()
  const router = useRouter()

  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const { data } = await api.get('/auth/me')
      return data as { user: any; terms?: { needs_acceptance: boolean } }
    },
    refetchInterval: 15_000,
  })

  const me = meQuery.data?.user ?? user
  const availability = (me?.driver?.availability_status ?? 'offline') as Availability | 'busy'
  const isBanned = me?.driver?.activation_status === 'banned'
  // Compte pas encore activé par l'admin : connexion OK, mais impossible de se rendre
  // disponible (l'API refuse). On l'indique clairement plutôt que de laisser le toggle
  // échouer en silence. `banned` a son propre écran de blocage ci-dessous.
  const pendingValidation =
    !!me?.driver && me.driver.activation_status !== 'active' && !isBanned
  const needsTermsAcceptance = meQuery.data?.terms?.needs_acceptance ?? false

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
  const avatar = initials(me?.driver?.first_name, me?.driver?.last_name, me?.name)

  const [bannedSupportOpen, setBannedSupportOpen] = useState(false)

  // Cas 7 — Driver banni : écran de blocage complet.
  if (isBanned) {
    return (
      <SafeAreaView className="flex-1 bg-cream" edges={['top', 'left', 'right', 'bottom']}>
        <View className="flex-1 items-center justify-center px-6">
          <View className="w-20 h-20 rounded-full bg-airmess-red/10 items-center justify-center mb-5">
            <Ionicons name="alert-circle" size={44} color="#D40511" />
          </View>
          <Text className="text-2xl font-jk-extrabold text-ink text-center">Compte banni</Text>
          <Text className="text-sm text-warm-600 text-center mt-3 leading-5 font-jk">
            Votre compte a été banni suite à un signalement de fraude. Contactez le support
            pour toute réclamation.
          </Text>
          <View className="w-full mt-6 gap-2">
            <Pressable
              onPress={() => setBannedSupportOpen(true)}
              className="h-12 rounded-2xl bg-airmess-yellow items-center justify-center flex-row"
              style={({ pressed }) => (pressed ? { opacity: 0.85 } : undefined)}
            >
              <Ionicons name="help-circle" size={18} color="#1A1614" />
              <Text className="text-ink font-jk-extrabold ml-2">Contacter le support</Text>
            </Pressable>
            <Pressable
              onPress={() => useAuthStore.getState().logout()}
              className="h-12 rounded-2xl border-2 border-warm-300 items-center justify-center flex-row"
              style={({ pressed }) => (pressed ? { opacity: 0.85 } : undefined)}
            >
              <Ionicons name="log-out-outline" size={18} color="#6E6558" />
              <Text className="text-warm-600 font-jk-bold ml-2">Se déconnecter</Text>
            </Pressable>
          </View>
        </View>

        <SupportContactSheet
          visible={bannedSupportOpen}
          onClose={() => setBannedSupportOpen(false)}
          context="Compte banni — demande de réclamation"
        />
      </SafeAreaView>
    )
  }

  const list = offeredQuery.data ?? []
  const express = list.filter((c) => c.urgency === 'express')
  const standard = list.filter((c) => c.urgency !== 'express')

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={['top', 'left', 'right']}>
      <KeyboardAwareScrollView
        bottomOffset={16}
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 28 }}
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
        {/* ============ HEADER ============ */}
        <View className="flex-row items-center justify-between mb-4">
          <Pressable
            onPress={() => router.push('/(tabs)/profile')}
            className="flex-row items-center flex-1"
            style={({ pressed }) => (pressed ? { opacity: 0.8 } : undefined)}
          >
            <View className="w-11 h-11 rounded-full bg-airmess-yellow items-center justify-center">
              <Text className="text-ink font-jk-extrabold text-[15px]">{avatar}</Text>
            </View>
            <View className="ml-3 flex-1">
              <Text className="text-xs text-warm-500 font-jk-medium">Salut 👋</Text>
              <Text className="text-xl font-jk-extrabold text-ink" numberOfLines={1}>
                {firstName}
              </Text>
            </View>
          </Pressable>
          <Pressable
            onPress={() => router.push('/(tabs)/notifications')}
            className="w-11 h-11 rounded-full bg-airmess-dark items-center justify-center ml-2"
            style={({ pressed }) => (pressed ? { opacity: 0.85 } : undefined)}
          >
            <Ionicons name="paper-plane" size={18} color="#FFCC00" />
          </Pressable>
        </View>

        {/* ============ STATUT ============ */}
        <View className="mb-4">
          <AvailabilityToggle current={availability} pendingValidation={pendingValidation} />
        </View>

        {/* ============ AUJOURD'HUI ============ */}
        <View className="mb-5">
          <TodayKpiBanner />
        </View>

        {/* ============ COURSE ACTIVE ============ */}
        {activeCourse && (
          <View className="mb-4">
            <Text className="text-base font-jk-extrabold text-ink mb-2">Course active</Text>
            <ActiveCourseCard course={activeCourse} />
          </View>
        )}

        {/* ============ PROPOSITIONS ============ */}
        {!activeCourse && availability === 'available' && (
          <View>
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-base font-jk-extrabold text-ink">Courses proposées</Text>
              <View className="flex-row items-center">
                <View className="w-1.5 h-1.5 rounded-full bg-success mr-1.5" />
                <Text className="text-warm-500 text-xs font-jk-medium">Scan zone · 8 s</Text>
              </View>
            </View>

            {offeredQuery.isLoading && (
              <Card variant="default" padding="lg">
                <Text className="text-center text-warm-500 text-sm font-jk">Chargement…</Text>
              </Card>
            )}

            {!offeredQuery.isLoading && list.length === 0 && <EmptyStateSearching />}

            {express.length > 0 && (
              <View className="mb-2">
                <View className="flex-row items-center mb-2">
                  <View className="flex-row items-center bg-airmess-red/10 px-2 py-1 rounded-md">
                    <Ionicons name="flash" size={11} color="#D40511" />
                    <Text className="text-airmess-red text-[11px] font-jk-extrabold ml-1">
                      Express
                    </Text>
                  </View>
                  <Text className="text-warm-500 text-xs font-jk-medium ml-2">
                    {express.length} prioritaire{express.length > 1 ? 's' : ''}
                  </Text>
                </View>
                {express.map((c) => (
                  <OfferedCourseItem key={c.id} course={c} />
                ))}
              </View>
            )}

            {standard.length > 0 && (
              <View className="mb-2">
                <View className="flex-row items-center mb-2 mt-1">
                  <Text className="text-ink text-[11px] font-jk-extrabold uppercase tracking-wide">
                    Standard
                  </Text>
                  <Text className="text-warm-500 text-xs font-jk-medium ml-2">
                    · {standard.length} course{standard.length > 1 ? 's' : ''}
                  </Text>
                </View>
                {standard.map((c) => (
                  <OfferedCourseItem key={c.id} course={c} />
                ))}
              </View>
            )}
          </View>
        )}

        {/* ============ HORS-LIGNE ============ */}
        {!activeCourse && availability !== 'available' && availability !== 'busy' && (
          <EmptyStateOffline availability={availability} />
        )}
      </KeyboardAwareScrollView>

      {/* CGU — modale plein écran bloquante si non accepté */}
      <AcceptTermsSheet visible={needsTermsAcceptance} onAccepted={() => meQuery.refetch()} />
    </SafeAreaView>
  )
}

/* ============================================================ */

function EmptyStateSearching() {
  return (
    <Card variant="default" padding="lg" className="items-center">
      <View className="w-16 h-16 rounded-full bg-warm-100 items-center justify-center mb-3">
        <Ionicons name="bicycle-outline" size={32} color="#8A7E68" />
      </View>
      <Text className="text-base font-jk-bold text-ink text-center">Aucune proposition</Text>
      <Text className="text-sm text-warm-500 text-center mt-1.5 leading-relaxed font-jk">
        Reste à l'écoute, ça va arriver.{'\n'}On scanne la zone toutes les 8 s.
      </Text>
      <View className="flex-row items-center gap-2 mt-4 bg-success-bg px-3 py-1.5 rounded-full">
        <View className="w-1.5 h-1.5 rounded-full bg-success" />
        <Text className="text-xs text-success font-jk-bold">Recherche active</Text>
      </View>
    </Card>
  )
}

function EmptyStateOffline({ availability }: { availability: string }) {
  const isPause = availability === 'on_break'
  return (
    <Card variant="default" padding="lg" className="items-center">
      <View className="w-16 h-16 rounded-full bg-warm-100 items-center justify-center mb-3">
        <Ionicons name={isPause ? 'cafe-outline' : 'moon-outline'} size={32} color="#8A7E68" />
      </View>
      <Text className="text-base font-jk-bold text-ink text-center">
        {isPause ? 'Tu es en pause' : 'Tu es hors service'}
      </Text>
      <Text className="text-sm text-warm-500 text-center mt-1.5 leading-relaxed font-jk">
        Passe en <Text className="font-jk-bold text-ink">Disponible</Text>
        {'\n'}pour recevoir des propositions.
      </Text>
    </Card>
  )
}
