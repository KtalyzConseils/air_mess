import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import wordmark from '../assets/logo/airmess-wordmark.svg'
import mark from '../assets/logo/airmess-mark.svg'

export default function DriverRegisterSuccessPage() {
  const { t } = useTranslation()

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      {/* Header minimal */}
      <div className="p-6 md:p-8">
        <Link to="/" className="inline-block">
          <img src={wordmark} alt="Air Mess" className="h-8 w-auto" />
        </Link>
      </div>

      <main className="flex-1 flex items-center justify-center px-4 pb-12">
        <Card variant="signature" padding="lg" className="max-w-lg w-full ams-anim-scale-in">
          {/* Mark décoratif + grosse coche */}
          <div className="text-center mb-6">
            <div className="relative inline-block">
              <img src={mark} alt="" aria-hidden className="h-16 w-auto opacity-20" />
              <div className="absolute inset-0 flex items-center justify-center text-display-1">
                ✅
              </div>
            </div>
          </div>

          <h1 className="text-h1 text-ink text-center">{t('driverRegister.success.cardTitle')}</h1>
          <p className="text-body text-warm-600 text-center mt-3">
            {t('driverRegister.success.cardBody')}
          </p>

          {/* Prochaine étape — encart warning chaud */}
          <div className="mt-6 bg-warning-bg border-l-4 border-warning rounded-md p-4">
            <div className="flex items-start gap-2">
              <Badge variant="warning" size="sm">{t('driverRegister.success.nextStepBadge')}</Badge>
            </div>
            <p className="text-body-s text-warm-700 mt-3">
              {t('driverRegister.success.nextStepBodyBefore')}{' '}
              <strong className="text-ink">{t('driverRegister.success.nextStepBodyBold')}</strong>{' '}
              {t('driverRegister.success.nextStepBodyMid')}{' '}
              <strong className="text-ink">{t('driverRegister.success.nextStepBodyBrand')}</strong>
              {' '}{t('driverRegister.success.nextStepBodyEnd')}
            </p>
          </div>

          {/* Téléchargement app (à venir) */}
          <div className="mt-6 bg-warm-100 rounded-md p-4">
            <p className="text-eyebrow uppercase text-warm-600 mb-3">{t('driverRegister.success.meanwhileEyebrow')}</p>
            <p className="text-body-s text-warm-600 mb-3">
              {t('driverRegister.success.meanwhileBody')}
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <span className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2.5 bg-off-white border border-warm-200 text-warm-500 rounded-md text-body-s font-medium cursor-not-allowed">
                <span aria-hidden>🤖</span> {t('driverRegister.success.playStore')}
                <Badge variant="neutral" size="sm" className="ml-auto">{t('driverRegister.success.soon')}</Badge>
              </span>
              <span className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2.5 bg-off-white border border-warm-200 text-warm-500 rounded-md text-body-s font-medium cursor-not-allowed">
                <span aria-hidden>🍎</span> {t('driverRegister.success.appStore')}
                <Badge variant="neutral" size="sm" className="ml-auto">{t('driverRegister.success.soon')}</Badge>
              </span>
            </div>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <Link to="/login" className="flex-1">
              <Button variant="secondary" size="md" fullWidth>
                {t('driverRegister.success.backToLogin')}
              </Button>
            </Link>
            <Link to="/" className="flex-1">
              <Button variant="dark" size="md" pill fullWidth>
                {t('driverRegister.success.home')}
              </Button>
            </Link>
          </div>
        </Card>
      </main>

      {/* Footer minimal */}
      <p className="text-center text-caption text-warm-400 pb-6">
        {t('driverRegister.success.copyright')}
      </p>
    </div>
  )
}
