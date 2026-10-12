import { useState } from 'react'
import {
  Image,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { Ionicons } from '@expo/vector-icons'
import { Link, Redirect } from 'expo-router'
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import Button from '../components/ui/Button'
import { useAuthStore } from '../stores/authStore'
import { useLanguageStore } from '../stores/languageStore'
import { getApiErrorMessage } from '../lib/apiError'

const LOGIN_COPY = {
  fr: {
    tagline: 'Espace marchand',
    welcome: 'Bienvenue',
    subtitle: 'Connecte-toi avec ton email et ton mot de passe.',
    email: 'Email',
    emailPlaceholder: 'commercant@example.com',
    password: 'Mot de passe',
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
    showPassword: 'Show password',
    hidePassword: 'Hide password',
    login: 'Log in',
    noAccount: "Don't have an account yet? ",
    createAccount: 'Create an account',
  },
} as const

export default function LoginScreen() {
  const insets = useSafeAreaInsets()
  const language = useLanguageStore((state) => state.language)
  const copy = LOGIN_COPY[language]
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
    <SafeAreaView className="flex-1 bg-airmess-dark" edges={['top', 'left', 'right']}>
      <StatusBar style="light" />
      <KeyboardAwareScrollView
        bottomOffset={24}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 + insets.bottom }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="items-center px-6 pb-4 pt-6">
          <Image
            source={require('../../assets/images/splash-icon.png')}
            style={{ width: 150, height: 225 }}
            resizeMode="contain"
          />
          <Text className="-mt-3 text-sm font-semibold uppercase tracking-widest text-warm-400">
            {copy.tagline}
          </Text>
        </View>

        <View className="mx-5 rounded-3xl bg-cream p-6 shadow-cta-dark dark:bg-[#181B24]">
          <Text className="mb-1 text-xl font-extrabold text-ink dark:text-white">{copy.welcome}</Text>
          <Text className="mb-5 text-sm text-warm-500">{copy.subtitle}</Text>

          <Text className="mb-1.5 text-[10px] font-extrabold uppercase tracking-widest text-warm-500">
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

          <Text className="mb-1.5 text-[10px] font-extrabold uppercase tracking-widest text-warm-500">
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
            <Text className="text-sm font-semibold text-warm-500">{copy.noAccount}</Text>
            <Link href="/register" asChild>
              <Pressable accessibilityRole="button">
                <Text className="text-sm font-extrabold text-airmess-red">{copy.createAccount}</Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  )
}
