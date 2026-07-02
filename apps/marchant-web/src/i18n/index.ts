import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import fr from './locales/fr.json'
import en from './locales/en.json'

/**
 * i18n config de l'app marchand/particulier.
 *
 * - Namespaces = top-level keys des fichiers JSON (common, nav, header, …).
 *   On utilise le namespace par défaut `translation` et on adresse via les
 *   clés imbriquées (`t('nav.dashboard')`), plus simple à setup qu'un
 *   namespace par fichier.
 *
 * - Détection : uiPrefsStore.locale (persisté) > localStorage > navigator.
 *   Fallback fr si rien de tout ça ne colle.
 *
 * - `interpolation.escapeValue: false` : React échappe déjà les XSS.
 *
 * Le store `uiPrefsStore` est la source de vérité UI ; ce module ne fait
 * qu'écouter au setup et laisser React re-render via `useTranslation`.
 */

export const SUPPORTED_LOCALES = ['fr', 'en'] as const
export type Locale = (typeof SUPPORTED_LOCALES)[number]

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      fr: { translation: fr },
      en: { translation: en },
    },
    fallbackLng: 'fr',
    supportedLngs: SUPPORTED_LOCALES,
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'airmess.locale',
      caches: ['localStorage'],
    },
    returnNull: false,
  })

export default i18n
