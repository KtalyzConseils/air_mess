import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Préférences UI persistées dans localStorage, propagées via Zustand.
 *
 * Deux contextes distincts :
 *  - `navMode`       : navigation admin (sidebar + FAB)
 *  - `clientNavMode` : navigation marchand/particulier (header horizontal + FAB)
 *
 * Stockés dans un seul store pour rester sous la même clé localStorage,
 * mais sémantiquement indépendants.
 */
export type NavMode = 'both' | 'sidebar' | 'fab'
export type ClientNavMode = 'horizontal' | 'fab'

interface UiPrefsState {
  navMode: NavMode
  setNavMode: (mode: NavMode) => void
  clientNavMode: ClientNavMode
  setClientNavMode: (mode: ClientNavMode) => void
}

export const useUiPrefsStore = create<UiPrefsState>()(
  persist(
    (set) => ({
      navMode: 'both',
      setNavMode: (mode) => set({ navMode: mode }),
      clientNavMode: 'horizontal',
      setClientNavMode: (mode) => set({ clientNavMode: mode }),
    }),
    {
      name: 'admin.ui.prefs',
      version: 2,
    },
  ),
)
