import { useMemo, useRef, useState, forwardRef, type ComponentProps } from 'react'
import { View, Text, TextInput, Pressable, Switch } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { AxiosError } from 'axios'
import { useAuthStore } from '../stores/authStore'
import type { SecteurActivite } from '../types/auth'
import { normalizePhone } from '../lib/phone'
import Button from '../components/ui/Button'
// OTP Firebase conservé dans components/PhoneOtpField.tsx — à rebrancher plus tard.

type AccountType = 'marchant' | 'individual'
type FieldName = 'name' | 'firstName' | 'lastName' | 'email' | 'phone' | 'password' | 'passwordConfirmation' | 'raisonSociale' | 'ifu'

const SECTEURS: { value: SecteurActivite; label: string }[] = [
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'boutique', label: 'Boutique' },
  { value: 'supermarche', label: 'Supermarché' },
  { value: 'pharmacie', label: 'Pharmacie' },
  { value: 'ecommerce', label: 'E-commerce' },
  { value: 'autre', label: 'Autre' },
]

interface FieldProps extends ComponentProps<typeof TextInput> {
  label: string
  error?: boolean
}

const Field = forwardRef<TextInput, FieldProps>(function Field(
  { label, error, ...props },
  ref,
) {
  return (
    <View className="mb-4">
      <Text className="text-[10px] uppercase text-warm-500 tracking-widest font-extrabold mb-1.5">
        {label}
      </Text>
      <TextInput
        ref={ref}
        placeholderTextColor="#B8AF9F"
        className={`border-2 rounded-2xl px-4 h-14 text-base text-ink bg-off-white ${
          error ? 'border-airmess-red' : 'border-warm-200'
        }`}
        {...props}
      />
    </View>
  )
})

/**
 * Inscription marchand / particulier.
 * OTP Firebase temporairement retiré du formulaire (code conservé).
 */
export default function RegisterScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const registerMarchant = useAuthStore((s) => s.registerMarchant)
  const registerIndividual = useAuthStore((s) => s.registerIndividual)

  const [type, setType] = useState<AccountType>('marchant')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errorField, setErrorField] = useState<FieldName | null>(null)
  const [acceptedTerms, setAcceptedTerms] = useState(false)

  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')

  const [name, setName] = useState('')
  const [raisonSociale, setRaisonSociale] = useState('')
  const [ifu, setIfu] = useState('')
  const [secteur, setSecteur] = useState<SecteurActivite>('boutique')

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')

  const fieldRefs = useRef<Record<FieldName, TextInput | null>>({})

  const canSubmit = useMemo(() => {
    if (!acceptedTerms) return false
    if (!email.trim() || !phone.trim() || password.length < 8) return false
    if (password !== passwordConfirmation) return false
    if (type === 'marchant') return !!name.trim() && !!raisonSociale.trim()
    return !!firstName.trim() && !!lastName.trim()
  }, [
    acceptedTerms,
    email,
    phone,
    password,
    passwordConfirmation,
    type,
    name,
    raisonSociale,
    firstName,
    lastName,
  ])

  const fieldErrorMap: Record<string, FieldName> = {
    name: 'name',
    first_name: 'firstName',
    last_name: 'lastName',
    email: 'email',
    phone: 'phone',
    password: 'password',
    password_confirmation: 'passwordConfirmation',
    raison_sociale: 'raisonSociale',
    ifu_rccm: 'ifu',
  }

  const frenchErrors: Record<string, string> = {
    'already been taken': 'est déjà utilisé',
    required: 'est obligatoire',
    min: 'est trop court',
    invalid: 'n\'est pas valide',
    confirmed: 'ne correspondent pas',
    regex: 'n\'a pas le bon format',
  }

  function translateError(errMsg: string): string {
    for (const [key, fr] of Object.entries(frenchErrors)) {
      if (errMsg.toLowerCase().includes(key.toLowerCase())) {
        return fr
      }
    }
    return errMsg
  }

  async function handleSubmit() {
    setError(null)
    setErrorField(null)
    setLoading(true)
    try {
      const normalized = normalizePhone(phone)
      if (type === 'marchant') {
        await registerMarchant({
          name: name.trim(),
          email: email.trim(),
          phone: normalized,
          password,
          password_confirmation: passwordConfirmation,
          raison_sociale: raisonSociale.trim(),
          ifu_rccm: ifu.trim() || undefined,
          secteur_activite: secteur,
          accepted_terms: true,
        })
      } else {
        await registerIndividual({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim(),
          phone: normalized,
          password,
          password_confirmation: passwordConfirmation,
          accepted_terms: true,
        })
      }
    } catch (err) {
      if (err instanceof AxiosError) {
        const data = err.response?.data as { message?: string; errors?: Record<string, string[]> }
        let errMsg = data?.message ?? 'Inscription impossible. Réessaie.'
        let fieldKey: FieldName | null = null

        if (data?.errors) {
          const firstErrorKey = Object.keys(data.errors)[0]
          const firstErrorMsg = data.errors[firstErrorKey]?.[0] ?? ''
          fieldKey = fieldErrorMap[firstErrorKey] ?? null
          if (firstErrorMsg) {
            errMsg = `${firstErrorKey}: ${translateError(firstErrorMsg)}`
          }
        }

        setError(errMsg)
        setErrorField(fieldKey)
        if (fieldKey && fieldRefs.current[fieldKey]) {
          setTimeout(() => {
            fieldRefs.current[fieldKey]?.focus()
          }, 100)
        }
      } else {
        setError((err as Error).message)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={['top']}>
      <StatusBar style="dark" translucent backgroundColor="rgba(255,255,255,0)" />
      <KeyboardAwareScrollView
        bottomOffset={32}
        contentContainerStyle={{ padding: 20, paddingBottom: 40 + insets.bottom }}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable onPress={() => router.back()} className="flex-row items-center mb-4" hitSlop={8}>
          <Ionicons name="arrow-back" size={20} color="#1A1614" />
          <Text className="text-ink font-bold ml-2">Retour</Text>
        </Pressable>

        <Text className="text-3xl font-extrabold text-ink">Créer un compte</Text>
        <Text className="text-warm-500 mt-1 mb-5">
          Marchand ou particulier — même application.
        </Text>

        <View className="flex-row gap-2 mb-5">
          {(['marchant', 'individual'] as AccountType[]).map((t) => (
            <Pressable
              key={t}
              onPress={() => setType(t)}
              className={`flex-1 rounded-2xl py-3 items-center border-2 ${
                type === t ? 'bg-airmess-dark border-airmess-dark' : 'bg-off-white border-warm-200'
              }`}
            >
              <Text className={`font-bold ${type === t ? 'text-airmess-yellow' : 'text-ink'}`}>
                {t === 'marchant' ? 'Marchand' : 'Particulier'}
              </Text>
            </Pressable>
          ))}
        </View>

        {type === 'marchant' ? (
          <>
            <Field
              ref={(r) => {
                if (r) fieldRefs.current.name = r
              }}
              label="Nom du contact"
              value={name}
              onChangeText={setName}
              placeholder="ex. Jean Dupont"
              error={errorField === 'name'}
            />
            <Field
              ref={(r) => {
                if (r) fieldRefs.current.raisonSociale = r
              }}
              label="Raison sociale"
              value={raisonSociale}
              onChangeText={setRaisonSociale}
              placeholder="ex. SARL Dupont Logistique"
              error={errorField === 'raisonSociale'}
            />
            <Field
              ref={(r) => {
                if (r) fieldRefs.current.ifu = r
              }}
              label="IFU / RCCM (optionnel)"
              value={ifu}
              onChangeText={setIfu}
              placeholder="ex. BJ1234567"
              error={errorField === 'ifu'}
            />
            <Text className="text-[10px] uppercase text-warm-500 tracking-widest font-extrabold mb-1.5">
              Secteur
            </Text>
            <View className="flex-row flex-wrap gap-2 mb-4">
              {SECTEURS.map((s) => (
                <Pressable
                  key={s.value}
                  onPress={() => setSecteur(s.value)}
                  className={`px-3 py-2 rounded-full border ${
                    secteur === s.value
                      ? 'bg-airmess-yellow border-airmess-yellow'
                      : 'bg-off-white border-warm-200'
                  }`}
                >
                  <Text className="text-xs font-bold text-ink">{s.label}</Text>
                </Pressable>
              ))}
            </View>
          </>
        ) : (
          <>
            <Field
              ref={(r) => {
                if (r) fieldRefs.current.firstName = r
              }}
              label="Prénom"
              value={firstName}
              onChangeText={setFirstName}
              placeholder="ex. Marie"
              error={errorField === 'firstName'}
            />
            <Field
              ref={(r) => {
                if (r) fieldRefs.current.lastName = r
              }}
              label="Nom"
              value={lastName}
              onChangeText={setLastName}
              placeholder="ex. Dupont"
              error={errorField === 'lastName'}
            />
          </>
        )}

        <Field
          ref={(r) => {
            if (r) fieldRefs.current.email = r
          }}
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholder="vous@example.com"
          error={errorField === 'email'}
        />
        <Field
          ref={(r) => {
            if (r) fieldRefs.current.phone = r
          }}
          label="Téléphone"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          placeholder="+229 XX XXX XXX"
          error={errorField === 'phone'}
        />
        <Field
          ref={(r) => {
            if (r) fieldRefs.current.password = r
          }}
          label="Mot de passe"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="Minimum 8 caractères"
          error={errorField === 'password'}
        />
        <Field
          ref={(r) => {
            if (r) fieldRefs.current.passwordConfirmation = r
          }}
          label="Confirmer le mot de passe"
          value={passwordConfirmation}
          onChangeText={setPasswordConfirmation}
          secureTextEntry
          placeholder="Confirme ton mot de passe"
          error={errorField === 'passwordConfirmation'}
        />

        <View className="flex-row items-center mb-5">
          <Switch value={acceptedTerms} onValueChange={setAcceptedTerms} />
          <Text className="text-sm text-ink ml-3 flex-1">
            J’accepte les CGU et la politique de confidentialité.
          </Text>
        </View>

        {error && (
          <View className="bg-danger-bg border-2 border-airmess-red/30 rounded-2xl p-3 mb-4 flex-row items-start">
            <View className="w-5 h-5 rounded-full bg-airmess-red items-center justify-center mr-2 mt-0.5">
              <Ionicons name="alert" size={10} color="#ffffff" />
            </View>
            <Text className="text-airmess-red text-sm flex-1 font-semibold">{error}</Text>
          </View>
        )}

        <Button
          variant="primary"
          size="lg"
          onPress={handleSubmit}
          loading={loading}
          disabled={!canSubmit}
        >
          Créer mon compte
        </Button>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  )
}
