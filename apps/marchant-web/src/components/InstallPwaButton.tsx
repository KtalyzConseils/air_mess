import { useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'
import { canInstallPwa, promptPwaInstall, subscribePwaInstall } from '../lib/pwaInstall'
import { SmartphoneIcon } from './ui/icons'

interface Props {
  /** 'header' = pastille jaune sur fond sombre (AppHeader) ; 'light' = pages claires (login/register). */
  variant?: 'header' | 'light'
}

/**
 * Bouton « Installer l'app » — visible uniquement quand le navigateur propose
 * l'installation (Chrome/Android). Rendu dans le header de l'espace
 * marchand/particulier et sur les pages login/register — jamais dans l'admin.
 */
export default function InstallPwaButton({ variant = 'header' }: Props) {
  const { t } = useTranslation()
  const canInstall = useSyncExternalStore(subscribePwaInstall, canInstallPwa)

  if (!canInstall) return null

  const classes =
    variant === 'light'
      ? 'inline-flex items-center gap-2 rounded-full bg-airmess-dark px-4 py-2 text-body-s font-semibold text-cream transition-colors hover:bg-ink'
      : 'inline-flex items-center gap-1.5 rounded-full border border-airmess-yellow/50 bg-airmess-yellow/10 px-3 py-1.5 text-caption font-semibold text-airmess-yellow transition-colors hover:bg-airmess-yellow/20'

  return (
    <button type="button" onClick={() => void promptPwaInstall()} className={classes}>
      <SmartphoneIcon size={variant === 'light' ? 16 : 14} />
      {t('pwa.install')}
    </button>
  )
}
