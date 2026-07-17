import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth'

/**
 * Firebase — uniquement Phone Auth (vérification OTP du numéro à
 * l'inscription driver). Config web publique (pas un secret) ; la sécurité
 * repose sur les Authorized domains + SMS region policy de la console.
 * Ne pas importer firebase/analytics ici.
 */
const firebaseConfig = {
  apiKey: 'AIzaSyCdjmZvpmbB3KQc6S9nf1mGMBjSjMwiG7o',
  authDomain: 'airmess-a3ff7.firebaseapp.com',
  projectId: 'airmess-a3ff7',
  storageBucket: 'airmess-a3ff7.firebasestorage.app',
  messagingSenderId: '52708255287',
  appId: '1:52708255287:web:e6fb9705bdf3d38a9141b2',
}

const app = initializeApp(firebaseConfig)

export const firebaseAuth = getAuth(app)
// Localise le widget reCAPTCHA et le SMS envoyé.
firebaseAuth.languageCode = 'fr'

export interface GoogleSignInResult {
  /** ID token Firebase à joindre au register (vérifié côté API). */
  idToken: string
  email: string
  displayName: string
  firstName: string
  lastName: string
}

/**
 * Connexion Google via popup — utilisée à l'inscription pour pré-remplir et
 * prouver l'email. On se déconnecte aussitôt : seul l'ID token sert de preuve,
 * aucune session Firebase n'est conservée.
 */
export async function signInWithGoogle(): Promise<GoogleSignInResult> {
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })
  const credential = await signInWithPopup(firebaseAuth, provider)
  const idToken = await credential.user.getIdToken()
  const email = credential.user.email ?? ''
  const displayName = credential.user.displayName ?? ''
  await signOut(firebaseAuth).catch(() => {})
  const [firstName = '', ...rest] = displayName.split(' ')
  return { idToken, email, displayName, firstName, lastName: rest.join(' ') }
}

/**
 * Normalise un numéro vers E.164 : "+229 01 90 12 34 56" → "+2290190123456".
 * Doit rester alignée avec App\Support\Phone::normalize côté API, sinon le
 * claim phone_number du jeton Firebase ne matchera pas le numéro soumis.
 */
export function normalizePhone(raw: string): string {
  let phone = raw.trim().replace(/[\s\-.()]+/g, '')
  if (phone.startsWith('00')) phone = `+${phone.slice(2)}`
  if (phone && !phone.startsWith('+')) phone = `+229${phone}`
  return phone
}
