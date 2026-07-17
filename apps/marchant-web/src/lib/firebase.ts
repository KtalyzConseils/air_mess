import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth'

/**
 * Firebase — uniquement Phone Auth (vérification OTP du numéro à
 * l'inscription driver) et Google Sign-In.
 *
 * Config chargée depuis les env vars Vite (préfixe VITE_). Ce n'est pas
 * un secret technique (l'apiKey Firebase est publique par design — la
 * sécurité repose sur les Authorized domains + SMS region policy +
 * App Check en console), mais on les sort du code pour taire les scanners
 * de secrets côté Git et garder toute config sensible hors du repo.
 *
 * En dev : les valeurs viennent de apps/marchant-web/.env
 * En prod : configuré côté Railway dans les env vars du service.
 * Documenté dans .env.example.
 *
 * Ne pas importer firebase/analytics ici.
 */
const firebaseConfig = {
  apiKey:             import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:         import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:          import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:      import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId:  import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:              import.meta.env.VITE_FIREBASE_APP_ID,
}

// Défense boot : si une var manque, Firebase donne une erreur cryptique
// (`auth/invalid-api-key`). On préfère un message clair.
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  throw new Error(
    'Firebase config manquante — copiez .env.example vers .env et renseignez les valeurs VITE_FIREBASE_*.',
  )
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
