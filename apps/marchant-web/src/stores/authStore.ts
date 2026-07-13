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
  /** Consentement CGU + politique confidentialité (checkbox obligatoire). */
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
  /** Consentement CGU + politique confidentialité (checkbox obligatoire). */
  accepted_terms: boolean
}

export interface RegisterDriverPayload {
  // Identité
  first_name: string
  last_name: string
  gender: 'M' | 'F' | 'autre'
  birth_date: string // YYYY-MM-DD
  // Auth
  email: string
  phone: string
  password: string
  password_confirmation: string
  // Véhicule
  vehicle_type: 'scooter' | 'moto' | 'voiture' | 'velo'
  vehicle_plate: string
  vehicle_color?: string
  // Documents
  photo: File | null // optionnel
  cni: File // requis
  driving_license: File | null // requis uniquement si vehicle_type === 'voiture'
  // Contact d'urgence
  emergency_contact_name: string
  emergency_contact_phone: string
  // Équipement (booléens optionnels)
  equipment_isothermal_bag?: boolean
  equipment_top_case?: boolean
  equipment_refrigerated_bag?: boolean
  /** Consentement CGU + politique confidentialité (checkbox obligatoire). */
  accepted_terms: boolean
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean

  login: (email: string, password: string) => Promise<void>
  registerIndividual: (payload: RegisterIndividualPayload) => Promise<void>
  registerMarchant: (payload: RegisterMarchantPayload) => Promise<void>
  registerDriver: (payload: RegisterDriverPayload) => Promise<void>
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

      // Inscription driver : POST multipart (3 documents), ne logue PAS le user dans marchant-web.
      // Le driver se connectera depuis l'app mobile une fois validé par l'admin.
      registerDriver: async (payload) => {
        const form = new FormData()
        // Champs texte
        form.append('first_name', payload.first_name)
        form.append('last_name', payload.last_name)
        form.append('gender', payload.gender)
        form.append('birth_date', payload.birth_date)
        form.append('email', payload.email)
        form.append('phone', payload.phone)
        form.append('password', payload.password)
        form.append('password_confirmation', payload.password_confirmation)
        form.append('vehicle_type', payload.vehicle_type)
        form.append('vehicle_plate', payload.vehicle_plate)
        if (payload.vehicle_color) form.append('vehicle_color', payload.vehicle_color)
        form.append('emergency_contact_name', payload.emergency_contact_name)
        form.append('emergency_contact_phone', payload.emergency_contact_phone)
        // Équipement (Laravel reconstruit l'objet equipment depuis equipment[xxx])
        form.append('equipment[isothermal_bag]',   payload.equipment_isothermal_bag   ? '1' : '0')
        form.append('equipment[top_case]',         payload.equipment_top_case         ? '1' : '0')
        form.append('equipment[refrigerated_bag]', payload.equipment_refrigerated_bag ? '1' : '0')
        // Fichiers
        if (payload.photo) form.append('photo', payload.photo)
        form.append('cni', payload.cni)
        // Permis : envoyé seulement s'il est fourni (voiture uniquement)
        if (payload.driving_license) form.append('driving_license', payload.driving_license)
        // Consentement CGU (checkbox obligatoire côté back)
        form.append('accepted_terms', payload.accepted_terms ? '1' : '0')

        await api.post('/auth/register/driver', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        // Pas de set() : le driver ne reste pas connecté côté web, il télécharge l'app mobile.
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
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
)
