import api from './client'
import type { LoginResponse, UserType } from '../types/auth'

export type RegisterAccountType = Extract<UserType, 'marchant' | 'individual'>

/** Secteurs d'activite acceptes par l'API (meme liste que la web marchand). */
export const SECTEURS_ACTIVITE = [
  'supermarche',
  'restaurant',
  'boutique',
  'pharmacie',
  'ecommerce',
  'autre',
] as const

export type SecteurActivite = (typeof SECTEURS_ACTIVITE)[number]

export interface SendRegistrationCodeResponse {
  message: string
  expires_in: number
}

/**
 * Envoie le code de confirmation par email — utilisé par l'inscription
 * particulier uniquement : le marchand s'inscrit sans vérification email (D-07).
 */
export async function sendRegistrationEmailCode(
  email: string,
  displayName?: string,
): Promise<SendRegistrationCodeResponse> {
  const { data } = await api.post<SendRegistrationCodeResponse>('/auth/register/email/send-code', {
    email: email.trim(),
    display_name: displayName?.trim() || undefined,
  })
  return data
}

export interface RegisterMarchantPayload {
  name: string
  email: string
  phone: string
  password: string
  password_confirmation: string
  raison_sociale: string
  secteur_activite: SecteurActivite
  ifu_rccm?: string
  /** Plus exigé pour un marchand (D-07) : le champ n'est plus envoyé. */
  email_code?: string
  accepted_terms: boolean
}

export interface RegisterIndividualPayload {
  first_name: string
  last_name: string
  email: string
  phone: string
  password: string
  password_confirmation: string
  email_code: string
  accepted_terms: boolean
}

export async function registerMarchant(payload: RegisterMarchantPayload): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>('/auth/register/marchant', payload)
  return data
}

export async function registerIndividual(payload: RegisterIndividualPayload): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>('/auth/register/individual', payload)
  return data
}
