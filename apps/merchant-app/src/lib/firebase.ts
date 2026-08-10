/**
 * Firebase Phone Auth — aligné sur marchant-web.
 * Config hardcodée (publique) ; EXPO_PUBLIC_* non vides priment.
 *
 * Persistence AsyncStorage : optionnelle ici — on signOut juste après
 * l'obtention du idToken à l'inscription.
 */
import { initializeApp, getApps, type FirebaseApp, type FirebaseOptions } from 'firebase/app'
import { getAuth, signOut, type Auth } from 'firebase/auth'

function envOr(key: string, fallback: string): string {
  const v = process.env[key]
  return typeof v === 'string' && v.trim().length > 0 ? v.trim() : fallback
}

/** Même projet que marchant-web (airmess-a3ff7). */
const FALLBACK = {
  apiKey: 'AIzaSyCdjmZvpmbB3KQc6S9nf1mGMBjSjMwiG7o',
  authDomain: 'airmess-a3ff7.firebaseapp.com',
  projectId: 'airmess-a3ff7',
  storageBucket: 'airmess-a3ff7.firebasestorage.app',
  messagingSenderId: '52708255287',
  appId: '1:52708255287:web:e6fb9705bdf3d38a9141b2',
} as const

export const firebaseConfig: FirebaseOptions = {
  apiKey: envOr('EXPO_PUBLIC_FIREBASE_API_KEY', FALLBACK.apiKey),
  authDomain: envOr('EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN', FALLBACK.authDomain),
  projectId: envOr('EXPO_PUBLIC_FIREBASE_PROJECT_ID', FALLBACK.projectId),
  storageBucket: envOr('EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET', FALLBACK.storageBucket),
  messagingSenderId: envOr(
    'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    FALLBACK.messagingSenderId,
  ),
  appId: envOr('EXPO_PUBLIC_FIREBASE_APP_ID', FALLBACK.appId),
}

let app: FirebaseApp | null = null
let auth: Auth | null = null

function getFirebaseApp(): FirebaseApp {
  if (app) return app
  app = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig)
  return app
}

/** Lazy — n’initialise Auth qu’à l’appel. */
export function getFirebaseAuth(): Auth {
  if (auth) return auth
  auth = getAuth(getFirebaseApp())
  auth.languageCode = 'fr'
  return auth
}

export async function getFirebaseIdToken(): Promise<string | null> {
  const user = getFirebaseAuth().currentUser
  if (!user) return null
  return user.getIdToken()
}

export async function clearFirebaseSession(): Promise<void> {
  await signOut(getFirebaseAuth()).catch(() => {})
}
