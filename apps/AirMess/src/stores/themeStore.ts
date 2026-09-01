import { create } from 'zustand'
import * as SecureStore from 'expo-secure-store'
import { colorScheme } from 'nativewind'

export type AppTheme = 'light' | 'dark'

const THEME_KEY = 'airmess_theme'

interface ThemeState {
  theme: AppTheme
  hydrated: boolean
  hydrate: () => Promise<void>
  setTheme: (theme: AppTheme) => Promise<void>
  toggleTheme: () => Promise<void>
}

function normalizeTheme(value: string | null | undefined): AppTheme {
  return value === 'dark' ? 'dark' : 'light'
}

function applyTheme(theme: AppTheme) {
  colorScheme.set(theme)
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: 'light',
  hydrated: false,

  hydrate: async () => {
    const saved = await SecureStore.getItemAsync(THEME_KEY).catch(() => null)
    const theme = normalizeTheme(saved)
    applyTheme(theme)
    set({ theme, hydrated: true })
  },

  setTheme: async (theme) => {
    await SecureStore.setItemAsync(THEME_KEY, theme)
    applyTheme(theme)
    set({ theme })
  },

  toggleTheme: async () => {
    await get().setTheme(get().theme === 'dark' ? 'light' : 'dark')
  },
}))
