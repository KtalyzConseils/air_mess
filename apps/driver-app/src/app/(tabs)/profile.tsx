import { useState } from 'react'
import { View, Text, ScrollView, Pressable, Alert, Platform, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import Constants from 'expo-constants'
import { useAuthStore } from '../../stores/authStore'
import { fetchDriverStats } from '../../api/driver'
import { fetchWallet } from '../../api/wallet'
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
 * Profile driver — carte hero (identité + stats) conservée telle quelle, puis
 * plaque + Compte + Préférences + déconnexion.
 */
export default function ProfileScreen() {
  const { user, logout } = useAuthStore()
  const router = useRouter()
  const driver = user?.driver
  const initials = `${driver?.first_name?.[0] ?? ''}${driver?.last_name?.[0] ?? ''}`.toUpperCase()
  const [supportOpen, setSupportOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  const activationKey = (driver?.activation_status ?? 'pending') as ActivationStatus
  const activation = ACTIVATION_META[activationKey] ?? ACTIVATION_META.pending
  const isVerified = activationKey === 'active' || activationKey === 'validated'

  const vehicle = VEHICLE_META[driver?.vehicle_type ?? ''] ?? {
    label: driver?.vehicle_type ?? '—',
    icon: 'help-circle-outline' as const,
  }
  const vehicleSubtitle = driver?.vehicle_brand || vehicle.label

  const acceptanceRate = driver?.acceptance_rate
    ? Math.round(Number(driver.acceptance_rate))
    : null

  const { data: stats } = useQuery({
    queryKey: ['driver-stats'],
    queryFn: fetchDriverStats,
  })
  const { data: wallet } = useQuery({ queryKey: ['wallet'], queryFn: fetchWallet })
  const cautionLabel = wallet ? `${wallet.balance.toLocaleString('fr-FR')} FCFA` : '—'

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
        {/* Hero identité + stats — conservée telle quelle */}
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

        {/* Plaque d'immatriculation + statut vérifié */}
        <View className="mx-5 mt-5 bg-off-white border border-warm-200 rounded-2xl p-4 flex-row items-center justify-between">
          <View>
            <Text className="text-[10px] uppercase text-warm-500 tracking-widest font-jk-bold">
              Plaque d'immatriculation
            </Text>
            <Text className="text-xl font-jk-extrabold text-ink mt-0.5">
              {driver?.vehicle_plate || '—'}
            </Text>
          </View>
          {isVerified && (
            <View className="flex-row items-center bg-success-bg px-2.5 py-1.5 rounded-full">
              <Ionicons name="shield-checkmark" size={13} color="#16A34A" />
              <Text className="text-success text-[11px] font-jk-bold ml-1">Vérifié</Text>
            </View>
          )}
        </View>

        {/* Compte */}
        <View className="mx-5 mt-5">
          <SectionLabel>Compte</SectionLabel>
          <View className="bg-off-white border border-warm-200 rounded-2xl overflow-hidden">
            {IS_ANDROID_14_PLUS && (
              <ProfileRow
                icon="notifications-outline"
                title="Alertes plein écran"
                subtitle="Réveil de l'écran pour les appels"
                onPress={() => { void openFullScreenIntentSettings() }}
              />
            )}
            <ProfileRow icon="card-outline" title="Moyen de paiement" subtitle="Mobile Money" />
            <ProfileRow
              icon="shield-checkmark-outline"
              title="Sécurité & caution"
              subtitle={cautionLabel}
              onPress={() => router.push('/(tabs)/wallet')}
            />
            <ProfileRow
              icon="headset-outline"
              title="Contacter le support"
              onPress={() => setSupportOpen(true)}
              isLast
            />
          </View>
        </View>

        {/* Préférences */}
        <View className="mx-5 mt-5">
          <SectionLabel>Préférences</SectionLabel>
          <View className="bg-off-white border border-warm-200 rounded-2xl overflow-hidden">
            <ProfileRow icon="bicycle-outline" title="Mon véhicule" subtitle={vehicleSubtitle} />
            <ProfileRow icon="star-outline" title="Avis & note" comingSoon isLast />
          </View>
        </View>

        {/* Se déconnecter */}
        <Pressable
          onPress={confirmLogout}
          className="mx-5 mt-6 bg-danger-bg border border-airmess-red/20 rounded-2xl py-4 flex-row items-center justify-center"
          style={({ pressed }) => (pressed ? { opacity: 0.85 } : undefined)}
        >
          <Ionicons name="log-out-outline" size={18} color="#D40511" />
          <Text className="text-airmess-red font-jk-extrabold ml-2">Se déconnecter</Text>
        </Pressable>

        {/* Footer */}
        <Text className="text-center text-[11px] text-warm-500 mt-6 font-jk-medium">
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
            <Text className="text-ink font-jk-bold mt-3">Déconnexion…</Text>
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

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text className="text-[11px] uppercase text-warm-500 tracking-widest font-jk-bold mb-2 ml-1">
      {children}
    </Text>
  )
}

function ProfileRow({
  icon,
  title,
  subtitle,
  onPress,
  comingSoon,
  isLast,
}: {
  icon: keyof typeof Ionicons.glyphMap
  title: string
  subtitle?: string
  onPress?: () => void
  comingSoon?: boolean
  isLast?: boolean
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress || comingSoon}
      className={[
        'flex-row items-center px-4 py-3.5',
        isLast ? '' : 'border-b border-warm-200',
        comingSoon ? 'opacity-60' : '',
      ].join(' ')}
      style={({ pressed }) => (pressed && onPress ? { opacity: 0.7 } : undefined)}
    >
      <View className="w-10 h-10 rounded-xl bg-warm-100 items-center justify-center mr-3">
        <Ionicons name={icon} size={18} color="#1A1614" />
      </View>
      <View className="flex-1">
        <Text className="text-[15px] text-ink font-jk-bold">{title}</Text>
        {subtitle ? (
          <Text className="text-xs text-warm-500 font-jk-medium mt-0.5">{subtitle}</Text>
        ) : null}
      </View>
      {comingSoon ? (
        <View className="bg-warm-100 px-2 py-1 rounded-full">
          <Text className="text-[9px] uppercase text-warm-500 font-jk-bold tracking-wide">
            Bientôt
          </Text>
        </View>
      ) : onPress ? (
        <Ionicons name="chevron-forward" size={18} color="#B8AF9F" />
      ) : null}
    </Pressable>
  )
}
