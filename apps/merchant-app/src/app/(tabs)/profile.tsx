import { useState } from 'react'
import { View, Text, ScrollView, Pressable, Alert, ActivityIndicator, Linking } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Constants from 'expo-constants'
import { Ionicons } from '@expo/vector-icons'
import { useAuthStore } from '../../stores/authStore'
import { usePushStore, pushStatusLabel } from '../../stores/pushStore'
import SupportContactSheet from '../../components/SupportContactSheet'

export default function ProfileScreen() {
  const { user, logout } = useAuthStore()
  const [supportOpen, setSupportOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const version = Constants.expoConfig?.version ?? ''

  const title =
    user?.type === 'marchant'
      ? user.marchant?.raison_sociale ?? user.name
      : user?.individual
        ? `${user.individual.first_name} ${user.individual.last_name}`
        : user?.name ?? '—'

  const subtitle =
    user?.type === 'marchant'
      ? user.marchant?.validated_at
        ? 'Compte validé'
        : 'En attente de validation'
      : 'Compte particulier'

  const initials = title
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')

  function confirmLogout() {
    Alert.alert('Déconnexion', "Tu seras déconnecté de l'application.", [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Se déconnecter',
        style: 'destructive',
        onPress: async () => {
          setLoggingOut(true)
          try {
            await logout()
          } catch {
            setLoggingOut(false)
          }
        },
      },
    ])
  }

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View className="mx-5 mt-3 bg-airmess-dark rounded-3xl p-6 items-center">
          <View className="w-24 h-24 rounded-full bg-airmess-yellow items-center justify-center">
            <Text className="text-3xl font-extrabold text-ink">{initials || '?'}</Text>
          </View>
          <Text className="text-2xl font-extrabold text-white mt-3 text-center">{title}</Text>
          <Text className="text-warm-400 text-sm mt-1">{subtitle}</Text>
          <Text className="text-warm-500 text-xs mt-2">{user?.email}</Text>
          {user?.phone ? (
            <Text className="text-warm-500 text-xs mt-0.5">{user.phone}</Text>
          ) : null}
        </View>

        <PushStatusCard />

        <View className="mx-5 mt-5 bg-off-white border border-warm-200 rounded-2xl overflow-hidden">
          <Row
            icon="help-circle-outline"
            label="Contacter le support"
            onPress={() => setSupportOpen(true)}
          />
        </View>

        <Pressable
          onPress={confirmLogout}
          disabled={loggingOut}
          className="mx-5 mt-6 bg-airmess-red/10 border border-airmess-red/30 rounded-2xl py-4 items-center"
        >
          {loggingOut ? (
            <ActivityIndicator color="#D40511" />
          ) : (
            <Text className="text-airmess-red font-extrabold">Se déconnecter</Text>
          )}
        </Pressable>

        {version ? (
          <Text className="text-center text-warm-500 text-xs mt-6 font-mono">v{version}</Text>
        ) : null}
      </ScrollView>

      <SupportContactSheet visible={supportOpen} onClose={() => setSupportOpen(false)} />
    </SafeAreaView>
  )
}

/**
 * État des notifications système sur ce téléphone.
 * Visible en permanence : quand le push ne marche pas, les notifications
 * continuent d'apparaître dans l'onglet Notifications (elles viennent de l'API),
 * ce qui masque complètement le problème sans cet indicateur.
 */
function PushStatusCard() {
  const { status, detail, retry } = usePushStore()
  const ok = status === 'registered'
  const checking = status === 'pending'

  const explain: Record<string, string> = {
    registered: 'Tu reçois les alertes de tes courses sur ce téléphone.',
    denied:
      "Les notifications sont désactivées pour Air Mess dans les réglages d'Android. Réactive-les pour être alerté.",
    expo_go:
      'Les notifications système ne fonctionnent pas dans Expo Go. Installe la version APK de l’app.',
    no_device: 'Les notifications système ne fonctionnent pas sur émulateur.',
    no_project_id: detail ?? 'Configuration push incomplète.',
    error: detail ?? 'Erreur inconnue.',
    pending: 'Vérification en cours…',
  }

  return (
    <View className="mx-5 mt-5 bg-off-white border border-warm-200 rounded-2xl p-4">
      <View className="flex-row items-center">
        <View
          className="w-10 h-10 rounded-full items-center justify-center mr-3"
          style={{ backgroundColor: ok ? '#E9F7EF' : checking ? '#F4EFE4' : '#FDECEC' }}
        >
          <Ionicons
            name={ok ? 'notifications' : checking ? 'time-outline' : 'notifications-off-outline'}
            size={18}
            color={ok ? '#1B8A4B' : checking ? '#8A7E68' : '#D40511'}
          />
        </View>
        <View className="flex-1">
          <Text className="font-bold text-ink">{pushStatusLabel(status)}</Text>
          <Text className="text-warm-500 text-xs mt-0.5">{explain[status]}</Text>
        </View>
      </View>

      {status === 'denied' && (
        <Pressable
          onPress={() => Linking.openSettings().catch(() => {})}
          className="mt-3 bg-airmess-yellow rounded-xl py-3 items-center"
        >
          <Text className="font-extrabold text-ink">Ouvrir les réglages</Text>
        </Pressable>
      )}

      {status === 'error' && (
        <Pressable
          onPress={retry}
          className="mt-3 border border-warm-200 rounded-xl py-3 items-center"
        >
          <Text className="font-bold text-ink">Réessayer</Text>
        </Pressable>
      )}
    </View>
  )
}

function Row({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  onPress: () => void
}) {
  return (
    <Pressable onPress={onPress} className="flex-row items-center px-4 py-4">
      <Ionicons name={icon} size={20} color="#1A1614" />
      <Text className="flex-1 ml-3 font-bold text-ink">{label}</Text>
      <Ionicons name="chevron-forward" size={18} color="#B8AF9F" />
    </Pressable>
  )
}
