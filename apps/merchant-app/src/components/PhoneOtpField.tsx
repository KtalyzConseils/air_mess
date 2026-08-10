import { useEffect, useRef, useState } from 'react'
import { View, Text, TextInput, Pressable, ActivityIndicator } from 'react-native'
import {
  signInWithPhoneNumber,
  signOut,
  type ConfirmationResult,
} from 'firebase/auth'
import { Ionicons } from '@expo/vector-icons'
import { getFirebaseAuth, firebaseConfig } from '../lib/firebase'
import { normalizePhone } from '../lib/phone'
import FirebaseRecaptchaVerifierModal, {
  type FirebaseRecaptchaRef,
} from './FirebaseRecaptchaVerifierModal'

type OtpStatus = 'idle' | 'sending' | 'code_sent' | 'verifying' | 'verified'

const RESEND_COOLDOWN_S = 60

type Props = {
  phone: string
  onPhoneChange: (phone: string) => void
  onTokenChange: (token: string | null) => void
  error?: string | null
}

function mapFirebaseError(err: unknown): string {
  const codeStr = (err as { code?: string })?.code ?? ''
  const msg = err instanceof Error ? err.message : String(err)
  console.error('[PhoneOtpField] Firebase error:', codeStr, err)
  // auth/error-code:-39 ≠ le compteur « SMS / jour » de la console.
  // C’est souvent un refus anti-abus / région / numéro (Firebase AuthError.QuotaExceeded
  // côté enum), alors que le dashboard d’utilisation peut rester à 1/10.
  if (
    codeStr === 'auth/too-many-requests' ||
    codeStr === 'auth/quota-exceeded' ||
    codeStr.includes('error-code:-39') ||
    msg.includes('error-code:-39')
  ) {
    return (
      'Firebase a refusé l’envoi SMS (code -39) : limite anti-abus sur ce numéro/IP, ' +
      'ou livraison temporairement indisponible pour la région. ' +
      'Ce n’est en général pas le quota « SMS/jour » de la console. ' +
      'Réessaie dans quelques minutes, change de numéro, ou utilise un numéro de test Firebase.'
    )
  }
  switch (codeStr) {
    case 'auth/invalid-phone-number':
    case 'auth/missing-phone-number':
      return 'Numéro de téléphone invalide.'
    case 'auth/invalid-verification-code':
      return 'Code incorrect. Réessaie.'
    case 'auth/code-expired':
    case 'auth/session-expired':
      return 'Code expiré. Renvoie un nouveau SMS.'
    case 'auth/billing-not-enabled':
      return 'Facturation Firebase non activée (SMS).'
    case 'auth/operation-not-allowed':
      return 'Phone Auth désactivé dans la console Firebase.'
    case 'auth/app-not-authorized':
    case 'auth/invalid-app-credential':
    case 'auth/captcha-check-failed':
      return 'Échec reCAPTCHA. Vérifie la config Firebase / domaine.'
    default: {
      const detail = codeStr || msg
      return detail ? `Vérification impossible (${detail})` : 'Vérification impossible.'
    }
  }
}

/**
 * Téléphone + OTP Firebase — miroir de marchant-web PhoneOtpField.
 * reCAPTCHA visible via WebView (Expo Go).
 */
export default function PhoneOtpField({
  phone,
  onPhoneChange,
  onTokenChange,
  error,
}: Props) {
  const recaptchaRef = useRef<FirebaseRecaptchaRef>(null)
  const confirmationRef = useRef<ConfirmationResult | null>(null)
  const verifiedPhoneRef = useRef<string | null>(null)

  const [status, setStatus] = useState<OtpStatus>('idle')
  const [code, setCode] = useState('')
  const [otpError, setOtpError] = useState<string | null>(null)
  const [resendIn, setResendIn] = useState(0)

  useEffect(() => {
    if (resendIn <= 0) return
    const t = setInterval(() => setResendIn((s) => s - 1), 1000)
    return () => clearInterval(t)
  }, [resendIn])

  useEffect(() => {
    const normalized = normalizePhone(phone)
    if (verifiedPhoneRef.current !== null && normalized !== verifiedPhoneRef.current) {
      verifiedPhoneRef.current = null
      confirmationRef.current = null
      setStatus('idle')
      setCode('')
      setOtpError(null)
      onTokenChange(null)
    }
  }, [phone, onTokenChange])

  async function sendCode() {
    const normalized = normalizePhone(phone)
    if (!/^\+\d{10,14}$/.test(normalized)) {
      setOtpError('Numéro invalide. Ex. +2290190123456')
      return
    }
    if (!recaptchaRef.current) {
      setOtpError('reCAPTCHA non prêt. Réessaie.')
      return
    }

    setOtpError(null)
    setStatus('sending')
    try {
      const auth = getFirebaseAuth()
      const confirmation = await signInWithPhoneNumber(
        auth,
        normalized,
        recaptchaRef.current,
      )
      confirmationRef.current = confirmation
      verifiedPhoneRef.current = normalized
      setStatus('code_sent')
      setCode('')
      setResendIn(RESEND_COOLDOWN_S)
    } catch (err) {
      setStatus('idle')
      setOtpError(mapFirebaseError(err))
    }
  }

  async function confirmCode(value: string) {
    if (!confirmationRef.current) return
    setStatus('verifying')
    setOtpError(null)
    try {
      const auth = getFirebaseAuth()
      const result = await confirmationRef.current.confirm(value)
      const idToken = await result.user.getIdToken()
      await signOut(auth).catch(() => {})
      setStatus('verified')
      onTokenChange(idToken)
    } catch (err) {
      setStatus('code_sent')
      setCode('')
      setOtpError(mapFirebaseError(err))
    }
  }

  function handleCodeChange(raw: string) {
    const digits = raw.replace(/\D/g, '').slice(0, 6)
    setCode(digits)
    if (digits.length === 6) void confirmCode(digits)
  }

  const verifyDisabled = status === 'sending' || !phone.trim()
  const fieldError = otpError && status === 'idle' ? otpError : error

  return (
    <View className="mb-4">
      <FirebaseRecaptchaVerifierModal
        ref={recaptchaRef}
        firebaseConfig={firebaseConfig}
        languageCode="fr"
        title="Vérification anti-robot"
        cancelLabel="Annuler"
      />

      <Text className="text-[10px] uppercase text-warm-500 tracking-widest font-extrabold mb-1.5">
        Téléphone
      </Text>
      <View className="flex-row items-center border-2 border-warm-200 rounded-2xl bg-off-white overflow-hidden">
        <TextInput
          value={phone}
          onChangeText={onPhoneChange}
          keyboardType="phone-pad"
          placeholder="+229 01 …"
          placeholderTextColor="#B8AF9F"
          editable={status !== 'verified'}
          className="flex-1 px-4 h-14 text-base text-ink"
        />
        {status === 'verified' ? (
          <View className="flex-row items-center px-3 mr-1 bg-success-bg rounded-full py-1.5">
            <Ionicons name="checkmark-circle" size={14} color="#16A34A" />
            <Text className="text-success text-xs font-bold ml-1">Vérifié</Text>
          </View>
        ) : (
          <Pressable
            onPress={() => void sendCode()}
            disabled={verifyDisabled}
            className={`mx-2 px-3 py-2 rounded-xl ${verifyDisabled ? 'bg-warm-200' : 'bg-airmess-dark'}`}
          >
            {status === 'sending' ? (
              <ActivityIndicator size="small" color="#FFCC00" />
            ) : (
              <Text className="text-cream text-xs font-bold">Vérifier</Text>
            )}
          </Pressable>
        )}
      </View>
      {fieldError ? (
        <Text className="text-airmess-red text-xs mt-1.5 font-semibold">{fieldError}</Text>
      ) : null}

      {(status === 'code_sent' || status === 'verifying') && (
        <View className="mt-3 border border-warm-200 bg-off-white rounded-2xl p-4">
          <Text className="text-warm-500 text-sm mb-2">
            Entre le code à 6 chiffres reçu par SMS.
          </Text>
          <View className="flex-row items-center gap-3">
            <TextInput
              value={code}
              onChangeText={handleCodeChange}
              keyboardType="number-pad"
              maxLength={6}
              editable={status !== 'verifying'}
              placeholder="······"
              placeholderTextColor="#B8AF9F"
              className="w-36 border-2 border-warm-200 rounded-2xl px-3 h-14 text-center text-2xl tracking-[8px] text-ink bg-white"
            />
            {status === 'verifying' ? (
              <ActivityIndicator color="#1A1614" />
            ) : (
              <Pressable onPress={() => void sendCode()} disabled={resendIn > 0}>
                <Text
                  className={`text-sm font-bold ${resendIn > 0 ? 'text-warm-400' : 'text-ink underline'}`}
                >
                  {resendIn > 0 ? `Renvoyer (${resendIn}s)` : 'Renvoyer'}
                </Text>
              </Pressable>
            )}
          </View>
          {otpError ? (
            <Text className="text-airmess-red text-xs mt-2 font-semibold">{otpError}</Text>
          ) : null}
        </View>
      )}
    </View>
  )
}
