import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '../types/auth'
import api from '../api/client'

export interface RegisterIndividualPayload {
  first_name: string
  last_name: string
  email: string
  phone: string
  password: string
  password_confirmation: string
  gender?: 'M' | 'F' | 'autre'
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
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean

  login: (email: string, password: string) => Promise<void>
  registerIndividual: (payload: RegisterIndividualPayload) => Promise<void>
  registerMarchant: (payload: RegisterMarchantPayload) => Promise<void>
  logout: () => Promise<void>
  fetchMe: () => Promise<void>
  setUser: (user: User) => void
}


export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: async (email, password) => {
        const { data } = await api.post('/auth/login', { email, password })
        localStorage.setItem('airmess_token', data.token)
        set({
          user: data.user,
          token: data.token,
          isAuthenticated: true,
        })
      },
      
      registerIndividual: async (payload) => {
        const { data } = await api.post('/auth/register/individual', payload)
        localStorage.setItem('airmess_token', data.token)
        set({ user: data.user, token: data.token, isAuthenticated: true })
      },

      registerMarchant: async (payload) => {
        const { data } = await api.post('/auth/register/marchant', payload)
        localStorage.setItem('airmess_token', data.token)
        set({ user: data.user, token: data.token, isAuthenticated: true })
      },


      logout: async () => {
        try {
          await api.post('/auth/logout')
        } catch {
          // ignore — on déconnecte localement de toute façon
        }
        localStorage.removeItem('airmess_token')
        set({ user: null, token: null, isAuthenticated: false })
      },

      fetchMe: async () => {
        const token = get().token ?? localStorage.getItem('airmess_token')
        if (!token) return
        try {
          const { data } = await api.get('/auth/me')
          set({ user: data.user, isAuthenticated: true })
        } catch {
          set({ user: null, token: null, isAuthenticated: false })
        }
      },

      setUser: (user) => set({ user }),
    }),
    {
      name: 'airmess-auth',
      partialize: (state) => ({ token: state.token, user: state.user }),
    },
  ),
)
