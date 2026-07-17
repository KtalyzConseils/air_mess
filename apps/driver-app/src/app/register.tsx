import { useState } from 'react'
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

  // Identité
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [gender, setGender] = useState<Gender | ''>('')
  const [birthDate, setBirthDate] = useState('')
  // Compte
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  // Téléphone + OTP
  const [phone, setPhone] = useState('')
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

  function validate(): string | null {
    if (!firstName.trim() || !lastName.trim()) return 'Renseignez vos nom et prénom.'
    if (!gender) return 'Sélectionnez votre genre.'
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return 'Date de naissance au format AAAA-MM-JJ.'
    if (!email.trim()) return 'Renseignez votre email.'
    if (password.length < 8) return 'Mot de passe : 8 caractères minimum.'
    if (password !== passwordConfirm) return 'Les mots de passe ne correspondent pas.'
    if (!phoneVerified) return 'Vérifiez votre numéro par SMS.'
    if (!vehicleType) return 'Choisissez un type de véhicule.'
    if (!vehiclePlate.trim()) return "Renseignez la plaque d'immatriculation."
    if (!cniType) return "Choisissez le type de pièce d'identité."
    if (!cni) return "Ajoutez le recto de votre pièce d'identité."
    if (isCnib && !cniBack) return 'Ajoutez le verso de votre CNIB.'
    if (isCar && !drivingLicense) return 'Ajoutez votre permis de conduire (voiture).'
    if (!ec1Name.trim() || !ec1Phone.trim()) return "Renseignez le 1er contact d'urgence."
    if (!ec2Name.trim() || !ec2Phone.trim()) return "Renseignez le 2e contact d'urgence."
    if (!acceptedTerms) return "Vous devez accepter les CGU."
    return null
  }

  async function handleSubmit() {
    setFormError(null)
    const err = validate()
    if (err) {
      setFormError(err)
      return
    }
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
      setDone(true)
    } catch (e) {
      setFormError(serverMessage(e, "Erreur lors de l'inscription."))
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

  return (
    <SafeAreaView className="flex-1 bg-airmess-dark" edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <KeyboardAwareScrollView
        bottomOffset={24}
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* En-tête */}
        <View className="px-5 pt-6 pb-4 flex-row items-center">
          <Pressable onPress={() => router.back()} hitSlop={10} className="mr-3" accessibilityLabel="Retour">
            <Ionicons name="arrow-back" size={24} color="#F5EFE3" />
          </Pressable>
          <Text className="text-cream text-xl font-extrabold">Devenir livreur</Text>
        </View>

        <View className="mx-5 bg-cream rounded-3xl p-5">
          {/* Identité */}
          <SectionTitle icon="person-outline">Votre identité</SectionTitle>
          <LabeledInput label="Prénom" value={firstName} onChangeText={setFirstName} autoCapitalize="words" />
          <LabeledInput label="Nom" value={lastName} onChangeText={setLastName} autoCapitalize="words" />
          <FieldLabel>Genre</FieldLabel>
          <Segmented
            options={[
              { value: 'M', label: 'Homme' },
              { value: 'F', label: 'Femme' },
              { value: 'autre', label: 'Autre' },
            ]}
            value={gender}
            onChange={(v) => setGender(v as Gender)}
          />
          <LabeledInput
            label="Date de naissance"
            value={birthDate}
            onChangeText={setBirthDate}
            placeholder="AAAA-MM-JJ"
            keyboardType="numbers-and-punctuation"
            hint="16 ans minimum"
          />

          {/* Compte */}
          <SectionTitle icon="lock-closed-outline">Votre compte</SectionTitle>
          <LabeledInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />
          <LabeledInput
            label="Mot de passe"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            hint="8 caractères minimum"
          />
          <LabeledInput
            label="Confirmer le mot de passe"
            value={passwordConfirm}
            onChangeText={setPasswordConfirm}
            secureTextEntry
          />

          {/* Téléphone + OTP */}
          <SectionTitle icon="phone-portrait-outline">Votre numéro</SectionTitle>
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

          {/* Véhicule */}
          <SectionTitle icon="bicycle-outline">Votre véhicule</SectionTitle>
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

          {/* Documents */}
          <SectionTitle icon="document-text-outline">Vos documents</SectionTitle>
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

          {/* Contacts d'urgence */}
          <SectionTitle icon="alert-circle-outline">Contacts d'urgence</SectionTitle>
          <LabeledInput label="Contact 1 — nom" value={ec1Name} onChangeText={setEc1Name} autoCapitalize="words" />
          <LabeledInput label="Contact 1 — téléphone" value={ec1Phone} onChangeText={setEc1Phone} keyboardType="phone-pad" />
          <LabeledInput label="Contact 2 — nom" value={ec2Name} onChangeText={setEc2Name} autoCapitalize="words" />
          <LabeledInput label="Contact 2 — téléphone" value={ec2Phone} onChangeText={setEc2Phone} keyboardType="phone-pad" />

          {/* Équipement */}
          <SectionTitle icon="bag-handle-outline">Votre équipement</SectionTitle>
          <CheckRow label="Sac isotherme" checked={eqIso} onToggle={() => setEqIso((v) => !v)} />
          <CheckRow label="Top case" checked={eqTop} onToggle={() => setEqTop((v) => !v)} />
          <CheckRow label="Sac réfrigéré" checked={eqFridge} onToggle={() => setEqFridge((v) => !v)} />

          {/* CGU */}
          <View className="h-4" />
          <Pressable onPress={() => setAcceptedTerms((v) => !v)} className="flex-row items-start">
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

          {formError && (
            <View className="bg-danger-bg border-2 border-airmess-red/30 rounded-2xl p-3 mt-4 flex-row items-start">
              <Ionicons name="alert-circle" size={18} color="#D64545" />
              <Text className="text-airmess-red text-sm flex-1 font-semibold ml-2">{formError}</Text>
            </View>
          )}

          <View className="h-5" />
          <Button variant="primary" size="lg" onPress={handleSubmit} loading={submitting}>
            Envoyer ma candidature
          </Button>
        </View>

        <Pressable onPress={() => router.replace('/login')} className="items-center mt-6" hitSlop={8}>
          <Text className="text-warm-400 text-sm">
            Déjà livreur ? <Text className="text-airmess-yellow font-bold">Se connecter</Text>
          </Text>
        </Pressable>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  )
}

/* ── Sous-composants ── */

function SectionTitle({ icon, children }: { icon: keyof typeof Ionicons.glyphMap; children: string }) {
  return (
    <View className="flex-row items-center mt-6 mb-3">
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
