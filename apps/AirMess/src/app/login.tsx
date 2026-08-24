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
import { AxiosError } from 'axios'
import { Redirect } from 'expo-router'
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import Button from '../components/ui/Button'
import { useAuthStore } from '../stores/authStore'

export default function LoginScreen() {
  const insets = useSafeAreaInsets()
  const user = useAuthStore((state) => state.user)
  const login = useAuthStore((state) => state.login)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSubmit = email.trim().length > 3 && password.length >= 4

  if (user) {
    return <Redirect href="/dashboard" />
  }

  async function handleLogin() {
    setError(null)
    setLoading(true)
    try {
      await login(email.trim(), password)
    } catch (err) {
      if (err instanceof AxiosError) {
        if (!err.response) {
          setError(
            err.code === 'ECONNABORTED'
              ? 'Le serveur met trop de temps a repondre. Reessaie.'
              : 'Impossible de joindre le serveur. Verifie ta connexion internet.',
          )
        } else if (err.response.status === 401) {
          setError('Email ou mot de passe incorrect.')
        } else {
          setError((err.response.data as { message?: string })?.message ?? `Erreur serveur (${err.response.status}).`)
        }
      } else {
        setError((err as Error).message)
      }
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
            Espace marchand
          </Text>
        </View>

        <View className="mx-5 rounded-3xl bg-cream p-6 shadow-cta-dark">
          <Text className="mb-1 text-xl font-extrabold text-ink">Bienvenue</Text>
          <Text className="mb-5 text-sm text-warm-500">
            Connecte-toi pour gerer tes courses.
          </Text>

          <Text className="mb-1.5 text-[10px] font-extrabold uppercase tracking-widest text-warm-500">
            Email
          </Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            placeholder="marchand@example.com"
            placeholderTextColor="#B8AF9F"
            className="mb-4 h-14 rounded-2xl border-2 border-warm-200 bg-off-white px-4 text-base text-ink"
          />

          <Text className="mb-1.5 text-[10px] font-extrabold uppercase tracking-widest text-warm-500">
            Mot de passe
          </Text>
          <View className="relative mb-4">
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoComplete="password"
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="password"
              placeholder="********"
              placeholderTextColor="#B8AF9F"
              className="h-14 rounded-2xl border-2 border-warm-200 bg-off-white pl-4 pr-14 text-base text-ink"
            />
            <Pressable
              onPress={() => setShowPassword((value) => !value)}
              className="absolute right-3 top-0 h-14 w-11 items-center justify-center"
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
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
            disabled={!canSubmit}
            rightIcon={<Ionicons name="arrow-forward" size={18} color="#1A1614" />}
          >
            Se connecter
          </Button>
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  )
}
