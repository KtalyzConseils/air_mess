import api from './client'
import type { LoginResponse } from '../types/auth'

export interface SendLoginCodeResponse {
  message: string
  expires_in: number
  debug_code?: string
}

export async function sendLoginCode(phone: string): Promise<SendLoginCodeResponse> {
  const { data } = await api.post<SendLoginCodeResponse>('/auth/login/sms/send', { phone })
  return data
}

export async function verifyLoginCode(phone: string, code: string): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>('/auth/login/sms/verify', { phone, code })
  return data
}
