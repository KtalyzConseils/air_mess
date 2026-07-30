/**
 * URL du formulaire d'inscription driver hébergé côté web.
 *
 * On redirige le bouton "Crée ton compte" du login vers le web plutôt que
 * l'écran natif : le natif existe encore (register.tsx) mais n'est plus
 * atteignable via le bouton — utile de le garder pour d'éventuels tests ou
 * deep-links, à coût zéro.
 *
 * Détection env : on se base sur EXPO_PUBLIC_API_BASE_URL (déjà switchée
 * automatiquement par le profil EAS entre dev/prod, cf. eas.json).
 *
 *   prod  → https://api.airmess-logistics.com/api           → app.airmess-logistics.com
 *   dev   → https://dev.api.airmess-logistics.com/api       → dev.app.airmess-logistics.com
 *   local → http://10.0.2.2:8000/api (ou variante)          → dev.app.airmess-logistics.com
 *
 * Règle : "prod" UNIQUEMENT si l'URL API est exactement l'host prod (sans
 * le sous-domaine "dev."). Tout le reste tombe en dev — c'est la valeur
 * safe (jamais on ne renvoie un dev vers le formulaire prod par erreur).
 */

const PROD_SIGNUP_URL = 'https://app.airmess-logistics.com/register/driver'
const DEV_SIGNUP_URL = 'https://dev.app.airmess-logistics.com/register/driver'

export function getSignupUrl(): string {
  const apiUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? ''
  const isProdApi = /:\/\/api\.airmess-logistics\.com/i.test(apiUrl)
  return isProdApi ? PROD_SIGNUP_URL : DEV_SIGNUP_URL
}
