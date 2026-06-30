import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import AdminPageShell from '../../components/admin/AdminPageShell'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import AdminTabs from '../../components/admin/AdminTabs'
import AdminPagination from '../../components/admin/AdminPagination'
import { ArrowRightIcon } from '../../components/ui/icons'
import {
  fetchWithdrawRequests,
  type WithdrawRequestWithDriver,
  type WithdrawRequestListParams,
} from '../../api/admin'

type FilterKey = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'all'

const FILTERS: readonly { key: FilterKey; label: string; params: WithdrawRequestListParams }[] = [
  { key: 'pending', label: 'À traiter', params: { status: 'pending' } },
  { key: 'approved', label: 'Approuvées', params: { status: 'approved' } },
  { key: 'rejected', label: 'Rejetées', params: { status: 'rejected' } },
  { key: 'cancelled', label: 'Annulées', params: { status: 'cancelled' } },
  { key: 'all', label: 'Tous', params: {} },
] as const

const STATUS_BADGE: Record<string, { label: string; classes: string }> = {
  pending: { label: 'En attente', classes: 'bg-warning-bg text-warning border border-warning/20' },
  approved: { label: 'Approuvée', classes: 'bg-success-bg text-success border border-success/20' },
  rejected: { label: 'Rejetée', classes: 'bg-danger-bg text-airmess-red border border-airmess-red/30' },
  cancelled: { label: 'Annulée', classes: 'bg-warm-100 text-warm-600 border border-warm-200' },
}

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_BADGE[status] ?? {
    label: status,
    classes: 'bg-warm-100 text-warm-600 border border-warm-200',
  }
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-caption font-semibold ${meta.classes}`}
    >
      {meta.label}
    </span>
  )
}

function formatFcfa(n: number): string {
  return n.toLocaleString('fr-FR') + ' FCFA'
}

function formatDateTime(value: string | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
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
    <AdminPageShell>
      <AdminPageHeader
        title="Retraits caution livreurs"
        subtitle="Cliquer sur une ligne pour ouvrir la fiche de revue."
        toolbar={<AdminTabs tabs={FILTERS} value={filterKey} onChange={changeFilter} />}
      />

      <div className="px-4 md:px-6 lg:px-8 py-5">
        <div className="bg-off-white border border-warm-200 rounded-lg overflow-hidden">
          {isLoading ? (
            <div className="p-10 text-center text-warm-500 text-body-s">Chargement…</div>
          ) : requests.length === 0 ? (
            <div className="p-10 text-center text-warm-500 text-body-s italic">
              Aucune demande dans ce filtre.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-body-s min-w-[700px]">
                <thead className="bg-cream/60 text-[10px] uppercase tracking-wider font-bold text-warm-600 border-b border-warm-200">
                  <tr>
                    <th className="px-4 py-2.5 text-left">Livreur</th>
                    <th className="px-4 py-2.5 text-right">Montant</th>
                    <th className="px-4 py-2.5 text-left">Méthode</th>
                    <th className="px-4 py-2.5 text-left">Statut</th>
                    <th className="px-4 py-2.5 text-left">Demandée</th>
                    <th className="px-4 py-2.5"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-warm-200">
                  {requests.map((r: WithdrawRequestWithDriver) => (
                    <tr
                      key={r.id}
                      onClick={() => navigate(`/admin/withdraw-requests/${r.id}`)}
                      className="hover:bg-cream/60 cursor-pointer align-top transition-colors"
                    >
                      <td className="px-4 py-2.5">
                        <p className="font-semibold text-ink">
                          {r.driver.first_name} {r.driver.last_name}
                        </p>
                        <p className="text-caption text-warm-500">
                          {r.driver.user.phone ?? r.driver.user.email}
                        </p>
                      </td>
                      <td className="px-4 py-2.5 text-right font-bold text-ink tabular-nums">
                        {formatFcfa(r.amount_fcfa)}
                      </td>
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-ink">
                          {r.target_method === 'momo' ? 'Mobile Money' : 'Banque'}
                        </p>
                        <p className="text-caption text-warm-500 font-mono">{r.target_account}</p>
                      </td>
                      <td className="px-4 py-2.5">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="px-4 py-2.5 text-caption text-warm-500 tabular-nums whitespace-nowrap">
                        {formatDateTime(r.created_at)}
                      </td>
                      <td className="px-4 py-2.5 text-right text-warm-400">
                        <ArrowRightIcon size={16} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {data && (
          <AdminPagination
            currentPage={data.current_page}
            lastPage={data.last_page}
            total={data.total}
            itemLabel="demande"
            onChange={setPage}
            isFetching={isFetching}
          />
        )}
      </div>
    </AdminPageShell>
  )
}
