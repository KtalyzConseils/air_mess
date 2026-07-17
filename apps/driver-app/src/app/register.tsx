import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  Image,
  StatusBar,
  Linking,
  ActivityIndicator,
  type TextInputProps,
} from 'react-native'
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { AxiosError } from 'axios'
import Button from '../components/ui/Button'
import { pickImage } from '../lib/pickImage'
import { TERMS_URL, PRIVACY_URL } from '../api/terms'
import {
  normalizePhone,
  sendPhoneOtp,
  verifyPhoneOtp,
  registerDriver,
  type LocalFile,
  type Gender,
  type VehicleType,
  type CniType,
} from '../api/register'

/**
 * Inscription livreur en 6 étapes (wizard).
 *
 * Objectif : le formulaire complet est long (identité + compte + tel + véhicule
 * + docs + contacts) — un scroll unique décourage. Le découpage en étapes
 * courtes + barre de progression rend l'inscription abordable et évite
 * l'abandon en milieu de parcours.
 *
 * Persistance : tout le state est porté par ce composant, le back-en-arrière ne
 * fait rien perdre. Validation par étape : impossible d'avancer si un champ
 * requis est vide ou mal formaté.
 */

const VEHICLES: { value: VehicleType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'moto', label: 'Moto', icon: 'bicycle' },
  { value: 'scooter', label: 'Scooter', icon: 'bicycle' },
  { value: 'voiture', label: 'Voiture', icon: 'car-sport' },
  { value: 'velo', label: 'Vélo', icon: 'bicycle-outline' },
]

const CNI_TYPES: { value: CniType; label: string }[] = [
  { value: 'cnib', label: 'CNIB' },
  { value: 'cip', label: 'CIP' },
  { value: 'passeport', label: 'Passeport' },
]

const STEPS = [
  { key: 'identity', title: 'Votre identité', subtitle: 'On commence par vous connaître.' },
  { key: 'account',  title: 'Votre compte',   subtitle: 'Pour vous connecter plus tard.' },
  { key: 'phone',    title: 'Votre numéro',   subtitle: 'On vérifie que c\'est bien vous.' },
  { key: 'vehicle',  title: 'Votre véhicule', subtitle: 'Avec quoi vous livrez ?' },
  { key: 'docs',     title: 'Vos documents',  subtitle: 'Photo prise en direct, jamais depuis la galerie.' },
  { key: 'finish',   title: 'Finalisation',   subtitle: 'Contacts d\'urgence, équipement, CGU.' },
] as const

const TOTAL_STEPS = STEPS.length

function serverMessage(err: unknown, fallback: string): string {
  if (err instanceof AxiosError) {
    const data = err.response?.data as { message?: string } | undefined
    return data?.message ?? fallback
  }
  return fallback
}

export default function RegisterScreen() {
  const router = useRouter()

  // ── Étape courante (0-based) ──
  const [step, setStep] = useState(0)

  // ── Identité ──
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [gender, setGender] = useState<Gender | ''>('')
  const [birthDate, setBirthDate] = useState('')
  // ── Compte ──
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  // ── Téléphone + OTP ──
  const [phone, setPhone] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [phoneToken, setPhoneToken] = useState<string | null>(null)
  const [otpSending, setOtpSending] = useState(false)
  const [otpVerifying, setOtpVerifying] = useState(false)
  const [otpError, setOtpError] = useState<string | null>(null)
  // ── Véhicule ──
  const [vehicleType, setVehicleType] = useState<VehicleType | ''>('')
  const [vehiclePlate, setVehiclePlate] = useState('')
  const [vehicleColor, setVehicleColor] = useState('')
  // ── Documents ──
  const [cniType, setCniType] = useState<CniType | ''>('')
  const [cni, setCni] = useState<LocalFile | null>(null)
  const [cniBack, setCniBack] = useState<LocalFile | null>(null)
  const [drivingLicense, setDrivingLicense] = useState<LocalFile | null>(null)
  const [photo, setPhoto] = useState<LocalFile | null>(null)
  // ── Contacts d'urgence ──
  const [ec1Name, setEc1Name] = useState('')
  const [ec1Phone, setEc1Phone] = useState('')
  const [ec2Name, setEc2Name] = useState('')
  const [ec2Phone, setEc2Phone] = useState('')
  // ── Équipement ──
  const [eqIso, setEqIso] = useState(false)
  const [eqTop, setEqTop] = useState(false)
  const [eqFridge, setEqFridge] = useState(false)
  // ── CGU ──
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  // ── Soumission ──
  const [submitting, setSubmitting] = useState(false)
  const [stepError, setStepError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const isCar = vehicleType === 'voiture'
  const isCnib = cniType === 'cnib'
  const phoneVerified = phoneToken !== null

  // Le numéro change après vérification → on invalide la preuve.
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
    setOtpSending(true)
    try {
      const res = await sendPhoneOtp(normalized)
      setOtpSent(true)
      // Dev (SMS simulé) : pré-remplit le code pour tester sans SMS réel.
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

  // ── Validation par étape ──
  // Retourne un message d'erreur si l'étape est incomplète, sinon null.
  function validateStep(index: number): string | null {
    switch (index) {
      case 0: // Identité
        if (!firstName.trim() || !lastName.trim()) return 'Renseignez vos nom et prénom.'
        if (!gender) return 'Sélectionnez votre genre.'
        if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return 'Date de naissance au format AAAA-MM-JJ.'
        return null
      case 1: // Compte
        if (!email.trim()) return 'Renseignez votre email.'
        if (password.length < 8) return 'Mot de passe : 8 caractères minimum.'
        if (password !== passwordConfirm) return 'Les mots de passe ne correspondent pas.'
        return null
      case 2: // Téléphone
        if (!phoneVerified) return 'Vérifiez votre numéro par SMS avant de continuer.'
        return null
      case 3: // Véhicule
        if (!vehicleType) return 'Choisissez un type de véhicule.'
        if (!vehiclePlate.trim()) return "Renseignez la plaque d'immatriculation."
        return null
      case 4: // Documents
        if (!cniType) return "Choisissez le type de pièce d'identité."
        if (!cni) return "Ajoutez le recto de votre pièce d'identité."
        if (isCnib && !cniBack) return 'Ajoutez le verso de votre CNIB.'
        if (isCar && !drivingLicense) return 'Ajoutez votre permis de conduire (voiture).'
        return null
      case 5: // Finalisation
        if (!ec1Name.trim() || !ec1Phone.trim()) return "Renseignez le 1er contact d'urgence."
        if (!ec2Name.trim() || !ec2Phone.trim()) return "Renseignez le 2e contact d'urgence."
        if (!acceptedTerms) return 'Vous devez accepter les CGU.'
        return null
      default:
        return null
    }
  }

  function goNext() {
    const err = validateStep(step)
    if (err) {
      setStepError(err)
      return
    }
    setStepError(null)
    if (step < TOTAL_STEPS - 1) setStep(step + 1)
  }

  function goPrev() {
    setStepError(null)
    if (step > 0) setStep(step - 1)
  }

  async function handleSubmit() {
    // Sanity : re-valider toutes les étapes avant l'envoi (défensif au cas où
    // le state a été mutéd — l'utilisateur ne devrait pas atteindre l'étape 6
    // sans avoir tout complété).
    for (let i = 0; i < TOTAL_STEPS; i++) {
      const err = validateStep(i)
      if (err) {
        setStep(i)
        setStepError(err)
        return
      }
    }
    setStepError(null)
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
        vehicle_color: vehicleColor.trim() || undefined,
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
      setDone(true)
    } catch (e) {
      setStepError(serverMessage(e, "Erreur lors de l'inscription."))
    } finally {
      setSubmitting(false)
    }
  }

  // ── Écran succès ──
  if (done) {
    return (
      <SafeAreaView className="flex-1 bg-airmess-dark items-center justify-center px-8">
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <View className="w-20 h-20 rounded-full bg-airmess-yellow items-center justify-center mb-6">
          <Ionicons name="checkmark" size={44} color="#1A1614" />
        </View>
        <Text className="text-cream text-2xl font-extrabold text-center mb-3">Candidature envoyée</Text>
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

  const currentStep = STEPS[step]
  const isLastStep = step === TOTAL_STEPS - 1

  return (
    <SafeAreaView className="flex-1 bg-airmess-dark" edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* En-tête + barre de progression */}
      <View className="px-5 pt-6 pb-4">
        <View className="flex-row items-center mb-4">
          <Pressable
            onPress={step === 0 ? () => router.back() : goPrev}
            hitSlop={10}
            className="mr-3"
            accessibilityLabel={step === 0 ? 'Retour' : 'Étape précédente'}
          >
            <Ionicons name="arrow-back" size={24} color="#F5EFE3" />
          </Pressable>
          <View className="flex-1">
            <Text className="text-warm-400 text-[10px] uppercase tracking-widest font-extrabold">
              Étape {step + 1} sur {TOTAL_STEPS}
            </Text>
            <Text className="text-cream text-xl font-extrabold">{currentStep.title}</Text>
          </View>
        </View>

        <ProgressBar current={step} total={TOTAL_STEPS} />
        <Text className="text-warm-300 text-sm mt-3">{currentStep.subtitle}</Text>
      </View>

      <KeyboardAwareScrollView
        bottomOffset={24}
        contentContainerStyle={{ paddingBottom: 20 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="mx-5 bg-cream rounded-3xl p-5">
          {step === 0 && (
            <IdentityStep
              firstName={firstName} setFirstName={setFirstName}
              lastName={lastName} setLastName={setLastName}
              gender={gender} setGender={setGender}
              birthDate={birthDate} setBirthDate={setBirthDate}
            />
          )}
          {step === 1 && (
            <AccountStep
              email={email} setEmail={setEmail}
              password={password} setPassword={setPassword}
              passwordConfirm={passwordConfirm} setPasswordConfirm={setPasswordConfirm}
            />
          )}
          {step === 2 && (
            <PhoneStep
              phone={phone} onPhoneChange={onPhoneChange}
              phoneVerified={phoneVerified}
              otpSent={otpSent} otpCode={otpCode} setOtpCode={setOtpCode}
              otpSending={otpSending} otpVerifying={otpVerifying} otpError={otpError}
              onSendOtp={handleSendOtp} onVerifyOtp={handleVerifyOtp}
            />
          )}
          {step === 3 && (
            <VehicleStep
              vehicleType={vehicleType} setVehicleType={setVehicleType}
              vehiclePlate={vehiclePlate} setVehiclePlate={setVehiclePlate}
              vehicleColor={vehicleColor} setVehicleColor={setVehicleColor}
            />
          )}
          {step === 4 && (
            <DocsStep
              cniType={cniType} setCniType={setCniType}
              cni={cni} setCni={setCni}
              cniBack={cniBack} setCniBack={setCniBack}
              drivingLicense={drivingLicense} setDrivingLicense={setDrivingLicense}
              photo={photo} setPhoto={setPhoto}
              isCnib={isCnib} isCar={isCar}
            />
          )}
          {step === 5 && (
            <FinishStep
              ec1Name={ec1Name} setEc1Name={setEc1Name}
              ec1Phone={ec1Phone} setEc1Phone={setEc1Phone}
              ec2Name={ec2Name} setEc2Name={setEc2Name}
              ec2Phone={ec2Phone} setEc2Phone={setEc2Phone}
              eqIso={eqIso} setEqIso={setEqIso}
              eqTop={eqTop} setEqTop={setEqTop}
              eqFridge={eqFridge} setEqFridge={setEqFridge}
              acceptedTerms={acceptedTerms} setAcceptedTerms={setAcceptedTerms}
            />
          )}

          {stepError && (
            <View className="bg-danger-bg border-2 border-airmess-red/30 rounded-2xl p-3 mt-4 flex-row items-start">
              <Ionicons name="alert-circle" size={18} color="#D64545" />
              <Text className="text-airmess-red text-sm flex-1 font-semibold ml-2">{stepError}</Text>
            </View>
          )}
        </View>

        {step === 0 && (
          <Pressable onPress={() => router.replace('/login')} className="items-center mt-6" hitSlop={8}>
            <Text className="text-warm-400 text-sm">
              Déjà livreur ? <Text className="text-airmess-yellow font-bold">Se connecter</Text>
            </Text>
          </Pressable>
        )}
      </KeyboardAwareScrollView>

      {/* Barre d'action fixe en bas */}
      <View className="px-5 pt-3 pb-5 bg-airmess-dark border-t border-white/5 flex-row gap-3">
        {step > 0 && (
          <View className="flex-1">
            <Button variant="outline" size="lg" onPress={goPrev} disabled={submitting}>
              Précédent
            </Button>
          </View>
        )}
        <View className={step > 0 ? 'flex-[2]' : 'flex-1'}>
          {isLastStep ? (
            <Button variant="primary" size="lg" onPress={handleSubmit} loading={submitting}>
              Envoyer ma candidature
            </Button>
          ) : (
            <Button
              variant="primary"
              size="lg"
              onPress={goNext}
              rightIcon={<Ionicons name="arrow-forward" size={18} color="#1A1614" />}
            >
              Suivant
            </Button>
          )}
        </View>
      </View>
    </SafeAreaView>
  )
}

/* ── Barre de progression ── */

function ProgressBar({ current, total }: { current: number; total: number }) {
  // Segments équi-larges, coloriés selon l'avancement. Le segment courant est mi-doré (fait mais pas complet).
  return (
    <View className="flex-row gap-1.5">
      {Array.from({ length: total }, (_, i) => {
        const done = i < current
        const active = i === current
        return (
          <View
            key={i}
            className="flex-1 h-1.5 rounded-full"
            style={{
              backgroundColor: done ? '#FFCC00' : active ? '#FFCC00CC' : '#3A342B',
            }}
          />
        )
      })}
    </View>
  )
}

/* ── Steps ── */

function IdentityStep(props: {
  firstName: string; setFirstName: (v: string) => void
  lastName: string; setLastName: (v: string) => void
  gender: Gender | ''; setGender: (v: Gender) => void
  birthDate: string; setBirthDate: (v: string) => void
}) {
  return (
    <>
      <LabeledInput label="Prénom" value={props.firstName} onChangeText={props.setFirstName} autoCapitalize="words" />
      <LabeledInput label="Nom" value={props.lastName} onChangeText={props.setLastName} autoCapitalize="words" />
      <FieldLabel>Genre</FieldLabel>
      <Segmented
        options={[
          { value: 'M', label: 'Homme' },
          { value: 'F', label: 'Femme' },
          { value: 'autre', label: 'Autre' },
        ]}
        value={props.gender}
        onChange={(v) => props.setGender(v as Gender)}
      />
      <LabeledInput
        label="Date de naissance"
        value={props.birthDate}
        onChangeText={props.setBirthDate}
        placeholder="AAAA-MM-JJ"
        keyboardType="numbers-and-punctuation"
        hint="16 ans minimum"
      />
    </>
  )
}

function AccountStep(props: {
  email: string; setEmail: (v: string) => void
  password: string; setPassword: (v: string) => void
  passwordConfirm: string; setPasswordConfirm: (v: string) => void
}) {
  return (
    <>
      <LabeledInput
        label="Email"
        value={props.email}
        onChangeText={props.setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
      />
      <LabeledInput
        label="Mot de passe"
        value={props.password}
        onChangeText={props.setPassword}
        secureTextEntry
        hint="8 caractères minimum"
      />
      <LabeledInput
        label="Confirmer le mot de passe"
        value={props.passwordConfirm}
        onChangeText={props.setPasswordConfirm}
        secureTextEntry
      />
    </>
  )
}

function PhoneStep(props: {
  phone: string; onPhoneChange: (v: string) => void
  phoneVerified: boolean
  otpSent: boolean; otpCode: string; setOtpCode: (v: string) => void
  otpSending: boolean; otpVerifying: boolean; otpError: string | null
  onSendOtp: () => void; onVerifyOtp: () => void
}) {
  return (
    <>
      <FieldLabel>Téléphone</FieldLabel>
      <View className="flex-row items-center gap-2">
        <View className="flex-1">
          <TextInput
            value={props.phone}
            onChangeText={props.onPhoneChange}
            editable={!props.phoneVerified}
            placeholder="+229 01 90 12 34 56"
            placeholderTextColor="#B8AF9F"
            keyboardType="phone-pad"
            className="border-2 border-warm-200 rounded-2xl px-4 h-14 text-base text-ink bg-off-white"
          />
        </View>
        {props.phoneVerified ? (
          <View className="h-14 px-3 rounded-2xl bg-success/15 items-center justify-center flex-row">
            <Ionicons name="checkmark-circle" size={20} color="#1E9E5A" />
            <Text className="text-success font-bold ml-1">Vérifié</Text>
          </View>
        ) : (
          <Pressable
            onPress={props.onSendOtp}
            disabled={props.otpSending}
            className="h-14 px-4 rounded-2xl bg-airmess-dark items-center justify-center"
          >
            {props.otpSending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-bold">{props.otpSent ? 'Renvoyer' : 'Envoyer'}</Text>
            )}
          </Pressable>
        )}
      </View>

      {props.otpSent && !props.phoneVerified && (
        <View className="mt-3">
          <FieldLabel>Code reçu par SMS</FieldLabel>
          <View className="flex-row items-center gap-2">
            <View className="flex-1">
              <TextInput
                value={props.otpCode}
                onChangeText={props.setOtpCode}
                placeholder="123456"
                placeholderTextColor="#B8AF9F"
                keyboardType="number-pad"
                maxLength={6}
                className="border-2 border-warm-200 rounded-2xl px-4 h-14 text-base text-ink bg-off-white tracking-widest"
              />
            </View>
            <Pressable
              onPress={props.onVerifyOtp}
              disabled={props.otpVerifying || props.otpCode.trim().length < 6}
              className="h-14 px-4 rounded-2xl bg-airmess-yellow items-center justify-center"
              style={props.otpCode.trim().length < 6 ? { opacity: 0.4 } : undefined}
            >
              {props.otpVerifying ? (
                <ActivityIndicator color="#1A1614" />
              ) : (
                <Text className="text-ink font-extrabold">Vérifier</Text>
              )}
            </Pressable>
          </View>
        </View>
      )}
      {props.otpError && <Text className="text-airmess-red text-sm mt-2 font-semibold">{props.otpError}</Text>}
    </>
  )
}

function VehicleStep(props: {
  vehicleType: VehicleType | ''; setVehicleType: (v: VehicleType) => void
  vehiclePlate: string; setVehiclePlate: (v: string) => void
  vehicleColor: string; setVehicleColor: (v: string) => void
}) {
  return (
    <>
      <FieldLabel>Type de véhicule</FieldLabel>
      <View className="flex-row flex-wrap gap-2">
        {VEHICLES.map((v) => {
          const active = props.vehicleType === v.value
          return (
            <Pressable
              key={v.value}
              onPress={() => props.setVehicleType(v.value)}
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
      <LabeledInput label="Plaque d'immatriculation" value={props.vehiclePlate} onChangeText={props.setVehiclePlate} autoCapitalize="characters" />
      <LabeledInput label="Couleur (optionnel)" value={props.vehicleColor} onChangeText={props.setVehicleColor} placeholder="ex : Rouge" />
    </>
  )
}

function DocsStep(props: {
  cniType: CniType | ''; setCniType: (v: CniType) => void
  cni: LocalFile | null; setCni: (f: LocalFile | null) => void
  cniBack: LocalFile | null; setCniBack: (f: LocalFile | null) => void
  drivingLicense: LocalFile | null; setDrivingLicense: (f: LocalFile | null) => void
  photo: LocalFile | null; setPhoto: (f: LocalFile | null) => void
  isCnib: boolean; isCar: boolean
}) {
  return (
    <>
      <FieldLabel>Type de pièce d'identité</FieldLabel>
      <Segmented options={CNI_TYPES} value={props.cniType} onChange={(v) => props.setCniType(v as CniType)} />
      <DocField
        label={props.isCnib ? "Pièce d'identité (recto)" : "Pièce d'identité"}
        file={props.cni}
        onPick={props.setCni}
        required
      />
      {props.isCnib && <DocField label="CNIB (verso)" file={props.cniBack} onPick={props.setCniBack} required />}
      {props.isCar && <DocField label="Permis de conduire" file={props.drivingLicense} onPick={props.setDrivingLicense} required />}
      <DocField label="Photo de profil (optionnel)" file={props.photo} onPick={props.setPhoto} />
      <View className="flex-row items-center bg-info-bg border border-info/30 rounded-xl px-3 py-2.5 mt-1">
        <Ionicons name="information-circle" size={16} color="#0284C7" />
        <Text className="text-xs text-info ml-2 flex-1 font-semibold">
          Toutes les photos sont prises en direct avec la caméra — c'est une garantie pour vous et pour Air Mess.
        </Text>
      </View>
    </>
  )
}

function FinishStep(props: {
  ec1Name: string; setEc1Name: (v: string) => void
  ec1Phone: string; setEc1Phone: (v: string) => void
  ec2Name: string; setEc2Name: (v: string) => void
  ec2Phone: string; setEc2Phone: (v: string) => void
  eqIso: boolean; setEqIso: (v: boolean) => void
  eqTop: boolean; setEqTop: (v: boolean) => void
  eqFridge: boolean; setEqFridge: (v: boolean) => void
  acceptedTerms: boolean; setAcceptedTerms: (v: boolean) => void
}) {
  return (
    <>
      <SubSection icon="alert-circle-outline">Contacts d'urgence</SubSection>
      <LabeledInput label="Contact 1 — nom" value={props.ec1Name} onChangeText={props.setEc1Name} autoCapitalize="words" />
      <LabeledInput label="Contact 1 — téléphone" value={props.ec1Phone} onChangeText={props.setEc1Phone} keyboardType="phone-pad" />
      <LabeledInput label="Contact 2 — nom" value={props.ec2Name} onChangeText={props.setEc2Name} autoCapitalize="words" />
      <LabeledInput label="Contact 2 — téléphone" value={props.ec2Phone} onChangeText={props.setEc2Phone} keyboardType="phone-pad" />

      <SubSection icon="bag-handle-outline">Votre équipement</SubSection>
      <CheckRow label="Sac isotherme" checked={props.eqIso} onToggle={() => props.setEqIso(!props.eqIso)} />
      <CheckRow label="Top case" checked={props.eqTop} onToggle={() => props.setEqTop(!props.eqTop)} />
      <CheckRow label="Sac réfrigéré" checked={props.eqFridge} onToggle={() => props.setEqFridge(!props.eqFridge)} />

      <View className="h-4" />
      <Pressable onPress={() => props.setAcceptedTerms(!props.acceptedTerms)} className="flex-row items-start">
        <View
          className={`w-6 h-6 rounded-md border-2 items-center justify-center mr-3 mt-0.5 ${
            props.acceptedTerms ? 'bg-airmess-yellow border-airmess-yellow' : 'border-warm-300 bg-off-white'
          }`}
        >
          {props.acceptedTerms && <Ionicons name="checkmark" size={16} color="#1A1614" />}
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
    </>
  )
}

/* ── Sous-composants génériques ── */

function SubSection({ icon, children }: { icon: keyof typeof Ionicons.glyphMap; children: string }) {
  return (
    <View className="flex-row items-center mt-4 mb-3">
      <Ionicons name={icon} size={18} color="#8A7E68" />
      <Text className="text-ink font-extrabold text-base ml-2">{children}</Text>
    </View>
  )
}

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
  // Camera-only : un clic ouvre directement l'appareil photo, plus d'Alert
  // "camera / galerie". Cohérent avec la garantie donnée à Air Mess : la photo
  // a bien été prise sur place au moment de l'inscription.
  async function choose() {
    const picked = await pickImage()
    if (picked) onPick(picked)
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
            <Text className="text-airmess-red font-semibold text-sm">Reprendre</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          onPress={choose}
          className="flex-row items-center border-2 border-dashed border-warm-300 rounded-2xl px-4 h-14 bg-off-white"
        >
          <Ionicons name="camera-outline" size={20} color="#8A7E68" />
          <Text className="text-warm-600 ml-2">Prendre une photo</Text>
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
