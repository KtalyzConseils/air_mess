import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import AppHeader from '../components/AppHeader'
import { useAuthStore } from '../stores/authStore'

export default function BillingReturnPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { fetchMe } = useAuthStore()
  const queryClient = useQueryClient()

  // Fedapay renvoie typiquement ?status=approved | declined | canceled
  const status = params.get('status') ?? 'unknown'
  const isSuccess = status === 'approved'
  const isCanceled = status === 'canceled'

  useEffect(() => {
    // On rafraîchit l'user pour voir le nouvel abo activé par le webhook
    fetchMe()
    queryClient.invalidateQueries({ queryKey: ['notifications'] })
  }, [fetchMe, queryClient])

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader />
      <main className="max-w-2xl mx-auto p-6">
        <div className="bg-white rounded-2xl shadow-sm p-10 text-center">
          {isSuccess && (
            <>
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-2xl font-bold text-airmess-dark">Paiement reçu</h2>
              <p className="text-gray-600 mt-3">
                Ton abonnement est en cours d'activation.{'\n'}
                Tu peux fermer cette page ou retourner au tableau de bord.
              </p>
            </>
          )}

          {isCanceled && (
            <>
              <div className="text-6xl mb-4">↩️</div>
              <h2 className="text-2xl font-bold text-airmess-dark">Paiement annulé</h2>
              <p className="text-gray-600 mt-3">
                Tu as annulé le paiement. Tu peux réessayer quand tu veux.
              </p>
            </>
          )}

          {!isSuccess && !isCanceled && (
            <>
              <div className="text-6xl mb-4">⏳</div>
              <h2 className="text-2xl font-bold text-airmess-dark">En cours de traitement</h2>
              <p className="text-gray-600 mt-3">
                Nous attendons la confirmation de Fedapay.{'\n'}
                Tu recevras une notification quand ton abonnement sera actif.
              </p>
            </>
          )}

          <div className="flex justify-center gap-2 mt-6">
            <button
              onClick={() => navigate('/billing')}
              className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50"
            >
              Retour aux offres
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 rounded-lg bg-airmess-dark text-white font-semibold hover:bg-gray-700"
            >
              Tableau de bord
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
