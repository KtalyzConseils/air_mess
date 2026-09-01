import { create } from 'zustand'
import * as SecureStore from 'expo-secure-store'

export type AppLanguage = 'fr' | 'en'

const LANGUAGE_KEY = 'airmess_language'
const DEFAULT_LANGUAGE: AppLanguage = 'fr'

interface LanguageState {
  language: AppLanguage
  hydrated: boolean
  hydrate: () => Promise<void>
  setLanguage: (language: AppLanguage) => Promise<void>
}

function normalizeLanguage(value: string | null | undefined): AppLanguage {
  return value === 'en' ? 'en' : DEFAULT_LANGUAGE
}

export const useLanguageStore = create<LanguageState>((set) => ({
  language: DEFAULT_LANGUAGE,
  hydrated: false,

  hydrate: async () => {
    const saved = await SecureStore.getItemAsync(LANGUAGE_KEY).catch(() => null)
    set({ language: normalizeLanguage(saved), hydrated: true })
  },

  setLanguage: async (language) => {
    await SecureStore.setItemAsync(LANGUAGE_KEY, language)
    set({ language })
  },
}))

export function getCurrentLanguage(): AppLanguage {
  return useLanguageStore.getState().language
}
