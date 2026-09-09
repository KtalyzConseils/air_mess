import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import AppHeader from '../components/AppHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import { useAuthStore } from '../stores/authStore'
import { confirmUserPayment } from '../api/wallet'

export default function BillingReturnPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { fetchMe } = useAuthStore()
  const queryClient = useQueryClient()
  const [confirmedStatus, setConfirmedStatus] = useState<string | null>(null)

  // Fedapay renvoie typiquement ?status=approved | declined | canceled
  const status = params.get('status') ?? 'unknown'
  const isSuccess = status === 'approved' || confirmedStatus === 'paid'
  const isCanceled = status === 'canceled'

  useEffect(() => {
    const rawPaymentId = params.get('payment_id') ?? sessionStorage.getItem('airmess_pending_payment_id')
    const paymentId = Number(rawPaymentId)

    void (async () => {
      if (Number.isInteger(paymentId) && paymentId > 0) {
        try {
          const confirmation = await confirmUserPayment(paymentId)
          setConfirmedStatus(confirmation.status)
          if (confirmation.status === 'paid') {
            sessionStorage.removeItem('airmess_pending_payment_id')
          }
        } catch {
          setConfirmedStatus('processing')
        }
      }

      await fetchMe()
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['wallet'] }),
        queryClient.invalidateQueries({ queryKey: ['courses'] }),
        queryClient.invalidateQueries({ queryKey: ['notifications'] }),
      ])
    })()
  }, [fetchMe, params, queryClient])

  return (
    <div className="min-h-screen bg-cream">
      <AppHeader />
      <main className="max-w-2xl mx-auto px-4 md:px-6 py-10 md:py-16">
        <Card variant="signature" padding="lg" className="text-center ams-anim-scale-in">
          {isSuccess && (
            <>
              <div className="text-display-1 mb-4">🎉</div>
              <h2 className="text-h1 text-ink">{t('billing.successReceivedTitle')}</h2>
              <p className="text-body text-warm-500 mt-3 max-w-md mx-auto">
                {t('billing.successReceivedBody')}
              </p>
            </>
          )}

          {isCanceled && (
            <>
              <div className="text-display-1 mb-4">↩️</div>
              <h2 className="text-h1 text-ink">{t('billing.canceledTitle')}</h2>
              <p className="text-body text-warm-500 mt-3 max-w-md mx-auto">
                {t('billing.canceledBody')}
              </p>
            </>
          )}

          {!isSuccess && !isCanceled && (
            <>
              <div className="text-display-1 mb-4">⏳</div>
              <h2 className="text-h1 text-ink">{t('billing.processingTitle')}</h2>
              <p className="text-body text-warm-500 mt-3 max-w-md mx-auto">
                {t('billing.processingBody')}
              </p>
            </>
          )}

          <div className="flex justify-center gap-3 mt-8 flex-wrap">
            <Button variant="secondary" size="md" onClick={() => navigate('/wallet')}>
              {t('billing.myWalletCta')}
            </Button>
            <Button variant="dark" size="md" pill onClick={() => navigate('/dashboard')}>
              {t('billing.dashboardCta')}
            </Button>
          </div>
        </Card>
      </main>
    </div>
  )
}
