import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { AxiosError } from 'axios'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../stores/authStore'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Highlight from '../components/Highlight'
import { EyeIcon, EyeOffIcon, ArrowRightIcon } from '../components/ui/icons'
import LanguageToggle from '../components/ui/LanguageToggle'
import AuthSupportFooter from '../components/AuthSupportFooter'
import InstallPwaButton from '../components/InstallPwaButton'
import wordmark from '../assets/logo/airmess-wordmark.svg'
import wordmarkWhite from '../assets/logo/airmess-wordmark-white.svg'

export default function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await login(email, password)
      const user = useAuthStore.getState().user
      if (user?.type === 'admin') {
        navigate('/admin/dashboard')
      } else if (user?.type === 'driver') {
        navigate('/unauthorized')
      } else {
        navigate('/dashboard')
      }
    } catch (err) {
      // Les erreurs d'auth restent en FR pour rester cohérentes avec les messages
      // renvoyés par l'API Laravel (jamais traduits côté backend).
      const message =
        err instanceof AxiosError
          ? err.response?.data?.message ?? 'Erreur de connexion.'
          : 'Erreur inattendue.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-cream relative">
      <div className="absolute top-4 right-4 z-10">
        <LanguageToggle variant="light" />
      </div>
      {/* ============================================================
          GAUCHE — Form (sur mobile : prend toute la largeur)
          ============================================================ */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md">
          {/* Logo */}
          <Link to="/" className="inline-block mb-12">
            <img src={wordmark} alt="Air Mess" className="h-8 w-auto" />
          </Link>

          {/* Headline */}
          <h1 className="text-h1 text-ink mb-2">{t('auth.login.title')}</h1>
          <p className="text-body-l text-warm-500 mb-6">
            {t('auth.login.subtitle')}
          </p>

          {/* Installation PWA — bloc autonome (jamais dans le coin, pas de collision
              avec le sélecteur de langue en absolute sur mobile). Rendu seulement
              si le navigateur propose l'installation. */}
          <InstallPwaButton variant="light" className="mb-8" />

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="email"
              label={t('common.email')}
              placeholder="contact@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                if (error) setError(null)
              }}
              required
              autoComplete="email"
              autoFocus
              error={error ? '' : undefined}
            />

            <Input
              type={showPassword ? 'text' : 'password'}
              label={t('common.password')}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                if (error) setError(null)
              }}
              required
              autoComplete="current-password"
              error={error ? '' : undefined}
              rightSlot={
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="p-2 text-warm-500 hover:text-ink transition-colors"
                  aria-label={showPassword ? t('common.hidePassword') : t('common.showPassword')}
                >
                  {showPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                </button>
              }
            />

            <div className="flex justify-end">
              <Link
                to="/forgot-password"
                className="text-caption text-warm-600 hover:text-ink"
              >
                {t('auth.login.forgotPassword')}
              </Link>
            </div>

            {error && (
              <div
                role="alert"
                className="bg-danger-bg border border-airmess-red/30 text-airmess-red px-4 py-3 rounded-md text-body-s"
              >
                {error}
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              pill
              fullWidth
              loading={loading}
              rightIcon={!loading && <ArrowRightIcon size={18} />}
            >
              {t('auth.login.submit')}
            </Button>
          </form>

          {/* Séparateur */}
          <div className="flex items-center gap-3 my-8">
            <div className="h-px flex-1 bg-warm-200" />
            <span className="text-caption text-warm-400">{t('common.or')}</span>
            <div className="h-px flex-1 bg-warm-200" />
          </div>

          {/* Inscription */}
          <Link to="/register" className="block">
            <Button variant="secondary" size="lg" pill fullWidth>
              {t('auth.login.createAccount')}
            </Button>
          </Link>

          <AuthSupportFooter context="Login" />

          <p className="text-caption text-warm-400 mt-10">
            {t('auth.login.copyright')}
          </p>
        </div>
      </div>

      {/* ============================================================
          DROITE — Panel sombre avec tagline + mockup KPI
          (caché en dessous de md pour libérer l'écran mobile)
          ============================================================ */}
      <div className="hidden md:flex flex-1 bg-airmess-dark text-cream p-12 items-center justify-center relative overflow-hidden">
        {/* Halo jaune ambiant subtil en arrière-plan */}
        <div
          className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-airmess-yellow/10 blur-3xl pointer-events-none"
          aria-hidden="true"
        />

        <div className="relative max-w-md">
          {/* Eyebrow + numéro */}
          <div className="flex items-center gap-3 mb-6">
            <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-airmess-red text-cream text-caption font-bold tabular-nums">
              01
            </span>
            <span className="text-eyebrow text-warm-300 uppercase">{t('auth.login.sidePanel.eyebrow')}</span>
          </div>

          {/* Tagline avec highlight signature */}
          <h2 className="text-display-2 leading-tight mb-10">
            {t('auth.login.sidePanel.taglineStart')}{' '}
            <Highlight>{t('auth.login.sidePanel.taglineHighlight')}</Highlight>
            <br />
            {t('auth.login.sidePanel.taglineEnd')}
          </h2>

          {/* Mockup dashboard — vrais KPIs réalistes */}
          <div className="bg-ink/60 border border-warm-600/30 rounded-xl p-6 backdrop-blur-sm">
            <img src={wordmarkWhite} alt="" className="h-5 w-auto mb-5 opacity-60" />

            <div className="space-y-3">
              <MockKpi label={t('auth.login.sidePanel.mockToDeliver')} value="3" dot="yellow" />
              <MockKpi label={t('auth.login.sidePanel.mockInProgress')} value="7" dot="red" pulse />
              <MockKpi label={t('auth.login.sidePanel.mockDeliveredMonth')} value="142" />
              <MockKpi label={t('auth.login.sidePanel.mockRevenueMonth')} value="284 K" suffix="FCFA" />
            </div>

            <div className="mt-5 pt-4 border-t border-warm-600/30 flex items-center justify-between">
              <span className="text-caption text-warm-300">{t('auth.login.sidePanel.mockWalletLabel')}</span>
              <span className="text-body font-bold text-airmess-yellow">12 500 FCFA</span>
            </div>
          </div>

          <p className="mt-8 text-body-s text-warm-300 max-w-sm">
            {t('auth.login.sidePanel.subtext')}
          </p>
        </div>
      </div>
    </div>
  )
}

/* ============================================================
   Sous-composant local : ligne de KPI pour le mockup droite
   ============================================================ */
interface MockKpiProps {
  label: string
  value: string
  suffix?: string
  dot?: 'yellow' | 'red'
  pulse?: boolean
}

function MockKpi({ label, value, suffix, dot, pulse }: MockKpiProps) {
  const dotColor = dot === 'yellow' ? 'bg-airmess-yellow' : dot === 'red' ? 'bg-airmess-red' : null

  return (
    <div className="flex items-center justify-between">
      <span className="inline-flex items-center gap-2 text-caption uppercase tracking-wider text-warm-300">
        {dotColor && (
          <span className="relative inline-flex h-1.5 w-1.5">
            <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${dotColor}`} />
            {pulse && (
              <span
                className={`absolute inset-0 h-1.5 w-1.5 rounded-full ${dotColor} animate-ping`}
                aria-hidden="true"
              />
            )}
          </span>
        )}
        {label}
      </span>
      <span className="text-body font-bold text-cream tabular-nums">
        {value}
        {suffix && <span className="ml-1 text-caption font-normal text-warm-400">{suffix}</span>}
      </span>
    </div>
  )
}
