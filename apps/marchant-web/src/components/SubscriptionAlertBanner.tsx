import { Link } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'

function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null
  const diff = new Date(iso).getTime() - Date.now()
  return Math.ceil(diff / 86_400_000)
}

/**
 * Bandeau d'alerte expiration d'abo. Marche pour marchands ET particuliers, avec une
 * sévérité visuelle adaptée :
 *  - Marchand expiré → rouge (bloqué pour créer des courses)
 *  - Particulier expiré → ambre (retombe sur quota gratuit, pas bloqué)
 *  - Proche expiration (≤ 7 jours) → ambre dans les deux cas
 *
 * Renvoie null si rien à afficher.
 */
export default function SubscriptionAlertBanner() {
  const user = useAuthStore((s) => s.user)
  const profile = user?.marchant ?? user?.individual
  const isMarchant = user?.type === 'marchant'
  const isIndividual = user?.type === 'individual'

  if ((!isMarchant && !isIndividual) || !profile) return null

  const status = profile.subscription_status
  const days = daysUntil(profile.subscription_next_billing_at)

  // Cas 1 : expiré ou perdu
  if (status === 'expired' || status === 'churned') {
    // Marchand : bandeau rouge bloquant
    if (isMarchant) {
      return (
        <div className="bg-airmess-red text-white rounded-2xl p-4 mb-6 flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="text-3xl">🚫</span>
            <div>
              <p className="font-bold">Abonnement expiré</p>
              <p className="text-sm opacity-90">
                Vous ne pouvez plus créer de nouvelles courses. Renouvelez maintenant pour réactiver votre compte.
              </p>
            </div>
          </div>
          <Link
            to="/billing"
            className="px-4 py-2 bg-white text-airmess-red rounded-lg font-bold hover:bg-gray-100 whitespace-nowrap"
          >
            Renouveler →
          </Link>
        </div>
      )
    }
    // Particulier : bandeau ambre non-bloquant
    return (
      <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 mb-6 flex items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl">ℹ️</span>
          <div>
            <p className="font-bold text-amber-900">Abonnement expiré — vous gardez vos courses gratuites</p>
            <p className="text-sm text-amber-800">
              Au-delà du quota gratuit, vous pouvez payer à la course ou renouveler votre abonnement.
            </p>
          </div>
        </div>
        <Link
          to="/billing"
          className="px-4 py-2 bg-amber-500 text-white rounded-lg font-semibold hover:bg-amber-600 whitespace-nowrap"
        >
          Renouveler
        </Link>
      </div>
    )
  }

  // Cas 2 : actif et expire dans ≤ 7 jours → bandeau ambre (même pour les deux types)
  if (status === 'active' && days !== null && days >= 0 && days <= 7) {
    return (
      <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 mb-6 flex items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl">⏰</span>
          <div>
            <p className="font-bold text-amber-900">
              {days === 0
                ? "Votre abonnement expire aujourd'hui"
                : days === 1
                  ? 'Votre abonnement expire demain'
                  : `Votre abonnement expire dans ${days} jours`}
            </p>
            <p className="text-sm text-amber-800">
              Renouvelez dès maintenant pour éviter toute interruption du service.
            </p>
          </div>
        </div>
        <Link
          to="/billing"
          className="px-4 py-2 bg-amber-500 text-white rounded-lg font-semibold hover:bg-amber-600 whitespace-nowrap"
        >
          Renouveler
        </Link>
      </div>
    )
  }

  return null
}
