import api from './client'
import type { Driver, Marchant, User } from '../types/auth'

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

export interface AddDriverRolePayload {
  first_name: string
  last_name: string
  gender?: 'M' | 'F' | 'autre' | ''
  birth_date?: string
  vehicle_type: 'scooter' | 'moto' | 'voiture' | 'velo'
  vehicle_plate: string
  vehicle_brand?: string | null
  emergency_contact_name: string
  emergency_contact_phone: string
  emergency_contact2_name?: string | null
  emergency_contact2_phone?: string | null
  preferred_response_channel?: 'email' | 'sms' | 'whatsapp' | null
  equipment?: {
    isothermal_bag?: boolean
    top_case?: boolean
    refrigerated_bag?: boolean
  }
}

export interface AddDriverRoleResponse {
  message: string
  driver: Driver
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

export async function addDriverRole(
  payload: AddDriverRolePayload,
): Promise<AddDriverRoleResponse> {
  const { data } = await api.post<AddDriverRoleResponse>(
    '/profile/add-role/driver',
    payload,
  )
  return data
}
