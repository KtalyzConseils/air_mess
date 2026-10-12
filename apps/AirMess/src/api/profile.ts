import api from './client'
import type { Marchant, User } from '../types/auth'

export interface UpdateMarchantProfilePayload {
  name: string
  phone: string | null
  raison_sociale: string
  ifu_rccm: string | null
  secteur_activite: Marchant['secteur_activite']
}

export async function updateMarchantProfile(payload: UpdateMarchantProfilePayload): Promise<User> {
  const { data } = await api.patch<{ user: User }>('/profile/marchant', payload)
  return data.user
}

export interface UpdateIndividualProfilePayload {
  name: string
  phone: string | null
}

export async function updateIndividualProfile(payload: UpdateIndividualProfilePayload): Promise<User> {
  const { data } = await api.patch<{ user: User }>('/profile/individual', payload)
  return data.user
}

export interface SetWebAccessPayload {
  email: string
  password: string
  password_confirmation: string
}

export async function setWebAccess(payload: SetWebAccessPayload): Promise<User> {
  const { data } = await api.post<{ user: User }>('/profile/web-access', payload)
  return data.user
}

export interface ChangePasswordPayload {
  current_password: string
  password: string
  password_confirmation: string
}

/**
 * Change le mot de passe du compte connecte. Le mot de passe actuel est exige
 * par l'API ; les autres sessions sont fermees au passage.
 */
export async function changePassword(payload: ChangePasswordPayload): Promise<void> {
  await api.post('/auth/password/change', payload)
}

/**
 * Demande de reinitialisation du mot de passe (ecran "Mot de passe oublie").
 *
 * L'API repond toujours la meme chose, qu'un compte existe ou non : le message
 * affiche ne doit donc jamais laisser croire que l'adresse est inconnue.
 * Pour un marchand ou un particulier, le lien recu par email ouvre la page web
 * de reinitialisation.
 */
export async function forgotPassword(email: string): Promise<{ message: string }> {
  const { data } = await api.post<{ message: string }>('/auth/password/forgot', { email })
  return data
}

export async function deleteAccount(): Promise<void> {
  await api.delete('/auth/me')
}
