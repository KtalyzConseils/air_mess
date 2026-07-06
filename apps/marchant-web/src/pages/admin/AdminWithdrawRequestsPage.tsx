import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import AdminPageShell from '../../components/admin/AdminPageShell'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import AdminTabs from '../../components/admin/AdminTabs'
import AdminPagination from '../../components/admin/AdminPagination'
import { ArrowRightIcon } from '../../components/ui/icons'
import {
  fetchWithdrawRequests,
  type WithdrawRequestOwner,
  type WithdrawRequestListParams,
} from '../../api/admin'

/**
 * Une demande peut être portée par un driver OU par un user marchand/particulier.
 * On unifie l'affichage via ce helper — un seul des deux est renseigné.
 */
function ownerDisplay(r: WithdrawRequestOwner): { name: string; contact: string; kind: 'driver' | 'user' } {
  if (r.driver) {
    return {
      name: `${r.driver.first_name} ${r.driver.last_name}`,
      contact: r.driver.user.phone ?? r.driver.user.email,
      kind: 'driver',
    }
  }
  if (r.user) {
    const name =
      r.user.marchant?.raison_sociale ??
      (r.user.individual ? `${r.user.individual.first_name} ${r.user.individual.last_name}`.trim() : null) ??
      r.user.name
    return {
      name,
      contact: r.user.phone ?? r.user.email,
      kind: 'user',
    }
  }
  return { name: '—', contact: '—', kind: 'user' }
}

type FilterKey = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'all'

const STATUS_BADGE_CLASSES: Record<string, string> = {
  pending: 'bg-warning-bg text-warning border border-warning/20',
  approved: 'bg-success-bg text-success border border-success/20',
  rejected: 'bg-danger-bg text-airmess-red border border-airmess-red/30',
  cancelled: 'bg-warm-100 text-warm-600 border border-warm-200',
}

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation()
  const classes =
    STATUS_BADGE_CLASSES[status] ?? 'bg-warm-100 text-warm-600 border border-warm-200'
  const labels: Record<string, string> = {
    pending: t('admin.withdraws.statusPending'),
    approved: t('admin.withdraws.statusApproved'),
    rejected: t('admin.withdraws.statusRejected'),
    cancelled: t('admin.withdraws.statusCancelled'),
  }
  const label = labels[status] ?? status
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-caption font-semibold ${classes}`}
    >
      {label}
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
  const { t } = useTranslation()
  const [filterKey, setFilterKey] = useState<FilterKey>('pending')
  const [page, setPage] = useState(1)

  const FILTERS: readonly {
    key: FilterKey
    label: string
    params: WithdrawRequestListParams
  }[] = [
    { key: 'pending', label: t('admin.withdraws.tabToProcess'), params: { status: 'pending' } },
    { key: 'approved', label: t('admin.withdraws.tabApproved'), params: { status: 'approved' } },
    { key: 'rejected', label: t('admin.withdraws.tabRejected2'), params: { status: 'rejected' } },
    { key: 'cancelled', label: t('admin.withdraws.tabCancelled'), params: { status: 'cancelled' } },
    { key: 'all', label: t('admin.withdraws.tabAll'), params: {} },
  ]

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
        title={t('admin.withdraws.titleList')}
        subtitle={t('admin.withdraws.subtitleList')}
        toolbar={<AdminTabs tabs={FILTERS} value={filterKey} onChange={changeFilter} />}
      />

      <div className="px-4 md:px-6 lg:px-8 py-5">
        <div className="bg-off-white border border-warm-200 rounded-lg overflow-hidden">
          {isLoading ? (
            <div className="p-10 text-center text-warm-500 text-body-s">
              {t('admin.common.loading')}
            </div>
          ) : requests.length === 0 ? (
            <div className="p-10 text-center text-warm-500 text-body-s italic">
              {t('admin.withdraws.emptyForFilter')}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-body-s min-w-[700px]">
                <thead className="bg-cream/60 text-[10px] uppercase tracking-wider font-bold text-warm-600 border-b border-warm-200">
                  <tr>
                    <th className="px-4 py-2.5 text-left">
                      {t('admin.withdraws.colDriver')}
                    </th>
                    <th className="px-4 py-2.5 text-right">
                      {t('admin.withdraws.colAmount')}
                    </th>
                    <th className="px-4 py-2.5 text-left">
                      {t('admin.withdraws.colMethod')}
                    </th>
                    <th className="px-4 py-2.5 text-left">
                      {t('admin.withdraws.colStatus')}
                    </th>
                    <th className="px-4 py-2.5 text-left">
                      {t('admin.withdraws.colRequestedAt')}
                    </th>
                    <th className="px-4 py-2.5"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-warm-200">
                  {requests.map((r: WithdrawRequestOwner) => {
                    const o = ownerDisplay(r)
                    return (
                    <tr
                      key={r.id}
                      onClick={() => navigate(`/admin/withdraw-requests/${r.id}`)}
                      className="hover:bg-cream/60 cursor-pointer align-top transition-colors"
                    >
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                              o.kind === 'driver'
                                ? 'bg-airmess-yellow/20 text-warm-700'
                                : 'bg-info-bg text-info'
                            }`}
                            title={o.kind === 'driver' ? 'Livreur' : 'Marchand / particulier'}
                          >
                            {o.kind === 'driver' ? '🛵' : '🏢'}
                          </span>
                          <div className="min-w-0">
                            <p className="font-semibold text-ink truncate">{o.name}</p>
                            <p className="text-caption text-warm-500">{o.contact}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-right font-bold text-ink tabular-nums">
                        {formatFcfa(r.amount_fcfa)}
                      </td>
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-ink">
                          {r.target_method === 'momo'
                            ? t('admin.withdraws.methodMomo')
                            : t('admin.withdraws.methodBank')}
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
                    )
                  })}
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
            itemLabel={t('admin.withdraws.requestItemLabel')}
            onChange={setPage}
            isFetching={isFetching}
          />
        )}
      </div>
    </AdminPageShell>
  )
}
