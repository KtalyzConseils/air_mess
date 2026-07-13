import { create } from 'zustand'
import * as SecureStore from 'expo-secure-store'
import api from '../api/client'
import type { User } from '../types/auth'
import { stopLocationTracking } from '../lib/locationTask'

interface AuthState {
  user: User | null
  token: string | null
  hydrated: boolean

  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  hydrate: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
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
    // Nettoyage PAR APPAREIL, attendu (le bouton affiche un loader pendant ce temps, puis
    // la page de login apparaît). On NE touche PAS à la disponibilité : elle est partagée
    // entre les appareils du même livreur.
    const prevToken = get().token
    const auth = prevToken ? { headers: { Authorization: `Bearer ${prevToken}` } } : {}

    // Token push lu depuis SecureStore (rapide) — enregistré à l'inscription du device.
    // Évite getExpoPushTokenAsync (appel réseau lent qui gelait le bouton).
    try {
      const pushToken = await SecureStore.getItemAsync('airmess_push_token')
      if (pushToken) {
        await api.delete('/device-tokens', { data: { token: pushToken }, ...auth })
      }
    } catch { /* endpoint absent / réseau : ignore */ }

    try { await stopLocationTracking() } catch { /* ignore */ }
    try { await api.post('/auth/logout', {}, auth) } catch { /* ignore */ }

    await SecureStore.deleteItemAsync('airmess_token').catch(() => {})
    await SecureStore.deleteItemAsync('airmess_push_token').catch(() => {})
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
