import { useState, useEffect, useRef } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  Image,
  StatusBar,
  Linking,
  Alert,
  ActivityIndicator,
  BackHandler,
  Platform,
  type TextInputProps,
} from 'react-native'
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker'
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { AxiosError } from 'axios'
import Button from '../components/ui/Button'
import WizardHeader from '../components/register/WizardHeader'
import WizardFooter from '../components/register/WizardFooter'
import { pickImage } from '../lib/pickImage'
import { TERMS_URL, PRIVACY_URL } from '../api/terms'
import {
  saveDraft,
  loadDraft,
  clearDraft,
  type RegisterDraft,
} from '../lib/registerDraft'
import {
  normalizePhone,
  validateBeninPhone,
  BENIN_DIAL_CODE,
  sendPhoneOtp,
  verifyPhoneOtp,
  registerDriver,
  type LocalFile,
  type Gender,
  type VehicleType,
  type CniType,
} from '../api/register'

const TOTAL_STEPS = 6

const STEP_META: Record<number, { title: string; subtitle: string }> = {
  1: { title: 'Votre identité', subtitle: 'On commence par se connaître.' },
  2: { title: 'Votre compte', subtitle: 'Créez vos identifiants Air Mess.' },
  3: { title: 'Votre numéro', subtitle: 'On vérifie votre téléphone par SMS.' },
  4: { title: 'Votre véhicule', subtitle: 'Sur quoi allez-vous livrer ?' },
  5: { title: 'Vos documents', subtitle: 'Prenez en photo vos pièces (recto/verso).' },
  6: { title: 'Presque terminé', subtitle: 'Contacts d\'urgence et acceptation des CGU.' },
}

// Ordre croissant "taille de véhicule", aligné sur le formulaire web.
const VEHICLES: { value: VehicleType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'velo', label: 'Vélo', icon: 'bicycle-outline' },
  { value: 'scooter', label: 'Scooter', icon: 'bicycle' },
  { value: 'moto', label: 'Moto', icon: 'bicycle' },
  { value: 'voiture', label: 'Voiture', icon: 'car-sport' },
]

const CNI_TYPES: { value: CniType; label: string }[] = [
  { value: 'cnib', label: 'CNIB' },
  { value: 'cip', label: 'CIP' },
  { value: 'passeport', label: 'Passeport' },
]

function serverMessage(err: unknown, fallback: string): string {
  if (err instanceof AxiosError) {
    const data = err.response?.data as { message?: string } | undefined
    return data?.message ?? fallback
  }
  return fallback
}

export default function RegisterScreen() {
  const router = useRouter()

  // Wizard state — l'étape courante, restaurée depuis le brouillon si présent.
  const [step, setStep] = useState(1)

  // Identité
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [gender, setGender] = useState<Gender | ''>('')
  const [birthDate, setBirthDate] = useState('')
  // Compte
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  // Téléphone + OTP. Prérempli avec l'indicatif Bénin, que le livreur peut remplacer
  // par un autre indicatif si son numéro est étranger.
  const [phone, setPhone] = useState(`${BENIN_DIAL_CODE} `)
  const [otpSent, setOtpSent] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [phoneToken, setPhoneToken] = useState<string | null>(null)
  const [otpSending, setOtpSending] = useState(false)
  const [otpVerifying, setOtpVerifying] = useState(false)
  const [otpError, setOtpError] = useState<string | null>(null)
  // Véhicule
  const [vehicleType, setVehicleType] = useState<VehicleType | ''>('')
  const [vehiclePlate, setVehiclePlate] = useState('')
  const [vehicleBrand, setVehicleBrand] = useState('')
  // Documents
  const [cniType, setCniType] = useState<CniType | ''>('')
  const [cni, setCni] = useState<LocalFile | null>(null)
  const [cniBack, setCniBack] = useState<LocalFile | null>(null)
  const [drivingLicense, setDrivingLicense] = useState<LocalFile | null>(null)
  const [photo, setPhoto] = useState<LocalFile | null>(null)
  // Contacts
  const [ec1Name, setEc1Name] = useState('')
  const [ec1Phone, setEc1Phone] = useState('')
  const [ec2Name, setEc2Name] = useState('')
  const [ec2Phone, setEc2Phone] = useState('')
  // Équipement
  const [eqIso, setEqIso] = useState(false)
  const [eqTop, setEqTop] = useState(false)
  const [eqFridge, setEqFridge] = useState(false)
  // CGU
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  // Soumission
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const isCar = vehicleType === 'voiture'
  const isCnib = cniType === 'cnib'
  const phoneVerified = phoneToken !== null

  /* ============================================================
     BROUILLON — restauration au mount + sauvegarde continue
     ============================================================ */

  // Marque "premier render fait" pour éviter de sauvegarder pendant qu'on hydrate.
  const hydratedRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const d = await loadDraft()
      if (cancelled || !d) {
        hydratedRef.current = true
        return
      }
      // Applique le brouillon champ par champ (chaque valeur peut être undefined).
      if (d.firstName) setFirstName(d.firstName)
      if (d.lastName) setLastName(d.lastName)
      if (d.gender) setGender(d.gender as Gender)
      if (d.birthDate) setBirthDate(d.birthDate)
      if (d.email) setEmail(d.email)
      if (d.phone) setPhone(d.phone)
      if (d.vehicleType) setVehicleType(d.vehicleType as VehicleType)
      if (d.vehiclePlate) setVehiclePlate(d.vehiclePlate)
      if (d.vehicleBrand) setVehicleBrand(d.vehicleBrand)
      if (d.cniType) setCniType(d.cniType as CniType)
      if (d.ec1Name) setEc1Name(d.ec1Name)
      if (d.ec1Phone) setEc1Phone(d.ec1Phone)
      if (d.ec2Name) setEc2Name(d.ec2Name)
      if (d.ec2Phone) setEc2Phone(d.ec2Phone)
      if (typeof d.eqIso === 'boolean') setEqIso(d.eqIso)
      if (typeof d.eqTop === 'boolean') setEqTop(d.eqTop)
      if (typeof d.eqFridge === 'boolean') setEqFridge(d.eqFridge)
      // Reprend à l'étape sauvegardée si valide, sinon reste à 1.
      // Étape 3 (OTP) : on ne peut pas restaurer la vérification → ramène à 3 max.
      if (d.step && d.step >= 1 && d.step <= TOTAL_STEPS) {
        setStep(Math.min(d.step, 3))
      }
      hydratedRef.current = true
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // Sauvegarde à chaque changement de champ suivi — silencieusement, en arrière-plan.
  useEffect(() => {
    if (!hydratedRef.current) return
    const draft: RegisterDraft = {
      firstName,
      lastName,
      gender: gender || undefined,
      birthDate,
      email,
      phone,
      vehicleType: vehicleType || undefined,
      vehiclePlate,
      vehicleBrand,
      cniType: cniType || undefined,
      ec1Name,
      ec1Phone,
      ec2Name,
      ec2Phone,
      eqIso,
      eqTop,
      eqFridge,
      step,
    }
    saveDraft(draft)
  }, [
    firstName,
    lastName,
    gender,
    birthDate,
    email,
    phone,
    vehicleType,
    vehiclePlate,
    vehicleBrand,
    cniType,
    ec1Name,
    ec1Phone,
    ec2Name,
    ec2Phone,
    eqIso,
    eqTop,
    eqFridge,
    step,
  ])

  /* ============================================================
     Retour physique Android — recule d'une étape au lieu de fermer
     ============================================================ */

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (done) return false // écran succès : laisse le comportement par défaut
      if (step > 1) {
        setStep((s) => s - 1)
        setFormError(null)
        return true
      }
      return false
    })
    return () => sub.remove()
  }, [step, done])

  /* ============================================================
     OTP
     ============================================================ */

  function onPhoneChange(v: string) {
    setPhone(v)
    if (phoneToken) {
      setPhoneToken(null)
      setOtpSent(false)
      setOtpCode('')
    }
  }

  async function handleSendOtp() {
    setOtpError(null)
    const normalized = normalizePhone(phone)
    if (normalized.length < 8) {
      setOtpError('Entrez un numéro valide.')
      return
    }
    // Un numéro béninois doit garder son « 01 » de tête (10 chiffres après +229).
    const beninError = validateBeninPhone(normalized)
    if (beninError) {
      setOtpError(beninError)
      return
    }
    setOtpSending(true)
    try {
      const res = await sendPhoneOtp(normalized)
      setOtpSent(true)
      if (res.debug_code) setOtpCode(res.debug_code)
    } catch (err) {
      setOtpError(serverMessage(err, "Échec de l'envoi du code."))
    } finally {
      setOtpSending(false)
    }
  }

  async function handleVerifyOtp() {
    setOtpError(null)
    setOtpVerifying(true)
    try {
      const token = await verifyPhoneOtp(normalizePhone(phone), otpCode.trim())
      setPhoneToken(token)
    } catch (err) {
      setOtpError(serverMessage(err, 'Code incorrect.'))
    } finally {
      setOtpVerifying(false)
    }
  }

  /* ============================================================
     Validation par étape
     ============================================================ */

  function validateStep(n: number): string | null {
    switch (n) {
      case 1:
        if (!firstName.trim() || !lastName.trim()) return 'Renseignez vos nom et prénom.'
        if (!gender) return 'Sélectionnez votre genre.'
        if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return 'Date de naissance au format AAAA-MM-JJ.'
        return null
      case 2:
        if (!email.trim()) return 'Renseignez votre email.'
        if (password.length < 8) return 'Mot de passe : 8 caractères minimum.'
        if (password !== passwordConfirm) return 'Les mots de passe ne correspondent pas.'
        return null
      case 3:
        if (!phoneVerified) return 'Vérifiez votre numéro par SMS.'
        return null
      case 4:
        if (!vehicleType) return 'Choisissez un type de véhicule.'
        if (!vehiclePlate.trim()) return "Renseignez la plaque d'immatriculation."
        return null
      case 5:
        if (!cniType) return "Choisissez le type de pièce d'identité."
        if (!cni) return "Ajoutez le recto de votre pièce d'identité."
        if (isCnib && !cniBack) return 'Ajoutez le verso de votre CNIB.'
        if (isCar && !drivingLicense) return 'Ajoutez votre permis de conduire (voiture).'
        return null
      case 6:
        if (!ec1Name.trim() || !ec1Phone.trim()) return "Renseignez le 1er contact d'urgence."
        if (!ec2Name.trim() || !ec2Phone.trim()) return "Renseignez le 2e contact d'urgence."
        if (!acceptedTerms) return 'Vous devez accepter les CGU.'
        return null
      default:
        return null
    }
  }

  const currentStepValid = validateStep(step) === null

  /* ============================================================
     Navigation entre étapes
     ============================================================ */

  function goNext() {
    const err = validateStep(step)
    if (err) {
      setFormError(err)
      return
    }
    setFormError(null)
    if (step === TOTAL_STEPS) {
      handleSubmit()
      return
    }
    setStep((s) => s + 1)
  }

  function goBack() {
    setStep((s) => Math.max(1, s - 1))
    setFormError(null)
  }

  async function handleSubmit() {
    setFormError(null)
    setSubmitting(true)
    try {
      await registerDriver({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        gender: gender as Gender,
        birth_date: birthDate,
        email: email.trim(),
        phone: normalizePhone(phone),
        password,
        password_confirmation: passwordConfirm,
        phone_verification_token: phoneToken!,
        vehicle_type: vehicleType as VehicleType,
        vehicle_plate: vehiclePlate.trim(),
        vehicle_brand: vehicleBrand.trim() || undefined,
        photo,
        cni_type: cniType as CniType,
        cni: cni!,
        cni_back: isCnib ? cniBack : null,
        driving_license: isCar ? drivingLicense : null,
        emergency_contact_name: ec1Name.trim(),
        emergency_contact_phone: ec1Phone.trim(),
        emergency_contact2_name: ec2Name.trim(),
        emergency_contact2_phone: ec2Phone.trim(),
        equipment_isothermal_bag: eqIso,
        equipment_top_case: eqTop,
        equipment_refrigerated_bag: eqFridge,
        accepted_terms: true,
      })
      // Succès → on vide le brouillon local pour ne pas réafficher les vieux
      // champs si l'utilisateur relance l'écran d'inscription un jour.
      await clearDraft()
      setDone(true)
    } catch (e) {
      setFormError(serverMessage(e, "Erreur lors de l'inscription."))
    } finally {
      setSubmitting(false)
    }
  }

  /* ============================================================
     Écran succès
     ============================================================ */

  if (done) {
    return (
      <SafeAreaView className="flex-1 bg-airmess-dark items-center justify-center px-8">
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <View className="w-20 h-20 rounded-full bg-airmess-yellow items-center justify-center mb-6">
          <Ionicons name="checkmark" size={44} color="#1A1614" />
        </View>
        <Text className="text-cream text-2xl font-extrabold text-center mb-3">
          Candidature envoyée
        </Text>
        <Text className="text-warm-300 text-base text-center mb-10">
          Un administrateur va vérifier vos documents sous 24-48h. Vous pourrez vous connecter dès
          l'activation de votre compte.
        </Text>
        <Button variant="primary" onPress={() => router.replace('/login')}>
          Retour à la connexion
        </Button>
      </SafeAreaView>
    )
  }

  /* ============================================================
     Rendu principal (wizard)
     ============================================================ */

  const meta = STEP_META[step]

  return (
    <SafeAreaView
      className="flex-1 bg-airmess-dark"
      edges={['top', 'left', 'right', 'bottom']}
    >
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <WizardHeader
        step={step}
        totalSteps={TOTAL_STEPS}
        title={meta.title}
        subtitle={meta.subtitle}
        onBack={goBack}
        canGoBack={step > 1}
      />

      <KeyboardAwareScrollView
        bottomOffset={24}
        contentContainerStyle={{ paddingBottom: 20 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
      >
        <View className="mx-5 bg-cream rounded-3xl p-5">
          {step === 1 && (
            <StepIdentity
              firstName={firstName}
              setFirstName={setFirstName}
              lastName={lastName}
              setLastName={setLastName}
              gender={gender}
              setGender={setGender}
              birthDate={birthDate}
              setBirthDate={setBirthDate}
            />
          )}

          {step === 2 && (
            <StepAccount
              email={email}
              setEmail={setEmail}
              password={password}
              setPassword={setPassword}
              passwordConfirm={passwordConfirm}
              setPasswordConfirm={setPasswordConfirm}
            />
          )}

          {step === 3 && (
            <StepPhone
              phone={phone}
              onPhoneChange={onPhoneChange}
              otpSent={otpSent}
              otpCode={otpCode}
              setOtpCode={setOtpCode}
              phoneVerified={phoneVerified}
              otpSending={otpSending}
              otpVerifying={otpVerifying}
              otpError={otpError}
              handleSendOtp={handleSendOtp}
              handleVerifyOtp={handleVerifyOtp}
            />
          )}

          {step === 4 && (
            <StepVehicle
              vehicleType={vehicleType}
              setVehicleType={setVehicleType}
              vehiclePlate={vehiclePlate}
              setVehiclePlate={setVehiclePlate}
              vehicleBrand={vehicleBrand}
              setVehicleBrand={setVehicleBrand}
              eqIso={eqIso}
              setEqIso={setEqIso}
              eqTop={eqTop}
              setEqTop={setEqTop}
              eqFridge={eqFridge}
              setEqFridge={setEqFridge}
            />
          )}

          {step === 5 && (
            <StepDocuments
              cniType={cniType}
              setCniType={setCniType}
              cni={cni}
              setCni={setCni}
              cniBack={cniBack}
              setCniBack={setCniBack}
              isCnib={isCnib}
              drivingLicense={drivingLicense}
              setDrivingLicense={setDrivingLicense}
              isCar={isCar}
              photo={photo}
              setPhoto={setPhoto}
            />
          )}

          {step === 6 && (
            <StepFinal
              ec1Name={ec1Name}
              setEc1Name={setEc1Name}
              ec1Phone={ec1Phone}
              setEc1Phone={setEc1Phone}
              ec2Name={ec2Name}
              setEc2Name={setEc2Name}
              ec2Phone={ec2Phone}
              setEc2Phone={setEc2Phone}
              acceptedTerms={acceptedTerms}
              setAcceptedTerms={setAcceptedTerms}
            />
          )}

          {formError && (
            <View className="bg-danger-bg border-2 border-airmess-red/30 rounded-2xl p-3 mt-4 flex-row items-start">
              <Ionicons name="alert-circle" size={18} color="#D64545" />
              <Text className="text-airmess-red text-sm flex-1 font-semibold ml-2">{formError}</Text>
            </View>
          )}
        </View>

        {step === 1 && (
          <Pressable
            onPress={() => router.replace('/login')}
            className="items-center mt-5"
            hitSlop={8}
          >
            <Text className="text-warm-400 text-sm">
              Déjà livreur ?{' '}
              <Text className="text-airmess-yellow font-bold">Se connecter</Text>
            </Text>
          </Pressable>
        )}
      </KeyboardAwareScrollView>

      <WizardFooter
        step={step}
        totalSteps={TOTAL_STEPS}
        onNext={goNext}
        onBack={goBack}
        nextDisabled={!currentStepValid}
        submitting={submitting}
      />
    </SafeAreaView>
  )
}

/* ============================================================
   Étapes — chaque bloc est isolé pour rester lisible
   ============================================================ */

function StepIdentity({
  firstName,
  setFirstName,
  lastName,
  setLastName,
  gender,
  setGender,
  birthDate,
  setBirthDate,
}: {
  firstName: string
  setFirstName: (v: string) => void
  lastName: string
  setLastName: (v: string) => void
  gender: Gender | ''
  setGender: (v: Gender) => void
  birthDate: string
  setBirthDate: (v: string) => void
}) {
  return (
    <View>
      <LabeledInput label="Prénom" value={firstName} onChangeText={setFirstName} autoCapitalize="words" />
      <LabeledInput label="Nom" value={lastName} onChangeText={setLastName} autoCapitalize="words" />
      <FieldLabel>Genre</FieldLabel>
      <Segmented
        options={[
          { value: 'M', label: 'Homme' },
          { value: 'F', label: 'Femme' },
        ]}
        value={gender}
        onChange={(v) => setGender(v as Gender)}
      />
      <BirthDateField value={birthDate} onChange={setBirthDate} />
    </View>
  )
}

/** Âge minimum requis pour s'inscrire comme livreur. */
const MIN_AGE_YEARS = 16

/** 'YYYY-MM-DD' → Date locale (midi, pour éviter tout décalage de fuseau). */
function parseISODate(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!m) return null
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12)
}

/** Date → 'YYYY-MM-DD' (format stocké + attendu par l'API). */
function toISODate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/**
 * Champ date de naissance : un sélecteur de date natif plutôt qu'une saisie libre.
 * On stocke toujours 'YYYY-MM-DD' (inchangé côté validation + API), on n'affiche qu'un
 * libellé lisible. Le sélecteur est borné à MIN_AGE_YEARS pour ne pas laisser choisir
 * une date trop récente.
 */
function BirthDateField({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  const [show, setShow] = useState(false)
  const selected = parseISODate(value)

  // Date la plus récente autorisée : aujourd'hui - âge minimum.
  const maxDate = new Date()
  maxDate.setFullYear(maxDate.getFullYear() - MIN_AGE_YEARS)

  function onPicked(event: DateTimePickerEvent, date?: Date) {
    // Android : le dialogue se ferme seul, on le masque quel que soit le bouton.
    if (Platform.OS === 'android') setShow(false)
    if (event.type === 'set' && date) {
      onChange(toISODate(date))
      if (Platform.OS === 'ios') setShow(false)
    } else if (event.type === 'dismissed') {
      setShow(false)
    }
  }

  const label = selected
    ? selected.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'Sélectionner votre date de naissance'

  return (
    <View>
      <FieldLabel>Date de naissance</FieldLabel>
      <Pressable
        onPress={() => setShow(true)}
        className="border-2 border-warm-200 rounded-2xl px-4 h-14 bg-off-white flex-row items-center justify-between"
      >
        <Text className={selected ? 'text-base text-ink' : 'text-base text-warm-400'}>
          {label}
        </Text>
        <Ionicons name="calendar-outline" size={20} color="#8A7E68" />
      </Pressable>
      <Text className="text-warm-500 text-xs mt-1 ml-1">16 ans minimum</Text>

      {show && (
        <DateTimePicker
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          value={selected ?? maxDate}
          maximumDate={maxDate}
          minimumDate={new Date(1940, 0, 1)}
          onChange={onPicked}
        />
      )}
    </View>
  )
}

function StepAccount({
  email,
  setEmail,
  password,
  setPassword,
  passwordConfirm,
  setPasswordConfirm,
}: {
  email: string
  setEmail: (v: string) => void
  password: string
  setPassword: (v: string) => void
  passwordConfirm: string
  setPasswordConfirm: (v: string) => void
}) {
  return (
    <View>
      <LabeledInput
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
      />
      <PasswordField
        label="Mot de passe"
        value={password}
        onChangeText={setPassword}
        hint="8 caractères minimum"
      />
      <PasswordField
        label="Confirmer le mot de passe"
        value={passwordConfirm}
        onChangeText={setPasswordConfirm}
      />
    </View>
  )
}

function StepPhone({
  phone,
  onPhoneChange,
  otpSent,
  otpCode,
  setOtpCode,
  phoneVerified,
  otpSending,
  otpVerifying,
  otpError,
  handleSendOtp,
  handleVerifyOtp,
}: {
  phone: string
  onPhoneChange: (v: string) => void
  otpSent: boolean
  otpCode: string
  setOtpCode: (v: string) => void
  phoneVerified: boolean
  otpSending: boolean
  otpVerifying: boolean
  otpError: string | null
  handleSendOtp: () => void
  handleVerifyOtp: () => void
}) {
  return (
    <View>
      <FieldLabel>Téléphone</FieldLabel>
      <View className="flex-row items-center gap-2">
        <View className="flex-1">
          <TextInput
            value={phone}
            onChangeText={onPhoneChange}
            editable={!phoneVerified}
            placeholder="+229 01 90 12 34 56"
            placeholderTextColor="#B8AF9F"
            keyboardType="phone-pad"
            className="border-2 border-warm-200 rounded-2xl px-4 h-14 text-base text-ink bg-off-white"
          />
        </View>
        {phoneVerified ? (
          <View className="h-14 px-3 rounded-2xl bg-success/15 items-center justify-center flex-row">
            <Ionicons name="checkmark-circle" size={20} color="#1E9E5A" />
            <Text className="text-success font-bold ml-1">Vérifié</Text>
          </View>
        ) : (
          <Pressable
            onPress={handleSendOtp}
            disabled={otpSending}
            className="h-14 px-4 rounded-2xl bg-airmess-dark items-center justify-center"
          >
            {otpSending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-bold">{otpSent ? 'Renvoyer' : 'Envoyer'}</Text>
            )}
          </Pressable>
        )}
      </View>

      {otpSent && !phoneVerified && (
        <View className="mt-3">
          <FieldLabel>Code reçu par SMS</FieldLabel>
          <View className="flex-row items-center gap-2">
            <View className="flex-1">
              <TextInput
                value={otpCode}
                onChangeText={setOtpCode}
                placeholder="123456"
                placeholderTextColor="#B8AF9F"
                keyboardType="number-pad"
                maxLength={6}
                className="border-2 border-warm-200 rounded-2xl px-4 h-14 text-base text-ink bg-off-white tracking-widest"
              />
            </View>
            <Pressable
              onPress={handleVerifyOtp}
              disabled={otpVerifying || otpCode.trim().length < 6}
              className="h-14 px-4 rounded-2xl bg-airmess-yellow items-center justify-center"
              style={otpCode.trim().length < 6 ? { opacity: 0.4 } : undefined}
            >
              {otpVerifying ? (
                <ActivityIndicator color="#1A1614" />
              ) : (
                <Text className="text-ink font-extrabold">Vérifier</Text>
              )}
            </Pressable>
          </View>
        </View>
      )}
      {otpError && <Text className="text-airmess-red text-sm mt-2 font-semibold">{otpError}</Text>}

      {!phoneVerified && (
        <View className="flex-row items-start mt-4 bg-warm-100 rounded-2xl p-3">
          <Ionicons name="information-circle-outline" size={18} color="#8A7E68" />
          <Text className="text-warm-600 text-xs flex-1 ml-2">
            Vous devez vérifier votre numéro pour continuer. Vous recevrez un SMS avec un code à 6 chiffres.
          </Text>
        </View>
      )}
    </View>
  )
}

function StepVehicle({
  vehicleType,
  setVehicleType,
  vehiclePlate,
  setVehiclePlate,
  vehicleBrand,
  setVehicleBrand,
  eqIso,
  setEqIso,
  eqTop,
  setEqTop,
  eqFridge,
  setEqFridge,
}: {
  vehicleType: VehicleType | ''
  setVehicleType: (v: VehicleType) => void
  vehiclePlate: string
  setVehiclePlate: (v: string) => void
  vehicleBrand: string
  setVehicleBrand: (v: string) => void
  eqIso: boolean
  setEqIso: (v: boolean) => void
  eqTop: boolean
  setEqTop: (v: boolean) => void
  eqFridge: boolean
  setEqFridge: (v: boolean) => void
}) {
  return (
    <View>
      <FieldLabel>Type de véhicule</FieldLabel>
      <View className="flex-row flex-wrap gap-2">
        {VEHICLES.map((v) => {
          const active = vehicleType === v.value
          return (
            <Pressable
              key={v.value}
              onPress={() => setVehicleType(v.value)}
              className={`flex-1 min-w-[45%] items-center rounded-2xl border-2 py-3 ${
                active ? 'border-airmess-yellow bg-airmess-yellow/10' : 'border-warm-200 bg-off-white'
              }`}
            >
              <Ionicons name={v.icon} size={24} color={active ? '#1A1614' : '#8A7E68'} />
              <Text className={`mt-1 font-semibold ${active ? 'text-ink' : 'text-warm-600'}`}>{v.label}</Text>
            </Pressable>
          )
        })}
      </View>
      <View className="h-3" />
      <LabeledInput label="Plaque d'immatriculation" value={vehiclePlate} onChangeText={setVehiclePlate} autoCapitalize="characters" />
      <LabeledInput label="Marque (optionnel)" value={vehicleBrand} onChangeText={setVehicleBrand} placeholder="ex : Bajaj, TVS, Haojue…" />

      <View className="h-3" />
      <FieldLabel>Équipement (optionnel)</FieldLabel>
      <CheckRow label="Sac isotherme" checked={eqIso} onToggle={() => setEqIso(!eqIso)} />
      <CheckRow label="Top case" checked={eqTop} onToggle={() => setEqTop(!eqTop)} />
      <CheckRow label="Sac réfrigéré" checked={eqFridge} onToggle={() => setEqFridge(!eqFridge)} />
    </View>
  )
}

function StepDocuments({
  cniType,
  setCniType,
  cni,
  setCni,
  cniBack,
  setCniBack,
  isCnib,
  drivingLicense,
  setDrivingLicense,
  isCar,
  photo,
  setPhoto,
}: {
  cniType: CniType | ''
  setCniType: (v: CniType) => void
  cni: LocalFile | null
  setCni: (f: LocalFile | null) => void
  cniBack: LocalFile | null
  setCniBack: (f: LocalFile | null) => void
  isCnib: boolean
  drivingLicense: LocalFile | null
  setDrivingLicense: (f: LocalFile | null) => void
  isCar: boolean
  photo: LocalFile | null
  setPhoto: (f: LocalFile | null) => void
}) {
  return (
    <View>
      <FieldLabel>Type de pièce d'identité</FieldLabel>
      <Segmented options={CNI_TYPES} value={cniType} onChange={(v) => setCniType(v as CniType)} />
      <DocField
        label={isCnib ? "Pièce d'identité (recto)" : "Pièce d'identité"}
        file={cni}
        onPick={setCni}
        required
      />
      {isCnib && <DocField label="CNIB (verso)" file={cniBack} onPick={setCniBack} required />}
      {isCar && <DocField label="Permis de conduire" file={drivingLicense} onPick={setDrivingLicense} required />}
      <DocField label="Photo de profil (optionnel)" file={photo} onPick={setPhoto} />
    </View>
  )
}

function StepFinal({
  ec1Name,
  setEc1Name,
  ec1Phone,
  setEc1Phone,
  ec2Name,
  setEc2Name,
  ec2Phone,
  setEc2Phone,
  acceptedTerms,
  setAcceptedTerms,
}: {
  ec1Name: string
  setEc1Name: (v: string) => void
  ec1Phone: string
  setEc1Phone: (v: string) => void
  ec2Name: string
  setEc2Name: (v: string) => void
  ec2Phone: string
  setEc2Phone: (v: string) => void
  acceptedTerms: boolean
  setAcceptedTerms: (v: boolean) => void
}) {
  return (
    <View>
      <FieldLabel>Contact d'urgence 1</FieldLabel>
      <LabeledInput label="Nom" value={ec1Name} onChangeText={setEc1Name} autoCapitalize="words" />
      <LabeledInput label="Téléphone" value={ec1Phone} onChangeText={setEc1Phone} keyboardType="phone-pad" />

      <View className="h-3" />
      <FieldLabel>Contact d'urgence 2</FieldLabel>
      <LabeledInput label="Nom" value={ec2Name} onChangeText={setEc2Name} autoCapitalize="words" />
      <LabeledInput label="Téléphone" value={ec2Phone} onChangeText={setEc2Phone} keyboardType="phone-pad" />

      <View className="h-4" />
      <Pressable onPress={() => setAcceptedTerms(!acceptedTerms)} className="flex-row items-start">
        <View
          className={`w-6 h-6 rounded-md border-2 items-center justify-center mr-3 mt-0.5 ${
            acceptedTerms ? 'bg-airmess-yellow border-airmess-yellow' : 'border-warm-300 bg-off-white'
          }`}
        >
          {acceptedTerms && <Ionicons name="checkmark" size={16} color="#1A1614" />}
        </View>
        <Text className="flex-1 text-ink text-sm">
          J'accepte les{' '}
          <Text className="text-airmess-red font-bold" onPress={() => Linking.openURL(TERMS_URL)}>
            CGU
          </Text>{' '}
          et la{' '}
          <Text className="text-airmess-red font-bold" onPress={() => Linking.openURL(PRIVACY_URL)}>
            politique de confidentialité
          </Text>
          .
        </Text>
      </Pressable>
    </View>
  )
}

/* ============================================================
   Sous-composants réutilisables (identiques à l'ancienne version)
   ============================================================ */

function FieldLabel({ children }: { children: string }) {
  return (
    <Text className="text-[10px] uppercase text-warm-500 tracking-widest font-extrabold mb-1.5 mt-1">
      {children}
    </Text>
  )
}

interface LabeledInputProps extends TextInputProps {
  label: string
  hint?: string
}

function LabeledInput({ label, hint, ...props }: LabeledInputProps) {
  return (
    <View className="mb-3">
      <FieldLabel>{label}</FieldLabel>
      <TextInput
        placeholderTextColor="#B8AF9F"
        className="border-2 border-warm-200 rounded-2xl px-4 h-14 text-base text-ink bg-off-white"
        {...props}
      />
      {hint && <Text className="text-warm-500 text-xs mt-1">{hint}</Text>}
    </View>
  )
}

/**
 * Champ mot de passe avec bouton œil pour afficher/masquer la saisie. Chaque champ
 * gère sa propre visibilité (même style que l'écran de connexion).
 */
function PasswordField({ label, hint, ...props }: LabeledInputProps) {
  const [visible, setVisible] = useState(false)
  return (
    <View className="mb-3">
      <FieldLabel>{label}</FieldLabel>
      <View className="relative">
        <TextInput
          placeholderTextColor="#B8AF9F"
          secureTextEntry={!visible}
          autoCapitalize="none"
          autoCorrect={false}
          className="border-2 border-warm-200 rounded-2xl pl-4 pr-14 h-14 text-base text-ink bg-off-white"
          {...props}
        />
        <Pressable
          onPress={() => setVisible((v) => !v)}
          className="absolute right-3 top-0 h-14 w-11 items-center justify-center"
          hitSlop={8}
          accessibilityLabel={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
        >
          <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={20} color="#8A7E68" />
        </Pressable>
      </View>
      {hint && <Text className="text-warm-500 text-xs mt-1">{hint}</Text>}
    </View>
  )
}

function Segmented({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <View className="flex-row gap-2 mb-3">
      {options.map((o) => {
        const active = value === o.value
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            className={`flex-1 h-12 rounded-2xl border-2 items-center justify-center ${
              active ? 'border-airmess-yellow bg-airmess-yellow/10' : 'border-warm-200 bg-off-white'
            }`}
          >
            <Text className={`font-semibold ${active ? 'text-ink' : 'text-warm-600'}`}>{o.label}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

function DocField({
  label,
  file,
  onPick,
  required,
}: {
  label: string
  file: LocalFile | null
  onPick: (f: LocalFile | null) => void
  required?: boolean
}) {
  async function choose() {
    Alert.alert(label, 'Comment ajouter ce document ?', [
      { text: 'Appareil photo', onPress: async () => onPick((await pickImage('camera')) ?? file) },
      { text: 'Galerie', onPress: async () => onPick((await pickImage('library')) ?? file) },
      { text: 'Annuler', style: 'cancel' },
    ])
  }

  return (
    <View className="mb-3">
      <FieldLabel>{`${label}${required ? ' *' : ''}`}</FieldLabel>
      {file ? (
        <View className="flex-row items-center border-2 border-success/40 bg-success/10 rounded-2xl p-2">
          <Image source={{ uri: file.uri }} style={{ width: 44, height: 44, borderRadius: 8 }} />
          <Text className="flex-1 text-ink text-sm ml-3" numberOfLines={1}>
            {file.name}
          </Text>
          <Pressable onPress={choose} hitSlop={8} className="px-2">
            <Text className="text-airmess-red font-semibold text-sm">Changer</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          onPress={choose}
          className="flex-row items-center border-2 border-dashed border-warm-300 rounded-2xl px-4 h-14 bg-off-white"
        >
          <Ionicons name="camera-outline" size={20} color="#8A7E68" />
          <Text className="text-warm-600 ml-2">Prendre en photo ou choisir</Text>
        </Pressable>
      )}
    </View>
  )
}

function CheckRow({ label, checked, onToggle }: { label: string; checked: boolean; onToggle: () => void }) {
  return (
    <Pressable
      onPress={onToggle}
      className="flex-row items-center px-3 h-12 rounded-2xl border-2 border-warm-200 bg-off-white mb-2"
    >
      <View
        className={`w-5 h-5 rounded border-2 items-center justify-center mr-3 ${
          checked ? 'bg-airmess-yellow border-airmess-yellow' : 'border-warm-300'
        }`}
      >
        {checked && <Ionicons name="checkmark" size={13} color="#1A1614" />}
      </View>
      <Text className="text-ink">{label}</Text>
    </Pressable>
  )
}
