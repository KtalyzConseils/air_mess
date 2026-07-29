import { useState } from 'react'
import { View, Text, TextInput, Pressable, Image } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useMutation } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import { forgotPassword } from '../api/password'
import Button from '../components/ui/Button'

/**
 * Mot de passe oublié — pendant natif de la page web marchand.
 * Le driver tape son email, on POST /auth/password/forgot, le back envoie un
 * mail avec un lien de reset. Étape 2 à suivre : le lien ouvrira directement
 * l'écran reset-password de l'app via deep-link.
 */
export default function ForgotPasswordScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const [email, setEmail] = useState('')

  const mutation = useMutation({
    mutationFn: () => forgotPassword(email.trim()),
  })

  const apiError =
    mutation.error instanceof AxiosError
      ? (mutation.error.response?.data as { message?: string })?.message ??
        'Erreur lors de la demande.'
      : null

  const submitted = mutation.isSuccess

  return (
    <SafeAreaView className="flex-1 bg-airmess-dark" edges={['top', 'left', 'right']}>
      <StatusBar style="light" />
      <KeyboardAwareScrollView
        bottomOffset={24}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 + insets.bottom }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="items-center pt-6 pb-4 px-6">
          <Image
            source={require('../../assets/images/splash-icon.png')}
            style={{ width: 120, height: 180 }}
            resizeMode="contain"
          />
          <Text className="text-warm-400 text-sm font-semibold tracking-widest uppercase -mt-3">
            Espace livreur
          </Text>
        </View>

        <View className="mx-5 bg-cream rounded-3xl p-6 shadow-cta-dark">
          <Pressable
            onPress={() => router.back()}
            className="flex-row items-center gap-1 mb-3"
            hitSlop={8}
          >
            <Ionicons name="chevron-back" size={16} color="#8A7E68" />
            <Text className="text-warm-500 text-sm">Retour à la connexion</Text>
          </Pressable>

          <Text className="text-xl font-extrabold text-ink mb-1">
            Mot de passe oublié
          </Text>

          {submitted ? (
            <View className="mt-4 bg-success-bg border border-success/30 rounded-2xl p-4">
              <Text className="text-success font-bold">Email envoyé</Text>
              <Text className="text-success text-sm mt-2">
                Si un compte livreur existe avec cet email, vous recevrez un lien
                de réinitialisation dans quelques minutes. Vérifiez aussi vos spams.
              </Text>
              <Text className="text-warm-600 text-xs mt-2">
                Le lien expire au bout d'une heure.
              </Text>

              <View className="mt-4">
                <Button
                  variant="outline"
                  size="md"
                  onPress={() => router.replace('/login')}
                >
                  Revenir à la connexion
                </Button>
              </View>
            </View>
          ) : (
            <>
              <Text className="text-sm text-warm-500 mb-5">
                Entre l'email de ton compte livreur, on t'envoie un lien pour
                choisir un nouveau mot de passe.
              </Text>

              <Text className="text-[10px] uppercase text-warm-500 tracking-widest font-extrabold mb-1.5">
                Email
              </Text>
              <TextInput
                value={email}
                onChangeText={(v) => {
                  setEmail(v)
                  if (mutation.error) mutation.reset()
                }}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                placeholder="livreur@example.com"
                placeholderTextColor="#B8AF9F"
                autoFocus
                editable={!mutation.isPending}
                className="border-2 border-warm-200 rounded-2xl px-4 h-14 text-base text-ink bg-off-white mb-4"
              />

              {apiError && (
                <View className="bg-danger-bg border-2 border-airmess-red/30 rounded-2xl p-3 mb-4 flex-row items-start">
                  <View className="w-6 h-6 rounded-full bg-airmess-red items-center justify-center mr-2 mt-0.5">
                    <Ionicons name="alert" size={12} color="#ffffff" />
                  </View>
                  <Text className="text-airmess-red text-sm flex-1 font-semibold">
                    {apiError}
                  </Text>
                </View>
              )}

              <Button
                variant="primary"
                size="lg"
                onPress={() => mutation.mutate()}
                loading={mutation.isPending}
                disabled={email.trim().length < 3}
                rightIcon={<Ionicons name="arrow-forward" size={18} color="#1A1614" />}
              >
                Envoyer le lien
              </Button>
            </>
          )}
        </View>

        <View className="items-center mt-6 px-6">
          <Text className="text-warm-500 text-xs text-center">
            Une question ?{' '}
            <Text className="text-airmess-yellow font-bold">Contacte le support</Text>
          </Text>
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  )
}
