import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import AppHeader from '../components/AppHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
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
    fetchMe()
    queryClient.invalidateQueries({ queryKey: ['wallet'] })
    queryClient.invalidateQueries({ queryKey: ['courses'] })
    queryClient.invalidateQueries({ queryKey: ['notifications'] })
  }, [fetchMe, queryClient])

  return (
    <div className="min-h-screen bg-cream">
      <AppHeader />
      <main className="max-w-2xl mx-auto px-4 md:px-6 py-10 md:py-16">
        <Card variant="signature" padding="lg" className="text-center ams-anim-scale-in">
          {isSuccess && (
            <>
              <div className="text-display-1 mb-4">🎉</div>
              <h2 className="text-h1 text-ink">Paiement reçu</h2>
              <p className="text-body text-warm-500 mt-3 max-w-md mx-auto">
                Votre paiement a bien été confirmé. Si c'était un rechargement, votre wallet est crédité
                dans quelques secondes ; si c'était une course, elle a été créée automatiquement.
              </p>
            </>
          )}

          {isCanceled && (
            <>
              <div className="text-display-1 mb-4">↩️</div>
              <h2 className="text-h1 text-ink">Paiement annulé</h2>
              <p className="text-body text-warm-500 mt-3 max-w-md mx-auto">
                Vous avez annulé le paiement. Aucun montant n'a été prélevé. Vous pouvez réessayer
                quand vous voulez.
              </p>
            </>
          )}

          {!isSuccess && !isCanceled && (
            <>
              <div className="text-display-1 mb-4">⏳</div>
              <h2 className="text-h1 text-ink">En cours de traitement</h2>
              <p className="text-body text-warm-500 mt-3 max-w-md mx-auto">
                Nous attendons la confirmation de Fedapay. Vous recevrez une notification dès que votre
                paiement sera validé.
              </p>
            </>
          )}

          <div className="flex justify-center gap-3 mt-8 flex-wrap">
            <Button variant="secondary" size="md" onClick={() => navigate('/wallet')}>
              💰 Mon wallet
            </Button>
            <Button variant="dark" size="md" pill onClick={() => navigate('/dashboard')}>
              Tableau de bord →
            </Button>
          </div>
        </Card>
      </main>
    </div>
  )
}
