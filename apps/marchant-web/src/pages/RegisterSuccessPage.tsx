import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import LanguageToggle from '../components/ui/LanguageToggle'
import AuthSupportFooter from '../components/AuthSupportFooter'
import wordmark from '../assets/logo/airmess-wordmark.svg'

export default function RegisterSuccessPage() {
  const { t } = useTranslation()

  return (
    <main className="min-h-screen bg-cream px-6 py-8 flex flex-col">
      <div className="flex items-center justify-between">
        <Link to="/login" aria-label="Airmess">
          <img src={wordmark} alt="Airmess" className="h-8 w-auto" />
        </Link>
        <LanguageToggle variant="light" />
      </div>

      <section className="flex-1 flex items-center justify-center py-12">
        <div className="w-full max-w-xl rounded-2xl border border-warm-200 bg-off-white p-7 text-center shadow-sm md:p-12">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-airmess-yellow text-3xl" aria-hidden="true">🎉</div>
          <p className="mb-3 text-eyebrow uppercase text-airmess-red">{t('auth.registerSuccess.eyebrow')}</p>
          <h1 className="mb-4 text-h1 text-ink">{t('auth.registerSuccess.title')}</h1>
          <p className="mx-auto mb-7 max-w-md text-body-l text-warm-600">{t('auth.registerSuccess.message')}</p>

          <div className="mb-8 rounded-xl border border-airmess-yellow/50 bg-airmess-yellow/10 px-5 py-5">
            <p className="text-sm font-semibold uppercase tracking-wide text-warm-600">{t('auth.registerSuccess.giftLabel')}</p>
            <p className="mt-1 text-3xl font-bold text-ink">500 FCFA</p>
            <p className="mt-1 text-body-s text-warm-600">{t('auth.registerSuccess.giftBody')}</p>
          </div>

          <p className="mt-4 text-caption text-warm-500">{t('auth.registerSuccess.loginHint')}</p>
          <AuthSupportFooter context="Register success" />
        </div>
      </section>
    </main>
  )
}
