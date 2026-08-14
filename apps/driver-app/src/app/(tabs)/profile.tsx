import { useState } from 'react'
import { View, Text, ScrollView, Pressable, Alert, Platform, ActivityIndicator, Linking, TextInput, Image, type TextInputProps } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useRouter, type Href } from 'expo-router'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import Constants from 'expo-constants'
import { useAuthStore } from '../../stores/authStore'
import { fetchDriverStats, updateDriverProfile, type DriverProfilePayload } from '../../api/driver'
import { fetchWallet } from '../../api/wallet'
import { openFullScreenIntentSettings } from '../../lib/fullScreenPermission'
import SupportContactSheet from '../../components/SupportContactSheet'
import { getAddMarchantRoleUrl } from '../../lib/signupUrl'
import BottomSheet from '../../components/ui/BottomSheet'
import Button from '../../components/ui/Button'

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

const VEHICLE_OPTIONS: { value: DriverProfilePayload['vehicle_type']; label: string }[] = [
  { value: 'moto', label: 'Moto' },
  { value: 'scooter', label: 'Scooter' },
  { value: 'voiture', label: 'Voiture' },
  { value: 'velo', label: 'Vélo' },
]

const RESPONSE_CHANNEL_OPTIONS: {
  value: NonNullable<DriverProfilePayload['preferred_response_channel']>
  label: string
}[] = [
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'sms', label: 'SMS' },
  { value: 'email', label: 'Email' },
]

const STATS_ROUTE = '/stats' as Href

/**
 * Profile driver — carte hero (identité + stats) conservée telle quelle, puis
 * plaque + Compte + Préférences + déconnexion.
 */
export default function ProfileScreen() {
  const { user, logout, token, deleteAccount, setUser } = useAuthStore()
  const router = useRouter()
  const driver = user?.driver
  const initials = `${driver?.first_name?.[0] ?? ''}${driver?.last_name?.[0] ?? ''}`.toUpperCase()
  const [supportOpen, setSupportOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [form, setForm] = useState<DriverProfilePayload>(() => ({
    first_name: driver?.first_name ?? '',
    last_name: driver?.last_name ?? '',
    phone: user?.phone ?? '',
    vehicle_type: (driver?.vehicle_type as DriverProfilePayload['vehicle_type']) || 'moto',
    vehicle_plate: driver?.vehicle_plate ?? '',
    vehicle_brand: driver?.vehicle_brand ?? '',
    preferred_response_channel: driver?.preferred_response_channel ?? null,
  }))

  function openEditProfile() {
    setForm({
      first_name: driver?.first_name ?? '',
      last_name: driver?.last_name ?? '',
      phone: user?.phone ?? '',
      vehicle_type: (driver?.vehicle_type as DriverProfilePayload['vehicle_type']) || 'moto',
      vehicle_plate: driver?.vehicle_plate ?? '',
      vehicle_brand: driver?.vehicle_brand ?? '',
      preferred_response_channel: driver?.preferred_response_channel ?? null,
    })
    setEditOpen(true)
  }

  const profileMutation = useMutation({
    mutationFn: () => updateDriverProfile({
      ...form,
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      phone: form.phone.trim(),
      vehicle_plate: form.vehicle_plate?.trim() || null,
      vehicle_brand: form.vehicle_brand?.trim() || null,
    }),
    onSuccess: (updatedUser) => {
      setUser(updatedUser)
      setEditOpen(false)
    },
    onError: (err: any) => {
      const msg =
        err?.response?.data?.message ||
        Object.values(err?.response?.data?.errors ?? {})?.flat()?.[0] ||
        'Impossible de modifier le profil.'
      Alert.alert('Erreur', String(msg))
    },
  })

  // Multi-rôles : proposer l'ouverture d'un commerce uniquement quand le
  // livreur est ACTIF (validé + activé) ET qu'il n'a pas déjà un profil marchant.
  // Le back appliquera la même règle (409 si déjà marchand) mais on évite d'exposer
  // un CTA qui échouerait.
  const canAddMarchant =
    driver?.activation_status === 'active' && !user?.marchant

  async function openAddMarchantRole() {
    if (!token) {
      Alert.alert('Session expirée', 'Reconnecte-toi pour continuer.')
      return
    }
    const url = getAddMarchantRoleUrl(token)
    try {
      const supported = await Linking.canOpenURL(url)
      if (!supported) {
        Alert.alert('Erreur', "Aucun navigateur disponible pour ouvrir le formulaire.")
        return
      }
      await Linking.openURL(url)
    } catch {
      Alert.alert('Erreur', "Impossible d'ouvrir le formulaire.")
    }
  }

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
  // Défense : balance peut être null pendant le tout premier fetch (race de types),
  // ou si le back renvoie un wallet incomplet. Sans ça, toLocaleString crashe le render.
  const cautionLabel =
    wallet && typeof wallet.balance === 'number'
      ? `${wallet.balance.toLocaleString('fr-FR')} FCFA`
      : '—'

  const totalCourses = stats?.all_time?.courses ?? 0
  const totalEarnings = stats?.all_time?.earnings ?? 0
  const qualityRating = stats?.quality_rating
  const isAirmessDriver = driver?.kind === 'airmess'
  const driverBadgeId = driver ? `AM-D${String(driver.id).padStart(5, '0')}` : 'AM-D-----'
  const version = Constants.expoConfig?.version ?? ''
  const canSaveProfile =
    form.first_name.trim().length >= 2 &&
    form.last_name.trim().length >= 2 &&
    form.phone.trim().length >= 8 &&
    !profileMutation.isPending

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

  function handleDeleteAccount() {
    Alert.alert(
      'Supprimer le compte ?',
      'Cette action est définitive et supprimera toutes tes données personnelles, ton historique et ta caution.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer mon compte',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Confirmer la suppression',
              'Es-tu absolument sûr de vouloir supprimer définitivement ton compte ? Cette action est irréversible.',
              [
                { text: 'Annuler', style: 'cancel' },
                {
                  text: 'Confirmer',
                  style: 'destructive',
                  onPress: async () => {
                    setLoggingOut(true)
                    try {
                      await deleteAccount()
                    } catch (error: any) {
                      Alert.alert(
                        'Erreur',
                        error?.response?.data?.message || 'Une erreur est survenue lors de la suppression.'
                      )
                    } finally {
                      setLoggingOut(false)
                    }
                  }
                }
              ]
            )
          }
        }
      ]
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero identité + stats — conservée telle quelle */}
        <View className="mx-5 mt-3 bg-airmess-dark rounded-3xl p-6">
          <Pressable
            onPress={openEditProfile}
            className="absolute right-4 top-4 w-10 h-10 rounded-full bg-white/10 items-center justify-center"
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Modifier le profil"
            style={({ pressed }) => (pressed ? { opacity: 0.8 } : undefined)}
          >
            <Ionicons name="create-outline" size={18} color="#FFCC00" />
          </Pressable>
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
            {qualityRating && (
              <View className="flex-row items-center mt-3 bg-white/10 px-3 py-1.5 rounded-full">
                <StarRating stars={qualityRating.stars} />
                <Text className="text-airmess-yellow text-xs font-jk-extrabold ml-2">
                  {qualityRating.label}
                </Text>
              </View>
            )}
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

        {isAirmessDriver && driver && (
          <AirmessProCard
            driver={{
              firstName: driver.first_name,
              lastName: driver.last_name,
              photoUrl: driver.photo_url ?? null,
              plate: driver.vehicle_plate,
              statusLabel: activation.label,
            }}
            badgeId={driverBadgeId}
          />
        )}

        <Pressable
          onPress={() => router.push(STATS_ROUTE)}
          className="mx-5 mt-5 bg-airmess-dark rounded-2xl overflow-hidden"
          style={({ pressed }) => (pressed ? { opacity: 0.92, transform: [{ scale: 0.99 }] } : undefined)}
          accessibilityRole="button"
          accessibilityLabel="Voir mes statistiques"
        >
          <View className="p-4 flex-row items-center">
            <View className="w-12 h-12 rounded-2xl bg-airmess-yellow items-center justify-center mr-3">
              <Ionicons name="stats-chart" size={23} color="#1A1614" />
            </View>
            <View className="flex-1">
              <Text className="text-white text-base font-jk-extrabold">Mes statistiques</Text>
              <Text className="text-warm-400 text-xs font-jk-medium mt-0.5">
                Gains, courses et progression
              </Text>
            </View>
            <View className="items-end mr-2">
              <Text className="text-airmess-yellow text-lg font-jk-extrabold">
                {totalCourses}
              </Text>
              <Text className="text-warm-400 text-[10px] font-jk-bold uppercase">Courses</Text>
            </View>
            <View className="w-9 h-9 rounded-full bg-white/10 items-center justify-center">
              <Ionicons name="chevron-forward" size={18} color="#FFCC00" />
            </View>
          </View>
          <View className="h-1 bg-airmess-yellow" />
        </Pressable>

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
            />
            <ProfileRow
              icon="trash-outline"
              title="Supprimer mon compte"
              onPress={handleDeleteAccount}
              destructive
              isLast
            />
          </View>
        </View>

        {/* Autres profils — multi-rôles. La section entière disparaît si
            aucun ajout n'est proposable, pour ne pas laisser un cadre vide. */}
        {canAddMarchant && (
          <View className="mx-5 mt-5">
            <SectionLabel>Développe ton activité</SectionLabel>
            <View className="bg-off-white border border-warm-200 rounded-2xl overflow-hidden">
              <ProfileRow
                icon="storefront-outline"
                title="Ouvrir aussi un commerce"
                subtitle="Vends tes produits sur Air Mess"
                onPress={() => { void openAddMarchantRole() }}
                isLast
              />
            </View>
          </View>
        )}

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

      <BottomSheet
        visible={editOpen}
        onClose={() => setEditOpen(false)}
        title="Modifier le profil"
        subtitle="Les documents et validations restent gérés par l'équipe Air Mess."
        footer={
          <View className="flex-row gap-2">
            <View className="flex-1">
              <Button
                variant="outline"
                size="md"
                onPress={() => setEditOpen(false)}
                disabled={profileMutation.isPending}
              >
                Annuler
              </Button>
            </View>
            <View className="flex-[1.4]">
              <Button
                size="md"
                onPress={() => profileMutation.mutate()}
                loading={profileMutation.isPending}
                disabled={!canSaveProfile}
              >
                Enregistrer
              </Button>
            </View>
          </View>
        }
      >
        <View className="gap-3 pb-2">
          <ProfileField
            label="Prénom"
            value={form.first_name}
            onChangeText={(first_name) => setForm((v) => ({ ...v, first_name }))}
            autoCapitalize="words"
          />
          <ProfileField
            label="Nom"
            value={form.last_name}
            onChangeText={(last_name) => setForm((v) => ({ ...v, last_name }))}
            autoCapitalize="words"
          />
          <ProfileField
            label="Téléphone"
            value={form.phone}
            onChangeText={(phone) => setForm((v) => ({ ...v, phone }))}
            keyboardType="phone-pad"
          />

          <View>
            <Text className="text-[10px] uppercase text-warm-500 tracking-widest font-jk-extrabold mb-1.5">
              Véhicule
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {VEHICLE_OPTIONS.map((option) => (
                <ChoicePill
                  key={option.value}
                  label={option.label}
                  selected={form.vehicle_type === option.value}
                  onPress={() => setForm((v) => ({ ...v, vehicle_type: option.value }))}
                />
              ))}
            </View>
          </View>

          <ProfileField
            label="Marque du véhicule"
            value={form.vehicle_brand ?? ''}
            onChangeText={(vehicle_brand) => setForm((v) => ({ ...v, vehicle_brand }))}
            placeholder="Bajaj, TVS, Honda..."
            autoCapitalize="words"
          />
          <ProfileField
            label="Plaque"
            value={form.vehicle_plate ?? ''}
            onChangeText={(vehicle_plate) => setForm((v) => ({ ...v, vehicle_plate }))}
            placeholder="BJ-0001-AM"
            autoCapitalize="characters"
          />

          <View>
            <Text className="text-[10px] uppercase text-warm-500 tracking-widest font-jk-extrabold mb-1.5">
              Réponse admin préférée
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {RESPONSE_CHANNEL_OPTIONS.map((option) => (
                <ChoicePill
                  key={option.value}
                  label={option.label}
                  selected={form.preferred_response_channel === option.value}
                  onPress={() =>
                    setForm((v) => ({ ...v, preferred_response_channel: option.value }))
                  }
                />
              ))}
            </View>
          </View>
        </View>
      </BottomSheet>

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

function AirmessProCard({
  driver,
  badgeId,
}: {
  driver: {
    firstName: string
    lastName: string
    photoUrl: string | null
    plate: string | null
    statusLabel: string
  }
  badgeId: string
}) {
  const fullName = `${driver.firstName} ${driver.lastName}`.trim()
  const initials = `${driver.firstName?.[0] ?? ''}${driver.lastName?.[0] ?? ''}`.toUpperCase()

  return (
    <View className="mx-5 mt-5 rounded-3xl overflow-hidden bg-ink">
      <View className="absolute right-0 top-0 w-32 h-32 rounded-full bg-airmess-yellow/20" />
      <View className="absolute -left-8 bottom-0 w-28 h-28 rounded-full bg-white/10" />
      <View className="p-5">
        <View className="flex-row items-start justify-between">
          <View className="flex-row items-center flex-1 pr-3">
            <View className="w-16 h-16 rounded-2xl bg-airmess-yellow items-center justify-center overflow-hidden border-2 border-white/15">
              {driver.photoUrl ? (
                <Image source={{ uri: driver.photoUrl }} className="w-full h-full" resizeMode="cover" />
              ) : (
                <Text className="text-2xl font-jk-extrabold text-ink">{initials || '?'}</Text>
              )}
            </View>
            <View className="ml-3 flex-1">
              <View className="self-start bg-airmess-yellow px-2.5 py-1 rounded-full">
                <Text className="text-[9px] uppercase text-ink font-jk-extrabold tracking-widest">
                  Driver AirMess
                </Text>
              </View>
              <Text className="text-white text-lg font-jk-extrabold mt-2" numberOfLines={1}>
                {fullName}
              </Text>
              <Text className="text-warm-300 text-xs font-jk-bold mt-0.5">
                Carte professionnelle digitale
              </Text>
            </View>
          </View>
          <MiniQr value={badgeId} />
        </View>

        <View className="mt-5 pt-4 border-t border-white/10 flex-row">
          <ProCardField label="Matricule" value={badgeId} />
          <ProCardField label="Statut" value={driver.statusLabel} />
          <ProCardField label="Plaque" value={driver.plate || '—'} />
        </View>
      </View>
      <View className="h-1.5 bg-airmess-yellow" />
    </View>
  )
}

function ProCardField({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1">
      <Text className="text-[9px] uppercase text-warm-400 font-jk-bold tracking-widest">
        {label}
      </Text>
      <Text className="text-white text-sm font-jk-extrabold mt-1" numberOfLines={1}>
        {value}
      </Text>
    </View>
  )
}

function MiniQr({ value }: { value: string }) {
  const seed = value.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)
  const cells = Array.from({ length: 81 }, (_, index) => ((index * 17 + seed) % 7 < 3))

  return (
    <View className="w-[74px] h-[74px] rounded-2xl bg-white p-2 shadow-sm border border-white/70">
      <View className="absolute -right-1 -top-1 w-5 h-5 rounded-full bg-airmess-yellow" />
      <View className="flex-1 rounded-xl bg-off-white p-1.5">
        <QrFinder className="left-1.5 top-1.5" />
        <QrFinder className="right-1.5 top-1.5" />
        <QrFinder className="left-1.5 bottom-1.5" />
        <View className="flex-row flex-wrap ml-[18px] mt-[18px]">
          {cells.map((filled, index) => (
            <View
              key={index}
              className={filled ? 'bg-ink rounded-[1px]' : 'bg-transparent'}
              style={{ width: 3.2, height: 3.2, margin: 0.8 }}
            />
          ))}
        </View>
      </View>
    </View>
  )
}

function QrFinder({ className }: { className: string }) {
  return (
    <View className={['absolute w-4 h-4 rounded-[4px] border-[3px] border-ink items-center justify-center bg-white', className].join(' ')}>
      <View className="w-1.5 h-1.5 rounded-[1px] bg-ink" />
    </View>
  )
}

function ProfileField({
  label,
  ...props
}: TextInputProps & {
  label: string
}) {
  return (
    <View>
      <Text className="text-[10px] uppercase text-warm-500 tracking-widest font-jk-extrabold mb-1.5">
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

function ChoicePill({
  label,
  selected,
  onPress,
}: {
  label: string
  selected: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      onPress={onPress}
      className={[
        'px-4 py-2.5 rounded-full border-2',
        selected ? 'bg-airmess-yellow border-airmess-yellow' : 'bg-off-white border-warm-200',
      ].join(' ')}
      style={({ pressed }) => (pressed ? { opacity: 0.85 } : undefined)}
      accessibilityRole="button"
    >
      <Text className={['text-sm font-jk-bold', selected ? 'text-ink' : 'text-warm-600'].join(' ')}>
        {label}
      </Text>
    </Pressable>
  )
}

function StarRating({ stars }: { stars: number }) {
  return (
    <View className="flex-row items-center">
      {[1, 2, 3, 4, 5].map((n) => (
        <Ionicons
          key={n}
          name={n <= stars ? 'star' : 'star-outline'}
          size={13}
          color="#FFCC00"
          style={{ marginRight: 1 }}
        />
      ))}
    </View>
  )
}

function ProfileRow({
  icon,
  title,
  subtitle,
  onPress,
  comingSoon,
  isLast,
  destructive,
}: {
  icon: keyof typeof Ionicons.glyphMap
  title: string
  subtitle?: string
  onPress?: () => void
  comingSoon?: boolean
  isLast?: boolean
  destructive?: boolean
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
      <View className="w-10 h-10 rounded-xl bg-warm-100 items-center justify-center mr-3" style={destructive ? { backgroundColor: 'rgba(212, 5, 17, 0.08)' } : undefined}>
        <Ionicons name={icon} size={18} color={destructive ? '#D40511' : '#1A1614'} />
      </View>
      <View className="flex-1">
        <Text className={['text-[15px] font-jk-bold', destructive ? 'text-airmess-red' : 'text-ink'].join(' ')}>{title}</Text>
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
