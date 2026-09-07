/**
 * Base URL du site web AirMess, adaptée automatiquement au type de build.
 *
 * On se base sur EXPO_PUBLIC_API_BASE_URL (déjà switchée par le profil EAS
 * entre dev/preview/production, cf. eas.json) plutôt que sur une URL fixe :
 * un build de préprod ne doit jamais pointer un utilisateur vers le site prod.
 *
 *   prod  → https://api.airmess-logistics.com/api           → app.airmess-logistics.com
 *   dev   → https://dev.api.airmess-logistics.com/api       → dev.app.airmess-logistics.com
 *   local → http://10.0.2.2:8000/api (ou variante)          → dev.app.airmess-logistics.com
 *
 * Règle : "prod" UNIQUEMENT si l'URL API est exactement l'host prod (sans le
 * sous-domaine "dev."). Tout le reste tombe en dev — c'est la valeur safe
 * (jamais un build de dev ne renvoie vers le site prod par erreur).
 * Même logique que apps/driver-app/src/lib/signupUrl.ts — garder les deux alignés.
 */

const PROD_WEB_BASE = 'https://app.airmess-logistics.com'
const DEV_WEB_BASE = 'https://dev.app.airmess-logistics.com'
export const DRIVER_APK_URL =
  'https://expo.dev/artifacts/eas/oJPb6g6nH13FGy08U2lQ893OL-I52H0yNJ8AQRMIsZs.apk'

function getWebBase(): string {
  const apiUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? ''
  const isProdApi = /:\/\/api\.airmess-logistics\.com/i.test(apiUrl)
  return isProdApi ? PROD_WEB_BASE : DEV_WEB_BASE
}

export const WEB_BASE_URL = getWebBase()

export function getWebLoginUrl(): string {
  return `${WEB_BASE_URL}/login`
}

export function getDriverRegisterUrl(): string {
  return `${WEB_BASE_URL}/register/driver`
}
