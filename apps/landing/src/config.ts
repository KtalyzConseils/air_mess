/**
 * Central place for outbound links to the AirMess app (marchant-web).
 * The base URL is injected at build time via VITE_APP_URL (see .env.example).
 * Falls back to localhost so `npm run dev` works without configuration.
 */
// Use VITE_APP_URL when provided AND non-empty; otherwise fall back.
// (An empty string from a misconfigured build arg must NOT produce relative links.)
const RAW = (import.meta.env.VITE_APP_URL ?? '').trim()
const FALLBACK = import.meta.env.DEV ? 'http://localhost:5173' : 'https://app.airmess-logistics.com'
const APP_URL = (RAW || FALLBACK).replace(/\/$/, '')

export const links = {
  app: APP_URL,
  login: `${APP_URL}/login`,
  registerSender: `${APP_URL}/register`,
  registerDriver: `${APP_URL}/register/driver`,
  // Direct download of the courier (driver) Android app build (Expo).
  driverApp:
    'https://expo.dev/accounts/ktalyzconseils/projects/driver-app/builds/dbb5f333-0f0e-4d53-a0e1-27c733396470',
} as const

export const contact = {
  email: 'contact@rmess.app',
  phone: '+229 94 18 07 94',
  // WhatsApp number in international format (no +), used to build wa.me links.
  whatsapp: '22994180794',
} as const

/** Build a wa.me link with a pre-filled message. */
export function whatsappLink(message: string) {
  return `https://wa.me/${contact.whatsapp}?text=${encodeURIComponent(message)}`
}
