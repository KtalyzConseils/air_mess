import { create } from 'zustand'
import api from '../api/client'
import type { User } from '../types/auth'
import { isClientUser } from '../types/auth'
import { deleteSecureItem, getSecureItem, setSecureItem } from '../lib/tokenStorage'

export interface RegisterIndividualPayload {
  first_name: string
  last_name: string
  email: string
  phone: string
  password: string
  password_confirmation: string
  gender?: 'M' | 'F' | 'autre'
  /** Optionnel tant que l’OTP est retiré du formulaire mobile. */
  firebase_id_token?: string
  firebase_google_id_token?: string
  accepted_terms: boolean
}

export interface RegisterMarchantPayload {
  name: string
  email: string
  phone: string
  password: string
  password_confirmation: string
  raison_sociale: string
  ifu_rccm?: string
  secteur_activite: 'supermarche' | 'restaurant' | 'boutique' | 'pharmacie' | 'ecommerce' | 'autre'
  /** Optionnel tant que l’OTP est retiré du formulaire mobile. */
  firebase_id_token?: string
  firebase_google_id_token?: string
  accepted_terms: boolean
}
export interface UpdateProfilePayload {
  name?: string
  first_name?: string
  last_name?: string
  email: string
  phone: string
}
interface AuthState {
  user: User | null
  token: string | null
  hydrated: boolean

  login: (email: string, password: string) => Promise<void>
  registerIndividual: (payload: RegisterIndividualPayload) => Promise<void>
  registerMarchant: (payload: RegisterMarchantPayload) => Promise<void>
  updateProfile: (payload: UpdateProfilePayload) => Promise<void>
  logout: () => Promise<void>
  hydrate: () => Promise<void>
}

async function persistSession(user: User, token: string, set: (s: Partial<AuthState>) => void) {
  await setSecureItem('airmess_token', token)
  set({ user, token })
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  hydrated: false,

  login: async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password })
    if (!isClientUser(data.user?.type)) {
      throw new Error('Compte livreur ou admin. Utilisez l’application dédiée.')
    }
    await persistSession(data.user, data.token, set)
  },

  registerIndividual: async (payload) => {
    const { data } = await api.post('/auth/register/individual', payload)
    await persistSession(data.user, data.token, set)
  },

  registerMarchant: async (payload) => {
    const { data } = await api.post('/auth/register/marchant', payload)
    await persistSession(data.user, data.token, set)
  },

  updateProfile: async (payload) => {
    const auth = { headers: { Authorization: `Bearer ${get().token}` } }
    const { data } = await api.post('/auth/profile', payload, auth)
    // Mettre à jour l'utilisateur dans l'état avec les données retournées
    const updatedUser = { ...get().user, ...data.user }
    set({ user: updatedUser })
  },

  logout: async () => {
    const prevToken = get().token
    const auth = prevToken ? { headers: { Authorization: `Bearer ${prevToken}` } } : {}

    try {
      const pushToken = await getSecureItem('airmess_push_token')
      if (pushToken) {
        await api.delete('/device-tokens', { data: { token: pushToken }, ...auth })
      }
    } catch {
      /* ignore */
    }

    try {
      await api.post('/auth/logout', {}, auth)
    } catch {
      /* ignore */
    }

    await deleteSecureItem('airmess_token')
    await deleteSecureItem('airmess_push_token')
    set({ user: null, token: null })
  },

  hydrate: async () => {
    const token = await getSecureItem('airmess_token')
    if (token) {
      try {
        const { data } = await api.get('/auth/me')
        if (!isClientUser(data.user?.type)) {
          await deleteSecureItem('airmess_token')
          set({ hydrated: true })
          return
        }
        set({ user: data.user, token, hydrated: true })
        return
      } catch {
        await deleteSecureItem('airmess_token')
      }
    }
    set({ hydrated: true })
  },
}))
