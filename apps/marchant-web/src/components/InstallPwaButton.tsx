import { useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'
import { canInstallPwa, promptPwaInstall, subscribePwaInstall } from '../lib/pwaInstall'
import { SmartphoneIcon } from './ui/icons'

/**
 * Bouton « Installer l'app » — visible uniquement quand le navigateur propose
 * l'installation (Chrome/Android, jamais dans l'admin : rendu par AppHeader,
 * le header de l'espace marchand/particulier).
 */
export default function InstallPwaButton() {
  const { t } = useTranslation()
  const canInstall = useSyncExternalStore(subscribePwaInstall, canInstallPwa)

  if (!canInstall) return null

  return (
    <button
      type="button"
      onClick={() => void promptPwaInstall()}
      className="inline-flex items-center gap-1.5 rounded-full border border-airmess-yellow/50 bg-airmess-yellow/10 px-3 py-1.5 text-caption font-semibold text-airmess-yellow transition-colors hover:bg-airmess-yellow/20"
    >
      <SmartphoneIcon size={14} />
      {t('pwa.install')}
    </button>
  )
}
