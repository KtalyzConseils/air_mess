import api from './client'

/**
 * Miroir exact des endpoints web marchant (apps/marchant-web/src/api/password.ts).
 * Le back Laravel expose les 2 mêmes routes publiques ; c'est le canal email qui
 * différencie ensuite le rendu (marchand → page web, driver → deep-link app, cf.
 * étape 2 à venir).
 */

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
