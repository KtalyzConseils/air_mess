import { useTranslation } from 'react-i18next'
import { DRIVER_APK_URL } from '../../lib/constants'
import { SmartphoneIcon, ArrowRightIcon } from '../ui/icons'

/**
 * Bannière "inscris-toi via l'app" affichée AVANT le formulaire web :
 * le canal privilégié est l'app livreur (Android), le formulaire web
 * reste disponible en dessous.
 */
export default function AppDownloadBanner() {
  const { t } = useTranslation()

  return (
    <div className="mb-8">
      <div className="relative overflow-hidden rounded-lg bg-airmess-dark text-cream p-5 md:p-6">
        {/* Halo décoratif, même langage que le panel gauche */}
        <div
          className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-airmess-yellow/15 blur-2xl pointer-events-none"
          aria-hidden
        />
        <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
          <span className="shrink-0 inline-flex h-12 w-12 items-center justify-center rounded-full bg-airmess-yellow text-ink">
            <SmartphoneIcon size={24} />
          </span>
          <div className="flex-1">
            <h2 className="text-h3 text-cream">{t('driverRegister.appBanner.title')}</h2>
            <p className="text-body-s text-warm-300 mt-1">
              {t('driverRegister.appBanner.body')}
            </p>
          </div>
          <a
            href={DRIVER_APK_URL}
            download
            className="shrink-0 inline-flex items-center justify-center gap-2 rounded-full bg-airmess-yellow px-5 py-2.5 text-body font-medium text-ink shadow-sm transition-all duration-200 hover:bg-airmess-yellow-light hover:shadow-md"
          >
            {t('driverRegister.appBanner.cta')}
            <ArrowRightIcon size={16} />
          </a>
        </div>
        <p className="relative text-caption text-warm-400 mt-3">
          {t('driverRegister.appBanner.note')}
        </p>
      </div>

      {/* Divider "ou continue sur le web" */}
      <div className="flex items-center gap-3 mt-6" role="separator">
        <span className="h-px flex-1 bg-warm-300" aria-hidden />
        <span className="text-caption text-warm-500 uppercase tracking-wide">
          {t('driverRegister.appBanner.orWeb')}
        </span>
        <span className="h-px flex-1 bg-warm-300" aria-hidden />
      </div>
    </div>
  )
}
