import { useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { Ionicons } from '@expo/vector-icons'
import { Link, useRouter } from 'expo-router'
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import BrandMark from '../components/BrandMark'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import { forgotPassword } from '../api/profile'
import { getApiErrorMessage } from '../lib/apiError'
import { useLanguageStore } from '../stores/languageStore'
import { useThemeStore } from '../stores/themeStore'

const FORGOT_COPY = {
  fr: {
    tagline: 'Espace marchand',
    title: 'Mot de passe oublie',
    subtitle:
      "Renseigne l'email de ton compte : on t'envoie un lien pour choisir un nouveau mot de passe.",
    email: 'Email',
    emailPlaceholder: 'commercant@example.com',
    submit: 'Envoyer le lien',
    backToLogin: 'Retour a la connexion',
    submittedTitle: 'Verifie ta boite mail',
    submittedBody: (email: string) =>
      `Si un compte existe pour ${email}, tu recevras un lien pour choisir un nouveau mot de passe.`,
    submittedExpiry: 'Le lien expire dans 60 minutes. Pense a regarder dans tes spams.',
    submittedWebNote:
      "Le lien s'ouvre dans ton navigateur : tu y choisis ton nouveau mot de passe, puis tu reviens te connecter ici.",
    otherEmail: 'Essayer une autre adresse',
  },
  en: {
    tagline: 'Merchant space',
    title: 'Forgot password',
    subtitle: 'Enter your account email: we send you a link to choose a new password.',
    email: 'Email',
    emailPlaceholder: 'merchant@example.com',
    submit: 'Send the link',
    backToLogin: 'Back to sign in',
    submittedTitle: 'Check your inbox',
    submittedBody: (email: string) =>
      `If an account exists for ${email}, you will receive a link to choose a new password.`,
    submittedExpiry: 'The link expires in 60 minutes. Remember to check your spam folder.',
    submittedWebNote:
      'The link opens in your browser: choose your new password there, then come back and sign in here.',
    otherEmail: 'Try another address',
  },
} as const

export default function ForgotPasswordScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const language = useLanguageStore((state) => state.language)
  const copy = FORGOT_COPY[language]
  const theme = useThemeStore((state) => state.theme)

  const [email, setEmail] = useState('')
  const [submittedTo, setSubmittedTo] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const trimmedEmail = email.trim()
  const canSubmit = trimmedEmail.includes('@') && !loading

  async function handleSubmit() {
    if (!canSubmit) return
    setLoading(true)
    setError(null)

    try {
      await forgotPassword(trimmedEmail)
      // L'API ne dit jamais si l'adresse existe : on affiche la meme
      // confirmation dans tous les cas.
      setSubmittedTo(trimmedEmail)
    } catch (err) {
      setError(getApiErrorMessage(err, language))
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-cream dark:bg-[#0F1115]" edges={['top', 'left', 'right']}>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
      <KeyboardAwareScrollView
        bottomOffset={24}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 + insets.bottom }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="items-center px-6 pb-5 pt-7">
          <BrandMark />
          <Text className="mt-4 text-sm font-semibold uppercase tracking-widest text-warm-600 dark:text-warm-300">
            {copy.tagline}
          </Text>
        </View>

        <Card padding="lg" className="mx-5 shadow-card">
          <Pressable
            onPress={() => router.back()}
            className="mb-2 min-h-11 flex-row items-center self-start pr-2"
            accessibilityRole="button"
          >
            <Ionicons name="arrow-back" size={18} color="#8A7E68" />
            <Text className="ml-1.5 text-xs font-extrabold text-warm-600 dark:text-warm-300">
              {copy.backToLogin}
            </Text>
          </Pressable>

          <Text className="mb-1 text-xl font-extrabold text-ink dark:text-white">{copy.title}</Text>

          {submittedTo ? (
            <View className="mt-4">
              <View className="flex-row items-start rounded-2xl border border-success/30 bg-success-bg p-4">
                <Ionicons name="mail-outline" size={20} color="#16A34A" />
                <View className="ml-3 flex-1">
                  {/* Titre en encre : le vert du token passe mal en petit texte
                      sur le fond success-bg (3:1). Le bloc reste vert. */}
                  <Text className="text-base font-extrabold text-ink">{copy.submittedTitle}</Text>
                  <Text className="mt-1.5 text-sm font-semibold leading-5 text-ink">
                    {copy.submittedBody(submittedTo)}
                  </Text>
                  <Text className="mt-2 text-xs font-semibold leading-5 text-warm-600">
                    {copy.submittedExpiry}
                  </Text>
                  <Text className="mt-2 text-xs font-semibold leading-5 text-warm-600">
                    {copy.submittedWebNote}
                  </Text>
                </View>
              </View>

              <Pressable
                onPress={() => {
                  setSubmittedTo(null)
                  setEmail('')
                  setError(null)
                }}
                className="mt-4 min-h-11 justify-center self-start pr-2"
                accessibilityRole="button"
              >
                <Text className="text-sm font-extrabold text-airmess-red">{copy.otherEmail}</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <Text className="mb-5 text-sm font-semibold leading-5 text-warm-600 dark:text-[#AEB6C5]">
                {copy.subtitle}
              </Text>

              <Text className="mb-1.5 text-[10px] font-extrabold uppercase tracking-widest text-warm-600 dark:text-warm-300">
                {copy.email}
              </Text>
              <TextInput
                value={email}
                onChangeText={(value) => {
                  setEmail(value)
                  if (error) setError(null)
                }}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                keyboardType="email-address"
                textContentType="emailAddress"
                placeholder={copy.emailPlaceholder}
                placeholderTextColor="#B8AF9F"
                className="mb-4 h-14 rounded-2xl border-2 border-warm-200 bg-off-white px-4 text-base text-ink dark:border-[#343A46] dark:bg-[#11141B] dark:text-white"
              />

              {error ? (
                <View className="mb-4 flex-row items-start rounded-2xl border-2 border-airmess-red/30 bg-danger-bg p-3">
                  <View className="mr-2 mt-0.5 h-6 w-6 items-center justify-center rounded-full bg-airmess-red">
                    <Ionicons name="alert" size={12} color="#ffffff" />
                  </View>
                  <Text className="flex-1 text-sm font-semibold text-airmess-red">{error}</Text>
                </View>
              ) : null}

              <Button
                variant="primary"
                size="lg"
                onPress={() => void handleSubmit()}
                loading={loading}
                disabled={!canSubmit}
                rightIcon={<Ionicons name="mail-outline" size={18} color="#1A1614" />}
              >
                {copy.submit}
              </Button>
            </>
          )}

          <View className="mt-5 flex-row justify-center">
            <Link href="/login" asChild>
              <Pressable accessibilityRole="button" hitSlop={12}>
                <Text className="text-sm font-extrabold text-airmess-red">{copy.backToLogin}</Text>
              </Pressable>
            </Link>
          </View>
        </Card>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  )
}
