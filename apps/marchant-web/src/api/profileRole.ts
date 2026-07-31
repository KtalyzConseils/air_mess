import api from './client'
import type { Marchant, User } from '../types/auth'

export interface AddMarchantRolePayload {
  raison_sociale: string
  ifu_rccm?: string | null
  secteur_activite:
    | 'supermarche'
    | 'restaurant'
    | 'boutique'
    | 'pharmacie'
    | 'ecommerce'
    | 'autre'
}

export interface AddMarchantRoleResponse {
  message: string
  marchant: Marchant
  user: User
}

export async function addMarchantRole(
  payload: AddMarchantRolePayload,
): Promise<AddMarchantRoleResponse> {
  const { data } = await api.post<AddMarchantRoleResponse>(
    '/profile/add-role/marchant',
    payload,
  )
  return data
}
