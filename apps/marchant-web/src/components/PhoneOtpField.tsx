import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signOut,
  type ConfirmationResult,
} from 'firebase/auth'
import type { UseFormRegisterReturn } from 'react-hook-form'
import Input from './ui/Input'
import { firebaseAuth, normalizePhone } from '../lib/firebase'
import { CheckIcon } from './ui/icons'

type OtpStatus = 'idle' | 'sending' | 'code_sent' | 'verifying' | 'verified'

const RESEND_COOLDOWN_S = 60

interface Props {
  label: string
  /** register('phone', ...) — RHF garde la propriété du champ téléphone. */
  registration: UseFormRegisterReturn
  /** Valeur courante du champ (watch('phone')) — sert à invalider si le numéro change. */
  phoneValue: string
  error?: string
  /** ID token Firebase une fois le numéro vérifié (null sinon). */
  onTokenChange: (token: string | null) => void
}

/**
 * Champ téléphone avec vérification OTP par SMS via Firebase Phone Auth.
 * Firebase gère le reCAPTCHA (invisible), l'envoi du SMS et le throttling.
 * Après confirmation du code, l'ID token Firebase sert de preuve de
 * possession du numéro : il est joint au register et validé côté API.
 */
export default function PhoneOtpField({
  label,
  registration,
  phoneValue,
  error,
  onTokenChange,
}: Props) {
  const { t } = useTranslation()
  const recaptchaHostRef = useRef<HTMLDivElement>(null)

  const [status, setStatus] = useState<OtpStatus>('idle')
  const [code, setCode] = useState('')
  const [otpError, setOtpError] = useState<string | null>(null)
  const [resendIn, setResendIn] = useState(0)

  const verifierRef = useRef<RecaptchaVerifier | null>(null)
  const confirmationRef = useRef<ConfirmationResult | null>(null)
  /** Numéro (normalisé) effectivement vérifié — pour détecter un changement. */
  const verifiedPhoneRef = useRef<string | null>(null)

  // Compteur de renvoi.
  useEffect(() => {
    if (resendIn <= 0) return
    const timer = setInterval(() => setResendIn((s) => s - 1), 1000)
    return () => clearInterval(timer)
  }, [resendIn])

  // Si le numéro change après vérification/envoi, tout repart de zéro.
  useEffect(() => {
    const normalized = normalizePhone(phoneValue ?? '')
    if (verifiedPhoneRef.current !== null && normalized !== verifiedPhoneRef.current) {
      verifiedPhoneRef.current = null
      confirmationRef.current = null
      setStatus('idle')
      setCode('')
      setOtpError(null)
      onTokenChange(null)
    }
  }, [phoneValue, onTokenChange])

  // Cleanup du widget reCAPTCHA au démontage.
  useEffect(() => {
    return () => {
      verifierRef.current?.clear()
      verifierRef.current = null
    }
  }, [])

  function mapFirebaseError(err: unknown): string {
    const codeStr = (err as { code?: string })?.code ?? ''
    // Trace complète en console pour diagnostiquer les causes de config
    // (billing, provider désactivé, domaine, clé API restreinte…).
    console.error('[PhoneOtpField] Firebase error:', codeStr, err)
    switch (codeStr) {
      case 'auth/invalid-phone-number':
      case 'auth/missing-phone-number':
        return t('driverRegister.otp.errorInvalidPhone')
      case 'auth/invalid-verification-code':
        return t('driverRegister.otp.errorBadCode')
      case 'auth/code-expired':
        return t('driverRegister.otp.errorExpired')
      case 'auth/too-many-requests':
      case 'auth/quota-exceeded':
        return t('driverRegister.otp.errorTooMany')
      case 'auth/billing-not-enabled':
        return t('driverRegister.otp.errorBilling')
      case 'auth/operation-not-allowed':
        return t('driverRegister.otp.errorProviderDisabled')
      case 'auth/app-not-authorized':
      case 'auth/invalid-app-credential':
      case 'auth/captcha-check-failed':
        return t('driverRegister.otp.errorDomain')
      default: {
        // Code ou message brut affiché pour ne pas déboguer à l'aveugle.
        const detail = codeStr || (err instanceof Error ? err.message : '')
        return detail
          ? `${t('driverRegister.otp.errorGeneric')} (${detail})`
          : t('driverRegister.otp.errorGeneric')
      }
    }
  }

  async function sendCode() {
    const phone = normalizePhone(phoneValue ?? '')
    // E.164 : indicatif + 8 à 12 chiffres.
    if (!/^\+\d{10,14}$/.test(phone)) {
      setOtpError(t('driverRegister.otp.errorInvalidPhone'))
      return
    }

    setOtpError(null)
    setStatus('sending')
    try {
      // Un widget reCAPTCHA ne peut être rendu qu'une fois par élément
      // ("reCAPTCHA has already been rendered in this element") : on détruit
      // l'ancien verifier et on monte le nouveau dans un enfant DOM vierge.
      verifierRef.current?.clear()
      verifierRef.current = null
      const host = recaptchaHostRef.current
      if (!host) throw new Error('recaptcha host missing')
      host.innerHTML = ''
      const slot = document.createElement('div')
      host.appendChild(slot)
      verifierRef.current = new RecaptchaVerifier(firebaseAuth, slot, { size: 'invisible' })

      confirmationRef.current = await signInWithPhoneNumber(firebaseAuth, phone, verifierRef.current)
      verifiedPhoneRef.current = phone // mémorisé dès l'envoi pour détecter un changement
      setStatus('code_sent')
      setCode('')
      setResendIn(RESEND_COOLDOWN_S)
    } catch (err) {
      verifierRef.current?.clear()
      verifierRef.current = null
      setStatus('idle')
      setOtpError(mapFirebaseError(err))
    }
  }

  async function confirmCode(value: string) {
    if (!confirmationRef.current) return
    setStatus('verifying')
    setOtpError(null)
    try {
      const result = await confirmationRef.current.confirm(value)
      const idToken = await result.user.getIdToken()
      // Pas de session Firebase persistante : seul le jeton sert de preuve.
      await signOut(firebaseAuth).catch(() => {})
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

  const verifyDisabled = status === 'sending' || !(phoneValue ?? '').trim()

  return (
    <div>
      <Input
        type="tel"
        label={label}
        placeholder="+229 01 90 12 34 56"
        autoComplete="tel"
        {...registration}
        error={otpError && status === 'idle' ? otpError : error}
        rightSlot={
          status === 'verified' ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-success-bg px-2 py-1 text-caption font-medium text-success">
              <CheckIcon size={12} /> {t('driverRegister.otp.verifiedBadge')}
            </span>
          ) : (
            <button
              type="button"
              disabled={verifyDisabled}
              onClick={() => void sendCode()}
              className="rounded-md bg-airmess-dark px-2.5 py-1.5 text-caption font-medium text-cream transition-colors hover:bg-ink disabled:opacity-50 whitespace-nowrap"
            >
              {status === 'sending'
                ? t('driverRegister.otp.sending')
                : t('driverRegister.otp.verifyCta')}
            </button>
          )
        }
      />

      {(status === 'code_sent' || status === 'verifying') && (
        <div className="mt-2 rounded-md border border-warm-300 bg-off-white p-3">
          <p className="text-caption text-warm-600 mb-2">{t('driverRegister.otp.codeSentHint')}</p>
          <div className="flex items-center gap-3">
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              disabled={status === 'verifying'}
              onChange={(e) => handleCodeChange(e.target.value)}
              placeholder="······"
              aria-label={t('driverRegister.otp.codeAria')}
              className="w-32 rounded-md border border-warm-300 bg-white px-3 py-2 text-center text-h3 tracking-[0.4em] text-ink focus:outline-none focus:border-airmess-yellow focus:shadow-glow-yellow disabled:opacity-60"
            />
            {status === 'verifying' ? (
              <span className="text-caption text-warm-500">{t('driverRegister.otp.verifying')}</span>
            ) : (
              <button
                type="button"
                disabled={resendIn > 0}
                onClick={() => void sendCode()}
                className="text-caption font-medium text-ink underline-offset-2 hover:underline disabled:no-underline disabled:opacity-50"
              >
                {resendIn > 0
                  ? t('driverRegister.otp.resendIn', { s: resendIn })
                  : t('driverRegister.otp.resend')}
              </button>
            )}
          </div>
          {otpError && <p className="mt-2 text-caption text-airmess-red">{otpError}</p>}
        </div>
      )}

      {/* Hôte du reCAPTCHA invisible — un enfant vierge est recréé à chaque envoi. */}
      <div ref={recaptchaHostRef} />
    </div>
  )
}
