import api from './client'
import { WEB_BASE_URL } from '../lib/webUrl'

export interface TermsStatus {
  current_version: number
  accepted_version: number | null
  accepted_at: string | null
  needs_acceptance: boolean
}

export const MARCHANT_WEB_BASE_URL = WEB_BASE_URL
export const TERMS_URL = `${MARCHANT_WEB_BASE_URL}/legal/terms`
export const PRIVACY_URL = `${MARCHANT_WEB_BASE_URL}/legal/privacy`

export async function acceptTerms(): Promise<TermsStatus> {
  const { data } = await api.post<{ terms: TermsStatus }>('/auth/accept-terms')
  return data.terms
}

export async function fetchTermsStatus(): Promise<TermsStatus> {
  const { data } = await api.get<{ terms: TermsStatus }>('/auth/me')
  return data.terms
}
