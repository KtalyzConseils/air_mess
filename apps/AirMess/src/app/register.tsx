import { useMemo, useState } from 'react'
import { Linking, Pressable, Text, TextInput, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Link, Redirect, useRouter } from 'expo-router'
import { isAxiosError } from 'axios'
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import Button from '../components/ui/Button'
import { PRIVACY_URL, TERMS_URL } from '../api/terms'
import { useAuthStore } from '../stores/authStore'
import type { QuickRegisterAccountType, VerificationChannel } from '../api/register'

const ACCOUNT_OPTIONS: {
  value: QuickRegisterAccountType
  title: string
  subtitle: string
  icon: keyof typeof Ionicons.glyphMap
}[] = [
  {
    value: 'individual',
    title: 'Particulier',
    subtitle: 'Pour envoyer quelques colis simplement',
    icon: 'person-outline',
  },
  {
    value: 'marchant',
    title: 'Marchand',
    subtitle: 'Pour une boutique, un restaurant ou une entreprise',
    icon: 'storefront-outline',
  },
]

const CHANNEL_OPTIONS: {
  value: VerificationChannel
  title: string
  subtitle: string
  icon: keyof typeof Ionicons.glyphMap
}[] = [
  {
    value: 'phone',
    title: 'Telephone',
    subtitle: 'Recevoir le code par SMS',
    icon: 'chatbubble-ellipses-outline',
  },
  {
    value: 'email',
    title: 'Email',
    subtitle: 'Recevoir le code dans ma boite mail',
    icon: 'mail-outline',
  },
]

export default function RegisterScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const user = useAuthStore((state) => state.user)
  const sendCode = useAuthStore((state) => state.sendQuickRegistrationCode)
  const verifyCode = useAuthStore((state) => state.verifyQuickRegistration)
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [accountType, setAccountType] = useState<QuickRegisterAccountType>('individual')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [phoneIsWhatsapp, setPhoneIsWhatsapp] = useState(true)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [channel, setChannel] = useState<VerificationChannel>('phone')
  const [code, setCode] = useState('')
  const [debugCode, setDebugCode] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const trimmedName = displayName.trim()
  const trimmedEmail = email.trim()
  const trimmedPhone = phone.trim()
  const needsEmail = channel === 'email'

  const canContinueInfo =
    trimmedName.length >= 2 &&
    trimmedPhone.length >= 8 &&
    phoneIsWhatsapp &&
    acceptedTerms &&
    (!trimmedEmail || trimmedEmail.includes('@'))
  const canSendCode = canContinueInfo && (!needsEmail || trimmedEmail.includes('@'))
  const canVerify = code.trim().length >= 4
  const nameLabel = accountType === 'marchant' ? "Nom de l'entreprise" : 'Nom complet'
  const progress = useMemo(() => [1, 2, 3].map((item) => item <= step), [step])

  if (user) {
    return <Redirect href="/dashboard" />
  }

  async function handleSendCode() {
    if (!canSendCode) return
    setLoading(true)
    setError(null)
    setDebugCode(null)

    try {
      const response = await sendCode({
        account_type: accountType,
        display_name: trimmedName,
        email: trimmedEmail || null,
        phone: trimmedPhone,
        verification_channel: channel,
        phone_is_whatsapp: phoneIsWhatsapp,
        accepted_terms: acceptedTerms,
      })
      setDebugCode(response.debug_code ?? null)
      setStep(3)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  async function handleVerify() {
    if (!canVerify) return
    setLoading(true)
    setError(null)

    try {
      await verifyCode(trimmedPhone, code.trim())
      router.replace('/dashboard')
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-airmess-dark" edges={['top', 'left', 'right']}>
      <KeyboardAwareScrollView
        bottomOffset={96}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 + insets.bottom }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="px-5 pb-4 pt-4">
          <Pressable
            onPress={() => (step === 1 ? router.back() : setStep((current) => (current - 1) as 1 | 2 | 3))}
            className="h-11 w-11 items-center justify-center rounded-full bg-white/10"
            accessibilityRole="button"
          >
            <Ionicons name="arrow-back" size={24} color="#FDFCF9" />
          </Pressable>

          <Text className="mt-6 text-3xl font-extrabold text-white">Creer ton compte</Text>
          <Text className="mt-2 text-sm font-semibold leading-5 text-warm-300">
            Quelques infos, un code de confirmation, puis tu peux lancer tes courses.
          </Text>

          <View className="mt-6 flex-row gap-2">
            {progress.map((active, index) => (
              <View
                key={index}
                className={['h-2 flex-1 rounded-full', active ? 'bg-airmess-yellow' : 'bg-white/15'].join(' ')}
              />
            ))}
          </View>
        </View>

        <View className="mx-5 rounded-3xl bg-cream p-5 shadow-cta-dark dark:bg-[#181B24]">
          {step === 1 && (
            <View>
              <Text className="text-xl font-extrabold text-ink dark:text-white">Tu es...</Text>
              <Text className="mt-1 text-sm font-semibold text-warm-500 dark:text-[#AEB6C5]">
                Ce choix adapte les prochaines informations.
              </Text>

              <View className="mt-5 gap-3">
                {ACCOUNT_OPTIONS.map((option) => (
                  <ChoiceCard
                    key={option.value}
                    title={option.title}
                    subtitle={option.subtitle}
                    icon={option.icon}
                    selected={accountType === option.value}
                    onPress={() => setAccountType(option.value)}
                  />
                ))}
              </View>

              <Button
                className="mt-6"
                onPress={() => setStep(2)}
                rightIcon={<Ionicons name="arrow-forward" size={18} color="#1A1614" />}
              >
                Continuer
              </Button>
            </View>
          )}

          {step === 2 && (
            <View>
              <Text className="text-xl font-extrabold text-ink dark:text-white">Tes informations</Text>
              <Text className="mt-1 text-sm font-semibold text-warm-500 dark:text-[#AEB6C5]">
                On garde seulement ce qui est utile pour creer une course.
              </Text>

              <FieldLabel>{nameLabel}</FieldLabel>
              <FormInput
                value={displayName}
                onChangeText={setDisplayName}
                placeholder={accountType === 'marchant' ? 'Ex: Maison Kossi' : 'Ex: Kossi A.'}
                textContentType="name"
              />

              <FieldLabel>Email visible dans le profil</FieldLabel>
              <FormInput
                value={email}
                onChangeText={setEmail}
                placeholder="optionnel@example.com"
                autoCapitalize="none"
                keyboardType="email-address"
                textContentType="emailAddress"
              />

              <FieldLabel>Telephone WhatsApp</FieldLabel>
              <FormInput
                value={phone}
                onChangeText={setPhone}
                placeholder="+229..."
                keyboardType="phone-pad"
                textContentType="telephoneNumber"
              />

              <Pressable
                onPress={() => setPhoneIsWhatsapp((current) => !current)}
                className="mt-4 flex-row items-start rounded-2xl bg-white p-3 dark:bg-[#11141B]"
                accessibilityRole="checkbox"
                accessibilityState={{ checked: phoneIsWhatsapp }}
              >
                <Ionicons
                  name={phoneIsWhatsapp ? 'checkbox' : 'square-outline'}
                  size={22}
                  color="#1A1614"
                />
                <Text className="ml-3 flex-1 text-sm font-semibold leading-5 text-ink dark:text-white">
                  Je confirme que ce numero est joignable sur WhatsApp.
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setAcceptedTerms((current) => !current)}
                className="mt-3 flex-row items-start rounded-2xl bg-white p-3 dark:bg-[#11141B]"
                accessibilityRole="checkbox"
                accessibilityState={{ checked: acceptedTerms }}
              >
                <Ionicons
                  name={acceptedTerms ? 'checkbox' : 'square-outline'}
                  size={22}
                  color="#1A1614"
                />
                <Text className="ml-3 flex-1 text-sm font-semibold leading-5 text-ink dark:text-white">
                  J'accepte les conditions generales et la politique de confidentialite.
                </Text>
              </Pressable>

              <View className="mt-2 flex-row gap-2">
                <SmallLink label="Conditions" url={TERMS_URL} />
                <SmallLink label="Confidentialite" url={PRIVACY_URL} />
              </View>

              <Button
                className="mt-6"
                onPress={() => setStep(3)}
                disabled={!canContinueInfo}
                rightIcon={<Ionicons name="arrow-forward" size={18} color="#1A1614" />}
              >
                Continuer
              </Button>
            </View>
          )}

          {step === 3 && (
            <View>
              <Text className="text-xl font-extrabold text-ink dark:text-white">Confirmation</Text>
              <Text className="mt-1 text-sm font-semibold leading-5 text-warm-500 dark:text-[#AEB6C5]">
                Choisis ou recevoir le code, puis saisis-le ici.
              </Text>

              <View className="mt-5 gap-3">
                {CHANNEL_OPTIONS.map((option) => (
                  <ChoiceCard
                    key={option.value}
                    title={option.title}
                    subtitle={option.subtitle}
                    icon={option.icon}
                    selected={channel === option.value}
                    disabled={option.value === 'email' && !trimmedEmail}
                    onPress={() => setChannel(option.value)}
                  />
                ))}
              </View>

              <Button
                className="mt-5"
                onPress={handleSendCode}
                loading={loading && !debugCode}
                disabled={!canSendCode || loading}
                rightIcon={<Ionicons name="send" size={18} color="#1A1614" />}
              >
                Envoyer le code
              </Button>

              {debugCode && (
                <Text className="mt-3 rounded-2xl bg-airmess-yellow/20 px-3 py-2 text-center text-sm font-extrabold text-ink">
                  Code test : {debugCode}
                </Text>
              )}

              <FieldLabel>Code de confirmation</FieldLabel>
              <FormInput
                value={code}
                onChangeText={setCode}
                placeholder="123456"
                keyboardType="number-pad"
                textContentType="oneTimeCode"
              />

              <Button
                className="mt-5"
                onPress={handleVerify}
                loading={loading && !!code}
                disabled={!canVerify || loading}
                rightIcon={<Ionicons name="checkmark" size={18} color="#1A1614" />}
              >
                Creer mon compte
              </Button>
            </View>
          )}

          {error && (
            <View className="mt-4 flex-row items-start rounded-2xl border border-airmess-red/30 bg-danger-bg p-3">
              <Ionicons name="alert-circle" size={20} color="#D40511" />
              <Text className="ml-2 flex-1 text-sm font-bold text-airmess-red">{error}</Text>
            </View>
          )}
        </View>

        <View className="mt-5 flex-row justify-center">
          <Text className="text-sm font-semibold text-warm-300">Deja un compte ? </Text>
          <Link href="/login" asChild>
            <Pressable accessibilityRole="button">
              <Text className="text-sm font-extrabold text-airmess-yellow">Se connecter</Text>
            </Pressable>
          </Link>
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  )
}

function ChoiceCard({
  title,
  subtitle,
  icon,
  selected,
  disabled,
  onPress,
}: {
  title: string
  subtitle: string
  icon: keyof typeof Ionicons.glyphMap
  selected: boolean
  disabled?: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={[
        'min-h-20 flex-row items-center rounded-2xl border px-4 py-3',
        selected ? 'border-airmess-yellow bg-airmess-yellow' : 'border-warm-200 bg-white dark:border-[#343A46] dark:bg-[#11141B]',
        disabled ? 'opacity-40' : '',
      ].join(' ')}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
    >
      <View className="mr-3 h-11 w-11 items-center justify-center rounded-full bg-off-white">
        <Ionicons name={icon} size={22} color="#1A1614" />
      </View>
      <View className="flex-1">
        <Text className={['text-base font-extrabold', selected ? 'text-ink' : 'text-ink dark:text-white'].join(' ')}>
          {title}
        </Text>
        <Text className={['mt-0.5 text-xs font-semibold leading-4', selected ? 'text-warm-600' : 'text-warm-500 dark:text-[#AEB6C5]'].join(' ')}>
          {subtitle}
        </Text>
      </View>
      {selected && <Ionicons name="checkmark-circle" size={22} color="#1A1614" />}
    </Pressable>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <Text className="mb-2 mt-4 text-xs font-extrabold uppercase text-warm-500 dark:text-[#AEB6C5]">{children}</Text>
}

function SmallLink({ label, url }: { label: string; url: string }) {
  return (
    <Pressable
      onPress={() => void Linking.openURL(url)}
      className="min-h-9 flex-1 items-center justify-center rounded-full bg-airmess-yellow/20 px-3"
      accessibilityRole="link"
    >
      <Text className="text-xs font-extrabold text-ink dark:text-white">{label}</Text>
    </Pressable>
  )
}

function FormInput({
  value,
  onChangeText,
  placeholder,
  keyboardType,
  textContentType,
  autoCapitalize,
}: {
  value: string
  onChangeText: (value: string) => void
  placeholder: string
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'number-pad'
  textContentType?: 'name' | 'emailAddress' | 'telephoneNumber' | 'oneTimeCode'
  autoCapitalize?: 'none'
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      keyboardType={keyboardType}
      textContentType={textContentType}
      autoCapitalize={autoCapitalize}
      placeholder={placeholder}
      placeholderTextColor="#A89F95"
      className="h-14 rounded-2xl border border-warm-200 bg-white px-4 text-base font-semibold text-ink dark:border-[#343A46] dark:bg-[#11141B] dark:text-white"
    />
  )
}

function getErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const data = error.response?.data as { message?: string; errors?: Record<string, string[]> } | undefined
    return data?.message ?? Object.values(data?.errors ?? {})[0]?.[0] ?? 'Action impossible.'
  }
  return error instanceof Error ? error.message : 'Action impossible.'
}
