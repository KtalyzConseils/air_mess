import { useState } from 'react'
import { View, Text, TextInput, Pressable } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { AxiosError } from 'axios'
import { requestPasswordReset } from '../api/password'
import Button from '../components/ui/Button'

/**
 * Identique à « Mot de passe oublié » (forgot-password), mais avec un nom de
 * route hors AUTH_ROUTES afin que le garde d'authentification ne redirige pas
 * un utilisateur CONNECTÉ vers l'accueil. Accessible depuis le profil.
 * Champ email pré-rempli avec l'email de l'utilisateur connecté.
 */
export default function ChangePasswordScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const params = useLocalSearchParams<{ email?: string }>()

  // Pré-rempli avec l'email passé depuis le profil (email de l'utilisateur connecté).
  const [email, setEmail] = useState(params.email ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const canSubmit = /\S+@\S+\.\S+/.test(email.trim())

  async function handleSubmit() {
    setError(null)
    setLoading(true)
    try {
      await requestPasswordReset(email.trim())
      setSent(true)
    } catch (err) {
      let msg: string
      if (err instanceof AxiosError) {
        if (!err.response) {
          msg =
            err.code === 'ECONNABORTED'
              ? 'Le serveur met trop de temps à répondre. Réessaie.'
              : 'Impossible de joindre le serveur. Vérifie ta connexion internet.'
        } else if (err.response.status === 429) {
          msg = 'Trop de demandes. Patiente une heure avant de réessayer.'
        } else {
          msg = (err.response.data as any)?.message ?? `Erreur serveur (${err.response.status}).`
        }
      } else {
        msg = (err as Error).message
      }
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-airmess-dark" edges={['top']}>
      <StatusBar style="light" translucent backgroundColor="rgba(0,0,0,0)" />
      <KeyboardAwareScrollView
        bottomOffset={32}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 + insets.bottom }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row items-center px-4 pt-2 pb-4">
          <Pressable
            onPress={() => router.back()}
            hitSlop={10}
            className="w-10 h-10 rounded-full bg-white/10 items-center justify-center"
          >
            <Ionicons name="arrow-back" size={20} color="#F4EFE4" />
          </Pressable>
        </View>

        <View className="mx-5 bg-cream rounded-3xl p-6 shadow-cta-dark">
          {sent ? (
            <>
              <View className="w-14 h-14 rounded-full bg-airmess-yellow items-center justify-center mb-4">
                <Ionicons name="mail-outline" size={26} color="#1A1614" />
              </View>
              <Text className="text-xl font-extrabold text-ink mb-1">Vérifie ta boîte mail</Text>
              <Text className="text-sm text-warm-500 mb-5">
                Si un compte Air Mess est associé à{' '}
                <Text className="font-bold text-ink">{email.trim()}</Text>, tu recevras un lien
                pour choisir un nouveau mot de passe. Pense à regarder dans les spams.
              </Text>

              <Button variant="primary" size="lg" onPress={() => router.back()}>
                Retour au profil
              </Button>

              <Pressable onPress={() => setSent(false)} className="items-center mt-4" hitSlop={8}>
                <Text className="text-warm-500 text-sm">
                  Mauvaise adresse ?{' '}
                  <Text className="text-ink font-bold underline">Recommencer</Text>
                </Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text className="text-xl font-extrabold text-ink mb-1">Mot de passe oublié</Text>
              <Text className="text-sm text-warm-500 mb-5">
                Saisis l’email de ton compte : on t’envoie un lien pour le réinitialiser.
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
                placeholder="vous@example.com"
                placeholderTextColor="#B8AF9F"
                onSubmitEditing={() => canSubmit && handleSubmit()}
                returnKeyType="send"
                className="border-2 border-warm-200 rounded-2xl px-4 h-14 text-base text-ink bg-off-white mb-4"
              />

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
                onPress={handleSubmit}
                loading={loading}
                disabled={!canSubmit}
                rightIcon={<Ionicons name="arrow-forward" size={18} color="#1A1614" />}
              >
                Envoyer le lien
              </Button>
            </>
          )}
        </View>

        <Pressable onPress={() => router.back()} className="items-center mt-6" hitSlop={8}>
          <Text className="text-warm-400 text-sm">
            Je me souviens de mon mot de passe{' '}
            <Text className="text-airmess-yellow font-bold">Retour au profil</Text>
          </Text>
        </Pressable>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  )
}
