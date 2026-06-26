import { useTranslation } from 'react-i18next'

type Props = { light?: boolean }

const langs = ['en', 'fr'] as const

export default function LanguageToggle({ light = false }: Props) {
  const { i18n, t } = useTranslation()
  const active = i18n.resolvedLanguage === 'fr' ? 'fr' : 'en'

  return (
    <div
      role="group"
      aria-label={t('lang.switch')}
      className={`inline-flex items-center rounded-full p-0.5 font-mono text-xs ${
        light ? 'bg-white/10' : 'bg-ink/5'
      }`}
    >
      {langs.map((lng) => {
        const isActive = lng === active
        return (
          <button
            key={lng}
            type="button"
            onClick={() => void i18n.changeLanguage(lng)}
            aria-pressed={isActive}
            className={`rounded-full px-2.5 py-1 transition-colors duration-200 ${
              isActive
                ? 'bg-yellow text-ink'
                : light
                  ? 'text-white/60 hover:text-white'
                  : 'text-muted hover:text-ink'
            }`}
          >
            {t(`lang.${lng}`)}
          </button>
        )
      })}
    </div>
  )
}
