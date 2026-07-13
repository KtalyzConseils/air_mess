import api from './client'

export interface TermsStatus {
  /** Version courante des CGU (constante côté back, bumpée à chaque évolution). */
  current_version: number
  /** Version que l'utilisateur a acceptée, ou null s'il n'a jamais accepté. */
  accepted_version: number | null
  /** Timestamp ISO de l'acceptation, ou null. */
  accepted_at: string | null
  /** L'utilisateur doit-il (re)voir la modale bloquante ? */
  needs_acceptance: boolean
}

/** URL publique des pages légales (marchant-web) affichées au driver. */
export const MARCHANT_WEB_BASE_URL = 'https://app.airmess-logistics.com'
export const TERMS_URL   = `${MARCHANT_WEB_BASE_URL}/legal/terms`
export const PRIVACY_URL = `${MARCHANT_WEB_BASE_URL}/legal/privacy`

/**
 * Enregistre l'acceptation des CGU + politique de confidentialité par
 * l'utilisateur connecté. Retourne le nouveau statut (needs_acceptance=false).
 */
export async function acceptTerms(): Promise<TermsStatus> {
  const { data } = await api.post<{ terms: TermsStatus }>('/auth/accept-terms')
  return data.terms
}

/**
 * Récupère le statut d'acceptation courant (retourné en même temps que /auth/me).
 */
export async function fetchTermsStatus(): Promise<TermsStatus> {
  const { data } = await api.get<{ terms: TermsStatus }>('/auth/me')
  return data.terms
}
