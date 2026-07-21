import { useRegisterSW } from 'virtual:pwa-register/react'
import { useTranslation } from 'react-i18next'
import Button from './ui/Button'

/**
 * Toast de mise à jour PWA : quand une nouvelle version du service worker est
 * disponible, on propose « Recharger » — jamais de reload sauvage (l'utilisateur
 * peut être en train de créer une course ou payer).
 */
export default function PwaReloadPrompt() {
  const { t } = useTranslation()
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  if (!needRefresh) return null

  return (
    <div className="fixed bottom-4 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-lg border border-warm-200 bg-airmess-dark p-4 shadow-lg ams-anim-scale-in">
      <p className="text-body-s text-cream">{t('pwa.updateAvailable')}</p>
      <div className="mt-3 flex gap-2">
        <Button variant="primary" size="sm" pill onClick={() => void updateServiceWorker(true)}>
          {t('pwa.reload')}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setNeedRefresh(false)}>
          <span className="text-warm-300">{t('pwa.later')}</span>
        </Button>
      </div>
    </div>
  )
}
