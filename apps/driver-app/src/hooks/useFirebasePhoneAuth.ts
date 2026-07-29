import { useCallback, useRef, useState } from 'react'
import auth, { type FirebaseAuthTypes } from '@react-native-firebase/auth'

export type PhoneAuthStatus =
  | 'idle'
  | 'sending'
  | 'code_sent'
  | 'verifying'
  | 'verified'
  | 'error'

interface UseFirebasePhoneAuth {
  status: PhoneAuthStatus
  error: string | null
  idToken: string | null
  sendCode: (phoneE164: string) => Promise<void>
  confirmCode: (code: string) => Promise<void>
  reset: () => void
}

/**
 * Wrapper autour de @react-native-firebase/auth (Phone Auth).
 *
 * Flow standard :
 *   1. sendCode(phone) → Firebase envoie un SMS via signInWithPhoneNumber.
 *      Sur Android, si le device passe SafetyNet + Google Play Services, ça peut
 *      basculer en "instant verification" et signer l'utilisateur SANS SMS
 *      (transparent pour l'appelant : la confirmation ci-dessous marche pareil).
 *   2. confirmCode(code) → confirmationResult.confirm(code) → getIdToken() →
 *      signOut() (on veut le token pas la session).
 *
 * Le idToken retourné est valide 1h et sert de preuve à /auth/register/driver
 * (claim `phone_number` E.164 vérifié par le back via FirebaseTokenVerifier).
 */
export function useFirebasePhoneAuth(): UseFirebasePhoneAuth {
  const [status, setStatus] = useState<PhoneAuthStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [idToken, setIdToken] = useState<string | null>(null)
  const confirmationRef = useRef<FirebaseAuthTypes.ConfirmationResult | null>(null)

  const sendCode = useCallback(async (phoneE164: string) => {
    setError(null)
    setStatus('sending')
    try {
      // 2ᵉ argument `forceResend = true` : oblige Firebase à envoyer un nouveau SMS
      // même si un envoi récent est en cache. Utile pour le bouton "Renvoyer".
      confirmationRef.current = await auth().signInWithPhoneNumber(phoneE164, true)
      setStatus('code_sent')
    } catch (e: unknown) {
      confirmationRef.current = null
      setError(mapFirebaseError(e))
      setStatus('error')
    }
  }, [])

  const confirmCode = useCallback(async (code: string) => {
    if (!confirmationRef.current) {
      setError('Envoie d\'abord un code par SMS.')
      return
    }
    setStatus('verifying')
    setError(null)
    try {
      const cred = await confirmationRef.current.confirm(code)
      const user = cred?.user
      if (!user) throw new Error('no_user')
      const token = await user.getIdToken()
      // Pas de session Firebase persistante côté client : seul le jeton nous sert
      // (le back valide sa signature + le claim phone_number). Le signOut évite qu'un
      // onAuthStateChanged résiduel déclenche un jour un effet parasite.
      await auth().signOut().catch(() => {})
      setIdToken(token)
      setStatus('verified')
    } catch (e: unknown) {
      setError(mapFirebaseError(e))
      // On reste en 'code_sent' pour permettre une nouvelle tentative sans re-SMS.
      setStatus('code_sent')
    }
  }, [])

  const reset = useCallback(() => {
    confirmationRef.current = null
    setIdToken(null)
    setStatus('idle')
    setError(null)
  }, [])

  return { status, error, idToken, sendCode, confirmCode, reset }
}

function mapFirebaseError(err: unknown): string {
  const code = (err as { code?: string })?.code ?? ''
  switch (code) {
    case 'auth/invalid-phone-number':
    case 'auth/missing-phone-number':
      return 'Numéro invalide.'
    case 'auth/invalid-verification-code':
      return 'Code incorrect.'
    case 'auth/code-expired':
      return 'Code expiré. Renvoyez-en un nouveau.'
    case 'auth/too-many-requests':
    case 'auth/quota-exceeded':
      return 'Trop de tentatives. Réessayez dans quelques minutes.'
    case 'auth/network-request-failed':
      return 'Pas de connexion. Vérifiez internet.'
    case 'auth/app-not-authorized':
    case 'auth/invalid-app-credential':
      return 'App non autorisée par Firebase (SHA-1/256 manquant côté console ?).'
    case 'auth/billing-not-enabled':
      return 'Vérification SMS indisponible (contactez le support).'
    default: {
      const detail = code || (err instanceof Error ? err.message : '')
      return detail ? `Échec de la vérification (${detail}).` : 'Échec de la vérification.'
    }
  }
}
