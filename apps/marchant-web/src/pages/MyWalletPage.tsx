import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import { useTranslation } from 'react-i18next'
import AppHeader from '../components/AppHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Highlight from '../components/Highlight'
import PageEyebrow from '../components/ui/PageEyebrow'
import { cn } from '../lib/cn'
import {
  fetchWallet,
  requestTopUp,
  requestWithdraw,
  cancelWithdraw,
  type WalletTransaction,
  type WalletTransactionType,
  type WithdrawMethod,
} from '../api/wallet'

const TX_META: Record<WalletTransactionType, { labelKey: string; icon: string; positive: boolean }> = {
  deposit:           { labelKey: 'wallet.txDeposit',          icon: '⬇️', positive: true  },
  course_charge:     { labelKey: 'wallet.txCourseCharge',     icon: '📦', positive: false },
  refund:            { labelKey: 'wallet.txRefund',           icon: '↩️', positive: true  },
  adjustment_credit: { labelKey: 'wallet.txAdjustmentCredit', icon: '✨', positive: true  },
  adjustment_debit:  { labelKey: 'wallet.txAdjustmentDebit',  icon: '⚠️', positive: false },
  withdraw:          { labelKey: 'wallet.txWithdraw',         icon: '🏦', positive: false },
  collection_credit: { labelKey: 'wallet.txCollectionCredit', icon: '💵', positive: true  },
  adjustment_incident: { labelKey: 'wallet.txAdjustmentIncident', icon: '⚖️', positive: false },
}

const QUICK_AMOUNTS = [5000, 10000, 25000, 50000]

function formatFcfa(n: number, locale: string = 'fr-FR'): string {
  return n.toLocaleString(locale) + ' FCFA'
}

function formatDateTime(value: string, locale: string = 'fr-FR'): string {
  return new Date(value).toLocaleString(locale, {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export default function MyWalletPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language === 'en' ? 'en-US' : 'fr-FR'
  const queryClient = useQueryClient()
  const [showTopUp, setShowTopUp] = useState(false)
  const [topUpAmount, setTopUpAmount] = useState<string>('5000')
  const [showWithdraw, setShowWithdraw] = useState(false)
  const [withdrawAmount, setWithdrawAmount] = useState<string>('')
  const [withdrawMethod, setWithdrawMethod] = useState<WithdrawMethod>('momo')
  const [withdrawAccount, setWithdrawAccount] = useState<string>('')

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['wallet'],
    queryFn: fetchWallet,
  })

  const topUpMutation = useMutation({
    mutationFn: (amount: number) =>
      requestTopUp(amount, `${window.location.origin}/billing/return`),
    onSuccess: (res) => {
      sessionStorage.setItem('airmess_pending_payment_id', String(res.payment_id))
      window.location.href = res.checkout_url
    },
    onError: (err) => {
      const msg =
        err instanceof AxiosError
          ? err.response?.data?.message ?? t('wallet.paymentCreateError')
          : t('common.unexpectedError')
      window.alert(`⚠️ ${msg}`)
    },
  })

  const withdrawMutation = useMutation({
    mutationFn: () =>
      requestWithdraw({
        amount: parseInt(withdrawAmount, 10),
        target_method: withdrawMethod,
        target_account: withdrawAccount.trim(),
      }),
    onSuccess: () => {
      setShowWithdraw(false)
      setWithdrawAmount('')
      setWithdrawAccount('')
      queryClient.invalidateQueries({ queryKey: ['wallet'] })
      queryClient.invalidateQueries({ queryKey: ['me', 'wallet'] })
    },
    onError: (err) => {
      const msg =
        err instanceof AxiosError
          ? err.response?.data?.message ?? t('wallet.withdrawRequestError')
          : t('common.unexpectedError')
      window.alert(`⚠️ ${msg}`)
    },
  })

  const cancelWithdrawMutation = useMutation({
    mutationFn: (id: number) => cancelWithdraw(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet'] })
      queryClient.invalidateQueries({ queryKey: ['me', 'wallet'] })
    },
    onError: (err) => {
      const msg =
        err instanceof AxiosError
          ? err.response?.data?.message ?? t('wallet.cancelWithdrawError')
          : t('common.unexpectedError')
      window.alert(`⚠️ ${msg}`)
    },
  })

  function submitTopUp() {
    const n = parseInt(topUpAmount, 10)
    if (!n || n < 500) {
      window.alert(t('wallet.minTopUpError'))
      return
    }
    topUpMutation.mutate(n)
  }

  function submitWithdraw() {
    const n = parseInt(withdrawAmount, 10)
    if (!data) return
    if (!n || n < data.min_withdraw_fcfa) {
      window.alert(t('wallet.minWithdrawError', { amount: formatFcfa(data.min_withdraw_fcfa, locale) }))
      return
    }
    if (n > data.available) {
      window.alert(t('wallet.insufficientBalanceError', { amount: formatFcfa(data.available, locale) }))
      return
    }
    if (!withdrawAccount.trim()) {
      window.alert(t('wallet.accountRequiredError'))
      return
    }
    withdrawMutation.mutate()
  }

  if (isLoading || !data) {
    return (
      <div className="min-h-screen bg-cream">
        <AppHeader />
        <main className="max-w-3xl mx-auto px-4 md:px-6 py-12 text-center text-warm-500">
          {t('wallet.loadingWallet')}
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream">
      <AppHeader />
      <main className="max-w-3xl mx-auto px-4 md:px-6 py-8 md:py-12">
        <PageEyebrow label={t('wallet.eyebrow')} className="mb-4" />
        <h1 className="text-h1 md:text-display-2 text-ink leading-tight mb-2">
          {t('wallet.titleStart')} <Highlight>{t('wallet.titleHighlight')}</Highlight>{t('wallet.titleEnd')}
        </h1>
        <p className="text-body-l text-warm-500 mb-8">
          {t('wallet.subtitle')}
        </p>

        {/* Bandeau si solde bas */}
        {data.is_low && (
          <Card padding="md" className="mb-4 bg-warning-bg! border-warning/30! flex items-start gap-3">
            <span className="text-h3" aria-hidden>⚠️</span>
            <div className="text-warning">
              <p className="font-bold text-body">{t('wallet.lowBalance')}</p>
              <p className="text-body-s mt-0.5">
                {t('wallet.lowBalanceBody', { amount: formatFcfa(data.min_recommended_fcfa, locale) })}
              </p>
            </div>
          </Card>
        )}

        {/* ============================================================
            CARTE BALANCE — sombre signature, halo subtil
            ============================================================ */}
        <Card variant="dark" padding="lg" className="mb-6 relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-airmess-yellow/10 blur-3xl pointer-events-none" aria-hidden />
          <div className="relative">
            <p className="text-eyebrow uppercase text-warm-300 mb-2">{t('wallet.balanceLabel')}</p>
            <p className="text-display-1 text-airmess-yellow tabular-nums leading-none">
              {data.balance.toLocaleString(locale)}
              <span className="text-h2 text-warm-300 ml-2 font-normal">FCFA</span>
            </p>

            {data.pending_reserved > 0 && (
              <p className="text-caption text-warm-300 mt-3">
                {t('wallet.reservedForOngoing', { amount: formatFcfa(data.pending_reserved, locale) })}
                {' · '}
                <span className="font-semibold text-cream">
                  {t('wallet.availableBalance')} : {formatFcfa(data.available, locale)}
                </span>
              </p>
            )}

            <div className="mt-6 pt-5 border-t border-warm-600/30 grid grid-cols-2 gap-4 text-body-s">
              <div>
                <p className="text-caption text-warm-400">{t('wallet.totalDeposited')}</p>
                <p className="font-bold text-cream tabular-nums">{formatFcfa(data.total_deposited, locale)}</p>
              </div>
              <div>
                <p className="text-caption text-warm-400">{t('wallet.totalSpent')}</p>
                <p className="font-bold text-cream tabular-nums">{formatFcfa(data.total_spent, locale)}</p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                variant="primary"
                size="lg"
                pill
                fullWidth
                onClick={() => setShowTopUp(true)}
                rightIcon={<span aria-hidden>→</span>}
              >
                {t('wallet.topUp')}
              </Button>
              <Button
                variant="secondary"
                size="lg"
                pill
                fullWidth
                onClick={() => setShowWithdraw(true)}
                disabled={data.available < data.min_withdraw_fcfa || !!data.pending_withdraw_request}
                rightIcon={<span aria-hidden>↗</span>}
              >
                {t('wallet.withdraw')}
              </Button>
            </div>
          </div>
        </Card>

        {/* ============================================================
            DEMANDE DE RETRAIT EN COURS (si présente)
            ============================================================ */}
        {data.pending_withdraw_request && (
          <Card variant="default" padding="md" className="mb-6 bg-info-bg! border-info/30!">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-eyebrow uppercase text-info font-bold mb-1">{t('wallet.pendingWithdrawTitle')}</p>
                <p className="text-body font-bold text-ink">
                  {formatFcfa(data.pending_withdraw_request.amount_fcfa, locale)}
                </p>
                <p className="text-body-s text-warm-600 mt-0.5">
                  {t('wallet.pendingWithdrawTo', { method: data.pending_withdraw_request.target_method.toUpperCase(), account: data.pending_withdraw_request.target_account })}
                </p>
                <p className="text-caption text-warm-500 mt-1">
                  {t('wallet.pendingWithdrawCreated', { date: formatDateTime(data.pending_withdraw_request.created_at, locale) })}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (data.pending_withdraw_request && window.confirm(t('wallet.cancelWithdrawConfirm'))) {
                    cancelWithdrawMutation.mutate(data.pending_withdraw_request.id)
                  }
                }}
                loading={cancelWithdrawMutation.isPending}
                className="text-airmess-red! shrink-0"
              >
                {t('common.cancel')}
              </Button>
            </div>
          </Card>
        )}

        {/* ============================================================
            HISTORIQUE
            ============================================================ */}
        <Card variant="default" padding="md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-h3 text-ink font-bold">{t('wallet.history')}</h3>
            <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isFetching}>
              {isFetching ? '…' : t('wallet.refresh')}
            </Button>
          </div>

          {data.recent_transactions.length === 0 ? (
            <p className="text-body-s text-warm-500 py-10 text-center">
              {t('wallet.historyEmpty')}
            </p>
          ) : (
            <ul className="divide-y divide-warm-100">
              {data.recent_transactions.map((tx: WalletTransaction) => {
                // Fallback : un type inconnu (nouveau côté API) ne doit jamais
                // faire planter la page. Le signe suit le montant réel (ex.
                // adjustment_incident peut être un crédit OU un débit).
                const meta = TX_META[tx.type] ?? { labelKey: 'wallet.txOther', icon: '•', positive: tx.amount_fcfa >= 0 }
                const positive = tx.amount_fcfa >= 0
                return (
                  <li key={tx.id} className="py-3 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <span className="text-h3 leading-none shrink-0" aria-hidden>{meta.icon}</span>
                      <div className="min-w-0">
                        <p className="text-body font-medium text-ink">{t(meta.labelKey)}</p>
                        <p className="text-caption text-warm-500">
                          {formatDateTime(tx.created_at, locale)}
                          {tx.course && (
                            <> · {t('wallet.onCourse')} <span className="font-mono text-warm-400">{tx.course.reference}</span></>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p
                        className={cn(
                          'text-body font-bold tabular-nums',
                          positive ? 'text-success' : 'text-airmess-red',
                        )}
                      >
                        {positive ? '+' : '−'}{Math.abs(tx.amount_fcfa).toLocaleString(locale)}
                      </p>
                      <p className="text-caption text-warm-400 tabular-nums">
                        {t('wallet.balanceLabel')} : {tx.balance_after.toLocaleString(locale)}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>
      </main>

      {/* ============================================================
          MODAL RETRAIT
          ============================================================ */}
      {showWithdraw && (
        <div className="fixed inset-0 bg-ink/60 backdrop-blur-sm flex items-end md:items-center justify-center z-50 p-4 ams-anim-fade-in">
          <Card variant="signature" padding="lg" className="w-full max-w-md ams-anim-scale-in">
            <h3 className="text-h2 text-ink font-bold">{t('wallet.withdrawModalTitle')}</h3>
            <p className="text-body-s text-warm-500 mt-1 mb-5">
              {t('wallet.withdrawModalSub')}
            </p>

            {/* Montant */}
            <label className="block text-caption text-warm-600 font-medium mb-1.5">
              {t('wallet.amountMinLabel', { amount: formatFcfa(data.min_withdraw_fcfa, locale) })}
            </label>
            <div className="relative mb-4">
              <input
                type="number"
                min={data.min_withdraw_fcfa}
                step={500}
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder={String(data.min_withdraw_fcfa)}
                className="w-full bg-off-white border border-warm-300 rounded-md px-3 py-2.5 pr-16 text-body text-ink transition-all duration-200 focus:outline-none focus:border-airmess-yellow focus:shadow-glow-yellow"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-body-s text-warm-500">
                FCFA
              </span>
            </div>

            {/* Méthode */}
            <label className="block text-caption text-warm-600 font-medium mb-1.5">{t('wallet.methodLabel')}</label>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {(['momo', 'bank'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setWithdrawMethod(m)}
                  className={cn(
                    'px-3 py-2 rounded-md text-body-s font-semibold border transition-all duration-200',
                    withdrawMethod === m
                      ? 'bg-airmess-yellow border-airmess-yellow text-ink'
                      : 'bg-off-white border-warm-300 text-warm-600 hover:border-warm-400',
                  )}
                >
                  {m === 'momo' ? t('wallet.methodMomo') : t('wallet.methodBank')}
                </button>
              ))}
            </div>

            {/* Numéro / IBAN */}
            <label className="block text-caption text-warm-600 font-medium mb-1.5">
              {withdrawMethod === 'momo' ? t('wallet.momoNumberLabel') : t('wallet.ibanLabel')}
            </label>
            <input
              type="text"
              value={withdrawAccount}
              onChange={(e) => setWithdrawAccount(e.target.value)}
              placeholder={withdrawMethod === 'momo' ? t('wallet.momoPlaceholder') : t('wallet.ibanPlaceholder')}
              className="w-full bg-off-white border border-warm-300 rounded-md px-3 py-2.5 text-body text-ink transition-all duration-200 focus:outline-none focus:border-airmess-yellow focus:shadow-glow-yellow font-mono"
            />
            <p className="text-caption text-warm-500 mt-1.5">
              {t('wallet.availableBalanceColon', { amount: formatFcfa(data.available, locale) })}
            </p>

            <div className="flex gap-3 mt-6">
              <Button
                variant="secondary"
                size="md"
                fullWidth
                onClick={() => setShowWithdraw(false)}
              >
                {t('common.cancel')}
              </Button>
              <Button
                variant="dark"
                size="md"
                pill
                fullWidth
                onClick={submitWithdraw}
                loading={withdrawMutation.isPending}
                rightIcon={!withdrawMutation.isPending && <span aria-hidden>→</span>}
              >
                {t('wallet.send')}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* ============================================================
          MODAL TOP-UP
          ============================================================ */}
      {showTopUp && (
        <div className="fixed inset-0 bg-ink/60 backdrop-blur-sm flex items-end md:items-center justify-center z-50 p-4 ams-anim-fade-in">
          <Card variant="signature" padding="lg" className="w-full max-w-md ams-anim-scale-in">
            <h3 className="text-h2 text-ink font-bold">{t('wallet.topUpModalTitle')}</h3>
            <p className="text-body-s text-warm-500 mt-1 mb-5">
              {t('wallet.topUpModalSub')}
            </p>

            {/* Quick amounts */}
            <Badge variant="neutral" size="sm" className="mb-2">{t('wallet.quickAmounts')}</Badge>
            <div className="grid grid-cols-2 gap-2 mb-5">
              {QUICK_AMOUNTS.map((a) => (
                <button
                  key={a}
                  onClick={() => setTopUpAmount(String(a))}
                  className={cn(
                    'px-3 py-2 rounded-md text-body-s font-semibold border transition-all duration-200',
                    topUpAmount === String(a)
                      ? 'bg-airmess-yellow border-airmess-yellow text-ink'
                      : 'bg-off-white border-warm-300 text-warm-600 hover:border-warm-400',
                  )}
                >
                  {formatFcfa(a, locale)}
                </button>
              ))}
            </div>

            <label className="block text-caption text-warm-600 font-medium mb-1.5">
              {t('wallet.customAmount')}
            </label>
            <div className="relative">
              <input
                type="number"
                min={500}
                step={500}
                value={topUpAmount}
                onChange={(e) => setTopUpAmount(e.target.value)}
                className="w-full bg-off-white border border-warm-300 rounded-md px-3 py-2.5 pr-16 text-body text-ink transition-all duration-200 focus:outline-none focus:border-airmess-yellow focus:shadow-glow-yellow"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-body-s text-warm-500">
                FCFA
              </span>
            </div>
            <p className="text-caption text-warm-500 mt-1.5">
              {t('wallet.minRecommended', { amount: formatFcfa(data.min_recommended_fcfa, locale) })}
            </p>

            <div className="flex gap-3 mt-6">
              <Button
                variant="secondary"
                size="md"
                fullWidth
                onClick={() => setShowTopUp(false)}
              >
                {t('common.cancel')}
              </Button>
              <Button
                variant="dark"
                size="md"
                pill
                fullWidth
                onClick={submitTopUp}
                loading={topUpMutation.isPending}
                rightIcon={!topUpMutation.isPending && <span aria-hidden>→</span>}
              >
                {t('wallet.pay')}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
