import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import en from './locales/en'
import fr from './locales/fr'

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      fr: { translation: fr },
    },
    // English is the default and the fallback.
    fallbackLng: 'en',
    supportedLngs: ['en', 'fr'],
    // Respect a previously chosen language; otherwise default to English.
    detection: {
      order: ['localStorage'],
      lookupLocalStorage: 'rmess_lang',
      caches: ['localStorage'],
    },
    interpolation: { escapeValue: false },
  })

// Keep <html lang> in sync with the active language.
const applyHtmlLang = (lng: string) => {
  document.documentElement.lang = lng
}
applyHtmlLang(i18n.resolvedLanguage ?? 'en')
i18n.on('languageChanged', applyHtmlLang)

export default i18n
