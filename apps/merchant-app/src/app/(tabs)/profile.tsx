import { useState, ComponentProps } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import Constants from 'expo-constants'
import { Ionicons } from '@expo/vector-icons'
import { AxiosError } from 'axios'
import { useRouter } from 'expo-router'
import { useAuthStore } from '../../stores/authStore'
import { usePushStore, pushStatusLabel } from '../../stores/pushStore'
import SupportContactSheet from '../../components/SupportContactSheet'
import Button from '../../components/ui/Button'

export default function ProfileScreen() {
  const router = useRouter()
  const { user, logout, updateProfile } = useAuthStore()
  const insets = useSafeAreaInsets()
  const [supportOpen, setSupportOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [updateLoading, setUpdateLoading] = useState(false)
  const [updateError, setUpdateError] = useState<string | null>(null)

  // Champs d'édition
  const [editName, setEditName] = useState(user?.name ?? '')
  const [editFirstName, setEditFirstName] = useState(
    user?.type === 'individual' ? user?.individual?.first_name ?? '' : ''
  )
  const [editLastName, setEditLastName] = useState(
    user?.type === 'individual' ? user?.individual?.last_name ?? '' : ''
  )
  const [editEmail, setEditEmail] = useState(user?.email ?? '')
  const [editPhone, setEditPhone] = useState(user?.phone ?? '')

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

  async function handleUpdateProfile() {
    setUpdateError(null)
    setUpdateLoading(true)
    try {
      const payload: any = {
        email: editEmail.trim(),
        phone: editPhone.trim(),
      }

      if (user?.type === 'individual') {
        payload.first_name = editFirstName.trim()
        payload.last_name = editLastName.trim()
      } else {
        payload.name = editName.trim()
      }

      await updateProfile(payload)
      setIsEditing(false)
    } catch (err) {
      let msg: string
      if (err instanceof AxiosError) {
        msg = (err.response?.data as any)?.message ?? 'Erreur de mise à jour'
      } else {
        msg = (err as Error).message
      }
      setUpdateError(msg)
    } finally {
      setUpdateLoading(false)
    }
  }

  function handleCancelEdit() {
    setEditName(user?.name ?? '')
    setEditFirstName(user?.type === 'individual' ? user?.individual?.first_name ?? '' : '')
    setEditLastName(user?.type === 'individual' ? user?.individual?.last_name ?? '' : '')
    setEditEmail(user?.email ?? '')
    setEditPhone(user?.phone ?? '')
    setUpdateError(null)
    setIsEditing(false)
  }

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
    <SafeAreaView className="flex-1 bg-cream" edges={['top']}>
      <StatusBar style="light" translucent backgroundColor="rgba(0,0,0,0.5)" />
      <KeyboardAwareScrollView
        bottomOffset={32}
        contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}
        keyboardShouldPersistTaps="handled"
      >
        {!isEditing ? (
          <>
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

              <Pressable
                onPress={() => setIsEditing(true)}
                className="mt-4 flex-row items-center bg-airmess-yellow px-4 py-2 rounded-full"
              >
                <Ionicons name="pencil" size={16} color="#1A1614" />
                <Text className="text-ink font-bold ml-2">Modifier le profil</Text>
              </Pressable>
            </View>

            <PushStatusCard />

            <View className="mx-5 mt-5 bg-off-white border border-warm-200 rounded-2xl overflow-hidden">
                            <Row
                icon="lock-closed-outline"
                label="Modifier mon mot de passe"
                onPress={() =>
                  router.push({
                    pathname: '/change-password',
                    params: { email: user?.email },
                  })
                }
              />
              <View className="h-px bg-warm-200" />
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
          </>
        ) : (
          <>
            <View className="mx-5 mt-3">
              <Pressable
                onPress={handleCancelEdit}
                className="flex-row items-center mb-4"
                hitSlop={8}
              >
                <Ionicons name="arrow-back" size={20} color="#1A1614" />
                <Text className="text-ink font-bold ml-2">Retour</Text>
              </Pressable>

              <Text className="text-3xl font-extrabold text-ink">Modifier mon profil</Text>
              <Text className="text-warm-500 mt-1 mb-5">Mets à jour tes informations</Text>

              {user?.type === 'individual' ? (
                <>
                  <EditField
                    label="Prénom"
                    value={editFirstName}
                    onChangeText={setEditFirstName}
                    placeholder="ex. Marie"
                  />
                  <EditField
                    label="Nom"
                    value={editLastName}
                    onChangeText={setEditLastName}
                    placeholder="ex. Dupont"
                  />
                </>
              ) : (
                <EditField
                  label="Nom du contact"
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="ex. Jean Dupont"
                />
              )}

              <EditField
                label="Email"
                value={editEmail}
                onChangeText={setEditEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="vous@example.com"
              />
              <EditField
                label="Téléphone"
                value={editPhone}
                onChangeText={setEditPhone}
                keyboardType="phone-pad"
                placeholder="+229 XX XXX XXX"
              />

              {updateError && (
                <View className="bg-danger-bg border-2 border-airmess-red/30 rounded-2xl p-3 mb-4 flex-row items-start">
                  <View className="w-5 h-5 rounded-full bg-airmess-red items-center justify-center mr-2 mt-0.5">
                    <Ionicons name="alert" size={10} color="#ffffff" />
                  </View>
                  <Text className="text-airmess-red text-sm flex-1 font-semibold">{updateError}</Text>
                </View>
              )}

              <View className="flex-row gap-3">
                <Pressable
                  onPress={handleCancelEdit}
                  disabled={updateLoading}
                  className="flex-1 border-2 border-warm-200 rounded-2xl py-4 items-center"
                >
                  <Text className="text-ink font-bold">Annuler</Text>
                </Pressable>
                <Pressable
                  onPress={handleUpdateProfile}
                  disabled={updateLoading}
                  className="flex-1 bg-airmess-dark rounded-2xl py-4 items-center"
                >
                  {updateLoading ? (
                    <ActivityIndicator color="#F7DC6F" />
                  ) : (
                    <Text className="text-airmess-yellow font-bold">Sauvegarder</Text>
                  )}
                </Pressable>
              </View>
            </View>
          </>
        )}
      </KeyboardAwareScrollView>

      <SupportContactSheet visible={supportOpen} onClose={() => setSupportOpen(false)} />
    </SafeAreaView>
  )
}

/**
 * Champ de formulaire pour l'édition du profil.
 */
function EditField({
  label,
  ...props
}: {
  label: string
} & ComponentProps<typeof TextInput>) {
  return (
    <View className="mb-4">
      <Text className="text-[10px] uppercase text-warm-500 tracking-widest font-extrabold mb-1.5">
        {label}
      </Text>
      <TextInput
        placeholderTextColor="#B8AF9F"
        className="border-2 border-warm-200 rounded-2xl px-4 h-14 text-base text-ink bg-off-white"
        {...props}
      />
    </View>
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
