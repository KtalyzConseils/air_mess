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
    // French is the primary market language and the fallback.
    fallbackLng: 'fr',
    supportedLngs: ['en', 'fr'],
    // Respect a previously chosen language; otherwise follow the browser and French.
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'rmess_lang',
      caches: ['localStorage'],
    },
    interpolation: { escapeValue: false },
  })

// Keep <html lang> in sync with the active language.
const applyHtmlLang = (lng: string) => {
  document.documentElement.lang = lng
}
applyHtmlLang(i18n.resolvedLanguage ?? 'fr')
i18n.on('languageChanged', applyHtmlLang)

export default i18n
