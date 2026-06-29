import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { AxiosError } from 'axios'
import { useAuthStore } from '../stores/authStore'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Highlight from '../components/Highlight'
import { EyeIcon, EyeOffIcon, ArrowRightIcon } from '../components/ui/icons'
import wordmark from '../assets/logo/airmess-wordmark.svg'
import wordmarkWhite from '../assets/logo/airmess-wordmark-white.svg'

export default function LoginPage() {
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
    <div className="min-h-screen flex flex-col md:flex-row bg-cream">
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
          <h1 className="text-h1 text-ink mb-2">Bon retour.</h1>
          <p className="text-body-l text-warm-500 mb-8">
            Connectez-vous à votre espace marchand.
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="email"
              label="Email"
              placeholder="contact@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              autoFocus
            />

            <Input
              type={showPassword ? 'text' : 'password'}
              label="Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              rightSlot={
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="p-2 text-warm-500 hover:text-ink transition-colors"
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
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
                Mot de passe oublié ?
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
              Se connecter
            </Button>
          </form>

          {/* Séparateur */}
          <div className="flex items-center gap-3 my-8">
            <div className="h-px flex-1 bg-warm-200" />
            <span className="text-caption text-warm-400">ou</span>
            <div className="h-px flex-1 bg-warm-200" />
          </div>

          {/* Inscription */}
          <Link to="/register" className="block">
            <Button variant="secondary" size="lg" pill fullWidth>
              Créer un compte marchand
            </Button>
          </Link>

          <p className="text-caption text-warm-400 mt-10">
            © 2026 KTALYZ — Air Mess
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
            <span className="text-eyebrow text-warm-300 uppercase">Marchands</span>
          </div>

          {/* Tagline avec highlight signature */}
          <h2 className="text-display-2 leading-tight mb-10">
            Pilotez vos{' '}
            <Highlight>livraisons</Highlight>
            <br />
            en temps réel.
          </h2>

          {/* Mockup dashboard — vrais KPIs réalistes */}
          <div className="bg-ink/60 border border-warm-600/30 rounded-xl p-6 backdrop-blur-sm">
            <img src={wordmarkWhite} alt="" className="h-5 w-auto mb-5 opacity-60" />

            <div className="space-y-3">
              <MockKpi label="À livrer" value="3" dot="yellow" />
              <MockKpi label="En cours" value="7" dot="red" pulse />
              <MockKpi label="Livrées (mois)" value="142" />
              <MockKpi label="CA mensuel" value="284 K" suffix="FCFA" />
            </div>

            <div className="mt-5 pt-4 border-t border-warm-600/30 flex items-center justify-between">
              <span className="text-caption text-warm-300">Wallet</span>
              <span className="text-body font-bold text-airmess-yellow">12 500 FCFA</span>
            </div>
          </div>

          <p className="mt-8 text-body-s text-warm-300 max-w-sm">
            Suivez chaque course en direct, encaissez automatiquement, retirez vos fonds quand vous voulez.
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
