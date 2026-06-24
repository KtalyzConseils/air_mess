import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import AppHeader from '../components/AppHeader'
import {
  fetchWallet,
  requestTopUp,
  type WalletTransaction,
  type WalletTransactionType,
} from '../api/wallet'

const TX_META: Record<WalletTransactionType, { label: string; icon: string; positive: boolean }> = {
  deposit:           { label: 'Rechargement',     icon: '⬇️', positive: true  },
  course_charge:     { label: 'Course livrée',    icon: '📦', positive: false },
  refund:            { label: 'Remboursement',    icon: '↩️', positive: true  },
  adjustment_credit: { label: 'Crédit admin',     icon: '✨', positive: true  },
  adjustment_debit:  { label: 'Débit admin',      icon: '⚠️', positive: false },
}

const QUICK_AMOUNTS = [5000, 10000, 25000, 50000]

function formatFcfa(n: number): string {
  return n.toLocaleString('fr-FR') + ' FCFA'
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export default function MyWalletPage() {
  const [showTopUp, setShowTopUp] = useState(false)
  const [topUpAmount, setTopUpAmount] = useState<string>('5000')

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['wallet'],
    queryFn: fetchWallet,
  })

  const topUpMutation = useMutation({
    mutationFn: (amount: number) =>
      requestTopUp(amount, `${window.location.origin}/billing/return`),
    onSuccess: (res) => {
      // Redirection vers Fedapay. Le wallet sera crédité via webhook.
      window.location.href = res.checkout_url
    },
    onError: (err) => {
      const msg =
        err instanceof AxiosError
          ? err.response?.data?.message ?? 'Erreur lors de la création du paiement.'
          : 'Erreur inattendue.'
      window.alert(`⚠️ ${msg}`)
    },
  })

  function submitTopUp() {
    const n = parseInt(topUpAmount, 10)
    if (!n || n < 500) {
      window.alert('Le montant minimum de rechargement est de 500 FCFA.')
      return
    }
    topUpMutation.mutate(n)
  }

  if (isLoading || !data) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppHeader />
        <main className="max-w-3xl mx-auto p-6">
          <div className="text-center py-20 text-gray-500">Chargement du wallet…</div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader />
      <main className="max-w-3xl mx-auto p-4 md:p-6">
        <h2 className="text-2xl font-bold text-airmess-dark mb-1">💰 Mon wallet</h2>
        <p className="text-sm text-gray-500 mb-4">
          Rechargez votre wallet pour payer vos courses automatiquement. Si le solde est insuffisant,
          la course passe en paiement direct.
        </p>

        {/* Bandeau si solde bas */}
        {data.is_low && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-4 text-sm text-amber-900">
            ⚠️ Votre solde est inférieur au minimum recommandé ({formatFcfa(data.min_recommended_fcfa)}).
            Rechargez maintenant pour éviter les paiements directs à chaque course.
          </div>
        )}

        {/* Carte balance */}
        <section className="bg-airmess-dark text-white rounded-2xl shadow-sm p-6 mb-4">
          <p className="text-xs uppercase tracking-wide text-gray-300 mb-1">Solde disponible</p>
          <p className="text-4xl md:text-5xl font-bold">{formatFcfa(data.available)}</p>

          {data.pending_reserved > 0 && (
            <p className="text-xs text-gray-300 mt-2">
              dont {formatFcfa(data.pending_reserved)} réservés pour des courses en cours
            </p>
          )}

          <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-gray-400 text-xs">Total rechargé</p>
              <p className="font-semibold">{formatFcfa(data.total_deposited)}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs">Total dépensé</p>
              <p className="font-semibold">{formatFcfa(data.total_spent)}</p>
            </div>
          </div>

          <button
            onClick={() => setShowTopUp(true)}
            className="mt-5 w-full bg-airmess-yellow text-airmess-dark font-bold py-3 rounded-lg hover:opacity-90 transition"
          >
            + Recharger
          </button>
        </section>

        {/* Historique */}
        <section className="bg-white rounded-2xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-airmess-dark">Historique</h3>
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="text-xs text-gray-500 hover:text-airmess-dark"
            >
              {isFetching ? '…' : '↻ Actualiser'}
            </button>
          </div>

          {data.recent_transactions.length === 0 ? (
            <p className="text-sm text-gray-500 py-8 text-center">
              Aucune transaction pour l'instant. Rechargez votre wallet pour commencer.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {data.recent_transactions.map((tx: WalletTransaction) => {
                const meta = TX_META[tx.type]
                return (
                  <li key={tx.id} className="py-3 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2 min-w-0">
                      <span className="text-lg">{meta.icon}</span>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-800 text-sm">{meta.label}</p>
                        <p className="text-xs text-gray-500">
                          {formatDateTime(tx.created_at)}
                          {tx.course && <> · course <span className="font-mono">{tx.course.reference}</span></>}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`font-semibold ${meta.positive ? 'text-green-700' : 'text-red-700'}`}>
                        {meta.positive ? '+' : ''}{tx.amount_fcfa.toLocaleString('fr-FR')}
                      </p>
                      <p className="text-[11px] text-gray-400">solde : {tx.balance_after.toLocaleString('fr-FR')}</p>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </main>

      {/* Modal top-up */}
      {showTopUp && (
        <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl p-6">
            <h3 className="text-xl font-bold text-airmess-dark mb-1">Recharger le wallet</h3>
            <p className="text-sm text-gray-500 mb-4">
              Vous serez redirigé vers Fedapay pour le paiement. Le wallet sera crédité dès confirmation.
            </p>

            <div className="grid grid-cols-2 gap-2 mb-4">
              {QUICK_AMOUNTS.map((a) => (
                <button
                  key={a}
                  onClick={() => setTopUpAmount(String(a))}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold border transition ${
                    topUpAmount === String(a)
                      ? 'bg-airmess-yellow border-airmess-yellow text-airmess-dark'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  {formatFcfa(a)}
                </button>
              ))}
            </div>

            <label className="block text-sm font-medium text-gray-700 mb-1">Montant personnalisé</label>
            <div className="relative">
              <input
                type="number"
                min={500}
                step={500}
                value={topUpAmount}
                onChange={(e) => setTopUpAmount(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-16 focus:ring-2 focus:ring-airmess-yellow outline-none"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">FCFA</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">Minimum 500 FCFA — recommandé {formatFcfa(data.min_recommended_fcfa)}</p>

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setShowTopUp(false)}
                className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 hover:bg-gray-50 font-medium"
              >
                Annuler
              </button>
              <button
                onClick={submitTopUp}
                disabled={topUpMutation.isPending}
                className="flex-1 bg-airmess-dark text-white px-4 py-2.5 rounded-lg font-semibold hover:opacity-90 disabled:opacity-50"
              >
                {topUpMutation.isPending ? 'Redirection…' : 'Payer →'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
