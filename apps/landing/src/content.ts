import { useTranslation } from 'react-i18next'
import en, { type Translation } from './locales/en'
import fr from './locales/fr'

const dictionaries: Record<string, Translation> = { en, fr }

/**
 * Returns the active, fully-typed translation object.
 * Using the object directly (instead of t('a.b.c')) keeps nested arrays
 * type-safe and re-renders on language change via useTranslation().
 */
export function useContent(): Translation {
  const { i18n } = useTranslation()
  return dictionaries[i18n.resolvedLanguage ?? 'en'] ?? en
}
