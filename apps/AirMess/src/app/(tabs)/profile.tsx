import { useCallback, useEffect, useState } from 'react'
import {
  KeyboardAvoidingView,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Link, useFocusEffect, useRouter } from 'expo-router'
import { isAxiosError } from 'axios'
import Card from '../../components/ui/Card'
import Screen from '../../components/ui/Screen'
import Button from '../../components/ui/Button'
import SupportContactSheet from '../../components/SupportContactSheet'
import { setWebAccess, updateMarchantProfile, type UpdateMarchantProfilePayload } from '../../api/profile'
import { useAuthStore } from '../../stores/authStore'
import { useLanguageStore } from '../../stores/languageStore'
import { useThemeStore } from '../../stores/themeStore'
import { getWebLoginUrl } from '../../lib/webUrl'
import type { Marchant } from '../../types/auth'

const SECTOR_OPTIONS: { value: Marchant['secteur_activite']; label: string }[] = [
  { value: 'supermarche', label: 'Supermarche' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'boutique', label: 'Boutique' },
  { value: 'pharmacie', label: 'Pharmacie' },
  { value: 'ecommerce', label: 'E-commerce' },
  { value: 'autre', label: 'Autre' },
]

const PROFILE_COPY = {
  fr: {
    profileFallback: 'Profil',
    history: 'Historique',
    support: 'Assistance',
    addresses: 'Adresses',
    settings: 'Parametres',
    profileConfirmed: 'Compte certifie',
    confirmProfile: 'Confirmer votre profil',
    certifiedVisibleDrivers: 'Badge visible par les conducteurs durant les courses.',
    visibleDrivers: "Le badge sera ajoute apres verification par l'equipe Air Mess.",
    trustBadge: 'Badge de confiance',
    trustBadgeReady: 'Votre profil est pret pour la verification Air Mess.',
    trustBadgePending: "Votre profil est complet. L'equipe Air Mess peut maintenant le verifier.",
    completeItems: 'informations completees',
    remainingItems: 'restantes',
    completeProfile: 'Completer',
    editProfile: 'Modifier',
    checklist: {
      manager: 'Nom du responsable',
      phone: 'Telephone WhatsApp',
      business: 'Nom du commerce',
      sector: "Secteur d'activite",
      businessId: 'IFU / RCCM',
    },
    businessInfo: 'Informations du commerce',
    businessIdentity: 'Identite visible pendant les courses',
    edit: 'Modifier',
    merchantOnly: 'Cette section est reservee aux comptes marchands.',
    profileUpdated: 'Profil mis a jour.',
    paymentMethods: 'Modes de paiement',
    paymentSubtitle: 'Wallet AirMess et especes',
    becomeDriver: 'Devenez livreur',
    security: 'Securite',
    securitySubtitle: 'Compte et sessions',
    information: 'Informations',
    informationSubtitle: 'A propos de AirMess',
    deleteAccount: 'Supprimer mon compte',
    deleteAccountSubtitle: 'Demande definitive de suppression',
    logout: 'Se deconnecter',
    editBusiness: 'Modifier le commerce',
    editBusinessSubtitle: 'Informations visibles aux livreurs',
    responsibleName: 'Nom du responsable',
    fullName: 'Nom complet',
    phone: 'Telephone',
    businessName: 'Raison sociale',
    businessPlaceholder: 'Nom du commerce',
    businessId: 'IFU / RCCM',
    optional: 'Optionnel',
    sector: "Secteur d'activite",
    cancel: 'Annuler',
    save: 'Enregistrer',
    updateFailed: 'Impossible de mettre a jour.',
    webAccessTitle: 'Acces au site web',
    webAccessSubtitleMissing: 'Ajoute un email et un mot de passe pour te connecter aussi depuis un ordinateur.',
    webAccessSubtitleDone: 'Tu peux te connecter sur le site web avec cet email et ce mot de passe.',
    webAccessActivate: 'Activer',
    webAccessEmail: 'Email',
    webAccessPassword: 'Mot de passe',
    webAccessPasswordConfirm: 'Confirmer le mot de passe',
    webAccessSubmit: "Activer l'acces web",
    webAccessSuccess: 'Acces web active.',
    webAccessOpenSite: 'Ouvrir le site web',
  },
  en: {
    profileFallback: 'Profile',
    history: 'History',
    support: 'Support',
    addresses: 'Addresses',
    settings: 'Settings',
    profileConfirmed: 'Certified account',
    confirmProfile: 'Confirm your profile',
    certifiedVisibleDrivers: 'Badge visible to drivers during deliveries.',
    visibleDrivers: 'The badge will be added after verification by the Air Mess team.',
    trustBadge: 'Trust badge',
    trustBadgeReady: 'Your profile is ready for Air Mess verification.',
    trustBadgePending: 'Your profile is complete. The Air Mess team can now verify it.',
    completeItems: 'completed details',
    remainingItems: 'remaining',
    completeProfile: 'Complete',
    editProfile: 'Edit',
    checklist: {
      manager: 'Manager name',
      phone: 'WhatsApp phone',
      business: 'Business name',
      sector: 'Business sector',
      businessId: 'Tax / registration ID',
    },
    businessInfo: 'Business information',
    businessIdentity: 'Identity shown during deliveries',
    edit: 'Edit',
    merchantOnly: 'This section is reserved for merchant accounts.',
    profileUpdated: 'Profile updated.',
    paymentMethods: 'Payment methods',
    paymentSubtitle: 'AirMess wallet and cash',
    becomeDriver: 'Become a driver',
    security: 'Security',
    securitySubtitle: 'Account and sessions',
    information: 'Information',
    informationSubtitle: 'About AirMess',
    deleteAccount: 'Delete my account',
    deleteAccountSubtitle: 'Permanent deletion request',
    logout: 'Log out',
    editBusiness: 'Edit business',
    editBusinessSubtitle: 'Information visible to drivers',
    responsibleName: 'Manager name',
    fullName: 'Full name',
    phone: 'Phone',
    businessName: 'Business name',
    businessPlaceholder: 'Store name',
    businessId: 'Tax / registration ID',
    optional: 'Optional',
    sector: 'Business sector',
    cancel: 'Cancel',
    save: 'Save',
    updateFailed: 'Unable to update.',
    webAccessTitle: 'Web access',
    webAccessSubtitleMissing: 'Add an email and a password to also sign in from a computer.',
    webAccessSubtitleDone: 'You can sign in on the website with this email and password.',
    webAccessActivate: 'Activate',
    webAccessEmail: 'Email',
    webAccessPassword: 'Password',
    webAccessPasswordConfirm: 'Confirm password',
    webAccessSubmit: 'Activate web access',
    webAccessSuccess: 'Web access activated.',
    webAccessOpenSite: 'Open the website',
  },
} as const

export default function ProfileScreen() {
  const router = useRouter()
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const setUser = useAuthStore((state) => state.setUser)
  const refreshUser = useAuthStore((state) => state.refreshUser)
  const language = useLanguageStore((state) => state.language)
  const theme = useThemeStore((state) => state.theme)
  const copy = PROFILE_COPY[language]
  const isDark = theme === 'dark'
  const iconColor = isDark ? '#FDFCF9' : '#1A1614'
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
  const [supportOpen, setSupportOpen] = useState(false)
  const [webAccessOpen, setWebAccessOpen] = useState(false)
  const [webAccessForm, setWebAccessForm] = useState({ email: '', password: '', password_confirmation: '' })
  const [isSavingWebAccess, setIsSavingWebAccess] = useState(false)
  const [webAccessError, setWebAccessError] = useState<string | null>(null)

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

  useFocusEffect(
    useCallback(() => {
      void refreshUser().catch(() => {})
    }, [refreshUser]),
  )

  const title =
    user?.marchant?.raison_sociale ??
    [user?.individual?.first_name, user?.individual?.last_name].filter(Boolean).join(' ') ??
    user?.name ??
    copy.profileFallback

  const subtitle = user?.phone ?? user?.email ?? ''
  const marchant = user?.marchant
  const isCertifiedMarchant = !!marchant?.validated_at
  const certificationItems = [
    { label: copy.checklist.manager, done: (user?.name ?? '').trim().length >= 2 },
    { label: copy.checklist.phone, done: (user?.phone ?? '').trim().length >= 8 },
    { label: copy.checklist.business, done: (marchant?.raison_sociale ?? '').trim().length >= 2 },
    { label: copy.checklist.sector, done: !!marchant?.secteur_activite },
    { label: copy.checklist.businessId, done: (marchant?.ifu_rccm ?? '').trim().length >= 2 },
  ]
  const completedCertificationItems = certificationItems.filter((item) => item.done).length
  const remainingCertificationItems = certificationItems.length - completedCertificationItems
  const isCertificationProfileComplete = remainingCertificationItems === 0
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
      setProfileSuccess(copy.profileUpdated)
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

  const hasWebAccess = !!user?.password_set_at
  const canSaveWebAccess =
    webAccessForm.email.trim().includes('@') &&
    webAccessForm.password.length >= 8 &&
    webAccessForm.password === webAccessForm.password_confirmation &&
    !isSavingWebAccess

  const openWebAccessModal = () => {
    setWebAccessForm({ email: user?.email ?? '', password: '', password_confirmation: '' })
    setWebAccessError(null)
    setWebAccessOpen(true)
  }

  const closeWebAccessModal = () => {
    if (isSavingWebAccess) return
    setWebAccessError(null)
    setWebAccessOpen(false)
  }

  const handleSaveWebAccess = async () => {
    if (!canSaveWebAccess) return

    setIsSavingWebAccess(true)
    setWebAccessError(null)

    try {
      const updatedUser = await setWebAccess({
        email: webAccessForm.email.trim(),
        password: webAccessForm.password,
        password_confirmation: webAccessForm.password_confirmation,
      })
      setUser(updatedUser)
      setWebAccessOpen(false)
    } catch (error) {
      setWebAccessError(getApiErrorMessage(error))
    } finally {
      setIsSavingWebAccess(false)
    }
  }

  return (
    <>
    <Screen scroll py={14} className="px-5">
      <Pressable
        onPress={() => router.back()}
        className="mb-3 h-11 w-11 items-center justify-center rounded-full bg-off-white dark:bg-[#181B24]"
        accessibilityRole="button"
        accessibilityLabel={language === 'fr' ? 'Retour' : 'Back'}
      >
        <Ionicons name="arrow-back" size={24} color={iconColor} />
      </Pressable>

      <View className="items-center">
        <View className="h-28 w-28 items-center justify-center rounded-full bg-warm-200">
          <Ionicons name="person" size={58} color="#FDFCF9" />
        </View>
        <View className="mt-4 flex-row items-center">
          <Text className="max-w-[280px] text-center text-2xl font-extrabold text-ink dark:text-white" numberOfLines={1}>
            {title}
          </Text>
          {isCertifiedMarchant && (
            <Ionicons name="checkmark-circle" size={18} color="#FFCC00" />
          )}
        </View>
        <Text className="mt-1 text-center text-base font-semibold text-warm-500 dark:text-[#AEB6C5]" numberOfLines={1}>
          {subtitle}
        </Text>
      </View>

      <View className="mt-7 flex-row justify-between">
        <QuickAction href="/(tabs)/courses" icon="time" label={copy.history} />
        <QuickAction icon="headset" label={copy.support} onPress={() => setSupportOpen(true)} />
        <QuickAction href="/(tabs)/addresses" icon="people" label={copy.addresses} />
        <QuickAction href="/settings" icon="settings" label={copy.settings} />
      </View>

      {marchant && (
        <Card variant={isCertifiedMarchant ? 'success' : 'warning'} className="mt-6">
          <View className="flex-row items-start">
            <View className="mr-3 h-12 w-12 items-center justify-center rounded-full bg-off-white dark:bg-[#11141B]">
              <Ionicons
                name={isCertifiedMarchant ? 'shield-checkmark' : 'shield-outline'}
                size={24}
                color={isCertifiedMarchant ? '#16A34A' : '#B7791F'}
              />
            </View>
            <View className="flex-1">
              <Text className="text-lg font-extrabold text-ink dark:text-white">
                {isCertifiedMarchant ? copy.profileConfirmed : copy.trustBadge}
              </Text>
              <Text className="text-sm leading-5 text-warm-600 dark:text-[#AEB6C5]">
                {isCertifiedMarchant
                  ? copy.certifiedVisibleDrivers
                  : `${completedCertificationItems}/${certificationItems.length} ${copy.completeItems} - ${remainingCertificationItems} ${copy.remainingItems}`}
              </Text>
            </View>
          </View>

          {!isCertifiedMarchant && (
            <>
              <View className="mt-4 h-2 overflow-hidden rounded-full bg-white/70 dark:bg-[#11141B]">
                <View
                  className="h-2 rounded-full bg-airmess-yellow"
                  style={{ width: `${(completedCertificationItems / certificationItems.length) * 100}%` }}
                />
              </View>

              {isCertificationProfileComplete ? (
                <Text className="mt-4 text-sm font-semibold leading-5 text-warm-600 dark:text-[#AEB6C5]">
                  {copy.trustBadgePending}
                </Text>
              ) : (
                <View className="mt-4 gap-2">
                  {certificationItems.filter((item) => !item.done).map((item) => (
                    <View key={item.label} className="flex-row items-center">
                      <Ionicons name="ellipse-outline" size={18} color="#8A7E68" />
                      <Text className="ml-2 flex-1 text-sm font-bold text-warm-600 dark:text-[#AEB6C5]">
                        {item.label}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              <Pressable
                onPress={() => {
                  fillFormFromUser()
                  setEditing(true)
                  setProfileError(null)
                  setProfileSuccess(null)
                }}
                className="mt-4 h-12 flex-row items-center justify-center rounded-2xl bg-airmess-dark px-4 dark:bg-airmess-yellow"
                accessibilityRole="button"
              >
                <Text className="text-base font-extrabold text-white dark:text-ink">
                  {isCertificationProfileComplete ? copy.editProfile : copy.completeProfile}
                </Text>
                <Ionicons
                  name="arrow-forward"
                  size={18}
                  color={isDark ? '#1A1614' : '#FFFFFF'}
                  style={{ marginLeft: 8 }}
                />
              </Pressable>
            </>
          )}

          {isCertifiedMarchant && (
            <Text className="mt-3 text-sm font-semibold leading-5 text-warm-600 dark:text-[#AEB6C5]">
              {copy.trustBadgeReady}
            </Text>
          )}
        </Card>
      )}

      <Card variant={hasWebAccess ? 'success' : undefined} className="mt-5">
        <View className="flex-row items-start">
          <View className="mr-3 h-12 w-12 items-center justify-center rounded-full bg-off-white dark:bg-[#11141B]">
            <Ionicons
              name={hasWebAccess ? 'desktop' : 'desktop-outline'}
              size={24}
              color={hasWebAccess ? '#16A34A' : '#8A7E68'}
            />
          </View>
          <View className="flex-1">
            <Text className="text-lg font-extrabold text-ink dark:text-white">{copy.webAccessTitle}</Text>
            <Text className="text-sm leading-5 text-warm-600 dark:text-[#AEB6C5]">
              {hasWebAccess ? copy.webAccessSubtitleDone : copy.webAccessSubtitleMissing}
            </Text>
          </View>
        </View>

        {!hasWebAccess ? (
          <Pressable
            onPress={openWebAccessModal}
            className="mt-4 h-12 flex-row items-center justify-center rounded-2xl bg-airmess-dark px-4 dark:bg-airmess-yellow"
            accessibilityRole="button"
          >
            <Text className="text-base font-extrabold text-white dark:text-ink">{copy.webAccessActivate}</Text>
            <Ionicons name="arrow-forward" size={18} color={isDark ? '#1A1614' : '#FFFFFF'} style={{ marginLeft: 8 }} />
          </Pressable>
        ) : (
          <Pressable
            onPress={() => void Linking.openURL(getWebLoginUrl())}
            className="mt-4 h-12 flex-row items-center justify-center rounded-2xl bg-off-white px-4 dark:bg-[#11141B]"
            accessibilityRole="button"
          >
            <Text className="text-base font-extrabold text-ink dark:text-white">{copy.webAccessOpenSite}</Text>
            <Ionicons name="open-outline" size={18} color={iconColor} style={{ marginLeft: 8 }} />
          </Pressable>
        )}
      </Card>

      <Card className="mt-5" padding="lg">
        <View className="mb-4 flex-row items-center justify-between">
          <View className="flex-1 flex-row items-center">
            <View className="mr-3 h-11 w-11 items-center justify-center rounded-full bg-airmess-yellow">
              <Ionicons name="storefront-outline" size={22} color="#1A1614" />
            </View>
            <View className="flex-1">
              <Text className="text-xl font-extrabold text-ink dark:text-white">{copy.businessInfo}</Text>
              <Text className="mt-0.5 text-sm font-semibold text-warm-500 dark:text-[#AEB6C5]" numberOfLines={1}>
                {copy.businessIdentity}
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
              <Text className="text-sm font-extrabold text-white">{copy.edit}</Text>
            </Pressable>
          )}
        </View>

        {!marchant ? (
            <Text className="text-sm font-semibold leading-5 text-warm-600 dark:text-[#AEB6C5]">
            {copy.merchantOnly}
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
        <MenuRow icon="card" title={copy.paymentMethods} subtitle={copy.paymentSubtitle} href="/(tabs)/wallet" />
      </Card>

      <Pressable
        className="mt-5 h-16 flex-row items-center rounded-2xl bg-airmess-dark px-5"
        accessibilityRole="button"
      >
        <View className="mr-4 h-10 w-10 items-center justify-center rounded-full bg-airmess-yellow">
          <Ionicons name="bicycle" size={20} color="#1A1614" />
        </View>
        <Text className="flex-1 text-lg font-extrabold text-white">{copy.becomeDriver}</Text>
        <Ionicons name="chevron-forward" size={22} color="#D40511" />
      </Pressable>

      <Card className="mt-5" padding="none">
        <MenuRow icon="shield-checkmark" title={copy.security} subtitle={copy.securitySubtitle} />
        <Divider />
        <MenuRow icon="information-circle" title={copy.information} subtitle={copy.informationSubtitle} />
      </Card>

      <Pressable
        className="mt-5 min-h-14 flex-row items-center rounded-2xl border border-airmess-red/30 bg-off-white px-5 py-3 dark:bg-[#181B24]"
        accessibilityRole="button"
      >
        <Ionicons name="trash-outline" size={22} color="#D40511" />
        <View className="ml-3 flex-1">
          <Text className="text-base font-extrabold text-airmess-red">{copy.deleteAccount}</Text>
          <Text className="mt-0.5 text-xs font-semibold text-warm-500 dark:text-[#AEB6C5]">
            {copy.deleteAccountSubtitle}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={21} color="#D40511" />
      </Pressable>

      <Pressable
        onPress={logout}
        className="mt-5 h-14 items-center justify-center rounded-2xl bg-danger-bg"
        accessibilityRole="button"
      >
        <Text className="text-base font-extrabold text-airmess-red">{copy.logout}</Text>
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
        behavior="padding"
        className="flex-1 justify-end bg-black/40"
      >
        <Pressable className="flex-1" onPress={closeProfileModal} />
        <View className="max-h-[100%] rounded-t-[28px] bg-cream px-5 pb-6 pt-4 dark:bg-[#0F1115]">
          <View className="mb-4 flex-row items-center justify-between">
            <View className="flex-row items-center">
              <View className="mr-3 h-11 w-11 items-center justify-center rounded-full bg-airmess-yellow">
                <Ionicons name="storefront-outline" size={22} color="#1A1614" />
              </View>
              <View>
                <Text className="text-xl font-extrabold text-ink dark:text-white">{copy.editBusiness}</Text>
                <Text className="mt-0.5 text-sm font-semibold text-warm-500 dark:text-[#AEB6C5]">
                  {copy.editBusinessSubtitle}
                </Text>
              </View>
            </View>
            <Pressable
              onPress={closeProfileModal}
              className="h-10 w-10 items-center justify-center rounded-full bg-off-white dark:bg-[#181B24]"
              accessibilityRole="button"
              accessibilityLabel={language === 'fr' ? 'Fermer' : 'Close'}
            >
              <Ionicons name="close" size={22} color={iconColor} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <FieldLabel>{copy.responsibleName}</FieldLabel>
            <ProfileInput
              value={form.name}
              onChangeText={(value) => setForm((current) => ({ ...current, name: value }))}
              placeholder={copy.fullName}
              textContentType="name"
            />

            <FieldLabel>{copy.phone}</FieldLabel>
            <ProfileInput
              value={form.phone ?? ''}
              onChangeText={(value) => setForm((current) => ({ ...current, phone: value }))}
              placeholder="+229..."
              keyboardType="phone-pad"
              textContentType="telephoneNumber"
            />

            <FieldLabel>{copy.businessName}</FieldLabel>
            <ProfileInput
              value={form.raison_sociale}
              onChangeText={(value) => setForm((current) => ({ ...current, raison_sociale: value }))}
              placeholder={copy.businessPlaceholder}
            />

            <FieldLabel>{copy.businessId}</FieldLabel>
            <ProfileInput
              value={form.ifu_rccm ?? ''}
              onChangeText={(value) => setForm((current) => ({ ...current, ifu_rccm: value }))}
              placeholder={copy.optional}
            />

            <FieldLabel>{copy.sector}</FieldLabel>
            <View className="flex-row flex-wrap gap-2">
              {SECTOR_OPTIONS.map((option) => {
                const selected = option.value === form.secteur_activite
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => setForm((current) => ({ ...current, secteur_activite: option.value }))}
                    className={[
                      'min-h-10 items-center justify-center rounded-full border px-4',
                      selected ? 'border-airmess-yellow bg-airmess-yellow' : 'border-warm-200 bg-white dark:border-[#343A46] dark:bg-[#181B24]',
                    ].join(' ')}
                    accessibilityRole="button"
                  >
                    <Text className={['text-sm font-extrabold', selected ? 'text-ink' : 'text-ink dark:text-white'].join(' ')}>
                      {option.label}
                    </Text>
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
                  {copy.cancel}
                </Button>
              </View>
              <View className="flex-1">
                <Button
                  onPress={handleSaveProfile}
                  loading={isSavingProfile}
                  disabled={!canSaveProfile}
                  rightIcon={<Ionicons name="checkmark" size={20} color="#1A1614" />}
                >
                  {copy.save}
                </Button>
              </View>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
    <Modal
      visible={webAccessOpen}
      transparent
      animationType="slide"
      onRequestClose={closeWebAccessModal}
      statusBarTranslucent
    >
      <KeyboardAvoidingView behavior="padding" className="flex-1 justify-end bg-black/40">
        <Pressable className="flex-1" onPress={closeWebAccessModal} />
        <View className="max-h-[100%] rounded-t-[28px] bg-cream px-5 pb-6 pt-4 dark:bg-[#0F1115]">
          <View className="mb-4 flex-row items-center justify-between">
            <View className="flex-row items-center">
              <View className="mr-3 h-11 w-11 items-center justify-center rounded-full bg-airmess-yellow">
                <Ionicons name="desktop-outline" size={22} color="#1A1614" />
              </View>
              <Text className="text-xl font-extrabold text-ink dark:text-white">{copy.webAccessTitle}</Text>
            </View>
            <Pressable
              onPress={closeWebAccessModal}
              className="h-10 w-10 items-center justify-center rounded-full bg-off-white dark:bg-[#181B24]"
              accessibilityRole="button"
              accessibilityLabel={language === 'fr' ? 'Fermer' : 'Close'}
            >
              <Ionicons name="close" size={22} color={iconColor} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <FieldLabel>{copy.webAccessEmail}</FieldLabel>
            <TextInput
              value={webAccessForm.email}
              onChangeText={(value) => setWebAccessForm((current) => ({ ...current, email: value }))}
              autoCapitalize="none"
              keyboardType="email-address"
              textContentType="emailAddress"
              placeholder="email@example.com"
              placeholderTextColor="#A89F95"
              className="h-14 rounded-2xl border border-warm-200 bg-white px-4 text-base font-semibold text-ink dark:border-[#343A46] dark:bg-[#181B24] dark:text-white"
            />

            <FieldLabel>{copy.webAccessPassword}</FieldLabel>
            <TextInput
              value={webAccessForm.password}
              onChangeText={(value) => setWebAccessForm((current) => ({ ...current, password: value }))}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="newPassword"
              placeholder="********"
              placeholderTextColor="#A89F95"
              className="h-14 rounded-2xl border border-warm-200 bg-white px-4 text-base font-semibold text-ink dark:border-[#343A46] dark:bg-[#181B24] dark:text-white"
            />

            <FieldLabel>{copy.webAccessPasswordConfirm}</FieldLabel>
            <TextInput
              value={webAccessForm.password_confirmation}
              onChangeText={(value) => setWebAccessForm((current) => ({ ...current, password_confirmation: value }))}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="newPassword"
              placeholder="********"
              placeholderTextColor="#A89F95"
              className="h-14 rounded-2xl border border-warm-200 bg-white px-4 text-base font-semibold text-ink dark:border-[#343A46] dark:bg-[#181B24] dark:text-white"
            />

            {webAccessError && (
              <Text className="mt-3 text-sm font-bold text-airmess-red">{webAccessError}</Text>
            )}

            <View className="mt-5 flex-row gap-3">
              <View className="flex-1">
                <Button variant="outline" onPress={closeWebAccessModal} disabled={isSavingWebAccess}>
                  {copy.cancel}
                </Button>
              </View>
              <View className="flex-1">
                <Button
                  onPress={handleSaveWebAccess}
                  loading={isSavingWebAccess}
                  disabled={!canSaveWebAccess}
                  rightIcon={<Ionicons name="checkmark" size={20} color="#1A1614" />}
                >
                  {copy.webAccessSubmit}
                </Button>
              </View>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
    <SupportContactSheet visible={supportOpen} onClose={() => setSupportOpen(false)} context="Profil marchand" />
    </>
  )
}

function QuickAction({
  icon,
  label,
  href,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  href?: '/(tabs)/courses' | '/(tabs)/wallet' | '/(tabs)/addresses' | '/settings'
  onPress?: () => void
}) {
  const theme = useThemeStore((state) => state.theme)
  const iconColor = theme === 'dark' ? '#FDFCF9' : '#1A1614'

  const content = (
    <Pressable onPress={onPress} className="items-center" accessibilityRole="button">
      <View className="mb-2 h-14 w-14 items-center justify-center rounded-full bg-off-white dark:bg-[#181B24]">
        <Ionicons name={icon} size={24} color={iconColor} />
      </View>
      <Text className="text-center text-sm font-extrabold text-ink dark:text-white">{label}</Text>
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
  const theme = useThemeStore((state) => state.theme)
  const iconColor = theme === 'dark' ? '#FDFCF9' : '#1A1614'

  const content = (
    <Pressable className="min-h-20 flex-row items-center px-5 py-3" accessibilityRole="button">
      <Ionicons name={icon} size={25} color={iconColor} />
      <View className="ml-4 flex-1">
        <Text className="text-xl font-extrabold text-ink dark:text-white">{title}</Text>
        <Text className="mt-0.5 text-sm font-semibold text-warm-500 dark:text-[#AEB6C5]" numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={22} color={iconColor} />
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
  return <Text className="mb-2 mt-3 text-xs font-extrabold uppercase text-warm-500 dark:text-[#AEB6C5]">{children}</Text>
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
      className="h-14 rounded-2xl border border-warm-200 bg-white px-4 text-base font-semibold text-ink dark:border-[#343A46] dark:bg-[#181B24] dark:text-white"
      placeholder={placeholder}
      placeholderTextColor="#A89F95"
    />
  )
}

function Divider() {
  return <View className="ml-16 h-px bg-warm-200 dark:bg-[#2A2F3A]" />
}

function getApiErrorMessage(error: unknown) {
  if (isAxiosError(error)) {
    const data = error.response?.data as { message?: string; errors?: Record<string, string[]> } | undefined
    return data?.message ?? Object.values(data?.errors ?? {})[0]?.[0] ?? PROFILE_COPY.fr.updateFailed
  }

  return PROFILE_COPY.fr.updateFailed
}
