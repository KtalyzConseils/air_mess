import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Image,
  StatusBar,
  ScrollView,
  Linking,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import Constants from 'expo-constants'
import { AxiosError } from 'axios'
import { useAuthStore } from '../stores/authStore'
import Button from '../components/ui/Button'

/**
 * Login driver — continuation directe du splash.
 *
 *   [ MARK + WORDMARK ]           ← bg dark, on prolonge l'ambiance splash
 *   Espace livreur
 *
 *   ┌─────── carte cream ───────┐
 *   │  Email                    │
 *   │  Mot de passe (avec eye)  │
 *   │  [ Se connecter → ]       │
 *   └───────────────────────────┘
 *
 *   v1.0.0
 */
const REGISTER_URL = 'https://app.airmess-logistics.com/register/driver'

export default function LoginScreen() {
  const login = useAuthStore((s) => s.login)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const version = Constants.expoConfig?.version ?? ''

  async function handleLogin() {
    setError(null)
    setLoading(true)
    try {
      await login(email, password)
    } catch (err) {
      const msg =
        err instanceof AxiosError
          ? err.response?.data?.message ?? 'Identifiants invalides.'
          : (err as Error).message
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const canSubmit = email.trim().length > 3 && password.length >= 4

  return (
    <SafeAreaView className="flex-1 bg-airmess-dark" edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Bloc marque — signature du splash prolongée */}
          <View className="items-center pt-10 pb-8 px-6">
            <Image
              source={require('../../assets/images/splash-icon.png')}
              style={{ width: 220, height: 330 }}
              resizeMode="contain"
            />
            <Text className="text-warm-400 text-sm font-semibold tracking-widest uppercase -mt-4">
              Espace livreur
            </Text>
          </View>

          {/* Carte formulaire — cream sur fond dark = respiration + focus */}
          <View className="mx-5 bg-cream rounded-3xl p-6 shadow-cta-dark">
            <Text className="text-xl font-extrabold text-ink mb-1">Bienvenue</Text>
            <Text className="text-sm text-warm-500 mb-5">
              Connecte-toi pour recevoir tes courses.
            </Text>

            <Text className="text-[10px] uppercase text-warm-500 tracking-widest font-extrabold mb-1.5">
              Email
            </Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              placeholder="livreur@example.com"
              placeholderTextColor="#B8AF9F"
              className="border-2 border-warm-200 rounded-2xl px-4 h-14 text-base text-ink bg-off-white mb-4"
            />

            <Text className="text-[10px] uppercase text-warm-500 tracking-widest font-extrabold mb-1.5">
              Mot de passe
            </Text>
            <View className="relative mb-4">
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoComplete="password"
                placeholder="••••••••"
                placeholderTextColor="#B8AF9F"
                className="border-2 border-warm-200 rounded-2xl pl-4 pr-14 h-14 text-base text-ink bg-off-white"
              />
              <Pressable
                onPress={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-0 h-14 w-11 items-center justify-center"
                hitSlop={8}
                accessibilityLabel={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#8A7E68"
                />
              </Pressable>
            </View>

            {error && (
              <View className="bg-danger-bg border-2 border-airmess-red/30 rounded-2xl p-3 mb-4 flex-row items-start">
                <View className="w-6 h-6 rounded-full bg-airmess-red items-center justify-center mr-2 mt-0.5">
                  <Ionicons name="alert" size={12} color="#ffffff" />
                </View>
                <Text className="text-airmess-red text-sm flex-1 font-semibold">{error}</Text>
              </View>
            )}

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

          {/* Lien inscription — onboarding nouveau livreur via le web */}
          <Pressable
            onPress={() => Linking.openURL(REGISTER_URL)}
            className="items-center mt-6"
            hitSlop={8}
            accessibilityRole="link"
            accessibilityLabel="Créer un compte livreur"
          >
            <Text className="text-warm-400 text-sm">
              Pas encore livreur ?{' '}
              <Text className="text-airmess-yellow font-bold">Crée ton compte</Text>
            </Text>
          </Pressable>

          {/* Footer version + mention équipe */}
          <View className="items-center mt-8">
            <Text className="text-warm-500 text-xs">
              Une question ? <Text className="text-airmess-yellow font-bold">Contacte le support</Text>
            </Text>
            {version ? (
              <Text className="text-warm-600 text-[10px] mt-2 font-mono">v{version}</Text>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
