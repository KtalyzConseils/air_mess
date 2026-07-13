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
 * Utilisé quand le store d'auth ne contient pas encore terms (édge case après reload).
 */
export async function fetchTermsStatus(): Promise<TermsStatus> {
  const { data } = await api.get<{ terms: TermsStatus }>('/auth/me')
  return data.terms
}
