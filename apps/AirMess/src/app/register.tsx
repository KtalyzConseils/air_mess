import { useState } from 'react'
import { Linking, Pressable, Text, TextInput, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { Ionicons } from '@expo/vector-icons'
import { Link, Redirect, useRouter } from 'expo-router'
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller'
import { SafeAreaView } from 'react-native-safe-area-context'
import Button from '../components/ui/Button'
import WizardHeader from '../components/register/WizardHeader'
import WizardFooter from '../components/register/WizardFooter'
import { PRIVACY_URL, TERMS_URL } from '../api/terms'
import { SECTEURS_ACTIVITE, type RegisterAccountType, type SecteurActivite } from '../api/register'
import { useAuthStore } from '../stores/authStore'
import { useLanguageStore } from '../stores/languageStore'
import { getApiErrorMessage } from '../lib/apiError'

/**
 * Etapes du wizard, calquees sur l'app livreur : une question par ecran.
 * Le particulier saute l'etape "entreprise" (secteur + IFU).
 */
type StepKey = 'type' | 'identite' | 'compte' | 'telephone' | 'entreprise' | 'confirmation'

const MARCHANT_STEPS: StepKey[] = ['type', 'identite', 'compte', 'telephone', 'entreprise', 'confirmation']
const INDIVIDUAL_STEPS: StepKey[] = ['type', 'identite', 'compte', 'telephone', 'confirmation']

const REGISTER_COPY = {
  fr: {
    wizardLabel: 'Devenir marchand',
    back: 'Retour',
    next: 'Suivant',
    submit: 'Creer mon compte',
    stepTitles: {
      type: { title: 'Tu es...', subtitle: 'Ce choix adapte les prochaines etapes.' },
      identiteMarchant: { title: 'Ton entreprise', subtitle: 'Le nom qui apparaitra sur tes courses.' },
      identiteIndividual: { title: 'Ton identite', subtitle: 'Ton prenom et ton nom.' },
      compte: { title: 'Ton compte', subtitle: 'Email et mot de passe : tes identifiants de connexion.' },
      telephone: { title: 'Ton numero', subtitle: 'Le numero joignable pour tes livraisons.' },
      entreprise: { title: 'Ton activite', subtitle: "Ton secteur, et ton numero IFU si tu l'as." },
      confirmation: { title: 'Confirmation', subtitle: 'Un code recu par email, puis les conditions.' },
    },
    errors: {
      type: 'Choisis un type de compte.',
      raisonSociale: "Renseigne le nom de ton entreprise.",
      identity: 'Renseigne ton prenom et ton nom.',
      email: 'Renseigne ton email.',
      password: 'Mot de passe : 8 caracteres minimum.',
      passwordMismatch: 'Les deux mots de passe ne sont pas identiques.',
      phone: 'Numero invalide.',
      secteur: "Choisis ton secteur d'activite.",
      code: 'Demande ton code de confirmation.',
      codeLength: 'Saisis les 6 chiffres du code.',
      terms: 'Tu dois accepter les conditions.',
    },
    typeOptions: [
      { value: 'individual' as const, title: 'Particulier', subtitle: 'Pour envoyer quelques colis simplement' },
      { value: 'marchant' as const, title: 'Marchand', subtitle: 'Pour une boutique, un restaurant ou une entreprise' },
    ],
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
    phoneHelper: 'Le livreur appellera ce numero pour te joindre.',
    passwordLabel: 'Mot de passe',
    passwordPlaceholder: '8 caracteres minimum',
    passwordConfirmLabel: 'Confirme ton mot de passe',
    passwordConfirmPlaceholder: 'Retape le meme mot de passe',
    secteurLabel: "Secteur d'activite",
    ifuLabel: 'Numero IFU / RCCM',
    ifuHelper: 'Optionnel, mais recommande pour la facturation.',
    ifuPlaceholder: 'Ex: 1234567890123',
    sendCode: 'Recevoir le code par email',
    resendCode: 'Renvoyer un code',
    codeLabel: 'Code recu par email',
    codePlaceholder: '123456',
    codeHelper: 'Ouvre ta boite mail, puis recopie les 6 chiffres recus.',
    codeSentTo: (email: string) => `Code envoye a ${email}.`,
    termsConfirm: "J'accepte les conditions generales et la politique de confidentialite.",
    terms: 'Conditions',
    privacy: 'Confidentialite',
    alreadyAccount: 'Deja un compte ? ',
    login: 'Se connecter',
  },
  en: {
    wizardLabel: 'Become a merchant',
    back: 'Back',
    next: 'Next',
    submit: 'Create my account',
    stepTitles: {
      type: { title: 'You are...', subtitle: 'This choice adapts the next steps.' },
      identiteMarchant: { title: 'Your business', subtitle: 'The name that will appear on your deliveries.' },
      identiteIndividual: { title: 'Your identity', subtitle: 'Your first and last name.' },
      compte: { title: 'Your account', subtitle: 'Email and password: your sign-in details.' },
      telephone: { title: 'Your number', subtitle: 'The number we can reach for your deliveries.' },
      entreprise: { title: 'Your business activity', subtitle: 'Your sector, and your TIN if you have one.' },
      confirmation: { title: 'Confirmation', subtitle: 'A code sent by email, then the terms.' },
    },
    errors: {
      type: 'Choose an account type.',
      raisonSociale: 'Enter your business name.',
      identity: 'Enter your first and last name.',
      email: 'Enter your email.',
      password: 'Password: 8 characters minimum.',
      passwordMismatch: 'The two passwords are not identical.',
      phone: 'Invalid number.',
      secteur: 'Choose your business sector.',
      code: 'Request your confirmation code.',
      codeLength: 'Enter the 6 digits of the code.',
      terms: 'You must accept the terms.',
    },
    typeOptions: [
      { value: 'individual' as const, title: 'Individual', subtitle: 'To send a few parcels simply' },
      { value: 'marchant' as const, title: 'Merchant', subtitle: 'For a shop, restaurant or business' },
    ],
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
    phoneHelper: 'The courier will call this number to reach you.',
    passwordLabel: 'Password',
    passwordPlaceholder: '8 characters minimum',
    passwordConfirmLabel: 'Confirm your password',
    passwordConfirmPlaceholder: 'Type the same password again',
    secteurLabel: 'Business sector',
    ifuLabel: 'TIN / Business ID',
    ifuHelper: 'Optional, but recommended for invoicing.',
    ifuPlaceholder: 'Ex: 1234567890123',
    sendCode: 'Receive the code by email',
    resendCode: 'Send a new code',
    codeLabel: 'Code received by email',
    codePlaceholder: '123456',
    codeHelper: 'Open your inbox, then copy the 6 digits you received.',
    codeSentTo: (email: string) => `Code sent to ${email}.`,
    termsConfirm: 'I accept the terms of service and privacy policy.',
    terms: 'Terms',
    privacy: 'Privacy',
    alreadyAccount: 'Already have an account? ',
    login: 'Log in',
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

function digitsOnly(value: string): string {
  return value.replace(/\D/g, '')
}

export default function RegisterScreen() {
  const router = useRouter()
  const language = useLanguageStore((state) => state.language)
  const copy = REGISTER_COPY[language]
  const secteurLabels = SECTEUR_LABELS[language]
  const user = useAuthStore((state) => state.user)
  const sendCode = useAuthStore((state) => state.sendRegistrationEmailCode)
  const registerMarchant = useAuthStore((state) => state.registerMarchant)
  const registerIndividual = useAuthStore((state) => state.registerIndividual)

  const [stepIndex, setStepIndex] = useState(1)
  const [accountType, setAccountType] = useState<RegisterAccountType | null>(null)
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
  const [sendingCode, setSendingCode] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const steps = accountType === 'individual' ? INDIVIDUAL_STEPS : MARCHANT_STEPS
  const stepKey: StepKey = steps[stepIndex - 1] ?? 'type'
  const isLastStep = stepIndex === steps.length
  const isMarchant = accountType !== 'individual'

  const trimmedName = raisonSociale.trim()
  const trimmedFirstName = firstName.trim()
  const trimmedLastName = lastName.trim()
  const trimmedEmail = email.trim()
  const trimmedPhone = phone.trim()
  const trimmedIfu = ifu.trim()
  const displayName = isMarchant ? trimmedName : `${trimmedFirstName} ${trimmedLastName}`.trim()

  // L'etape "identite" a deux libelles selon le type de compte.
  const metaKey = stepKey === 'identite' ? (isMarchant ? 'identiteMarchant' : 'identiteIndividual') : stepKey
  const meta = copy.stepTitles[metaKey]

  if (user) {
    return <Redirect href="/dashboard" />
  }

  /** Validation de l'etape courante : pilote l'etat du CTA du bas. */
  function validateStep(key: StepKey): string | null {
    switch (key) {
      case 'type':
        return accountType ? null : copy.errors.type
      case 'identite':
        if (isMarchant) return trimmedName.length >= 2 ? null : copy.errors.raisonSociale
        return trimmedFirstName.length >= 2 && trimmedLastName.length >= 2 ? null : copy.errors.identity
      case 'compte':
        if (!trimmedEmail.includes('@')) return copy.errors.email
        if (password.length < 8) return copy.errors.password
        if (password !== passwordConfirmation) return copy.errors.passwordMismatch
        return null
      case 'telephone':
        return digitsOnly(trimmedPhone).length >= 8 ? null : copy.errors.phone
      case 'entreprise':
        return secteur ? null : copy.errors.secteur
      case 'confirmation':
        if (codeSentTo !== trimmedEmail) return copy.errors.code
        if (code.trim().length !== 6) return copy.errors.codeLength
        return acceptedTerms ? null : copy.errors.terms
      default:
        return null
    }
  }

  const currentStepValid = validateStep(stepKey) === null

  /** Toute modification de l'email invalide le code deja recu. */
  function changeEmail(value: string) {
    setEmail(value)
    if (codeSentTo && value.trim() !== codeSentTo) {
      setCodeSentTo(null)
      setCode('')
    }
  }

  async function sendCodeNow() {
    if (!trimmedEmail.includes('@')) return
    setSendingCode(true)
    setError(null)
    try {
      await sendCode(trimmedEmail, displayName)
      setCodeSentTo(trimmedEmail)
    } catch (err) {
      setError(getApiErrorMessage(err, language))
    } finally {
      setSendingCode(false)
    }
  }

  async function goNext() {
    const stepError = validateStep(stepKey)
    if (stepError) {
      setError(stepError)
      return
    }
    setError(null)

    if (isLastStep) {
      await handleSubmit()
      return
    }

    // Le code part des qu'on arrive sur l'etape de confirmation : une action
    // de moins pour l'utilisateur, et jamais deux envois pour le meme email.
    if (steps[stepIndex] === 'confirmation' && codeSentTo !== trimmedEmail) {
      await sendCodeNow()
    }

    setStepIndex((current) => current + 1)
  }

  function goBack() {
    setError(null)
    setStepIndex((current) => Math.max(1, current - 1))
  }

  async function handleSubmit() {
    setError(null)
    setSubmitting(true)

    try {
      if (accountType === 'marchant') {
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
      setSubmitting(false)
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-airmess-dark" edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar style="light" />

      <WizardHeader
        step={stepIndex}
        totalSteps={steps.length}
        label={copy.wizardLabel}
        backLabel={copy.back}
        title={meta.title}
        subtitle={meta.subtitle}
        onBack={goBack}
        canGoBack={stepIndex > 1}
      />

      <KeyboardAwareScrollView
        mode="layout"
        bottomOffset={24}
        contentContainerStyle={{ paddingBottom: 20 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
      >
        <View className="mx-5 rounded-3xl bg-cream p-5">
          {stepKey === 'type' && (
            <StepType
              options={copy.typeOptions}
              value={accountType}
              onChange={setAccountType}
            />
          )}

          {stepKey === 'identite' && (
            <StepIdentity
              isMarchant={isMarchant}
              raisonSociale={raisonSociale}
              setRaisonSociale={setRaisonSociale}
              firstName={firstName}
              setFirstName={setFirstName}
              lastName={lastName}
              setLastName={setLastName}
              labels={{
                nameLabel: copy.nameLabelMarchant,
                namePlaceholder: copy.namePlaceholderMarchant,
                firstNameLabel: copy.firstNameLabel,
                firstNamePlaceholder: copy.firstNamePlaceholder,
                lastNameLabel: copy.lastNameLabel,
                lastNamePlaceholder: copy.lastNamePlaceholder,
              }}
            />
          )}

          {stepKey === 'compte' && (
            <StepAccount
              email={email}
              setEmail={changeEmail}
              password={password}
              setPassword={setPassword}
              passwordConfirmation={passwordConfirmation}
              setPasswordConfirmation={setPasswordConfirmation}
              showPassword={showPassword}
              toggleShowPassword={() => setShowPassword((value) => !value)}
              labels={{
                emailLabel: copy.emailLabel,
                emailPlaceholder: copy.emailPlaceholder,
                emailHelper: copy.emailHelper,
                passwordLabel: copy.passwordLabel,
                passwordPlaceholder: copy.passwordPlaceholder,
                passwordConfirmLabel: copy.passwordConfirmLabel,
                passwordConfirmPlaceholder: copy.passwordConfirmPlaceholder,
              }}
              passwordTooShort={copy.errors.password}
              passwordMismatch={copy.errors.passwordMismatch}
            />
          )}

          {stepKey === 'telephone' && (
            <StepPhone
              phone={phone}
              onChangePhone={setPhone}
              label={copy.phoneLabel}
              placeholder={copy.phonePlaceholder}
              helper={copy.phoneHelper}
            />
          )}

          {stepKey === 'entreprise' && (
            <StepActivity
              secteur={secteur}
              onChangeSecteur={setSecteur}
              secteurLabel={copy.secteurLabel}
              secteurLabels={secteurLabels}
              ifu={ifu}
              onChangeIfu={setIfu}
              ifuLabel={copy.ifuLabel}
              ifuPlaceholder={copy.ifuPlaceholder}
              ifuHelper={copy.ifuHelper}
            />
          )}

          {stepKey === 'confirmation' && (
            <StepConfirmation
              email={codeSentTo ?? trimmedEmail}
              code={code}
              onChangeCode={setCode}
              onResend={() => void sendCodeNow()}
              resending={sendingCode}
              resendLabel={copy.resendCode}
              codeLabel={copy.codeLabel}
              codePlaceholder={copy.codePlaceholder}
              codeHelper={codeSentTo ? copy.codeSentTo(codeSentTo) : copy.codeHelper}
              acceptedTerms={acceptedTerms}
              toggleAcceptedTerms={() => setAcceptedTerms((value) => !value)}
              termsConfirm={copy.termsConfirm}
              termsLabel={copy.terms}
              privacyLabel={copy.privacy}
            />
          )}

          {error ? (
            <View className="mt-4 flex-row items-start rounded-2xl border-2 border-airmess-red/30 bg-danger-bg p-3">
              <Ionicons name="alert-circle" size={18} color="#D40511" />
              <Text className="ml-2 flex-1 text-sm font-semibold text-airmess-red">{error}</Text>
            </View>
          ) : null}
        </View>

        {stepIndex === 1 && (
          <View className="mt-5 flex-row justify-center">
            <Text className="text-sm font-semibold text-warm-300">{copy.alreadyAccount}</Text>
            <Link href="/login" asChild>
              <Pressable accessibilityRole="button">
                <Text className="text-sm font-extrabold text-airmess-yellow">{copy.login}</Text>
              </Pressable>
            </Link>
          </View>
        )}
      </KeyboardAwareScrollView>

      <WizardFooter
        isLast={isLastStep}
        canGoBack={stepIndex > 1}
        onNext={() => void goNext()}
        onBack={goBack}
        nextDisabled={!currentStepValid || sendingCode}
        submitting={submitting}
        backLabel={copy.back}
        nextLabel={copy.next}
        submitLabel={copy.submit}
      />
    </SafeAreaView>
  )
}

/* ============================================================
   Etapes — chaque bloc est isole pour rester lisible
   ============================================================ */

function StepType({
  options,
  value,
  onChange,
}: {
  options: readonly { value: RegisterAccountType; title: string; subtitle: string }[]
  value: RegisterAccountType | null
  onChange: (value: RegisterAccountType) => void
}) {
  return (
    <View className="gap-3">
      {options.map((option) => (
        <ChoiceCard
          key={option.value}
          title={option.title}
          subtitle={option.subtitle}
          icon={option.value === 'individual' ? 'person-outline' : 'storefront-outline'}
          selected={value === option.value}
          onPress={() => onChange(option.value)}
        />
      ))}
    </View>
  )
}

function StepIdentity({
  isMarchant,
  raisonSociale,
  setRaisonSociale,
  firstName,
  setFirstName,
  lastName,
  setLastName,
  labels,
}: {
  isMarchant: boolean
  raisonSociale: string
  setRaisonSociale: (value: string) => void
  firstName: string
  setFirstName: (value: string) => void
  lastName: string
  setLastName: (value: string) => void
  labels: {
    nameLabel: string
    namePlaceholder: string
    firstNameLabel: string
    firstNamePlaceholder: string
    lastNameLabel: string
    lastNamePlaceholder: string
  }
}) {
  if (isMarchant) {
    return (
      <View>
        <FieldLabel>{labels.nameLabel}</FieldLabel>
        <FormInput
          value={raisonSociale}
          onChangeText={setRaisonSociale}
          placeholder={labels.namePlaceholder}
          textContentType="organizationName"
        />
      </View>
    )
  }

  return (
    <View>
      <FieldLabel>{labels.firstNameLabel}</FieldLabel>
      <FormInput
        value={firstName}
        onChangeText={setFirstName}
        placeholder={labels.firstNamePlaceholder}
        textContentType="givenName"
      />
      <FieldLabel>{labels.lastNameLabel}</FieldLabel>
      <FormInput
        value={lastName}
        onChangeText={setLastName}
        placeholder={labels.lastNamePlaceholder}
        textContentType="familyName"
      />
    </View>
  )
}

function StepAccount({
  email,
  setEmail,
  password,
  setPassword,
  passwordConfirmation,
  setPasswordConfirmation,
  showPassword,
  toggleShowPassword,
  labels,
  passwordTooShort,
  passwordMismatch,
}: {
  email: string
  setEmail: (value: string) => void
  password: string
  setPassword: (value: string) => void
  passwordConfirmation: string
  setPasswordConfirmation: (value: string) => void
  showPassword: boolean
  toggleShowPassword: () => void
  labels: {
    emailLabel: string
    emailPlaceholder: string
    emailHelper: string
    passwordLabel: string
    passwordPlaceholder: string
    passwordConfirmLabel: string
    passwordConfirmPlaceholder: string
  }
  passwordTooShort: string
  passwordMismatch: string
}) {
  const tooShort = password.length > 0 && password.length < 8
  const mismatch = passwordConfirmation.length > 0 && password !== passwordConfirmation

  return (
    <View>
      <FieldLabel>{labels.emailLabel}</FieldLabel>
      <FormInput
        value={email}
        onChangeText={setEmail}
        placeholder={labels.emailPlaceholder}
        autoCapitalize="none"
        keyboardType="email-address"
        textContentType="emailAddress"
      />
      <HelperText>{labels.emailHelper}</HelperText>

      <FieldLabel>{labels.passwordLabel}</FieldLabel>
      <PasswordInput
        value={password}
        onChangeText={setPassword}
        placeholder={labels.passwordPlaceholder}
        visible={showPassword}
        onToggle={toggleShowPassword}
      />
      <HelperText tone={tooShort ? 'error' : 'muted'}>
        {tooShort ? passwordTooShort : labels.passwordPlaceholder}
      </HelperText>

      <FieldLabel>{labels.passwordConfirmLabel}</FieldLabel>
      <PasswordInput
        value={passwordConfirmation}
        onChangeText={setPasswordConfirmation}
        placeholder={labels.passwordConfirmPlaceholder}
        visible={showPassword}
        onToggle={toggleShowPassword}
      />
      <HelperText tone={mismatch ? 'error' : 'muted'}>
        {mismatch ? passwordMismatch : labels.passwordConfirmPlaceholder}
      </HelperText>
    </View>
  )
}

function StepPhone({
  phone,
  onChangePhone,
  label,
  placeholder,
  helper,
}: {
  phone: string
  onChangePhone: (value: string) => void
  label: string
  placeholder: string
  helper: string
}) {
  return (
    <View>
      <FieldLabel>{label}</FieldLabel>
      <FormInput
        value={phone}
        onChangeText={onChangePhone}
        placeholder={placeholder}
        keyboardType="phone-pad"
        textContentType="telephoneNumber"
      />
      <HelperText>{helper}</HelperText>
    </View>
  )
}

function StepActivity({
  secteur,
  onChangeSecteur,
  secteurLabel,
  secteurLabels,
  ifu,
  onChangeIfu,
  ifuLabel,
  ifuPlaceholder,
  ifuHelper,
}: {
  secteur: SecteurActivite | null
  onChangeSecteur: (value: SecteurActivite) => void
  secteurLabel: string
  secteurLabels: Record<SecteurActivite, string>
  ifu: string
  onChangeIfu: (value: string) => void
  ifuLabel: string
  ifuPlaceholder: string
  ifuHelper: string
}) {
  return (
    <View>
      <FieldLabel>{secteurLabel}</FieldLabel>
      <View className="flex-row flex-wrap gap-2">
        {SECTEURS_ACTIVITE.map((value) => {
          const selected = secteur === value
          return (
            <Pressable
              key={value}
              onPress={() => onChangeSecteur(value)}
              className={[
                'rounded-full border px-4 py-2.5',
                selected
                  ? 'border-airmess-yellow bg-airmess-yellow'
                  : 'border-warm-200 bg-white',
              ].join(' ')}
              accessibilityRole="button"
              accessibilityState={{ selected }}
            >
              <Text className="text-sm font-extrabold text-ink">{secteurLabels[value]}</Text>
            </Pressable>
          )
        })}
      </View>

      <FieldLabel>{ifuLabel}</FieldLabel>
      <FormInput
        value={ifu}
        onChangeText={onChangeIfu}
        placeholder={ifuPlaceholder}
        keyboardType="number-pad"
      />
      <HelperText>{ifuHelper}</HelperText>
    </View>
  )
}

function StepConfirmation({
  email,
  code,
  onChangeCode,
  onResend,
  resending,
  resendLabel,
  codeLabel,
  codePlaceholder,
  codeHelper,
  acceptedTerms,
  toggleAcceptedTerms,
  termsConfirm,
  termsLabel,
  privacyLabel,
}: {
  email: string
  code: string
  onChangeCode: (value: string) => void
  onResend: () => void
  resending: boolean
  resendLabel: string
  codeLabel: string
  codePlaceholder: string
  codeHelper: string
  acceptedTerms: boolean
  toggleAcceptedTerms: () => void
  termsConfirm: string
  termsLabel: string
  privacyLabel: string
}) {
  return (
    <View>
      <View className="flex-row items-center rounded-2xl border border-warm-200 bg-white px-4 py-3">
        <Ionicons name="mail-outline" size={18} color="#8A7E68" />
        <Text className="ml-2 flex-1 text-sm font-extrabold text-ink">{email}</Text>
      </View>

      <HelperText>{codeHelper}</HelperText>

      <FieldLabel>{codeLabel}</FieldLabel>
      <FormInput
        value={code}
        onChangeText={onChangeCode}
        placeholder={codePlaceholder}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
      />

      <Button
        className="mt-4"
        variant="outline"
        size="md"
        onPress={onResend}
        loading={resending}
        rightIcon={<Ionicons name="send" size={16} color="#1A1614" />}
      >
        {resendLabel}
      </Button>

      <Pressable
        onPress={toggleAcceptedTerms}
        className="mt-4 flex-row items-start rounded-2xl bg-white p-3"
        accessibilityRole="checkbox"
        accessibilityState={{ checked: acceptedTerms }}
      >
        <Ionicons
          name={acceptedTerms ? 'checkbox' : 'square-outline'}
          size={22}
          color="#1A1614"
        />
        <Text className="ml-3 flex-1 text-sm font-semibold leading-5 text-ink">
          {termsConfirm}
        </Text>
      </Pressable>

      <View className="mt-2 flex-row gap-2">
        <SmallLink label={termsLabel} url={TERMS_URL} />
        <SmallLink label={privacyLabel} url={PRIVACY_URL} />
      </View>
    </View>
  )
}

function ChoiceCard({
  title,
  subtitle,
  icon,
  selected,
  onPress,
}: {
  title: string
  subtitle: string
  icon: keyof typeof Ionicons.glyphMap
  selected: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      onPress={onPress}
      className={[
        'min-h-20 flex-row items-center rounded-2xl border px-4 py-3',
        selected ? 'border-airmess-yellow bg-airmess-yellow' : 'border-warm-200 bg-white',
      ].join(' ')}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <View className="mr-3 h-11 w-11 items-center justify-center rounded-full bg-off-white">
        <Ionicons name={icon} size={22} color="#1A1614" />
      </View>
      <View className="flex-1">
        <Text className="text-base font-extrabold text-ink">{title}</Text>
        <Text className={['mt-0.5 text-xs font-semibold leading-4', selected ? 'text-warm-600' : 'text-warm-500'].join(' ')}>
          {subtitle}
        </Text>
      </View>
      {selected && <Ionicons name="checkmark-circle" size={22} color="#1A1614" />}
    </Pressable>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text className="mb-2 mt-4 text-xs font-extrabold uppercase text-warm-500">
      {children}
    </Text>
  )
}

function HelperText({ children, tone = 'muted' }: { children: React.ReactNode; tone?: 'muted' | 'error' }) {
  return (
    <Text
      className={['mt-1.5 text-xs font-semibold', tone === 'error' ? 'text-airmess-red' : 'text-warm-500'].join(' ')}
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
        className="h-14 rounded-2xl border border-warm-200 bg-white pl-4 pr-14 text-base font-semibold text-ink"
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
      <Text className="text-xs font-extrabold text-ink">{label}</Text>
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
  textContentType?:
    | 'name'
    | 'givenName'
    | 'familyName'
    | 'organizationName'
    | 'emailAddress'
    | 'telephoneNumber'
    | 'oneTimeCode'
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
      className="h-14 rounded-2xl border border-warm-200 bg-white px-4 text-base font-semibold text-ink"
    />
  )
}
