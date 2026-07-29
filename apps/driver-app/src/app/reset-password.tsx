import { useState } from 'react'
import { View, Text, TextInput, Pressable, Image } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useMutation } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import { resetPassword } from '../api/password'
import Button from '../components/ui/Button'

/**
 * Reset password — pendant natif de la page web marchand.
 *
 * Récupère token + email :
 *  - depuis l'URL en query params quand l'app est ouverte via deep-link
 *    (airmess://reset-password?token=X&email=Y) — étape 2 à venir ;
 *  - à défaut, l'utilisateur peut coller les 2 valeurs à la main (workaround
 *    tant que le deep-link n'est pas branché : le driver clique sur le lien de
 *    l'email sur son PC, le voit dans la barre d'adresse, et copie ici).
 */
export default function ResetPasswordScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const params = useLocalSearchParams<{ token?: string; email?: string }>()

  // Les params du deep-link peuvent arriver comme `string[]` si dupliqués — on
  // prend la 1ʳᵉ valeur dans tous les cas.
  const initialToken = Array.isArray(params.token) ? params.token[0] : params.token ?? ''
  const initialEmail = Array.isArray(params.email) ? params.email[0] : params.email ?? ''

  const [email, setEmail] = useState(initialEmail)
  const [token, setToken] = useState(initialToken)
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)

  const mismatch = confirmation.length > 0 && password !== confirmation
  const canSubmit =
    email.trim().length > 3 &&
    token.trim().length > 0 &&
    password.length >= 8 &&
    !mismatch

  const mutation = useMutation({
    mutationFn: () =>
      resetPassword({
        email: email.trim(),
        token: token.trim(),
        password,
        password_confirmation: confirmation,
      }),
    onSuccess: () => {
      // Redirige vers login après 2 s pour laisser le driver lire le message.
      setTimeout(() => router.replace('/login'), 2000)
    },
  })

  const apiError =
    mutation.error instanceof AxiosError
      ? (mutation.error.response?.data as { message?: string })?.message ??
        'Erreur lors de la réinitialisation.'
      : null

  const done = mutation.isSuccess

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
          <Text className="text-xl font-extrabold text-ink mb-1">
            Nouveau mot de passe
          </Text>

          {done ? (
            <View className="mt-4 bg-success-bg border border-success/30 rounded-2xl p-4">
              <Text className="text-success font-bold">Mot de passe changé</Text>
              <Text className="text-success text-sm mt-2">
                Redirection vers la connexion…
              </Text>
            </View>
          ) : (
            <>
              <Text className="text-sm text-warm-500 mb-5">
                {initialEmail ? (
                  <>
                    Nouveau mot de passe pour{' '}
                    <Text className="text-ink font-bold">{initialEmail}</Text>.
                  </>
                ) : (
                  <>
                    Colle les informations reçues par email (email + token) pour
                    changer ton mot de passe.
                  </>
                )}
              </Text>

              {/* Si le deep-link n'a PAS pré-rempli les 2 champs, on les affiche
                  pour permettre au driver de coller manuellement (étape 1
                  transitoire — sera automatique en étape 2). */}
              {!initialEmail && (
                <>
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
                    editable={!mutation.isPending}
                    className="border-2 border-warm-200 rounded-2xl px-4 h-14 text-base text-ink bg-off-white mb-4"
                  />
                </>
              )}
              {!initialToken && (
                <>
                  <Text className="text-[10px] uppercase text-warm-500 tracking-widest font-extrabold mb-1.5">
                    Token reçu par email
                  </Text>
                  <TextInput
                    value={token}
                    onChangeText={setToken}
                    autoCapitalize="none"
                    autoCorrect={false}
                    placeholder="Colle le token ici"
                    placeholderTextColor="#B8AF9F"
                    editable={!mutation.isPending}
                    className="border-2 border-warm-200 rounded-2xl px-4 h-14 text-base text-ink bg-off-white mb-4"
                  />
                </>
              )}

              <Text className="text-[10px] uppercase text-warm-500 tracking-widest font-extrabold mb-1.5">
                Nouveau mot de passe
              </Text>
              <View className="relative mb-1">
                <TextInput
                  value={password}
                  onChangeText={(v) => {
                    setPassword(v)
                    if (mutation.error) mutation.reset()
                  }}
                  secureTextEntry={!showPassword}
                  autoComplete="new-password"
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="newPassword"
                  placeholder="••••••••"
                  placeholderTextColor="#B8AF9F"
                  editable={!mutation.isPending}
                  className="border-2 border-warm-200 rounded-2xl pl-4 pr-14 h-14 text-base text-ink bg-off-white"
                />
                <Pressable
                  onPress={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-0 h-14 w-11 items-center justify-center"
                  hitSlop={8}
                  accessibilityLabel={
                    showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'
                  }
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#8A7E68"
                  />
                </Pressable>
              </View>
              <Text className="text-warm-500 text-xs mb-4 ml-1">8 caractères minimum.</Text>

              <Text className="text-[10px] uppercase text-warm-500 tracking-widest font-extrabold mb-1.5">
                Confirmer le mot de passe
              </Text>
              <View className="relative mb-1">
                <TextInput
                  value={confirmation}
                  onChangeText={(v) => {
                    setConfirmation(v)
                    if (mutation.error) mutation.reset()
                  }}
                  secureTextEntry={!showConfirmation}
                  autoComplete="new-password"
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="newPassword"
                  placeholder="••••••••"
                  placeholderTextColor="#B8AF9F"
                  editable={!mutation.isPending}
                  className={[
                    'border-2 rounded-2xl pl-4 pr-14 h-14 text-base text-ink bg-off-white',
                    mismatch ? 'border-airmess-red' : 'border-warm-200',
                  ].join(' ')}
                />
                <Pressable
                  onPress={() => setShowConfirmation((v) => !v)}
                  className="absolute right-3 top-0 h-14 w-11 items-center justify-center"
                  hitSlop={8}
                  accessibilityLabel={
                    showConfirmation
                      ? 'Masquer la confirmation'
                      : 'Afficher la confirmation'
                  }
                >
                  <Ionicons
                    name={showConfirmation ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#8A7E68"
                  />
                </Pressable>
              </View>
              {mismatch ? (
                <Text className="text-airmess-red text-xs font-semibold mb-4 ml-1">
                  Les mots de passe ne correspondent pas.
                </Text>
              ) : (
                <View className="mb-4" />
              )}

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
                disabled={!canSubmit}
                rightIcon={<Ionicons name="arrow-forward" size={18} color="#1A1614" />}
              >
                Changer le mot de passe
              </Button>
            </>
          )}
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  )
}
