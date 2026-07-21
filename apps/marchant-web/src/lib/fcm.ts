import { getMessaging, getToken, isSupported } from 'firebase/messaging'
import { initializeApp } from 'firebase/app'
import api from '../api/client'

/**
 * Web push FCM de la PWA : après que l'utilisateur a accordé la permission
 * notifications, on récupère un token FCM (clé VAPID publique) et on
 * l'enregistre côté API (device_tokens, platform=web). L'API pousse ensuite
 * via FCM v1 — les notifications arrivent même app fermée.
 *
 * Sans VITE_FIREBASE_VAPID_KEY (dev), tout est silencieusement désactivé :
 * le bouton "Activer les alertes" garde son comportement notifications locales.
 */

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined

const STORAGE_KEY = 'airmess-fcm-token'

// App Firebase dédiée au messaging : firebase.ts crée déjà l'app par défaut
// pour l'auth ; getMessaging veut une app — on réutilise la même config.
const firebaseConfig = {
  apiKey: 'AIzaSyCdjmZvpmbB3KQc6S9nf1mGMBjSjMwiG7o',
  authDomain: 'airmess-a3ff7.firebaseapp.com',
  projectId: 'airmess-a3ff7',
  storageBucket: 'airmess-a3ff7.firebasestorage.app',
  messagingSenderId: '52708255287',
  appId: '1:52708255287:web:e6fb9705bdf3d38a9141b2',
}

/**
 * À appeler quand la permission notifications est accordée et l'utilisateur
 * connecté. Idempotente : re-registre le token existant (met à jour last_seen_at).
 */
export async function enableWebPush(): Promise<boolean> {
  try {
    if (!VAPID_KEY) return false
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return false
    if (!(await isSupported())) return false

    // Le SW FCM doit être enregistré explicitement (scope dédié, cohabite avec
    // le SW Workbox de la PWA).
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
      scope: '/firebase-cloud-messaging-push-scope',
    })

    const app = initializeApp(firebaseConfig, 'messaging')
    const messaging = getMessaging(app)
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    })
    if (!token) return false

    await api.post('/device-tokens', { token, platform: 'web' })
    localStorage.setItem(STORAGE_KEY, token)
    return true
  } catch (err) {
    console.warn('[fcm] activation web push impossible :', err)
    return false
  }
}

/**
 * À appeler à la déconnexion : ce navigateur ne doit plus recevoir les
 * notifications du compte. Best-effort (le token invalide serait de toute
 * façon purgé côté API au premier envoi en échec).
 */
export async function disableWebPush(): Promise<void> {
  const token = localStorage.getItem(STORAGE_KEY)
  if (!token) return
  localStorage.removeItem(STORAGE_KEY)
  try {
    await api.delete('/device-tokens', { data: { token } })
  } catch {
    // ignore — logout local prioritaire
  }
}
