import api from './client'
import type { LoginResponse, UserType } from '../types/auth'

export type QuickRegisterAccountType = Extract<UserType, 'marchant' | 'individual'>
export type VerificationChannel = 'phone' | 'email'

export interface SendQuickRegistrationCodePayload {
  account_type: QuickRegisterAccountType
  display_name: string
  email: string | null
  phone: string
  verification_channel: VerificationChannel
  phone_is_whatsapp: boolean
  accepted_terms: boolean
}

export interface SendQuickRegistrationCodeResponse {
  message: string
  expires_in: number
  debug_code?: string
}

export async function sendQuickRegistrationCode(
  payload: SendQuickRegistrationCodePayload,
): Promise<SendQuickRegistrationCodeResponse> {
  const { data } = await api.post<SendQuickRegistrationCodeResponse>('/auth/register/quick/send-code', payload)
  return data
}

export async function verifyQuickRegistration(phone: string, code: string): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>('/auth/register/quick/verify', { phone, code })
  return data
}
