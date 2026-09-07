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
    subtitle: 'Connecte-toi avec ton numero de telephone.',
    codeTitle: 'Verification',
    codeSubtitle: (phone: string) => `Entre le code envoye au ${phone}.`,
    phone: 'Telephone',
    back: 'Retour',
    edit: 'Modifier',
    editLabel: 'Modifier le numero',
    codeLabel: 'Code recu par SMS',
    debugCode: 'Code test :',
    sendCode: 'Envoyer le code',
    login: 'Se connecter',
    noAccount: 'Pas encore de compte ? ',
    createAccount: 'Creer un compte',
  },
  en: {
    tagline: 'Merchant space',
    welcome: 'Welcome',
    subtitle: 'Sign in with your phone number.',
    codeTitle: 'Verification',
    codeSubtitle: (phone: string) => `Enter the code sent to ${phone}.`,
    phone: 'Phone',
    back: 'Back',
    edit: 'Edit',
    editLabel: 'Edit phone number',
    codeLabel: 'Code received by SMS',
    debugCode: 'Test code:',
    sendCode: 'Send code',
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
  const sendLoginCode = useAuthStore((state) => state.sendLoginCode)
  const verifyLoginCode = useAuthStore((state) => state.verifyLoginCode)
  const [phone, setPhone] = useState('')
  const [step, setStep] = useState<'phone' | 'code'>('phone')
  const [code, setCode] = useState('')
  const [debugCode, setDebugCode] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const trimmedPhone = phone.trim()
  const canSendCode = trimmedPhone.length >= 8
  const canVerifyCode = code.trim().length >= 4

  if (user) {
    return <Redirect href="/dashboard" />
  }

  async function handleSendCode() {
    if (!canSendCode) return
    setError(null)
    setDebugCode(null)
    setLoading(true)
    try {
      const response = await sendLoginCode(trimmedPhone)
      setDebugCode(response.debug_code ?? null)
      setStep('code')
    } catch (err) {
      setError(getApiErrorMessage(err, language))
    } finally {
      setLoading(false)
    }
  }

  async function handleVerifyCode() {
    if (!canVerifyCode) return
    setError(null)
    setLoading(true)
    try {
      await verifyLoginCode(trimmedPhone, code.trim())
    } catch (err) {
      setError(getApiErrorMessage(err, language))
    } finally {
      setLoading(false)
    }
  }

  function editPhone() {
    setStep('phone')
    setError(null)
    setDebugCode(null)
    setCode('')
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
          {step === 'phone' ? (
            <>
              <Text className="mb-1 text-xl font-extrabold text-ink dark:text-white">{copy.welcome}</Text>
              <Text className="mb-5 text-sm text-warm-500">{copy.subtitle}</Text>

              <Text className="mb-1.5 text-[10px] font-extrabold uppercase tracking-widest text-warm-500">
                {copy.phone}
              </Text>
              <TextInput
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                textContentType="telephoneNumber"
                placeholder="+229..."
                placeholderTextColor="#B8AF9F"
                className="mb-4 h-14 rounded-2xl border-2 border-warm-200 bg-off-white px-4 text-base text-ink dark:border-[#343A46] dark:bg-[#11141B] dark:text-white"
              />
            </>
          ) : (
            <>
              <Pressable
                onPress={editPhone}
                className="mb-4 h-10 flex-row items-center self-start rounded-full bg-off-white px-3 dark:bg-[#11141B]"
                accessibilityRole="button"
                accessibilityLabel={copy.editLabel}
              >
                <Ionicons name="arrow-back" size={17} color="#1A1614" />
                <Text className="ml-1.5 text-xs font-extrabold text-ink dark:text-white">{copy.back}</Text>
              </Pressable>

              <Text className="mb-1 text-xl font-extrabold text-ink dark:text-white">{copy.codeTitle}</Text>
              <Text className="mb-4 text-sm text-warm-500">{copy.codeSubtitle(trimmedPhone)}</Text>

              <View className="mb-4 flex-row items-center rounded-2xl border border-warm-200 bg-off-white px-4 py-3 dark:border-[#343A46] dark:bg-[#11141B]">
                <Ionicons name="call-outline" size={18} color="#8A7E68" />
                <Text className="ml-2 flex-1 text-sm font-extrabold text-ink dark:text-white">{trimmedPhone}</Text>
                <Pressable onPress={editPhone} accessibilityRole="button" hitSlop={8}>
                  <Text className="text-xs font-extrabold text-airmess-red">{copy.edit}</Text>
                </Pressable>
              </View>

              {debugCode && (
                <Text className="mb-3 rounded-2xl bg-airmess-yellow/20 px-3 py-2 text-center text-sm font-extrabold text-ink">
                  {copy.debugCode} {debugCode}
                </Text>
              )}
              <Text className="mb-1.5 text-[10px] font-extrabold uppercase tracking-widest text-warm-500">
                {copy.codeLabel}
              </Text>
              <TextInput
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                placeholder="123456"
                placeholderTextColor="#B8AF9F"
                className="mb-4 h-14 rounded-2xl border-2 border-warm-200 bg-off-white px-4 text-base text-ink dark:border-[#343A46] dark:bg-[#11141B] dark:text-white"
              />
            </>
          )}

          {error ? (
            <View className="mb-4 flex-row items-start rounded-2xl border-2 border-airmess-red/30 bg-danger-bg p-3">
              <View className="mr-2 mt-0.5 h-6 w-6 items-center justify-center rounded-full bg-airmess-red">
                <Ionicons name="alert" size={12} color="#ffffff" />
              </View>
              <Text className="flex-1 text-sm font-semibold text-airmess-red">{error}</Text>
            </View>
          ) : null}

          {step === 'phone' ? (
            <Button
              variant="primary"
              size="lg"
              onPress={handleSendCode}
              loading={loading}
              disabled={!canSendCode}
              rightIcon={<Ionicons name="send" size={18} color="#1A1614" />}
            >
              {copy.sendCode}
            </Button>
          ) : (
            <Button
              variant="primary"
              size="lg"
              onPress={handleVerifyCode}
              loading={loading}
              disabled={!canVerifyCode}
              rightIcon={<Ionicons name="checkmark" size={18} color="#1A1614" />}
            >
              {copy.login}
            </Button>
          )}

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
