import { useState } from 'react'
import { View, Text, ScrollView, Pressable, Alert, Platform, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery } from '@tanstack/react-query'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import Constants from 'expo-constants'
import { useAuthStore } from '../../stores/authStore'
import { fetchDriverStats } from '../../api/driver'
import { openFullScreenIntentSettings } from '../../lib/fullScreenPermission'
import SupportContactSheet from '../../components/SupportContactSheet'

// Android 14+ : la permission "notifications plein écran" doit être accordée par l'utilisateur.
const IS_ANDROID_14_PLUS =
  Platform.OS === 'android' && typeof Platform.Version === 'number' && Platform.Version >= 34

type ActivationStatus = 'active' | 'validated' | 'pending' | 'suspended' | 'banned'

const ACTIVATION_META: Record<
  ActivationStatus,
  { label: string; dotColor: string; textColor: string }
> = {
  active:    { label: 'Compte actif',        dotColor: '#16A34A', textColor: 'text-success' },
  validated: { label: 'Validé',              dotColor: '#16A34A', textColor: 'text-success' },
  pending:   { label: 'En cours de validation', dotColor: '#F59E0B', textColor: 'text-warning' },
  suspended: { label: 'Compte suspendu',     dotColor: '#D40511', textColor: 'text-airmess-red' },
  banned:    { label: 'Compte banni',        dotColor: '#D40511', textColor: 'text-airmess-red' },
}

const VEHICLE_META: Record<
  string,
  { label: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }
> = {
  scooter:  { label: 'Scooter', icon: 'moped-outline' },
  moto:     { label: 'Moto',    icon: 'motorbike' },
  voiture:  { label: 'Voiture', icon: 'car' },
  velo:     { label: 'Vélo',    icon: 'bike' },
  camion:   { label: 'Camion',  icon: 'truck-outline' },
}

/**
 * Profile driver — identité + véhicule + coordonnées + actions compte.
 *
 * Hero dark (avatar + nom + statut + stats compactes) → focus sur qui est le driver
 * Puis cards cream pour véhicule / coordonnées / actions.
 */
export default function ProfileScreen() {
  const { user, logout } = useAuthStore()
  const driver = user?.driver
  const initials = `${driver?.first_name?.[0] ?? ''}${driver?.last_name?.[0] ?? ''}`.toUpperCase()
  const [supportOpen, setSupportOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  const activationKey = (driver?.activation_status ?? 'pending') as ActivationStatus
  const activation = ACTIVATION_META[activationKey] ?? ACTIVATION_META.pending

  const vehicle = VEHICLE_META[driver?.vehicle_type ?? ''] ?? {
    label: driver?.vehicle_type ?? '—',
    icon: 'help-circle-outline' as const,
  }

  const acceptanceRate = driver?.acceptance_rate
    ? Math.round(Number(driver.acceptance_rate))
    : null

  const { data: stats } = useQuery({
    queryKey: ['driver-stats'],
    queryFn: fetchDriverStats,
  })

  const totalCourses = stats?.all_time.courses ?? 0
  const totalEarnings = stats?.all_time.earnings ?? 0
  const version = Constants.expoConfig?.version ?? ''

  function confirmLogout() {
    Alert.alert('Déconnexion', "Tu seras déconnecté de l'application.", [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Se déconnecter',
        style: 'destructive',
        onPress: async () => {
          // Loader pendant le nettoyage (token push + FGS + /auth/logout), puis la
          // redirection vers le login se fait via le store (user = null).
          setLoggingOut(true)
          try {
            await logout()
          } catch {
            setLoggingOut(false) // en cas d'échec inattendu, on rend la main
          }
        },
      },
    ])
  }

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero identité + stats */}
        <View className="mx-5 mt-3 bg-airmess-dark rounded-3xl p-6">
          <View className="items-center">
            <View className="w-24 h-24 rounded-full bg-airmess-yellow items-center justify-center">
              <Text className="text-3xl font-extrabold text-ink">{initials || '?'}</Text>
            </View>
            <Text className="text-2xl font-extrabold text-white mt-3">
              {driver?.first_name} {driver?.last_name}
            </Text>
            <View className="flex-row items-center mt-1.5 bg-white/10 px-3 py-1 rounded-full">
              <View
                className="w-2 h-2 rounded-full mr-2"
                style={{ backgroundColor: activation.dotColor }}
              />
              <Text className="text-white text-xs font-bold">{activation.label}</Text>
            </View>
          </View>

          <View className="flex-row mt-6 pt-5 border-t border-white/10">
            <StatBox
              icon="cube-outline"
              value={totalCourses > 999 ? `${(totalCourses / 1000).toFixed(1)}k` : String(totalCourses)}
              label="Livrées"
            />
            <View className="w-px bg-white/10 mx-1" />
            <StatBox
              icon="wallet-outline"
              value={totalEarnings ? `${Math.round(totalEarnings / 1000)}k` : '—'}
              label="FCFA total"
            />
            <View className="w-px bg-white/10 mx-1" />
            <StatBox
              icon="checkmark-circle-outline"
              value={acceptanceRate !== null ? `${acceptanceRate}%` : '—'}
              label="Acceptation"
            />
          </View>
        </View>

        {/* Véhicule */}
        <View className="mx-5 mt-5">
          <SectionLabel icon="car-sport-outline">Mon véhicule</SectionLabel>
          <View className="bg-off-white border border-warm-200 rounded-2xl p-5 flex-row items-center">
            <View className="w-14 h-14 rounded-2xl bg-airmess-yellow/15 items-center justify-center mr-4">
              <MaterialCommunityIcons name={vehicle.icon} size={28} color="#1A1614" />
            </View>
            <View className="flex-1">
              <Text className="text-lg font-extrabold text-ink">{vehicle.label}</Text>
              <View className="flex-row items-center mt-0.5">
                {driver?.vehicle_brand && (
                  <Text className="text-sm text-warm-600 font-semibold">
                    {driver.vehicle_brand}
                  </Text>
                )}
                {driver?.vehicle_brand && driver?.vehicle_plate && (
                  <Text className="text-warm-400 mx-1.5">·</Text>
                )}
                {driver?.vehicle_plate && (
                  <View className="bg-cream border border-warm-300 px-2 py-0.5 rounded-md">
                    <Text className="text-xs font-mono font-bold text-ink">
                      {driver.vehicle_plate}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* Coordonnées */}
        <View className="mx-5 mt-5">
          <SectionLabel icon="person-outline">Mes coordonnées</SectionLabel>
          <View className="bg-off-white border border-warm-200 rounded-2xl overflow-hidden">
            <InfoRow icon="mail-outline" label="Email" value={user?.email} />
            <InfoRow icon="call-outline" label="Téléphone" value={user?.phone} isLast />
          </View>
        </View>

        {/* Compte */}
        <View className="mx-5 mt-5">
          <SectionLabel icon="settings-outline">Compte</SectionLabel>
          <View className="bg-off-white border border-warm-200 rounded-2xl overflow-hidden">
            {IS_ANDROID_14_PLUS && (
              <ActionRow
                icon="notifications-outline"
                label="Alertes plein écran"
                onPress={() => { void openFullScreenIntentSettings() }}
              />
            )}
            <ActionRow icon="create-outline" label="Modifier mon profil" comingSoon />
            <ActionRow icon="shield-checkmark-outline" label="Mes documents" comingSoon />
            <ActionRow
              icon="help-circle-outline"
              label="Aide & support"
              onPress={() => setSupportOpen(true)}
            />
            <ActionRow
              icon="document-text-outline"
              label="Conditions générales"
              comingSoon
              isLast
            />
          </View>
        </View>

        {/* Déconnexion */}
        <View className="mx-5 mt-5">
          <View className="bg-off-white border border-warm-200 rounded-2xl overflow-hidden">
            <ActionRow
              icon="log-out-outline"
              label="Déconnexion"
              onPress={confirmLogout}
              danger
              isLast
            />
          </View>
        </View>

        {/* Footer */}
        <Text className="text-center text-[11px] text-warm-500 mt-6 font-mono">
          Air Mess Driver{version ? ` · v${version}` : ''}
        </Text>
      </ScrollView>

      <SupportContactSheet
        visible={supportOpen}
        onClose={() => setSupportOpen(false)}
        context="Profil driver"
      />

      {/* Loader plein écran pendant la déconnexion (puis redirection auto vers le login). */}
      {loggingOut && (
        <View
          className="absolute inset-0 items-center justify-center bg-airmess-dark/70"
          style={{ zIndex: 50 }}
        >
          <View className="bg-off-white rounded-2xl px-8 py-6 items-center">
            <ActivityIndicator size="large" color="#1A1614" />
            <Text className="text-ink font-bold mt-3">Déconnexion…</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  )
}

function StatBox({
  icon,
  value,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap
  value: string
  label: string
}) {
  return (
    <View className="flex-1 items-center">
      <Ionicons name={icon} size={18} color="#FFCC00" />
      <Text className="text-xl font-extrabold text-white mt-1.5">{value}</Text>
      <Text className="text-[10px] text-warm-400 uppercase tracking-widest font-bold mt-0.5">
        {label}
      </Text>
    </View>
  )
}

function SectionLabel({
  icon,
  children,
}: {
  icon: keyof typeof Ionicons.glyphMap
  children: React.ReactNode
}) {
  return (
    <View className="flex-row items-center mb-2 ml-1">
      <Ionicons name={icon} size={12} color="#8A7E68" />
      <Text className="text-[10px] uppercase text-warm-500 tracking-widest font-extrabold ml-1.5">
        {children}
      </Text>
    </View>
  )
}

function InfoRow({
  icon,
  label,
  value,
  isLast,
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  value?: string | null
  isLast?: boolean
}) {
  return (
    <View
      className={[
        'flex-row items-center px-4 py-3.5',
        isLast ? '' : 'border-b border-warm-200',
      ].join(' ')}
    >
      <View className="w-9 h-9 rounded-xl bg-warm-100 items-center justify-center mr-3">
        <Ionicons name={icon} size={16} color="#1A1614" />
      </View>
      <View className="flex-1">
        <Text className="text-[10px] uppercase text-warm-500 tracking-widest font-bold">
          {label}
        </Text>
        <Text className="text-sm text-ink font-semibold mt-0.5">{value || '—'}</Text>
      </View>
    </View>
  )
}

function ActionRow({
  icon,
  label,
  onPress,
  danger,
  comingSoon,
  isLast,
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  onPress?: () => void
  danger?: boolean
  comingSoon?: boolean
  isLast?: boolean
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={comingSoon}
      className={[
        'flex-row items-center px-4 py-4',
        isLast ? '' : 'border-b border-warm-200',
        comingSoon ? 'opacity-50' : '',
      ].join(' ')}
      style={({ pressed }) => (pressed && !comingSoon ? { opacity: 0.7 } : undefined)}
    >
      <View
        className={[
          'w-9 h-9 rounded-xl items-center justify-center mr-3',
          danger ? 'bg-danger-bg' : 'bg-warm-100',
        ].join(' ')}
      >
        <Ionicons name={icon} size={16} color={danger ? '#D40511' : '#1A1614'} />
      </View>
      <Text
        className={[
          'flex-1 text-sm font-semibold',
          danger ? 'text-airmess-red' : 'text-ink',
        ].join(' ')}
      >
        {label}
      </Text>
      {comingSoon ? (
        <View className="bg-warm-100 px-2 py-1 rounded-full">
          <Text className="text-[10px] text-warm-600 font-extrabold uppercase tracking-widest">
            Bientôt
          </Text>
        </View>
      ) : (
        <Ionicons name="chevron-forward" size={16} color="#B8AF9F" />
      )}
    </Pressable>
  )
}
