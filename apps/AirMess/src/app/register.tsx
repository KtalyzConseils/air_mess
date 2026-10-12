import { useMemo, useState } from 'react'
import { Linking, Pressable, Text, TextInput, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Link, Redirect, useRouter } from 'expo-router'
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import Button from '../components/ui/Button'
import { PRIVACY_URL, TERMS_URL } from '../api/terms'
import { SECTEURS_ACTIVITE, type RegisterAccountType, type SecteurActivite } from '../api/register'
import { useAuthStore } from '../stores/authStore'
import { useLanguageStore } from '../stores/languageStore'
import { getApiErrorMessage } from '../lib/apiError'

const REGISTER_COPY = {
  fr: {
    title: 'Creer ton compte',
    subtitle: 'Tes infos, un code recu par email, et ton compte est pret.',
    accountOptions: [
      { value: 'individual' as const, title: 'Particulier', subtitle: 'Pour envoyer quelques colis simplement' },
      { value: 'marchant' as const, title: 'Marchand', subtitle: 'Pour une boutique, un restaurant ou une entreprise' },
    ],
    stepYouAre: 'Tu es...',
    stepYouAreSubtitle: 'Ce choix adapte les prochaines informations.',
    continueLabel: 'Continuer',
    stepInfo: 'Tes informations',
    stepInfoSubtitle: "Ces infos servent a creer ton compte et a te contacter au sujet de tes courses.",
    nameLabelMarchant: "Nom de l'entreprise",
    namePlaceholderMarchant: 'Ex: Maison Kossi',
    firstNameLabel: 'Prenom',
    firstNamePlaceholder: 'Ex: Kossi',
    lastNameLabel: 'Nom',
    lastNamePlaceholder: 'Ex: Dossou',
    emailLabel: 'Email',
    emailPlaceholder: 'commercant@example.com',
    emailHelper: 'Ton email sert a te connecter et a recevoir ton code de confirmation.',
    phoneLabel: 'Telephone WhatsApp',
    phonePlaceholder: '+229...',
    passwordLabel: 'Mot de passe',
    passwordPlaceholder: '8 caracteres minimum',
    passwordConfirmLabel: 'Confirme ton mot de passe',
    passwordConfirmPlaceholder: 'Retape le meme mot de passe',
    passwordMismatch: 'Les deux mots de passe ne sont pas identiques.',
    passwordTooShort: 'Le mot de passe doit contenir au moins 8 caracteres.',
    secteurLabel: "Secteur d'activite",
    ifuLabel: 'Numero IFU / RCCM',
    ifuHelper: 'Optionnel, mais recommande pour la facturation.',
    ifuPlaceholder: 'Ex: 1234567890123',
    termsConfirm: "J'accepte les conditions generales et la politique de confidentialite.",
    terms: 'Conditions',
    privacy: 'Confidentialite',
    stepConfirm: 'Confirmation par email',
    stepConfirmSubtitle: (email: string) => `On envoie un code a ${email} pour confirmer ton adresse.`,
    sendCode: 'Recevoir le code par email',
    resendCode: 'Renvoyer un code',
    codeLabel: 'Code recu par email',
    codePlaceholder: '123456',
    createAccount: 'Creer mon compte',
    alreadyAccount: 'Deja un compte ? ',
    login: 'Se connecter',
    genericError: 'Action impossible.',
  },
  en: {
    title: 'Create your account',
    subtitle: 'Your details, a code sent by email, and your account is ready.',
    accountOptions: [
      { value: 'individual' as const, title: 'Individual', subtitle: 'To send a few parcels simply' },
      { value: 'marchant' as const, title: 'Merchant', subtitle: 'For a shop, restaurant or business' },
    ],
    stepYouAre: 'You are...',
    stepYouAreSubtitle: 'This choice adapts the next questions.',
    continueLabel: 'Continue',
    stepInfo: 'Your information',
    stepInfoSubtitle: 'We use it to create your account and reach you about your deliveries.',
    nameLabelMarchant: 'Business name',
    namePlaceholderMarchant: 'Ex: Kossi House',
    firstNameLabel: 'First name',
    firstNamePlaceholder: 'Ex: Kossi',
    lastNameLabel: 'Last name',
    lastNamePlaceholder: 'Ex: Dossou',
    emailLabel: 'Email',
    emailPlaceholder: 'merchant@example.com',
    emailHelper: 'Your email is used to sign in and to receive your confirmation code.',
    phoneLabel: 'WhatsApp phone',
    phonePlaceholder: '+229...',
    passwordLabel: 'Password',
    passwordPlaceholder: '8 characters minimum',
    passwordConfirmLabel: 'Confirm your password',
    passwordConfirmPlaceholder: 'Type the same password again',
    passwordMismatch: 'The two passwords are not identical.',
    passwordTooShort: 'The password must contain at least 8 characters.',
    secteurLabel: 'Business sector',
    ifuLabel: 'IFU / RCCM number',
    ifuHelper: 'Optional, but recommended for invoicing.',
    ifuPlaceholder: 'Ex: 1234567890123',
    termsConfirm: 'I accept the terms of service and privacy policy.',
    terms: 'Terms',
    privacy: 'Privacy',
    stepConfirm: 'Email confirmation',
    stepConfirmSubtitle: (email: string) => `We send a code to ${email} to confirm your address.`,
    sendCode: 'Receive the code by email',
    resendCode: 'Send a new code',
    codeLabel: 'Code received by email',
    codePlaceholder: '123456',
    createAccount: 'Create my account',
    alreadyAccount: 'Already have an account? ',
    login: 'Log in',
    genericError: 'Action failed.',
  },
} as const

const SECTEUR_LABELS: Record<'fr' | 'en', Record<SecteurActivite, string>> = {
  fr: {
    supermarche: 'Supermarche',
    restaurant: 'Restaurant',
    boutique: 'Boutique',
    pharmacie: 'Pharmacie',
    ecommerce: 'E-commerce',
    autre: 'Autre',
  },
  en: {
    supermarche: 'Supermarket',
    restaurant: 'Restaurant',
    boutique: 'Shop',
    pharmacie: 'Pharmacy',
    ecommerce: 'E-commerce',
    autre: 'Other',
  },
}

export default function RegisterScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const language = useLanguageStore((state) => state.language)
  const copy = REGISTER_COPY[language]
  const secteurLabels = SECTEUR_LABELS[language]
  const user = useAuthStore((state) => state.user)
  const sendCode = useAuthStore((state) => state.sendRegistrationEmailCode)
  const registerMarchant = useAuthStore((state) => state.registerMarchant)
  const registerIndividual = useAuthStore((state) => state.registerIndividual)

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [accountType, setAccountType] = useState<RegisterAccountType>('marchant')
  const [raisonSociale, setRaisonSociale] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [secteur, setSecteur] = useState<SecteurActivite | null>(null)
  const [ifu, setIfu] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [code, setCode] = useState('')
  const [codeSentTo, setCodeSentTo] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const trimmedName = raisonSociale.trim()
  const trimmedFirstName = firstName.trim()
  const trimmedLastName = lastName.trim()
  const trimmedEmail = email.trim()
  const trimmedPhone = phone.trim()
  const trimmedIfu = ifu.trim()
  const isMarchant = accountType === 'marchant'

  const displayName = isMarchant ? trimmedName : `${trimmedFirstName} ${trimmedLastName}`.trim()
  const passwordTooShort = password.length > 0 && password.length < 8
  const passwordMismatch = passwordConfirmation.length > 0 && password !== passwordConfirmation

  const identityOk = isMarchant
    ? trimmedName.length >= 2
    : trimmedFirstName.length >= 2 && trimmedLastName.length >= 2
  const passwordOk = password.length >= 8 && password === passwordConfirmation

  const canContinueInfo =
    identityOk &&
    trimmedEmail.includes('@') &&
    trimmedPhone.length >= 8 &&
    passwordOk &&
    (!isMarchant || secteur !== null) &&
    acceptedTerms

  const canSendCode = canContinueInfo && trimmedEmail.includes('@') && !loading
  const canCreate = code.trim().length === 6 && codeSentTo === trimmedEmail && !loading

  const progress = useMemo(() => [1, 2, 3].map((item) => item <= step), [step])

  if (user) {
    return <Redirect href="/dashboard" />
  }

  function goBack() {
    if (step === 1) {
      router.back()
      return
    }
    setError(null)
    setStep((current) => (current - 1) as 1 | 2)
  }

  /** Toute modification de l'email invalide le code deja envoye. */
  function changeEmail(value: string) {
    setEmail(value)
    if (codeSentTo && value.trim() !== codeSentTo) {
      setCodeSentTo(null)
      setCode('')
    }
  }

  async function handleSendCode() {
    if (!canSendCode) return
    setLoading(true)
    setError(null)

    try {
      await sendCode(trimmedEmail, displayName)
      setCodeSentTo(trimmedEmail)
      setStep(3)
    } catch (err) {
      setError(getApiErrorMessage(err, language))
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateAccount() {
    if (!canCreate) return
    setLoading(true)
    setError(null)

    try {
      if (isMarchant) {
        await registerMarchant({
          name: displayName,
          email: trimmedEmail,
          phone: trimmedPhone,
          password,
          password_confirmation: passwordConfirmation,
          raison_sociale: trimmedName,
          secteur_activite: secteur ?? 'autre',
          ifu_rccm: trimmedIfu || undefined,
          email_code: code.trim(),
          accepted_terms: true,
        })
      } else {
        await registerIndividual({
          first_name: trimmedFirstName,
          last_name: trimmedLastName,
          email: trimmedEmail,
          phone: trimmedPhone,
          password,
          password_confirmation: passwordConfirmation,
          email_code: code.trim(),
          accepted_terms: true,
        })
      }
      router.replace('/dashboard')
    } catch (err) {
      setError(getApiErrorMessage(err, language))
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
            onPress={goBack}
            className="h-11 w-11 items-center justify-center rounded-full bg-white/10"
            accessibilityRole="button"
          >
            <Ionicons name="arrow-back" size={24} color="#FDFCF9" />
          </Pressable>

          <Text className="mt-6 text-3xl font-extrabold text-white">{copy.title}</Text>
          <Text className="mt-2 text-sm font-semibold leading-5 text-warm-300">{copy.subtitle}</Text>

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
              <Text className="text-xl font-extrabold text-ink dark:text-white">{copy.stepYouAre}</Text>
              <Text className="mt-1 text-sm font-semibold text-warm-500 dark:text-[#AEB6C5]">
                {copy.stepYouAreSubtitle}
              </Text>

              <View className="mt-5 gap-3">
                {copy.accountOptions.map((option) => (
                  <ChoiceCard
                    key={option.value}
                    title={option.title}
                    subtitle={option.subtitle}
                    icon={option.value === 'individual' ? 'person-outline' : 'storefront-outline'}
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
                {copy.continueLabel}
              </Button>
            </View>
          )}

          {step === 2 && (
            <View>
              <Text className="text-xl font-extrabold text-ink dark:text-white">{copy.stepInfo}</Text>
              <Text className="mt-1 text-sm font-semibold text-warm-500 dark:text-[#AEB6C5]">
                {copy.stepInfoSubtitle}
              </Text>

              {isMarchant ? (
                <>
                  <FieldLabel>{copy.nameLabelMarchant}</FieldLabel>
                  <FormInput
                    value={raisonSociale}
                    onChangeText={setRaisonSociale}
                    placeholder={copy.namePlaceholderMarchant}
                    textContentType="organizationName"
                  />
                </>
              ) : (
                <>
                  <FieldLabel>{copy.firstNameLabel}</FieldLabel>
                  <FormInput
                    value={firstName}
                    onChangeText={setFirstName}
                    placeholder={copy.firstNamePlaceholder}
                    textContentType="givenName"
                  />
                  <FieldLabel>{copy.lastNameLabel}</FieldLabel>
                  <FormInput
                    value={lastName}
                    onChangeText={setLastName}
                    placeholder={copy.lastNamePlaceholder}
                    textContentType="familyName"
                  />
                </>
              )}

              <FieldLabel>{copy.emailLabel}</FieldLabel>
              <FormInput
                value={email}
                onChangeText={changeEmail}
                placeholder={copy.emailPlaceholder}
                autoCapitalize="none"
                keyboardType="email-address"
                textContentType="emailAddress"
              />
              <HelperText>{copy.emailHelper}</HelperText>

              <FieldLabel>{copy.phoneLabel}</FieldLabel>
              <FormInput
                value={phone}
                onChangeText={setPhone}
                placeholder={copy.phonePlaceholder}
                keyboardType="phone-pad"
                textContentType="telephoneNumber"
              />

              <FieldLabel>{copy.passwordLabel}</FieldLabel>
              <PasswordInput
                value={password}
                onChangeText={setPassword}
                placeholder={copy.passwordPlaceholder}
                visible={showPassword}
                onToggle={() => setShowPassword((value) => !value)}
              />
              <HelperText tone={passwordTooShort ? 'error' : 'muted'}>
                {passwordTooShort ? copy.passwordTooShort : copy.passwordPlaceholder}
              </HelperText>

              <FieldLabel>{copy.passwordConfirmLabel}</FieldLabel>
              <PasswordInput
                value={passwordConfirmation}
                onChangeText={setPasswordConfirmation}
                placeholder={copy.passwordConfirmPlaceholder}
                visible={showPassword}
                onToggle={() => setShowPassword((value) => !value)}
              />
              <HelperText tone={passwordMismatch ? 'error' : 'muted'}>
                {passwordMismatch ? copy.passwordMismatch : copy.passwordConfirmPlaceholder}
              </HelperText>

              {isMarchant && (
                <>
                  <FieldLabel>{copy.secteurLabel}</FieldLabel>
                  <View className="flex-row flex-wrap gap-2">
                    {SECTEURS_ACTIVITE.map((value) => {
                      const selected = secteur === value
                      return (
                        <Pressable
                          key={value}
                          onPress={() => setSecteur(value)}
                          className={[
                            'rounded-full border px-4 py-2.5',
                            selected
                              ? 'border-airmess-yellow bg-airmess-yellow'
                              : 'border-warm-200 bg-white dark:border-[#343A46] dark:bg-[#11141B]',
                          ].join(' ')}
                          accessibilityRole="button"
                          accessibilityState={{ selected }}
                        >
                          <Text className="text-sm font-extrabold text-ink dark:text-white">
                            {secteurLabels[value]}
                          </Text>
                        </Pressable>
                      )
                    })}
                  </View>

                  <FieldLabel>{copy.ifuLabel}</FieldLabel>
                  <FormInput
                    value={ifu}
                    onChangeText={setIfu}
                    placeholder={copy.ifuPlaceholder}
                    keyboardType="number-pad"
                  />
                  <HelperText>{copy.ifuHelper}</HelperText>
                </>
              )}

              <Pressable
                onPress={() => setAcceptedTerms((current) => !current)}
                className="mt-4 flex-row items-start rounded-2xl bg-white p-3 dark:bg-[#11141B]"
                accessibilityRole="checkbox"
                accessibilityState={{ checked: acceptedTerms }}
              >
                <Ionicons
                  name={acceptedTerms ? 'checkbox' : 'square-outline'}
                  size={22}
                  color="#1A1614"
                />
                <Text className="ml-3 flex-1 text-sm font-semibold leading-5 text-ink dark:text-white">
                  {copy.termsConfirm}
                </Text>
              </Pressable>

              <View className="mt-2 flex-row gap-2">
                <SmallLink label={copy.terms} url={TERMS_URL} />
                <SmallLink label={copy.privacy} url={PRIVACY_URL} />
              </View>

              <Button
                className="mt-6"
                onPress={() => void handleSendCode()}
                loading={loading}
                disabled={!canSendCode}
                rightIcon={<Ionicons name="mail-outline" size={18} color="#1A1614" />}
              >
                {copy.sendCode}
              </Button>
            </View>
          )}

          {step === 3 && (
            <View>
              <Text className="text-xl font-extrabold text-ink dark:text-white">{copy.stepConfirm}</Text>
              <Text className="mt-1 text-sm font-semibold leading-5 text-warm-500 dark:text-[#AEB6C5]">
                {copy.stepConfirmSubtitle(codeSentTo ?? trimmedEmail)}
              </Text>

              <View className="mt-4 flex-row items-center rounded-2xl border border-warm-200 bg-white px-4 py-3 dark:border-[#343A46] dark:bg-[#11141B]">
                <Ionicons name="mail-outline" size={18} color="#8A7E68" />
                <Text className="ml-2 flex-1 text-sm font-extrabold text-ink dark:text-white">
                  {codeSentTo ?? trimmedEmail}
                </Text>
                <Pressable
                  onPress={() => setStep(2)}
                  accessibilityRole="button"
                  hitSlop={8}
                >
                  <Text className="text-xs font-extrabold text-airmess-red">{copy.continueLabel}</Text>
                </Pressable>
              </View>

              <Button
                className="mt-4"
                variant="outline"
                onPress={() => void handleSendCode()}
                loading={loading}
                disabled={!canSendCode}
                rightIcon={<Ionicons name="send" size={18} color="#1A1614" />}
              >
                {copy.resendCode}
              </Button>

              <FieldLabel>{copy.codeLabel}</FieldLabel>
              <FormInput
                value={code}
                onChangeText={setCode}
                placeholder={copy.codePlaceholder}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
              />

              <Button
                className="mt-5"
                onPress={() => void handleCreateAccount()}
                loading={loading}
                disabled={!canCreate}
                rightIcon={<Ionicons name="checkmark" size={18} color="#1A1614" />}
              >
                {copy.createAccount}
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
          <Text className="text-sm font-semibold text-warm-300">{copy.alreadyAccount}</Text>
          <Link href="/login" asChild>
            <Pressable accessibilityRole="button">
              <Text className="text-sm font-extrabold text-airmess-yellow">{copy.login}</Text>
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

function HelperText({ children, tone = 'muted' }: { children: React.ReactNode; tone?: 'muted' | 'error' }) {
  return (
    <Text
      className={[
        'mt-1.5 text-xs font-semibold',
        tone === 'error' ? 'text-airmess-red' : 'text-warm-500 dark:text-[#AEB6C5]',
      ].join(' ')}
    >
      {children}
    </Text>
  )
}

function PasswordInput({
  value,
  onChangeText,
  placeholder,
  visible,
  onToggle,
}: {
  value: string
  onChangeText: (value: string) => void
  placeholder: string
  visible: boolean
  onToggle: () => void
}) {
  return (
    <View>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={!visible}
        autoCapitalize="none"
        autoCorrect={false}
        textContentType="newPassword"
        placeholder={placeholder}
        placeholderTextColor="#A89F95"
        className="h-14 rounded-2xl border border-warm-200 bg-white pl-4 pr-14 text-base font-semibold text-ink dark:border-[#343A46] dark:bg-[#11141B] dark:text-white"
      />
      <Pressable
        onPress={onToggle}
        className="absolute right-3 top-0 h-14 w-11 items-center justify-center"
        hitSlop={8}
        accessibilityRole="button"
      >
        <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={20} color="#8A7E68" />
      </Pressable>
    </View>
  )
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
  textContentType?: 'name' | 'givenName' | 'familyName' | 'organizationName' | 'emailAddress' | 'telephoneNumber' | 'oneTimeCode'
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
