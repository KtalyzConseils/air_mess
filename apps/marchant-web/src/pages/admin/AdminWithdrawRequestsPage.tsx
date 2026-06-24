import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import AdminHeader from '../../components/AdminHeader'
import {
  fetchWithdrawRequests,
  type WithdrawRequestWithDriver,
  type WithdrawRequestListParams,
} from '../../api/admin'

type FilterKey = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'all'

const FILTERS: { key: FilterKey; label: string; params: WithdrawRequestListParams }[] = [
  { key: 'pending',   label: 'À traiter', params: { status: 'pending' } },
  { key: 'approved',  label: 'Approuvées', params: { status: 'approved' } },
  { key: 'rejected',  label: 'Rejetées',   params: { status: 'rejected' } },
  { key: 'cancelled', label: 'Annulées',   params: { status: 'cancelled' } },
  { key: 'all',       label: 'Tous',       params: {} },
]

const STATUS_BADGE: Record<string, { label: string; classes: string }> = {
  pending:   { label: 'En attente', classes: 'bg-amber-100 text-amber-800' },
  approved:  { label: 'Approuvée',  classes: 'bg-green-100 text-green-800' },
  rejected:  { label: 'Rejetée',    classes: 'bg-red-100 text-red-800' },
  cancelled: { label: 'Annulée',    classes: 'bg-gray-200 text-gray-700' },
}

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_BADGE[status] ?? { label: status, classes: 'bg-gray-100 text-gray-700' }
  return <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${meta.classes}`}>{meta.label}</span>
}

function formatFcfa(n: number): string {
  return n.toLocaleString('fr-FR') + ' FCFA'
}

function formatDateTime(value: string | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export default function AdminWithdrawRequestsPage() {
  const navigate = useNavigate()
  const [filterKey, setFilterKey] = useState<FilterKey>('pending')
  const [page, setPage] = useState(1)

  const activeFilter = FILTERS.find((f) => f.key === filterKey)!

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['admin', 'withdraw-requests', filterKey, page],
    queryFn: () => fetchWithdrawRequests({ ...activeFilter.params, page }),
    placeholderData: keepPreviousData,
  })

  const requests = data?.data ?? []

  function changeFilter(key: FilterKey) {
    setFilterKey(key)
    setPage(1)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />
      <main className="max-w-6xl mx-auto p-4 md:p-6">
        <h2 className="text-2xl font-bold text-airmess-dark mb-1">💸 Retraits caution livreurs</h2>
        <p className="text-sm text-gray-500 mb-6">
          Cliquez sur une ligne pour ouvrir la page de revue et décider d'approuver ou de rejeter.
        </p>

        <div className="flex gap-1 bg-white rounded-lg p-1 shadow-sm w-fit mb-4 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => changeFilter(f.key)}
              className={`px-3 py-1.5 rounded text-sm font-medium transition ${
                filterKey === f.key ? 'bg-airmess-dark text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm overflow-x-auto">
          {isLoading && <div className="p-10 text-center text-gray-500">Chargement…</div>}

          {!isLoading && requests.length === 0 && (
            <div className="p-10 text-center text-gray-500">Aucune demande dans ce filtre.</div>
          )}

          {requests.length > 0 && (
            <table className="w-full text-sm min-w-[700px]">
              <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3 text-left">Livreur</th>
                  <th className="px-4 py-3 text-right">Montant</th>
                  <th className="px-4 py-3 text-left">Méthode</th>
                  <th className="px-4 py-3 text-left">Statut</th>
                  <th className="px-4 py-3 text-left">Demandée</th>
                  <th className="px-4 py-3 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {requests.map((r: WithdrawRequestWithDriver) => (
                  <tr
                    key={r.id}
                    onClick={() => navigate(`/admin/withdraw-requests/${r.id}`)}
                    className="hover:bg-airmess-yellow/10 cursor-pointer align-top transition"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-airmess-dark">
                        {r.driver.first_name} {r.driver.last_name}
                      </div>
                      <div className="text-xs text-gray-500">{r.driver.user.phone ?? r.driver.user.email}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">{formatFcfa(r.amount_fcfa)}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{r.target_method === 'momo' ? '📱 MoMo' : '🏦 Banque'}</div>
                      <div className="text-xs text-gray-500 font-mono">{r.target_account}</div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{formatDateTime(r.created_at)}</td>
                    <td className="px-4 py-3 text-right text-gray-400">→</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {data && data.last_page > 1 && (
          <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
            <span>Page {data.current_page} / {data.last_page} — {data.total} demande(s){isFetching && ' · …'}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={data.current_page <= 1}
                className="px-3 py-1.5 rounded border border-gray-200 disabled:opacity-40 hover:bg-white">Précédent</button>
              <button onClick={() => setPage((p) => p + 1)} disabled={data.current_page >= data.last_page}
                className="px-3 py-1.5 rounded border border-gray-200 disabled:opacity-40 hover:bg-white">Suivant</button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
