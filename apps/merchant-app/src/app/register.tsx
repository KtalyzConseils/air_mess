import { useMemo, useState, type ComponentProps } from 'react'
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

const SECTEURS: { value: SecteurActivite; label: string }[] = [
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'boutique', label: 'Boutique' },
  { value: 'supermarche', label: 'Supermarché' },
  { value: 'pharmacie', label: 'Pharmacie' },
  { value: 'ecommerce', label: 'E-commerce' },
  { value: 'autre', label: 'Autre' },
]

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

  async function handleSubmit() {
    setError(null)
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
        const firstField = data?.errors ? Object.values(data.errors)[0]?.[0] : null
        setError(firstField ?? data?.message ?? 'Inscription impossible.')
      } else {
        setError((err as Error).message)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />
      <KeyboardAwareScrollView
        bottomOffset={24}
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
            <Field label="Nom du contact" value={name} onChangeText={setName} />
            <Field label="Raison sociale" value={raisonSociale} onChangeText={setRaisonSociale} />
            <Field label="IFU / RCCM (optionnel)" value={ifu} onChangeText={setIfu} />
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
            <Field label="Prénom" value={firstName} onChangeText={setFirstName} />
            <Field label="Nom" value={lastName} onChangeText={setLastName} />
          </>
        )}

        <Field
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Field
          label="Téléphone"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          placeholder="+229…"
        />
        <Field label="Mot de passe" value={password} onChangeText={setPassword} secureTextEntry />
        <Field
          label="Confirmer le mot de passe"
          value={passwordConfirmation}
          onChangeText={setPasswordConfirmation}
          secureTextEntry
        />

        <View className="flex-row items-center mb-5">
          <Switch value={acceptedTerms} onValueChange={setAcceptedTerms} />
          <Text className="text-sm text-ink ml-3 flex-1">
            J’accepte les CGU et la politique de confidentialité.
          </Text>
        </View>

        {error && (
          <View className="bg-danger-bg border border-airmess-red/30 rounded-2xl p-3 mb-4">
            <Text className="text-airmess-red text-sm font-semibold">{error}</Text>
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

function Field({
  label,
  ...props
}: {
  label: string
} & ComponentProps<typeof TextInput>) {
  return (
    <View className="mb-4">
      <Text className="text-[10px] uppercase text-warm-500 tracking-widest font-extrabold mb-1.5">
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
