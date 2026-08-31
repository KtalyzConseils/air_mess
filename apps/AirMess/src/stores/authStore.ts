import { create } from 'zustand'
import api from '../api/client'
import type { LoginResponse, User } from '../types/auth'
import { unregisterPushNotifications } from '../lib/notifications'
import { deleteAuthToken, getAuthToken, setAuthToken } from '../utils/authStorage'

interface AuthState {
  user: User | null
  token: string | null
  hydrated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  hydrate: () => Promise<void>
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

    await setAuthToken(data.token)
    set({ user: data.user, token: data.token })
  },

  logout: async () => {
    const prevToken = get().token
    const auth = prevToken ? { headers: { Authorization: `Bearer ${prevToken}` } } : {}

    await unregisterPushNotifications().catch(() => undefined)

    try {
      await api.post('/auth/logout', {}, auth)
    } catch {
      // Logout local meme si le serveur est indisponible.
    }

    await deleteAuthToken().catch(() => {})
    set({ user: null, token: null })
  },

  hydrate: async () => {
    const token = await getAuthToken()
    if (token) {
      try {
        const { data } = await api.get<{ user: User }>('/auth/me')
        if (data.user?.type === 'marchant' || data.user?.type === 'individual') {
          set({ user: data.user, token, hydrated: true })
          return
        }
      } catch {
        // Token invalide ou API indisponible au demarrage.
      }
      await deleteAuthToken().catch(() => {})
    }
    set({ user: null, token: null, hydrated: true })
  },
}))
