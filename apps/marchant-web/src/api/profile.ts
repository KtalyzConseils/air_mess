import api from './client'
import type { Marchant, User } from '../types/auth'

export interface UpdateMarchantProfilePayload {
  name: string
  phone: string | null
  raison_sociale: string
  ifu_rccm: string | null
  secteur_activite: Marchant['secteur_activite']
}

export async function updateMarchantProfile(
  payload: UpdateMarchantProfilePayload,
): Promise<User> {
  const { data } = await api.patch('/profile/marchant', payload)
  return data.user
}
