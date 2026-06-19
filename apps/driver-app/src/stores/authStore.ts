import { create } from 'zustand'
import * as SecureStore from 'expo-secure-store'
import api from '../api/client'
import type { User } from '../types/auth'

interface AuthState {
  user: User | null
  token: string | null
  hydrated: boolean

  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  hydrate: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  hydrated: false,

  login: async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password })
    if (data.user?.type !== 'driver') {
      throw new Error('Compte non-livreur. Utilisez l\'application RMess Marchand.')
    }
    await SecureStore.setItemAsync('airmess_token', data.token)
    set({ user: data.user, token: data.token })
  },

  logout: async () => {
    try { await api.post('/auth/logout') } catch { /* ignore */ }
    await SecureStore.deleteItemAsync('airmess_token')
    set({ user: null, token: null })
  },

  hydrate: async () => {
    const token = await SecureStore.getItemAsync('airmess_token')
    if (token) {
      try {
        const { data } = await api.get('/auth/me')
        set({ user: data.user, token, hydrated: true })
        return
      } catch {
        await SecureStore.deleteItemAsync('airmess_token')
      }
    }
    set({ hydrated: true })
  },
}))
