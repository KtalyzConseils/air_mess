import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import api from '../../api/client'
import type { AdminEarning, AdminPayout } from '../../api/admin/payouts'
import { generatePayout, markPayoutPaid } from '../../api/admin/payouts'
import ConfirmModal from '../ConfirmModal'

interface DriverPayoutsResponse {
  driver: { id: number; first_name: string; last_name: string }
  pending_balance_fcfa: number
  total_paid_out_fcfa: number
  earnings: {
    data: AdminEarning[]
    current_page: number
    last_page: number
    total: number
  }
  payouts: AdminPayout[]
}

function formatFcfa(n: number): string {
  return n.toLocaleString('fr-FR') + ' FCFA'
}
function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

const PAYOUT_STATUS: Record<string, { label: string; classes: string }> = {
  pending: { label: 'En attente', classes: 'bg-amber-100 text-amber-800' },
  paid:    { label: 'Versé',      classes: 'bg-green-100 text-green-800' },
  failed:  { label: 'Échoué',     classes: 'bg-red-100 text-red-800' },
}

const METHOD_LABEL: Record<string, string> = {
  mobile_money:  '📱 Mobile Money',
  bank_transfer: '🏦 Virement bancaire',
  cash:          '💵 Espèces',
}

export default function DriverPayoutsSection({ driverId }: { driverId: number }) {
  const queryClient = useQueryClient()
  const queryKey = ['admin', 'driver', driverId, 'earnings']

  // États des modaux
  const [genOpen, setGenOpen] = useState(false)
  const [confirmPayoutId, setConfirmPayoutId] = useState<number | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // --- Query : récupérer les données ---
  const { data, isLoading, isError } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data } = await api.get<DriverPayoutsResponse>(`/admin/drivers/${driverId}/earnings`)
      return data
    },
  })

  // --- Mutation 1 : générer un versement ---
  const generateMutation = useMutation({
    mutationFn: (payload: { method: 'mobile_money' | 'bank_transfer' | 'cash'; destination?: string }) =>
      generatePayout(driverId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey })
      setGenOpen(false)
      setErrorMsg(null)
    },
    onError: (err) => {
      const msg =
        err instanceof AxiosError
          ? err.response?.data?.message ?? 'Erreur lors de la génération.'
          : 'Erreur lors de la génération.'
      setErrorMsg(msg)
    },
  })

  // --- Mutation 2 : marquer comme payé ---
  const markPaidMutation = useMutation({
    mutationFn: (payoutId: number) => markPayoutPaid(payoutId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey })
      setConfirmPayoutId(null)
    },
    onError: (err) => {
      const msg =
        err instanceof AxiosError
          ? err.response?.data?.message ?? 'Action impossible.'
          : 'Action impossible.'
      window.alert(msg)
    },
  })

  if (isLoading) return <p className="text-gray-500 text-sm">Chargement des versements…</p>
  if (isError || !data) return <p className="text-red-600 text-sm">Erreur de chargement.</p>

  const earnings = data.earnings.data
  const payouts = data.payouts
  const canGenerate = data.pending_balance_fcfa > 0

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-airmess-dark">Gains & versements</h3>
        <button
          onClick={() => setGenOpen(true)}
          disabled={!canGenerate}
          className="px-3 py-1.5 rounded-lg bg-airmess-yellow text-airmess-dark text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
          title={canGenerate ? 'Générer un versement' : 'Aucun gain en attente'}
        >
          💸 Générer un versement
        </button>
      </div>

      {/* 2 KPIs */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-airmess-yellow rounded-2xl p-5">
          <p className="text-xs uppercase font-bold text-airmess-dark tracking-wider">Solde en attente</p>
          <p className="text-3xl font-bold text-airmess-dark mt-2">{formatFcfa(data.pending_balance_fcfa)}</p>
          <p className="text-xs text-airmess-dark/70 mt-1">
            {data.earnings.total} course{data.earnings.total > 1 ? 's' : ''} en attente
          </p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-200">
          <p className="text-xs uppercase font-bold text-gray-500 tracking-wider">Total versé tout temps</p>
          <p className="text-3xl font-bold text-airmess-dark mt-2">{formatFcfa(data.total_paid_out_fcfa)}</p>
        </div>
      </div>

      {/* Liste earnings pending */}
      <div className="bg-white rounded-2xl shadow-sm p-5 mb-4">
        <h4 className="font-semibold text-airmess-dark mb-3">Courses à régler ({earnings.length})</h4>
        {earnings.length === 0 ? (
          <p className="text-sm text-gray-400">Aucune course en attente de règlement.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {earnings.slice(0, 10).map((e) => (
              <li key={e.id} className="py-2 flex justify-between text-sm">
                <span className="text-gray-700">
                  {e.course?.reference ?? '?'} · livrée le {formatDate(e.course?.delivered_at ?? null)}
                </span>
                <span className="font-semibold text-airmess-dark">+{formatFcfa(e.amount_fcfa)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Liste payouts */}
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <h4 className="font-semibold text-airmess-dark mb-3">Historique des versements ({payouts.length})</h4>
        {payouts.length === 0 ? (
          <p className="text-sm text-gray-400">Aucun versement pour le moment.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {payouts.map((p) => {
              const meta = PAYOUT_STATUS[p.status] ?? PAYOUT_STATUS.pending
              return (
                <li key={p.id} className="py-3 flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-airmess-dark">{formatFcfa(p.total_amount_fcfa)}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {p.earnings_count} course{p.earnings_count > 1 ? 's' : ''} · {METHOD_LABEL[p.method] ?? p.method}
                      {p.paid_at && ` · payé le ${formatDate(p.paid_at)}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${meta.classes}`}>
                      {meta.label}
                    </span>
                    {p.status === 'pending' && (
                      <button
                        onClick={() => setConfirmPayoutId(p.id)}
                        className="px-2 py-1 rounded text-xs font-semibold bg-green-600 text-white hover:opacity-90"
                      >
                        Marquer payé
                      </button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Modal : générer versement */}
      <GeneratePayoutModal
        visible={genOpen}
        balance={data.pending_balance_fcfa}
        isPending={generateMutation.isPending}
        errorMsg={errorMsg}
        onClose={() => { setGenOpen(false); setErrorMsg(null) }}
        onConfirm={(payload) => generateMutation.mutate(payload)}
      />

      {/* Modal : marquer comme payé */}
      <ConfirmModal
        visible={confirmPayoutId !== null}
        title="Confirmer le versement effectué"
        description={
          'Cette action marque le versement comme PAYÉ.\n\n' +
          'Tu confirmes que tu as effectivement viré l\'argent au livreur ' +
          '(via MoMo, virement, ou cash) ?'
        }
        confirmLabel="Oui, j'ai viré l'argent"
        confirmVariant="success"
        isPending={markPaidMutation.isPending}
        onConfirm={() => confirmPayoutId && markPaidMutation.mutate(confirmPayoutId)}
        onClose={() => setConfirmPayoutId(null)}
      />
    </section>
  )
}

// ===== Sous-composant : modal de génération =====

function GeneratePayoutModal({
  visible,
  balance,
  isPending,
  errorMsg,
  onClose,
  onConfirm,
}: {
  visible: boolean
  balance: number
  isPending: boolean
  errorMsg: string | null
  onClose: () => void
  onConfirm: (payload: { method: 'mobile_money' | 'bank_transfer' | 'cash'; destination?: string }) => void
}) {
  const [method, setMethod] = useState<'mobile_money' | 'bank_transfer' | 'cash'>('mobile_money')
  const [destination, setDestination] = useState('')

  if (!visible) return null

  const needsDestination = method !== 'cash'
  const canSubmit = !isPending && (!needsDestination || destination.trim().length > 0)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
        <h3 className="text-lg font-bold text-airmess-dark">Générer un versement</h3>
        <p className="text-sm text-gray-600 mt-2">
          Montant à verser : <strong className="text-airmess-dark">{formatFcfa(balance)}</strong>
        </p>

        <label className="block text-xs uppercase text-gray-500 font-semibold mt-4 mb-1">
          Méthode
        </label>
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value as typeof method)}
          disabled={isPending}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-airmess-yellow text-sm"
        >
          {Object.entries(METHOD_LABEL).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>

        {needsDestination && (
          <>
            <label className="block text-xs uppercase text-gray-500 font-semibold mt-4 mb-1">
              {method === 'mobile_money' ? 'Numéro MoMo' : 'IBAN / RIB'}
            </label>
            <input
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder={method === 'mobile_money' ? '+229 XX XX XX XX' : 'BJ66 XXXX…'}
              disabled={isPending}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-airmess-yellow text-sm"
            />
          </>
        )}

        {errorMsg && (
          <p className="text-sm text-airmess-red mt-3 bg-red-50 p-2 rounded">{errorMsg}</p>
        )}

        <div className="flex justify-end gap-2 mt-5">
          <button
            onClick={onClose}
            disabled={isPending}
            className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 text-sm font-medium"
          >
            Annuler
          </button>
          <button
            onClick={() => onConfirm({
              method,
              destination: needsDestination ? destination.trim() : undefined,
            })}
            disabled={!canSubmit}
            className="px-4 py-2 rounded-lg font-semibold text-sm bg-airmess-yellow text-airmess-dark hover:opacity-90 disabled:opacity-50"
          >
            {isPending ? 'Création…' : 'Générer'}
          </button>
        </div>
      </div>
    </div>
  )
}
