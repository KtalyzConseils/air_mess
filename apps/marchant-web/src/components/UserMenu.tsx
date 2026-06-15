import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { PLAN_LIMITS } from '../types/auth'

const PLAN_LABEL: Record<string, string> = {
  trial:    'Essai gratuit',
  starter:  'Starter',
  pro:      'Pro',
  business: 'Business',
}
const PLAN_ICON: Record<string, string> = {
  trial:    '🆓',
  starter:  '✦',
  pro:      '⭐',
  business: '💎',
}

function getInitials(name: string): string {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('') || '?'
  )
}

function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null
  const diff = new Date(iso).getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / 86_400_000))
}

export default function UserMenu() {
  const { user, logout } = useAuthStore()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const displayName =
    user?.marchant?.raison_sociale ??
    (user?.individual ? `${user.individual.first_name} ${user.individual.last_name}`.trim() : null) ??
    user?.name ?? 'Utilisateur'
  const initials = getInitials(displayName)

  // Profil métier (marchand OU particulier) — on récupère ce qui existe.
  const profile = user?.marchant ?? user?.individual
  const isMarchant = user?.type === 'marchant'
  const isIndividual = user?.type === 'individual'

  // Plan affiché : marchand → 'trial' par défaut, particulier → null si pas d'abo.
  const plan = profile?.subscription_plan ?? (isMarchant ? 'trial' : null)
  const status = profile?.subscription_status ?? null
  const daysLeft = daysUntil(profile?.subscription_next_billing_at)
  const isSuspended = status === 'suspended' || status === 'churned'

  const coursesUsed = profile?.monthly_courses_used ?? 0
  const coursesLimit = plan && PLAN_LIMITS[plan]
    ? PLAN_LIMITS[plan]
    : user?.individual?.monthly_courses_limit ?? 0
  const usageRatio = coursesLimit > 0 ? coursesUsed / coursesLimit : 0
  const usageBarColor =
    usageRatio >= 1 ? 'bg-airmess-red' : usageRatio >= 0.8 ? 'bg-amber-500' : 'bg-emerald-500'

  useEffect(() => {
    if (!open) return
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-10 h-10 rounded-full bg-airmess-yellow text-airmess-dark font-bold flex items-center justify-center hover:opacity-90 transition"
        title={displayName}
      >
        {initials}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-100 py-2 z-50 text-airmess-dark">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold truncate">{displayName}</p>
            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
          </div>

          {(isMarchant || isIndividual) && profile && (
            <Link
              to="/billing"
              onClick={() => setOpen(false)}
              className="block px-4 py-2 border-b border-gray-100 bg-gray-50 hover:bg-gray-100 transition"
            >
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="text-base">{plan ? PLAN_ICON[plan] : '🆓'}</span>
                  <span className="text-sm font-semibold text-airmess-dark">
                    {plan ? PLAN_LABEL[plan] : 'Quota gratuit'}
                  </span>
                </span>
                {isSuspended && (
                  <span className="text-[10px] uppercase font-bold bg-airmess-red text-white px-1.5 py-0.5 rounded">
                    Suspendu
                  </span>
                )}
              </div>

              {/* Marchand en trial → CTA upgrade */}
              {!isSuspended && isMarchant && plan === 'trial' && (
                <p className="text-xs text-gray-500 mt-0.5">Passe à un plan payant →</p>
              )}

              {/* Particulier sans abo → CTA discover */}
              {!isSuspended && isIndividual && !plan && (
                <p className="text-xs text-gray-500 mt-0.5">Découvrir les plans →</p>
              )}

              {/* Avec abo payant → date de renouvellement */}
              {!isSuspended && plan && plan !== 'trial' && daysLeft !== null && (
                <p className="text-xs text-gray-500 mt-0.5">
                  {daysLeft > 0
                    ? `Renouvellement dans ${daysLeft} jour${daysLeft > 1 ? 's' : ''}`
                    : 'Expiré — renouveler maintenant'}
                </p>
              )}

              {!isSuspended && coursesLimit > 0 && (
                <div className="mt-2">
                  <div className="flex justify-between text-[11px] text-gray-600 mb-0.5">
                    <span>Quota courses</span>
                    <span className="font-semibold">{coursesUsed}/{coursesLimit}</span>
                  </div>
                  <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${usageBarColor} transition-all`}
                      style={{ width: `${Math.min(100, usageRatio * 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </Link>
          )}

          <Link
            to="/profile"
            onClick={() => setOpen(false)}
            className="w-full px-4 py-2 text-sm flex items-center gap-2 text-gray-700 hover:bg-gray-50"
          >
            <span>👤</span>
            <span>Mon profil</span>
          </Link>

          <div className="border-t border-gray-100 my-1" />

          <button
            onClick={() => {
              setOpen(false)
              logout()
            }}
            className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 text-airmess-red hover:bg-red-50"
          >
            <span>↪</span>
            <span>Déconnexion</span>
          </button>
        </div>
      )}
    </div>
  )
}
