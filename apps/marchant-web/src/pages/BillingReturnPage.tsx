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
    // Rafraîchir le wallet et les courses : le webhook a déjà mis à jour la BDD
    fetchMe()
    queryClient.invalidateQueries({ queryKey: ['wallet'] })
    queryClient.invalidateQueries({ queryKey: ['courses'] })
    queryClient.invalidateQueries({ queryKey: ['notifications'] })
  }, [fetchMe, queryClient])

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader />
      <main className="max-w-2xl mx-auto p-4 md:p-6">
        <div className="bg-white rounded-2xl shadow-sm p-10 text-center">
          {isSuccess && (
            <>
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-2xl font-bold text-airmess-dark">Paiement reçu</h2>
              <p className="text-gray-600 mt-3">
                Ton paiement a bien été confirmé. Si c'était un rechargement, ton wallet est crédité dans
                quelques secondes ; si c'était une course, elle a été créée automatiquement.
              </p>
            </>
          )}

          {isCanceled && (
            <>
              <div className="text-6xl mb-4">↩️</div>
              <h2 className="text-2xl font-bold text-airmess-dark">Paiement annulé</h2>
              <p className="text-gray-600 mt-3">
                Tu as annulé le paiement. Aucun montant n'a été prélevé. Tu peux réessayer quand tu veux.
              </p>
            </>
          )}

          {!isSuccess && !isCanceled && (
            <>
              <div className="text-6xl mb-4">⏳</div>
              <h2 className="text-2xl font-bold text-airmess-dark">En cours de traitement</h2>
              <p className="text-gray-600 mt-3">
                Nous attendons la confirmation de Fedapay. Tu recevras une notification dès que ton paiement
                sera validé.
              </p>
            </>
          )}

          <div className="flex justify-center gap-2 mt-6 flex-wrap">
            <button
              onClick={() => navigate('/wallet')}
              className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50"
            >
              💰 Mon wallet
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
