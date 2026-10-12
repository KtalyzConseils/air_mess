import { create } from 'zustand'
import api from '../api/client'
import {
  registerIndividual,
  registerMarchant,
  sendRegistrationEmailCode,
  type RegisterIndividualPayload,
  type RegisterMarchantPayload,
  type SendRegistrationCodeResponse,
} from '../api/register'
import type { User } from '../types/auth'
import { unregisterPushNotifications } from '../lib/notifications'
import { deleteAuthToken, getAuthToken, setAuthToken } from '../utils/authStorage'

const NOT_ALLOWED_ACCOUNT = 'Ce compte n est pas un compte marchand ou particulier.'

interface AuthState {
  user: User | null
  token: string | null
  hydrated: boolean
  login: (email: string, password: string) => Promise<void>
  sendRegistrationEmailCode: (email: string, displayName?: string) => Promise<SendRegistrationCodeResponse>
  registerMarchant: (payload: RegisterMarchantPayload) => Promise<void>
  registerIndividual: (payload: RegisterIndividualPayload) => Promise<void>
  logout: () => Promise<void>
  hydrate: () => Promise<void>
  refreshUser: () => Promise<void>
  setUser: (user: User) => void
}

/**
 * L'app marchand n'accepte que les comptes `marchant` et `individual` :
 * livreurs et admins se connectent ailleurs. Un jeton emis pour un autre
 * type de compte n'est jamais stocke.
 */
function assertAllowedAccount(user: User | undefined): void {
  if (user?.type !== 'marchant' && user?.type !== 'individual') {
    throw new Error(NOT_ALLOWED_ACCOUNT)
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  hydrated: false,

  setUser: (user) => set({ user }),

  sendRegistrationEmailCode,

  /**
   * Connexion par email + mot de passe (meme contrat que l'app livreur :
   * POST /auth/login). Remplace l'ancienne connexion par telephone + OTP.
   */
  login: async (email, password) => {
    const { data } = await api.post<{ user: User; token: string }>('/auth/login', {
      email: email.trim(),
      password,
    })
    assertAllowedAccount(data.user)
    await setAuthToken(data.token)
    set({ user: data.user, token: data.token })
  },

  registerMarchant: async (payload) => {
    const data = await registerMarchant(payload)
    assertAllowedAccount(data.user)
    await setAuthToken(data.token)
    set({ user: data.user, token: data.token })
  },

  registerIndividual: async (payload) => {
    const data = await registerIndividual(payload)
    assertAllowedAccount(data.user)
    await setAuthToken(data.token)
    set({ user: data.user, token: data.token })
  },

  refreshUser: async () => {
    const token = get().token ?? (await getAuthToken())
    if (!token) return

    const { data } = await api.get<{ user: User }>('/auth/me')
    assertAllowedAccount(data.user)
    set({ user: data.user, token })
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
        await get().refreshUser()
        set({ hydrated: true })
        return
      } catch {
        // Token invalide ou API indisponible au demarrage.
      }
      await deleteAuthToken().catch(() => {})
    }
    set({ user: null, token: null, hydrated: true })
  },
}))
