import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import AdminPageShell from '../../components/admin/AdminPageShell'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import AdminTabs from '../../components/admin/AdminTabs'
import AdminPagination from '../../components/admin/AdminPagination'
import { AdminSearchInput, AdminButton } from '../../components/admin/AdminToolbar'
import { fetchIndividuals, type IndividualListParams } from '../../api/admin'

type FilterKey = 'all' | 'free' | 'active' | 'expired' | 'suspended'

function Badge({ status }: { status: string | null }) {
  const { t } = useTranslation()
  const STATUS_BADGE: Record<string, { label: string; classes: string }> = {
    active: { label: t('admin.individuals.badgeSubscribed'), classes: 'bg-success-bg text-success border border-success/20' },
    expired: { label: t('admin.individuals.badgeExpired'), classes: 'bg-warning-bg text-warning border border-warning/20' },
    suspended: { label: t('admin.individuals.badgeSuspended'), classes: 'bg-danger-bg text-airmess-red border border-airmess-red/30' },
    churned: { label: t('admin.individuals.badgeChurned'), classes: 'bg-warm-100 text-warm-600 border border-warm-200' },
  }
  if (!status) {
    return (
      <span className="inline-block px-2 py-0.5 rounded text-caption font-semibold bg-cream text-ink border border-warm-300">
        {t('admin.individuals.badgeQuotaFree')}
      </span>
    )
  }
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

export default function AdminIndividualsPage() {
  const { t } = useTranslation()
  const [filterKey, setFilterKey] = useState<FilterKey>('all')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)

  const FILTERS: readonly { key: FilterKey; label: string; params: IndividualListParams }[] = [
    { key: 'all', label: t('admin.individuals.tabAll'), params: {} },
    { key: 'free', label: t('admin.individuals.tabFreeQuota'), params: { subscription_status: 'free' } },
    { key: 'active', label: t('admin.individuals.tabSubscribed'), params: { subscription_status: 'active' } },
    { key: 'expired', label: t('admin.individuals.tabExpired'), params: { subscription_status: 'expired' } },
    { key: 'suspended', label: t('admin.individuals.tabSuspended'), params: { subscription_status: 'suspended' } },
  ] as const

  const activeFilter = FILTERS.find((f) => f.key === filterKey)!
  const search = q.trim()

  const params: IndividualListParams = search
    ? { q: search, page }
    : { ...activeFilter.params, page }

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['admin', 'individuals', search ? `search:${search}` : filterKey, page],
    queryFn: () => fetchIndividuals(params),
    placeholderData: keepPreviousData,
  })

  const individuals = data?.data ?? []

  function changeFilter(key: FilterKey) {
    setFilterKey(key)
    setPage(1)
  }

  return (
    <AdminPageShell>
      <AdminPageHeader
        title={t('admin.individuals.title')}
        subtitle={t('admin.individuals.pageSubtitle')}
        toolbar={
          <div className="flex flex-wrap items-center justify-between gap-3 w-full">
            <AdminTabs tabs={FILTERS} value={filterKey} onChange={changeFilter} />
            <AdminSearchInput
              value={q}
              onChange={(e) => {
                setQ(e.target.value)
                setPage(1)
              }}
              placeholder={t('admin.individuals.searchPlaceholder')}
              minWidthClass="min-w-[260px]"
            />
          </div>
        }
      />

      <div className="px-4 md:px-6 lg:px-8 py-5">
        {search && (
          <p className="text-caption text-warm-500 mb-3">
            {t('admin.common.globalSearchIgnoredPrefix')}{' '}
            <strong className="text-ink">{activeFilter.label}</strong> {t('admin.common.globalSearchIgnoredSuffix')}{' '}
            <button
              onClick={() => setQ('')}
              className="text-airmess-red font-semibold hover:underline"
            >
              {t('admin.common.clearFilter')}
            </button>
          </p>
        )}

        <div className="bg-off-white border border-warm-200 rounded-lg overflow-hidden">
          {isLoading ? (
            <div className="p-10 text-center text-warm-500 text-body-s">{t('admin.common.loading')}</div>
          ) : individuals.length === 0 ? (
            <div className="p-10 text-center text-warm-500 text-body-s italic">
              {t('admin.individuals.emptyResults')}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-body-s min-w-[700px]">
                <thead className="bg-cream/60 text-[10px] uppercase tracking-wider font-bold text-warm-600 border-b border-warm-200">
                  <tr>
                    <th className="px-5 py-2.5 text-left">{t('admin.individuals.colName')}</th>
                    <th className="px-5 py-2.5 text-left">{t('admin.individuals.colContact')}</th>
                    <th className="px-5 py-2.5 text-left">{t('admin.individuals.colQuota')}</th>
                    <th className="px-5 py-2.5 text-left">{t('admin.individuals.colStatus')}</th>
                    <th className="px-5 py-2.5 text-right">{t('admin.individuals.colAction')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-warm-200">
                  {individuals.map((p) => (
                    <tr key={p.id} className="hover:bg-cream/40 transition-colors">
                      <td className="px-5 py-2.5">
                        <Link
                          to={`/admin/individuals/${p.id}`}
                          className="font-semibold text-ink hover:text-airmess-red"
                        >
                          {p.first_name} {p.last_name}
                        </Link>
                      </td>
                      <td className="px-5 py-2.5">
                        <p className="text-ink truncate max-w-[220px]">{p.user.email}</p>
                        <p className="text-caption text-warm-500 truncate max-w-[220px]">
                          {p.user.phone ?? '—'}
                        </p>
                      </td>
                      <td className="px-5 py-2.5 text-ink tabular-nums">
                        {p.monthly_courses_used}/{p.monthly_courses_limit}
                      </td>
                      <td className="px-5 py-2.5">
                        <Badge status={p.subscription_status} />
                      </td>
                      <td className="px-5 py-2.5 text-right whitespace-nowrap">
                        <Link to={`/admin/individuals/${p.id}`}>
                          <AdminButton variant="ghost" size="sm">
                            {t('admin.common.view')}
                          </AdminButton>
                        </Link>
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
            itemLabel={t('admin.individuals.itemLabel')}
            onChange={setPage}
            isFetching={isFetching}
          />
        )}
      </div>
    </AdminPageShell>
  )
}
