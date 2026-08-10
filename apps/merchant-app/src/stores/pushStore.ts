import { create } from 'zustand'

/**
 * État de l'enregistrement push du device, partagé entre le hook qui
 * l'effectue (_layout) et l'écran Profil qui l'affiche.
 */
export type PushStatus =
  | 'pending'
  | 'registered'
  | 'expo_go'
  | 'denied'
  | 'no_device'
  | 'no_project_id'
  | 'error'

export interface PushState {
  status: PushStatus
  detail: string | null
  /** Incrémenté par `retry()` : le hook le surveille pour relancer une tentative. */
  attempt: number
  setStatus: (status: PushStatus, detail?: string | null) => void
  retry: () => void
}

export const usePushStore = create<PushState>((set: any) => ({
  status: 'pending',
  detail: null,
  attempt: 0,
  setStatus: (status: PushStatus, detail: string | null = null) => set({ status, detail }),
  retry: () => set((s: PushState) => ({ attempt: s.attempt + 1, status: 'pending', detail: null })),
}))

/** Libellé court affichable, par état. */
export function pushStatusLabel(status: PushStatus): string {
  switch (status) {
    case 'registered':
      return 'Notifications activées'
    case 'denied':
      return 'Notifications bloquées'
    case 'expo_go':
      return 'Indisponible en Expo Go'
    case 'no_device':
      return 'Indisponible sur émulateur'
    case 'no_project_id':
      return 'Configuration push incomplète'
    case 'error':
      return 'Notifications indisponibles'
    default:
      return 'Vérification…'
  }
}
