import { useTranslation } from 'react-i18next'
import { GlobeIcon } from './icons'
import type { Locale } from '../../i18n'

/**
 * Segmented FR / EN.
 * Utilisé sur les pages publiques (login/register/forgot/reset) où l'utilisateur
 * n'a pas encore accès au UserMenu, et dans le header admin.
 *
 * `variant='light'`  → fond clair (pages d'auth cream, admin header cream)
 * `variant='dark'`   → fond sombre (le fond airmess-dark)
 */
export default function LanguageToggle({
  variant = 'light',
  showIcon = true,
}: {
  variant?: 'light' | 'dark'
  showIcon?: boolean
}) {
  const { i18n } = useTranslation()
  const current = (i18n.resolvedLanguage ?? 'fr') as Locale

  const wrapperCls =
    variant === 'dark'
      ? 'inline-flex items-center gap-2 rounded-full border border-warm-600/40 bg-airmess-dark/40 text-cream px-1.5 py-1 text-xs'
      : 'inline-flex items-center gap-2 rounded-full border border-warm-300 bg-off-white text-warm-700 px-1.5 py-1 text-xs'

  return (
    <div className={wrapperCls} role="group" aria-label="Language">
      {showIcon && <GlobeIcon size={13} />}
      <LangButton code="fr" current={current} variant={variant} onSelect={(c) => void i18n.changeLanguage(c)}>
        FR
      </LangButton>
      <LangButton code="en" current={current} variant={variant} onSelect={(c) => void i18n.changeLanguage(c)}>
        EN
      </LangButton>
    </div>
  )
}

function LangButton({
  code,
  current,
  variant,
  onSelect,
  children,
}: {
  code: Locale
  current: Locale
  variant: 'light' | 'dark'
  onSelect: (code: Locale) => void
  children: React.ReactNode
}) {
  const active = current === code
  const activeCls = variant === 'dark' ? 'bg-airmess-yellow text-ink' : 'bg-airmess-dark text-cream'
  const idleCls = variant === 'dark' ? 'text-warm-300 hover:text-cream' : 'text-warm-500 hover:text-ink'
  return (
    <button
      type="button"
      onClick={() => onSelect(code)}
      aria-pressed={active}
      className={['rounded-full px-2 py-0.5 font-bold transition-colors', active ? activeCls : idleCls].join(' ')}
    >
      {children}
    </button>
  )
}
