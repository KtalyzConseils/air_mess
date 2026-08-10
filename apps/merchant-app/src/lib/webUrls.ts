/**
 * Base publique de marchant-web (pages légales, page de suivi du colis).
 * Surchargée par profil de build EAS : `dev.app.…` en preview-dev, `app.…` en prod.
 *
 * Filet anti-dérive : si WEB_BASE_URL est absent et que l'API est en `dev.api.`,
 * on dérive `dev.app.` pour éviter de partager un lien prod depuis un build local dev.
 */
function resolveWebBaseUrl(): string {
  const explicit = process.env.EXPO_PUBLIC_WEB_BASE_URL?.trim()
  if (explicit) return explicit.replace(/\/+$/, '')

  const api = process.env.EXPO_PUBLIC_API_BASE_URL ?? ''
  if (api.includes('dev.api.')) {
    return 'https://dev.app.airmess-logistics.com'
  }
  return 'https://app.airmess-logistics.com'
}

export const WEB_BASE_URL = resolveWebBaseUrl()

/**
 * Page publique de suivi partagée au destinataire.
 * Ex. https://dev.app.airmess-logistics.com/t/<token>
 */
export function trackingUrl(token: string): string {
  return `${WEB_BASE_URL}/t/${token}`
}
