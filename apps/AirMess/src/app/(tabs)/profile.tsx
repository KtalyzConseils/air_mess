import { useEffect, useState } from 'react'
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Link, useRouter } from 'expo-router'
import { isAxiosError } from 'axios'
import Card from '../../components/ui/Card'
import Screen from '../../components/ui/Screen'
import Button from '../../components/ui/Button'
import { updateMarchantProfile, type UpdateMarchantProfilePayload } from '../../api/profile'
import { useAuthStore } from '../../stores/authStore'
import type { Marchant } from '../../types/auth'

const SECTOR_OPTIONS: { value: Marchant['secteur_activite']; label: string }[] = [
  { value: 'supermarche', label: 'Supermarche' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'boutique', label: 'Boutique' },
  { value: 'pharmacie', label: 'Pharmacie' },
  { value: 'ecommerce', label: 'E-commerce' },
  { value: 'autre', label: 'Autre' },
]

export default function ProfileScreen() {
  const router = useRouter()
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const setUser = useAuthStore((state) => state.setUser)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<UpdateMarchantProfilePayload>({
    name: '',
    phone: '',
    raison_sociale: '',
    ifu_rccm: '',
    secteur_activite: 'autre',
  })
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null)

  const fillFormFromUser = () => {
    if (!user?.marchant) return

    setForm({
      name: user.name ?? '',
      phone: user.phone ?? '',
      raison_sociale: user.marchant.raison_sociale ?? '',
      ifu_rccm: user.marchant.ifu_rccm ?? '',
      secteur_activite: user.marchant.secteur_activite ?? 'autre',
    })
  }

  useEffect(() => {
    fillFormFromUser()
  }, [user])

  const title =
    user?.marchant?.raison_sociale ??
    [user?.individual?.first_name, user?.individual?.last_name].filter(Boolean).join(' ') ??
    user?.name ??
    'Profil'

  const subtitle = user?.phone ?? user?.email ?? ''
  const marchant = user?.marchant
  const isMarchantValidated = user?.type !== 'marchant' || !!marchant?.validated_at
  const canSaveProfile =
    !!marchant &&
    form.name.trim().length >= 2 &&
    form.raison_sociale.trim().length >= 2 &&
    !isSavingProfile

  const handleSaveProfile = async () => {
    if (!canSaveProfile) return

    setIsSavingProfile(true)
    setProfileError(null)
    setProfileSuccess(null)

    try {
      const updatedUser = await updateMarchantProfile({
        name: form.name.trim(),
        phone: form.phone?.trim() || null,
        raison_sociale: form.raison_sociale.trim(),
        ifu_rccm: form.ifu_rccm?.trim() || null,
        secteur_activite: form.secteur_activite,
      })
      setUser(updatedUser)
      setEditing(false)
      setProfileSuccess('Profil mis a jour.')
    } catch (error) {
      setProfileError(getApiErrorMessage(error))
    } finally {
      setIsSavingProfile(false)
    }
  }

  const closeProfileModal = () => {
    if (isSavingProfile) return
    fillFormFromUser()
    setProfileError(null)
    setEditing(false)
  }

  return (
    <>
    <Screen scroll py={14} className="px-5">
      <Pressable
        onPress={() => router.back()}
        className="mb-3 h-11 w-11 items-center justify-center rounded-full bg-off-white"
        accessibilityRole="button"
        accessibilityLabel="Retour"
      >
        <Ionicons name="arrow-back" size={24} color="#1A1614" />
      </Pressable>

      <View className="items-center">
        <View className="h-28 w-28 items-center justify-center rounded-full bg-warm-200">
          <Ionicons name="person" size={58} color="#FDFCF9" />
        </View>
        <View className="mt-4 flex-row items-center">
          <Text className="max-w-[280px] text-center text-2xl font-extrabold text-ink" numberOfLines={1}>
            {title}
          </Text>
          <Ionicons name="checkmark-circle" size={18} color="#1A1614" />
        </View>
        <Text className="mt-1 text-center text-base font-semibold text-warm-500" numberOfLines={1}>
          {subtitle}
        </Text>
      </View>

      <View className="mt-7 flex-row justify-between">
        <QuickAction href="/(tabs)/courses" icon="time" label="Historique" />
        <QuickAction icon="headset" label="Assistance" />
        <QuickAction href="/(tabs)/addresses" icon="people" label="Adresses" />
        <QuickAction icon="settings" label="Parametres" />
      </View>

      <Card variant={isMarchantValidated ? 'success' : 'warning'} className="mt-6 flex-row items-center">
        <View className="mr-3 h-12 w-12 items-center justify-center rounded-full bg-off-white">
          <Text className="text-base font-extrabold text-info">
            {isMarchantValidated ? '2/2' : '1/2'}
          </Text>
        </View>
        <View className="flex-1">
          <Text className="text-lg font-extrabold text-ink">
            {isMarchantValidated ? 'Profil confirme' : 'Confirmer votre profil'}
          </Text>
          <Text className="text-sm leading-5 text-warm-600">
            Visible par les conducteurs durant les courses.
          </Text>
        </View>
      </Card>

      <Card className="mt-5" padding="lg">
        <View className="mb-4 flex-row items-center justify-between">
          <View className="flex-1 flex-row items-center">
            <View className="mr-3 h-11 w-11 items-center justify-center rounded-full bg-airmess-yellow">
              <Ionicons name="storefront-outline" size={22} color="#1A1614" />
            </View>
            <View className="flex-1">
              <Text className="text-xl font-extrabold text-ink">Informations du commerce</Text>
              <Text className="mt-0.5 text-sm font-semibold text-warm-500" numberOfLines={1}>
                Identite visible pendant les courses
              </Text>
            </View>
          </View>
          {marchant && (
            <Pressable
              onPress={() => {
                fillFormFromUser()
                setEditing(true)
                setProfileError(null)
                setProfileSuccess(null)
              }}
              className="ml-3 h-10 items-center justify-center rounded-full bg-airmess-dark px-4"
              accessibilityRole="button"
            >
              <Text className="text-sm font-extrabold text-white">Modifier</Text>
            </Pressable>
          )}
        </View>

        {!marchant ? (
          <Text className="text-sm font-semibold leading-5 text-warm-600">
            Cette section est reservee aux comptes marchands.
          </Text>
        ) : (
          <>
            {profileSuccess && (
              <Text className="text-sm font-bold text-success">{profileSuccess}</Text>
            )}
          </>
        )}
      </Card>

      <Card className="mt-5" padding="none">
        <MenuRow icon="card" title="Modes de paiement" subtitle="Wallet AirMess et especes" href="/(tabs)/wallet" />
      </Card>

      <Pressable
        className="mt-5 h-16 flex-row items-center rounded-2xl bg-airmess-dark px-5"
        accessibilityRole="button"
      >
        <View className="mr-4 h-10 w-10 items-center justify-center rounded-full bg-airmess-yellow">
          <Ionicons name="bicycle" size={20} color="#1A1614" />
        </View>
        <Text className="flex-1 text-lg font-extrabold text-white">Devenez livreur</Text>
        <Ionicons name="chevron-forward" size={22} color="#D40511" />
      </Pressable>

      <Card className="mt-5" padding="none">
        <MenuRow icon="shield-checkmark" title="Securite" subtitle="Compte et sessions" />
        <Divider />
        <MenuRow icon="information-circle" title="Informations" subtitle="A propos de AirMess" />
      </Card>

      <Pressable
        className="mt-5 min-h-14 flex-row items-center rounded-2xl border border-airmess-red/30 bg-off-white px-5 py-3"
        accessibilityRole="button"
      >
        <Ionicons name="trash-outline" size={22} color="#D40511" />
        <View className="ml-3 flex-1">
          <Text className="text-base font-extrabold text-airmess-red">Supprimer mon compte</Text>
          <Text className="mt-0.5 text-xs font-semibold text-warm-500">
            Demande definitive de suppression
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={21} color="#D40511" />
      </Pressable>

      <Pressable
        onPress={logout}
        className="mt-5 h-14 items-center justify-center rounded-2xl bg-danger-bg"
        accessibilityRole="button"
      >
        <Text className="text-base font-extrabold text-airmess-red">Se deconnecter</Text>
      </Pressable>
    </Screen>
    <Modal
      visible={editing}
      transparent
      animationType="slide"
      onRequestClose={closeProfileModal}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 justify-end bg-black/40"
      >
        <Pressable className="flex-1" onPress={closeProfileModal} />
        <View className="max-h-[100%] rounded-t-[28px] bg-cream px-5 pb-6 pt-4">
          <View className="mb-4 flex-row items-center justify-between">
            <View className="flex-row items-center">
              <View className="mr-3 h-11 w-11 items-center justify-center rounded-full bg-airmess-yellow">
                <Ionicons name="storefront-outline" size={22} color="#1A1614" />
              </View>
              <View>
                <Text className="text-xl font-extrabold text-ink">Modifier le commerce</Text>
                <Text className="mt-0.5 text-sm font-semibold text-warm-500">
                  Informations visibles aux livreurs
                </Text>
              </View>
            </View>
            <Pressable
              onPress={closeProfileModal}
              className="h-10 w-10 items-center justify-center rounded-full bg-off-white"
              accessibilityRole="button"
              accessibilityLabel="Fermer"
            >
              <Ionicons name="close" size={22} color="#1A1614" />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <FieldLabel>Nom du responsable</FieldLabel>
            <ProfileInput
              value={form.name}
              onChangeText={(value) => setForm((current) => ({ ...current, name: value }))}
              placeholder="Nom complet"
              textContentType="name"
            />

            <FieldLabel>Telephone</FieldLabel>
            <ProfileInput
              value={form.phone ?? ''}
              onChangeText={(value) => setForm((current) => ({ ...current, phone: value }))}
              placeholder="+229..."
              keyboardType="phone-pad"
              textContentType="telephoneNumber"
            />

            <FieldLabel>Raison sociale</FieldLabel>
            <ProfileInput
              value={form.raison_sociale}
              onChangeText={(value) => setForm((current) => ({ ...current, raison_sociale: value }))}
              placeholder="Nom du commerce"
            />

            <FieldLabel>IFU / RCCM</FieldLabel>
            <ProfileInput
              value={form.ifu_rccm ?? ''}
              onChangeText={(value) => setForm((current) => ({ ...current, ifu_rccm: value }))}
              placeholder="Optionnel"
            />

            <FieldLabel>Secteur d'activite</FieldLabel>
            <View className="flex-row flex-wrap gap-2">
              {SECTOR_OPTIONS.map((option) => {
                const selected = option.value === form.secteur_activite
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => setForm((current) => ({ ...current, secteur_activite: option.value }))}
                    className={[
                      'min-h-10 items-center justify-center rounded-full border px-4',
                      selected ? 'border-airmess-yellow bg-airmess-yellow' : 'border-warm-200 bg-white',
                    ].join(' ')}
                    accessibilityRole="button"
                  >
                    <Text className="text-sm font-extrabold text-ink">{option.label}</Text>
                  </Pressable>
                )
              })}
            </View>

            {profileError && (
              <Text className="mt-3 text-sm font-bold text-airmess-red">{profileError}</Text>
            )}

            <View className="mt-5 flex-row gap-3">
              <View className="flex-1">
                <Button variant="outline" onPress={closeProfileModal} disabled={isSavingProfile}>
                  Annuler
                </Button>
              </View>
              <View className="flex-1">
                <Button
                  onPress={handleSaveProfile}
                  loading={isSavingProfile}
                  disabled={!canSaveProfile}
                  rightIcon={<Ionicons name="checkmark" size={20} color="#1A1614" />}
                >
                  Enregistrer
                </Button>
              </View>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
    </>
  )
}

function QuickAction({
  icon,
  label,
  href,
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  href?: '/(tabs)/courses' | '/(tabs)/wallet' | '/(tabs)/addresses'
}) {
  const content = (
    <Pressable className="items-center" accessibilityRole="button">
      <View className="mb-2 h-14 w-14 items-center justify-center rounded-full bg-off-white">
        <Ionicons name={icon} size={24} color="#1A1614" />
      </View>
      <Text className="text-center text-sm font-extrabold text-ink">{label}</Text>
    </Pressable>
  )

  if (!href) return content
  return (
    <Link href={href} asChild>
      {content}
    </Link>
  )
}

function MenuRow({
  icon,
  title,
  subtitle,
  href,
}: {
  icon: keyof typeof Ionicons.glyphMap
  title: string
  subtitle: string
  href?: '/(tabs)/wallet'
}) {
  const content = (
    <Pressable className="min-h-20 flex-row items-center px-5 py-3" accessibilityRole="button">
      <Ionicons name={icon} size={25} color="#1A1614" />
      <View className="ml-4 flex-1">
        <Text className="text-xl font-extrabold text-ink">{title}</Text>
        <Text className="mt-0.5 text-sm font-semibold text-warm-500" numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={22} color="#1A1614" />
    </Pressable>
  )

  if (!href) return content
  return (
    <Link href={href} asChild>
      {content}
    </Link>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <Text className="mb-2 mt-3 text-xs font-extrabold uppercase text-warm-500">{children}</Text>
}

function ProfileInput({
  value,
  onChangeText,
  placeholder,
  keyboardType,
  textContentType,
}: {
  value: string
  onChangeText: (value: string) => void
  placeholder: string
  keyboardType?: 'default' | 'phone-pad'
  textContentType?: 'name' | 'telephoneNumber'
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      keyboardType={keyboardType}
      textContentType={textContentType}
      className="h-14 rounded-2xl border border-warm-200 bg-white px-4 text-base font-semibold text-ink"
      placeholder={placeholder}
      placeholderTextColor="#A89F95"
    />
  )
}

function Divider() {
  return <View className="ml-16 h-px bg-warm-200" />
}

function getApiErrorMessage(error: unknown) {
  if (isAxiosError(error)) {
    const data = error.response?.data as { message?: string; errors?: Record<string, string[]> } | undefined
    return data?.message ?? Object.values(data?.errors ?? {})[0]?.[0] ?? 'Impossible de mettre a jour.'
  }

  return 'Impossible de mettre a jour.'
}
