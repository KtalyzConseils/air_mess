import { create } from 'zustand'
import * as SecureStore from 'expo-secure-store'
import api from '../api/client'
import {
  sendQuickRegistrationCode,
  verifyQuickRegistration,
  type SendQuickRegistrationCodePayload,
  type SendQuickRegistrationCodeResponse,
} from '../api/register'
import type { LoginResponse, User } from '../types/auth'

interface AuthState {
  user: User | null
  token: string | null
  hydrated: boolean
  login: (email: string, password: string) => Promise<void>
  sendQuickRegistrationCode: (payload: SendQuickRegistrationCodePayload) => Promise<SendQuickRegistrationCodeResponse>
  verifyQuickRegistration: (phone: string, code: string) => Promise<void>
  logout: () => Promise<void>
  hydrate: () => Promise<void>
  refreshUser: () => Promise<void>
  setUser: (user: User) => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  hydrated: false,

  setUser: (user) => set({ user }),

  login: async (email, password) => {
    const { data } = await api.post<LoginResponse>('/auth/login', { email, password })

    if (data.user?.type !== 'marchant' && data.user?.type !== 'individual') {
      throw new Error('Ce compte n est pas un compte marchand ou particulier.')
    }

    await SecureStore.setItemAsync('airmess_token', data.token)
    set({ user: data.user, token: data.token })
  },

  sendQuickRegistrationCode,

  refreshUser: async () => {
    const token = get().token ?? (await SecureStore.getItemAsync('airmess_token'))
    if (!token) return

    const { data } = await api.get<{ user: User }>('/auth/me')
    if (data.user?.type === 'marchant' || data.user?.type === 'individual') {
      set({ user: data.user, token })
      return
    }
    throw new Error('Ce compte n est pas un compte marchand ou particulier.')
  },

  verifyQuickRegistration: async (phone, code) => {
    const data = await verifyQuickRegistration(phone, code)

    if (data.user?.type !== 'marchant' && data.user?.type !== 'individual') {
      throw new Error('Ce compte n est pas un compte marchand ou particulier.')
    }

    await SecureStore.setItemAsync('airmess_token', data.token)
    set({ user: data.user, token: data.token })
  },

  logout: async () => {
    const prevToken = get().token
    const auth = prevToken ? { headers: { Authorization: `Bearer ${prevToken}` } } : {}

    try {
      await api.post('/auth/logout', {}, auth)
    } catch {
      // Logout local meme si le serveur est indisponible.
    }

    await SecureStore.deleteItemAsync('airmess_token').catch(() => {})
    set({ user: null, token: null })
  },

  hydrate: async () => {
    const token = await SecureStore.getItemAsync('airmess_token')
    if (token) {
      try {
        await get().refreshUser()
        set({ hydrated: true })
        return
      } catch {
        // Token invalide ou API indisponible au demarrage.
      }
      await SecureStore.deleteItemAsync('airmess_token').catch(() => {})
    }
    set({ user: null, token: null, hydrated: true })
  },
}))
