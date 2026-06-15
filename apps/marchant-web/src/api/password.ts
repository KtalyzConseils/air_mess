import api from './client'

export async function forgotPassword(email: string): Promise<{ message: string }> {
  const { data } = await api.post<{ message: string }>('/auth/password/forgot', { email })
  return data
}

export async function resetPassword(payload: {
  email: string
  token: string
  password: string
  password_confirmation: string
}): Promise<{ message: string }> {
  const { data } = await api.post<{ message: string }>('/auth/password/reset', payload)
  return data
}
