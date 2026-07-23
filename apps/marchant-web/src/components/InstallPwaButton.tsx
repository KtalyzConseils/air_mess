import { useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'
import { canInstallPwa, promptPwaInstall, subscribePwaInstall } from '../lib/pwaInstall'
import { SmartphoneIcon } from './ui/icons'
import { cn } from '../lib/cn'

interface Props {
  /** 'header' = pastille jaune sur fond sombre (AppHeader) ; 'light' = pages claires (login/register). */
  variant?: 'header' | 'light'
  /** Classes additionnelles (marges, largeur…) appliquées seulement si le bouton est rendu. */
  className?: string
}

/**
 * Bouton « Installer l'app » — visible uniquement quand le navigateur propose
 * l'installation (Chrome/Android). Rendu dans le header de l'espace
 * marchand/particulier et sur les pages login/register — jamais dans l'admin.
 * Retourne null si l'install n'est pas proposée (iOS, déjà installée…), donc
 * les marges passées via className ne créent pas d'espace vide dans ce cas.
 */
export default function InstallPwaButton({ variant = 'header', className }: Props) {
  const { t } = useTranslation()
  const canInstall = useSyncExternalStore(subscribePwaInstall, canInstallPwa)

  if (!canInstall) return null

  const base =
    variant === 'light'
      ? // Pleine largeur sur mobile (bloc autonome sous le sous-titre), auto sur ≥sm.
        'inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-full bg-airmess-dark px-4 py-2.5 text-body-s font-semibold text-cream transition-colors hover:bg-ink'
      : 'inline-flex items-center gap-1.5 rounded-full border border-airmess-yellow/50 bg-airmess-yellow/10 px-3 py-1.5 text-caption font-semibold text-airmess-yellow transition-colors hover:bg-airmess-yellow/20'

  return (
    <button type="button" onClick={() => void promptPwaInstall()} className={cn(base, className)}>
      <SmartphoneIcon size={variant === 'light' ? 16 : 14} />
      {t('pwa.install')}
    </button>
  )
}
