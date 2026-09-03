import { isAxiosError } from 'axios'
import type { AppLanguage } from '../stores/languageStore'

const FALLBACK = { fr: 'Action impossible.', en: 'Action failed.' }
const NETWORK_TIMEOUT = {
  fr: 'Le serveur met trop de temps a repondre. Reessaie.',
  en: 'The server is taking too long to respond. Try again.',
}
const NETWORK_OFFLINE = {
  fr: 'Impossible de joindre le serveur. Verifie ta connexion internet.',
  en: 'Unable to reach the server. Check your internet connection.',
}

/**
 * Message d'erreur API pret a afficher. Les messages renvoyes par le backend
 * (validation, 4xx) restent en francais (pas encore localises cote API) —
 * seuls les cas reseau/generiques (pas de reponse serveur, erreur inconnue)
 * sont traduits selon la langue de l'app.
 */
export function getApiErrorMessage(error: unknown, language: AppLanguage = 'fr'): string {
  if (isAxiosError(error)) {
    if (!error.response) {
      return error.code === 'ECONNABORTED' ? NETWORK_TIMEOUT[language] : NETWORK_OFFLINE[language]
    }
    const data = error.response.data as { message?: string; errors?: Record<string, string[]> } | undefined
    return data?.message ?? Object.values(data?.errors ?? {})[0]?.[0] ?? `${language === 'fr' ? 'Erreur serveur' : 'Server error'} (${error.response.status}).`
  }
  return error instanceof Error ? error.message : FALLBACK[language]
}
