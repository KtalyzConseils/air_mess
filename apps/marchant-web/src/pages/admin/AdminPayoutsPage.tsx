import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import AdminHeader from '../../components/AdminHeader'
import ConfirmModal from '../../components/ConfirmModal'
import { fetchAllPayouts, markPayoutPaid, type AdminPayoutWithDriver } from '../../api/admin/payouts'

type StatusFilter = 'all' | 'pending' | 'paid' | 'failed'

const FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all',     label: 'Tous' },
  { key: 'pending', label: 'En attente' },
  { key: 'paid',    label: 'Payés' },
  { key: 'failed',  label: 'Échoués' },
]

const STATUS_META: Record<string, { label: string; classes: string }> = {
  pending: { label: 'En attente', classes: 'bg-amber-100 text-amber-800' },
  paid:    { label: 'Payé',       classes: 'bg-green-100 text-green-800' },
  failed:  { label: 'Échoué',     classes: 'bg-red-100 text-red-800' },
}

const METHOD_LABEL: Record<string, string> = {
  mobile_money:  '📱 MoMo',
  bank_transfer: '🏦 Virement',
  cash:          '💵 Espèces',
}

function formatFcfa(n: number): string {
  return n.toLocaleString('fr-FR') + ' FCFA'
}
function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function AdminPayoutsPage() {
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<StatusFilter>('pending')
  const [page, setPage] = useState(1)
  const [confirmPayoutId, setConfirmPayoutId] = useState<number | null>(null)

  const queryKey = ['admin', 'payouts', filter, page]

  const { data, isLoading, isError } = useQuery({
    queryKey,
    queryFn: () => fetchAllPayouts({
      status: filter === 'all' ? undefined : filter,
      page,
    }),
  })

  const markPaidMutation = useMutation({
    mutationFn: (payoutId: number) => markPayoutPaid(payoutId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'payouts'] })
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

  const totalPending = data?.data.filter((p) => p.status === 'pending')
    .reduce((sum, p) => sum + p.total_amount_fcfa, 0) ?? 0

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />
      <main className="max-w-6xl mx-auto p-4 md:p-6">
        <h2 className="text-2xl font-bold text-airmess-dark mb-1">Versements aux livreurs</h2>
        <p className="text-sm text-gray-500 mb-6">
          Vue d'ensemble de tous les versements générés. Génère un versement depuis la fiche d'un livreur.
        </p>

        {/* KPI pending dans la page */}
        {filter === 'pending' && data && data.data.length > 0 && (
          <div className="bg-airmess-yellow rounded-2xl p-5 mb-4">
            <p className="text-xs uppercase font-bold text-airmess-dark tracking-wider">
              Total à verser maintenant
            </p>
            <p className="text-3xl font-bold text-airmess-dark mt-2">
              {formatFcfa(totalPending)}
            </p>
            <p className="text-xs text-airmess-dark/70 mt-1">
              {data.data.filter((p) => p.status === 'pending').length} versement{data.data.filter((p) => p.status === 'pending').length > 1 ? 's' : ''} en attente sur cette page
            </p>
          </div>
        )}

        {/* Filtres */}
        <div className="flex gap-1 bg-white rounded-lg p-1 shadow-sm w-fit mb-4">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => { setFilter(f.key); setPage(1) }}
              className={`px-3 py-1.5 rounded text-sm font-medium transition ${
                filter === f.key ? 'bg-airmess-dark text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Tableau */}
        <div className="bg-white rounded-2xl shadow-sm overflow-x-auto">
          {isLoading && <div className="p-10 text-center text-gray-500">Chargement…</div>}
          {isError && <div className="p-10 text-center text-red-600">Erreur de chargement.</div>}
          {data && data.data.length === 0 && (
            <div className="p-10 text-center text-gray-500">Aucun versement avec ce filtre.</div>
          )}
          {data && data.data.length > 0 && (
            <table className="w-full text-sm min-w-[800px]">
              <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                <tr>
                  <th className="px-6 py-3 text-left">Livreur</th>
                  <th className="px-6 py-3 text-right">Montant</th>
                  <th className="px-6 py-3 text-center">Courses</th>
                  <th className="px-6 py-3 text-left">Méthode</th>
                  <th className="px-6 py-3 text-left">Période</th>
                  <th className="px-6 py-3 text-center">Statut</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.data.map((p) => <PayoutRow key={p.id} payout={p} onMarkPaid={() => setConfirmPayoutId(p.id)} />)}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {data && data.last_page > 1 && (
          <div className="flex justify-between items-center mt-4 text-sm">
            <span className="text-gray-500">
              Page {data.current_page} / {data.last_page} · {data.total} versements au total
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded border border-gray-300 disabled:opacity-50 hover:bg-gray-50"
              >
                ← Précédent
              </button>
              <button
                disabled={page >= data.last_page}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 rounded border border-gray-300 disabled:opacity-50 hover:bg-gray-50"
              >
                Suivant →
              </button>
            </div>
          </div>
        )}

        <ConfirmModal
          visible={confirmPayoutId !== null}
          title="Confirmer le versement effectué"
          description={
            'Cette action marque le versement comme PAYÉ.\n\n' +
            'Tu confirmes que tu as effectivement viré l\'argent au livreur ?'
          }
          confirmLabel="Oui, j'ai viré l'argent"
          confirmVariant="success"
          isPending={markPaidMutation.isPending}
          onConfirm={() => confirmPayoutId && markPaidMutation.mutate(confirmPayoutId)}
          onClose={() => setConfirmPayoutId(null)}
        />
      </main>
    </div>
  )
}

function PayoutRow({ payout, onMarkPaid }: { payout: AdminPayoutWithDriver; onMarkPaid: () => void }) {
  const meta = STATUS_META[payout.status] ?? STATUS_META.pending
  const driverName = payout.driver
    ? `${payout.driver.first_name} ${payout.driver.last_name}`
    : '—'

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-3">
        {payout.driver ? (
          <Link
            to={`/admin/drivers/${payout.driver.id}`}
            className="font-medium text-airmess-dark hover:underline"
          >
            {driverName}
          </Link>
        ) : (
          <span className="text-gray-400">{driverName}</span>
        )}
        {payout.destination && (
          <p className="text-xs text-gray-500 mt-0.5">{payout.destination}</p>
        )}
      </td>
      <td className="px-6 py-3 text-right font-semibold text-airmess-dark">
        {formatFcfa(payout.total_amount_fcfa)}
      </td>
      <td className="px-6 py-3 text-center text-gray-600">{payout.earnings_count}</td>
      <td className="px-6 py-3 text-gray-600 text-xs">{METHOD_LABEL[payout.method] ?? payout.method}</td>
      <td className="px-6 py-3 text-gray-600 text-xs">
        {formatDate(payout.period_start)}<br />→ {formatDate(payout.period_end)}
      </td>
      <td className="px-6 py-3 text-center">
        <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${meta.classes}`}>
          {meta.label}
        </span>
      </td>
      <td className="px-6 py-3 text-right">
        {payout.status === 'pending' && (
          <button
            onClick={onMarkPaid}
            className="px-3 py-1 rounded text-xs font-semibold bg-green-600 text-white hover:opacity-90"
          >
            Marquer payé
          </button>
        )}
        {payout.status === 'paid' && payout.paid_at && (
          <span className="text-xs text-gray-500">payé le {formatDate(payout.paid_at)}</span>
        )}
      </td>
    </tr>
  )
}
