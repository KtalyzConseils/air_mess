import { useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { Ionicons } from '@expo/vector-icons'
import { Link, Redirect, useRouter } from 'expo-router'
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import BrandMark from '../components/BrandMark'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import { useAuthStore } from '../stores/authStore'
import { useLanguageStore } from '../stores/languageStore'
import { useThemeStore } from '../stores/themeStore'
import { getApiErrorMessage } from '../lib/apiError'

const LOGIN_COPY = {
  fr: {
    tagline: 'Espace marchand',
    welcome: 'Bienvenue',
    subtitle: 'Connecte-toi avec ton email et ton mot de passe.',
    email: 'Email',
    emailPlaceholder: 'commercant@example.com',
    password: 'Mot de passe',
    forgotPassword: 'Mot de passe oublie ?',
    showPassword: 'Afficher le mot de passe',
    hidePassword: 'Masquer le mot de passe',
    login: 'Se connecter',
    noAccount: 'Pas encore de compte ? ',
    createAccount: 'Creer un compte',
  },
  en: {
    tagline: 'Merchant space',
    welcome: 'Welcome',
    subtitle: 'Sign in with your email and password.',
    email: 'Email',
    emailPlaceholder: 'merchant@example.com',
    password: 'Password',
    forgotPassword: 'Forgot your password?',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
    login: 'Log in',
    noAccount: "Don't have an account yet? ",
    createAccount: 'Create an account',
  },
} as const

export default function LoginScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const language = useLanguageStore((state) => state.language)
  const copy = LOGIN_COPY[language]
  const theme = useThemeStore((state) => state.theme)
  const user = useAuthStore((state) => state.user)
  const login = useAuthStore((state) => state.login)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const trimmedEmail = email.trim()
  const canSubmit = trimmedEmail.includes('@') && password.length >= 4

  if (user) {
    return <Redirect href="/dashboard" />
  }

  async function handleLogin() {
    if (!canSubmit) return
    setError(null)
    setLoading(true)
    try {
      await login(trimmedEmail, password)
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

        {/* Fond clair : carte off-white bordee plutot qu'un aplat jaune, pour
            garder un fond confortable et des champs lisibles. */}
        <Card padding="lg" className="mx-5 shadow-card">
          <Text className="mb-1 text-xl font-extrabold text-ink dark:text-white">{copy.welcome}</Text>
          <Text className="mb-5 text-sm font-semibold text-warm-600 dark:text-[#AEB6C5]">
            {copy.subtitle}
          </Text>

          <Text className="mb-1.5 text-[10px] font-extrabold uppercase tracking-widest text-warm-600 dark:text-warm-300">
            {copy.email}
          </Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            placeholder={copy.emailPlaceholder}
            placeholderTextColor="#B8AF9F"
            className="mb-4 h-14 rounded-2xl border-2 border-warm-200 bg-off-white px-4 text-base text-ink dark:border-[#343A46] dark:bg-[#11141B] dark:text-white"
          />

          <Text className="mb-1.5 text-[10px] font-extrabold uppercase tracking-widest text-warm-600 dark:text-warm-300">
            {copy.password}
          </Text>
          <View className="mb-4">
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="password"
              textContentType="password"
              placeholder="********"
              placeholderTextColor="#B8AF9F"
              className="h-14 rounded-2xl border-2 border-warm-200 bg-off-white pl-4 pr-14 text-base text-ink dark:border-[#343A46] dark:bg-[#11141B] dark:text-white"
            />
            <Pressable
              onPress={() => setShowPassword((value) => !value)}
              className="absolute right-3 top-0 h-14 w-11 items-center justify-center"
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={showPassword ? copy.hidePassword : copy.showPassword}
            >
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color="#8A7E68"
              />
            </Pressable>
          </View>

          <Pressable
            onPress={() => router.push('/forgot-password')}
            className="-mt-1 mb-3 min-h-11 justify-center self-end px-1"
            hitSlop={8}
            accessibilityRole="link"
          >
            <Text className="text-sm font-semibold text-warm-600 underline dark:text-warm-300">
              {copy.forgotPassword}
            </Text>
          </Pressable>

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
            onPress={handleLogin}
            loading={loading}
            disabled={!canSubmit || loading}
            rightIcon={<Ionicons name="arrow-forward" size={18} color="#1A1614" />}
          >
            {copy.login}
          </Button>

          <View className="mt-5 flex-row justify-center">
            <Text className="text-sm font-semibold text-warm-600 dark:text-[#AEB6C5]">
              {copy.noAccount}
            </Text>
            <Link href="/register" asChild>
              <Pressable accessibilityRole="button" hitSlop={12}>
                <Text className="text-sm font-extrabold text-airmess-red">{copy.createAccount}</Text>
              </Pressable>
            </Link>
          </View>
        </Card>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  )
}
