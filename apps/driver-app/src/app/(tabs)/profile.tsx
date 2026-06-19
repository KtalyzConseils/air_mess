import { View, Text, ScrollView, Pressable, Alert } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { useAuthStore } from '../../stores/authStore'
import { fetchDriverStats } from '../../api/driver'

const VEHICLE_EMOJI: Record<string, string> = {
  scooter: '🛵', moto: '🏍️', voiture: '🚗', velo: '🚲', camion: '🚚',
}

const ACTIVATION_LABELS: Record<string, { label: string; color: string }> = {
  active:    { label: '✓ Compte actif',     color: 'bg-green-500' },
  validated: { label: '✓ Validé',            color: 'bg-green-500' },
  pending:   { label: '⏳ En validation',    color: 'bg-amber-500' },
  suspended: { label: '⚠ Compte suspendu',  color: 'bg-airmess-red' },
}

function StatBox({ icon, value, label }: { icon: string; value: string; label: string }) {
  return (
    <View className="flex-1 items-center">
      <Text className="text-2xl">{icon}</Text>
      <Text className="text-xl font-bold text-white mt-1">{value}</Text>
      <Text className="text-xs text-gray-300 mt-0.5">{label}</Text>
    </View>
  )
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value?: string | null }) {
  return (
    <View className="flex-row items-center py-3 border-b border-gray-100 last:border-0">
      <Text className="text-xl w-8">{icon}</Text>
      <View className="flex-1">
        <Text className="text-xs text-gray-500">{label}</Text>
        <Text className="text-sm text-airmess-dark font-medium">{value || '—'}</Text>
      </View>
    </View>
  )
}

function ActionRow({
  icon, label, onPress, danger, comingSoon,
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  onPress?: () => void
  danger?: boolean
  comingSoon?: boolean
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={comingSoon}
      className={`flex-row items-center py-4 px-1 border-b border-gray-100 last:border-0 ${
        comingSoon ? 'opacity-40' : ''
      }`}
    >
      <Ionicons
        name={icon}
        size={20}
        color={danger ? '#CC0000' : '#2C2C2C'}
        style={{ width: 32 }}
      />
      <Text className={`flex-1 text-sm font-medium ${danger ? 'text-airmess-red' : 'text-airmess-dark'}`}>
        {label}
      </Text>
      {comingSoon ? (
        <Text className="text-xs text-gray-400">À venir</Text>
      ) : (
        <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
      )}
    </Pressable>
  )
}

export default function ProfileScreen() {
  const { user, logout } = useAuthStore()
  const driver = user?.driver
  const initials = `${driver?.first_name?.[0] ?? ''}${driver?.last_name?.[0] ?? ''}`.toUpperCase()
  const activation = ACTIVATION_LABELS[driver?.activation_status ?? 'pending']
  const vehicleEmoji = VEHICLE_EMOJI[driver?.vehicle_type ?? ''] ?? '🚙'
  const acceptanceRate = driver?.acceptance_rate ? Math.round(Number(driver.acceptance_rate)) : null

  const { data: stats } = useQuery({
    queryKey: ['driver-stats'],
    queryFn: fetchDriverStats,
  })

  function confirmLogout() {
    Alert.alert(
      'Déconnexion',
      'Tu seras déconnecté de l\'application.',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Se déconnecter', style: 'destructive', onPress: () => logout() },
      ],
    )
  }

  return (
    <ScrollView className="flex-1 bg-gray-100">
      {/* HERO */}
      <View className="bg-airmess-dark px-6 pt-14 pb-6">
        <View className="items-center">
          {/* Avatar circulaire avec initiales */}
          <View className="w-24 h-24 rounded-full bg-airmess-yellow items-center justify-center shadow-lg">
            <Text className="text-3xl font-bold text-airmess-dark">{initials}</Text>
          </View>

          <Text className="text-2xl font-bold text-white mt-3">
            {driver?.first_name} {driver?.last_name}
          </Text>

          {activation && (
            <View className={`${activation.color} px-3 py-1 rounded-full mt-2`}>
              <Text className="text-white text-xs font-semibold">{activation.label}</Text>
            </View>
          )}
        </View>

        {/* Stats compactes en bandeau */}
        <View className="flex-row mt-6 pt-5 border-t border-gray-700">
          <StatBox
            icon="📦"
            value={stats?.all_time.courses.toString() ?? '—'}
            label="Livrées"
          />
          <View className="w-px bg-gray-700 mx-2" />
          <StatBox
            icon="💰"
            value={stats ? `${Math.round(stats.all_time.earnings / 1000)}k` : '—'}
            label="FCFA total"
          />
          <View className="w-px bg-gray-700 mx-2" />
          <StatBox
            icon="⭐"
            value={acceptanceRate !== null ? `${acceptanceRate}%` : '—'}
            label="Acceptation"
          />
        </View>
      </View>

      {/* VÉHICULE */}
      <View className="mx-4 mt-4 bg-white rounded-2xl p-5 shadow-sm">
        <Text className="text-xs uppercase text-gray-500 font-semibold mb-3">Mon véhicule</Text>
        <View className="flex-row items-center">
          <Text className="text-5xl mr-4">{vehicleEmoji}</Text>
          <View className="flex-1">
            <Text className="text-lg font-bold text-airmess-dark capitalize">
              {driver?.vehicle_type ?? '—'}
            </Text>
            <Text className="text-sm text-gray-500">
              {driver?.vehicle_color ? `${driver.vehicle_color} · ` : ''}
              <Text className="font-mono">{driver?.vehicle_plate ?? '—'}</Text>
            </Text>
          </View>
        </View>
      </View>

      {/* COORDONNÉES */}
      <View className="mx-4 mt-4 bg-white rounded-2xl px-5 py-2">
        <Text className="text-xs uppercase text-gray-500 font-semibold pt-3 pb-1">Mes coordonnées</Text>
        <InfoRow icon="📧" label="Email"     value={user?.email} />
        <InfoRow icon="📞" label="Téléphone" value={user?.phone} />
      </View>

      {/* ACTIONS */}
      <View className="mx-4 mt-4 bg-white rounded-2xl px-5 py-2 mb-2">
        <Text className="text-xs uppercase text-gray-500 font-semibold pt-3 pb-1">Compte</Text>
        <ActionRow icon="person-outline"    label="Modifier mon profil" comingSoon />
        <ActionRow icon="shield-outline"    label="Mes documents"        comingSoon />
        <ActionRow icon="help-circle-outline" label="Aide & support"    comingSoon />
        <ActionRow icon="document-text-outline" label="Conditions générales" comingSoon />
      </View>

      {/* DÉCONNEXION */}
      <View className="mx-4 mt-2 bg-white rounded-2xl px-5 py-2">
        <ActionRow icon="log-out-outline" label="Déconnexion" danger onPress={confirmLogout} />
      </View>

      {/* Footer version */}
      <Text className="text-center text-xs text-gray-400 my-6">
        RMess Livreur · v1.0.0
      </Text>
    </ScrollView>
  )
}
