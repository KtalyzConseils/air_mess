/**
 * Central place for outbound links to the AirMess app (marchant-web).
 * The base URL is injected at build time via VITE_APP_URL (see .env.example).
 * Falls back to localhost so `npm run dev` works without configuration.
 */
const APP_URL = (import.meta.env.VITE_APP_URL ?? 'http://localhost:5173').replace(/\/$/, '')

export const links = {
  app: APP_URL,
  login: `${APP_URL}/login`,
  registerSender: `${APP_URL}/register`,
  registerDriver: `${APP_URL}/register/driver`,
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
