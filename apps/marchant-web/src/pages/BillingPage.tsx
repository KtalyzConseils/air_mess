import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import AppHeader from '../components/AppHeader'
import { useAuthStore } from '../stores/authStore'
import { fetchPlans, createCheckout, type SubscriptionPlan } from '../api/subscription'

const FEATURE_LABELS: Record<string, string> = {
  email_support:     '📧 Support email',
  whatsapp_support:  '💬 Support WhatsApp prioritaire',
  tracking_pages:    '📍 Pages de suivi pour vos clients',
  multi_user:        '👥 Comptes utilisateurs multiples',
  advanced_stats:    '📊 Statistiques avancées',
  priority_matching: '⚡ Matching livreur prioritaire',
  api_access:        '🔌 Accès API',
  account_manager:   '🤝 Account manager dédié',
  sla:               '🛡️ SLA garanti',
}

export default function BillingPage() {
  const { user } = useAuthStore()
  const [selectingCode, setSelectingCode] = useState<string | null>(null)

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['subscription', 'plans'],
    queryFn: fetchPlans,
  })

  const checkoutMutation = useMutation({
    mutationFn: createCheckout,
    onSuccess: (data) => {
      // Redirection brutale vers Fedapay (hors de notre SPA)
      window.location.href = data.checkout_url
    },
  })

  // Le plan courant dépend du type d'user : marchand → subscription_plan ou 'trial' par défaut,
  // particulier → subscription_plan ou null (pas d'abo, quota gratuit).
  const currentPlanCode =
    user?.type === 'marchant'
      ? user.marchant?.subscription_plan ?? 'trial'
      : user?.individual?.subscription_plan ?? null
  const isIndividual = user?.type === 'individual'

  const apiError =
    checkoutMutation.error instanceof AxiosError
      ? checkoutMutation.error.response?.data?.message ?? 'Erreur lors de la création du paiement.'
      : null

  function handleSelect(plan: SubscriptionPlan) {
    if (plan.monthly_price_fcfa === 0) return // pas d'achat pour le trial
    setSelectingCode(plan.code)
    checkoutMutation.mutate(plan.code)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader />

      <main className="max-w-6xl mx-auto p-4 md:p-6">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-airmess-dark">Mon abonnement</h2>
          <p className="text-gray-500 mt-1">
            {isIndividual
              ? "Souscris à un plan pour augmenter ton quota mensuel. Sans abo, tu gardes tes courses gratuites + paiement à la course au-delà."
              : "Choisis l'offre qui correspond à ton volume de livraisons."}
          </p>
        </div>

        {apiError && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-4">
            ⚠️ {apiError}
          </div>
        )}

        {isLoading && <p className="text-gray-500">Chargement des offres...</p>}

        {!isLoading && plans.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {plans
              .filter((p) => !(isIndividual && p.code === 'trial')) // pas de trial pour les particuliers
              .map((plan) => {
              const isCurrent = plan.code === currentPlanCode
              const isFree = plan.monthly_price_fcfa === 0
              const isPro = plan.code === 'pro'
              const isLoading = checkoutMutation.isPending && selectingCode === plan.code

              return (
                <div
                  key={plan.code}
                  className={`bg-white rounded-2xl p-6 shadow-sm border-2 flex flex-col ${
                    isPro ? 'border-airmess-yellow' : 'border-transparent'
                  }`}
                >
                  {isPro && (
                    <div className="text-xs uppercase font-bold bg-airmess-yellow text-airmess-dark px-2 py-1 rounded-full self-start mb-2">
                      ⭐ Recommandé
                    </div>
                  )}

                  <h3 className="text-xl font-bold text-airmess-dark">{plan.name}</h3>

                  <div className="mt-3 mb-4">
                    {isFree ? (
                      <p className="text-3xl font-bold text-airmess-dark">Gratuit</p>
                    ) : (
                      <p className="text-3xl font-bold text-airmess-dark">
                        {plan.monthly_price_fcfa.toLocaleString('fr-FR')}
                        <span className="text-base font-normal text-gray-500"> FCFA/mois</span>
                      </p>
                    )}
                  </div>

                  {plan.description && (
                    <p className="text-sm text-gray-600 mb-4">{plan.description}</p>
                  )}

                  <ul className="space-y-2 text-sm flex-1">
                    <li className="flex items-start gap-2">
                      <span className="text-green-600">✓</span>
                      <span>
                        <strong>{plan.included_courses}</strong> courses incluses /mois
                      </span>
                    </li>
                    {(plan.features ?? []).map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <span className="text-green-600">✓</span>
                        <span>{FEATURE_LABELS[f] ?? f}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-5">
                    {isCurrent ? (
                      <div className="w-full text-center py-2.5 rounded-lg bg-gray-100 text-gray-600 text-sm font-semibold">
                        ✓ Plan actuel
                      </div>
                    ) : isFree ? (
                      <div className="w-full text-center py-2.5 rounded-lg bg-gray-50 text-gray-400 text-sm">
                        Période d'essai
                      </div>
                    ) : (
                      <button
                        onClick={() => handleSelect(plan)}
                        disabled={checkoutMutation.isPending}
                        className={`w-full py-2.5 rounded-lg font-semibold text-sm transition disabled:opacity-50 ${
                          isPro
                            ? 'bg-airmess-yellow text-airmess-dark hover:opacity-90'
                            : 'bg-airmess-dark text-white hover:bg-gray-700'
                        }`}
                      >
                        {isLoading ? 'Redirection…' : 'Choisir ce plan'}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <p className="text-xs text-gray-400 mt-8 text-center">
          Paiement sécurisé via Fedapay · MTN MoMo, Moov Money, Visa, Mastercard
        </p>
      </main>
    </div>
  )
}
