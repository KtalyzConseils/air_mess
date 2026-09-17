import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import LanguageToggle from '../components/ui/LanguageToggle'
import Button from '../components/ui/Button'
import wordmark from '../assets/logo/airmess-wordmark.svg'
import { useAuthStore } from '../stores/authStore'

export default function UnauthorizedPage() {
  const { t } = useTranslation()
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)

  const homePath = user?.type === 'admin' ? '/admin/dashboard' : '/dashboard'
  const isDriver = user?.type === 'driver'

  return (
    <main className="min-h-screen bg-cream px-6 py-8 flex flex-col">
      <div className="flex items-center justify-between">
        <Link to={homePath} aria-label="Airmess">
          <img src={wordmark} alt="Airmess" className="h-8 w-auto" />
        </Link>
        <LanguageToggle variant="light" />
      </div>

      <section className="flex-1 flex items-center justify-center py-12">
        <div className="w-full max-w-xl rounded-2xl border border-warm-200 bg-off-white p-7 text-center shadow-sm md:p-12">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-warning text-3xl" aria-hidden="true">
            ⛔
          </div>
          <p className="mb-3 text-eyebrow uppercase text-airmess-red">{t('unauthorized.eyebrow')}</p>
          <h1 className="mb-4 text-h1 text-ink">{t('unauthorized.title')}</h1>
          <p className="mx-auto mb-7 max-w-md text-body-l text-warm-600">{t('unauthorized.body')}</p>

          {isDriver && (
            <p className="mx-auto mb-7 max-w-md rounded-lg bg-warm-100 px-4 py-3 text-body-s text-warm-700">
              {t('unauthorized.driverHint')}
            </p>
          )}

          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            {!isDriver && (
              <Link to={homePath}>
                <Button variant="primary" size="md" pill>
                  {t('unauthorized.home')}
                </Button>
              </Link>
            )}
            <Button variant="secondary" size="md" onClick={() => void logout()}>
              {t('unauthorized.logout')}
            </Button>
          </div>
        </div>
      </section>
    </main>
  )
}
