import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import AdminPageShell from '../../components/admin/AdminPageShell'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import AdminTabs from '../../components/admin/AdminTabs'
import AdminPagination from '../../components/admin/AdminPagination'
import { AdminSearchInput, AdminButton } from '../../components/admin/AdminToolbar'
import MarchantStatusBadge from '../../components/MarchantStatusBadge'
import { fetchMarchants, validateMarchant, type MarchantListParams } from '../../api/admin'

type FilterKey = 'pending' | 'all' | 'active' | 'suspended'

export default function AdminMarchantsPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [filterKey, setFilterKey] = useState<FilterKey>('pending')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)

  const FILTERS: readonly { key: FilterKey; label: string; params: MarchantListParams }[] = [
    { key: 'pending', label: t('admin.marchants.tabToValidate'), params: { validation: 'pending' } },
    { key: 'all', label: t('admin.marchants.tabAll'), params: {} },
    { key: 'active', label: t('admin.marchants.tabActive'), params: { subscription_status: 'active' } },
    { key: 'suspended', label: t('admin.marchants.tabSuspended'), params: { subscription_status: 'suspended' } },
  ] as const

  const activeFilter = FILTERS.find((f) => f.key === filterKey)!
  const search = q.trim()

  // Quand on recherche, on cherche dans TOUS les marchands (le filtre statut est ignoré).
  const params: MarchantListParams = search
    ? { q: search, page }
    : { ...activeFilter.params, page }

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['admin', 'marchants', search ? `search:${search}` : filterKey, page],
    queryFn: () => fetchMarchants(params),
    placeholderData: keepPreviousData,
  })

  const mutation = useMutation({
    mutationFn: validateMarchant,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'marchants'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] })
    },
  })

  const marchants = data?.data ?? []

  function changeFilter(key: FilterKey) {
    setFilterKey(key)
    setPage(1)
  }

  return (
    <AdminPageShell>
      <AdminPageHeader
        title={t('admin.marchants.title')}
        subtitle={t('admin.marchants.pageSubtitle')}
        toolbar={
          <div className="flex flex-wrap items-center justify-between gap-3 w-full">
            <AdminTabs tabs={FILTERS} value={filterKey} onChange={changeFilter} />
            <AdminSearchInput
              value={q}
              onChange={(e) => {
                setQ(e.target.value)
                setPage(1)
              }}
              placeholder={t('admin.marchants.searchPlaceholder')}
              minWidthClass="min-w-[280px]"
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
          ) : marchants.length === 0 ? (
            <div className="p-10 text-center text-warm-500 text-body-s italic">
              {t('admin.marchants.emptyResults')}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-body-s min-w-[700px]">
                <thead className="bg-cream/60 text-[10px] uppercase tracking-wider font-bold text-warm-600 border-b border-warm-200">
                  <tr>
                    <th className="px-5 py-2.5 text-left">{t('admin.marchants.colRaisonSociale')}</th>
                    <th className="px-5 py-2.5 text-left">{t('admin.marchants.colSector')}</th>
                    <th className="px-5 py-2.5 text-left">{t('admin.marchants.colContact')}</th>
                    <th className="px-5 py-2.5 text-left">{t('admin.marchants.colStatus')}</th>
                    <th className="px-5 py-2.5 text-right">{t('admin.marchants.colActions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-warm-200">
                  {marchants.map((m) => (
                    <tr key={m.id} className="hover:bg-cream/40 transition-colors">
                      <td className="px-5 py-2.5">
                        <Link
                          to={`/admin/marchants/${m.id}`}
                          className="font-semibold text-ink hover:text-airmess-red"
                        >
                          {m.raison_sociale}
                        </Link>
                        {!m.validated_at && (
                          <span className="ml-2 text-caption font-bold text-warning uppercase tracking-wide">
                            {t('admin.marchants.toValidateBadge')}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-2.5 text-warm-600 truncate max-w-[160px]">
                        {m.secteur_activite}
                      </td>
                      <td className="px-5 py-2.5">
                        <p className="text-ink truncate max-w-[200px]">{m.user.email}</p>
                        <p className="text-caption text-warm-500 truncate max-w-[200px]">
                          {m.user.phone}
                        </p>
                      </td>
                      <td className="px-5 py-2.5">
                        <MarchantStatusBadge status={m.subscription_status} />
                      </td>
                      <td className="px-5 py-2.5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {!m.validated_at && (
                            <AdminButton
                              variant="primary"
                              size="sm"
                              onClick={() => mutation.mutate(m.id)}
                              disabled={mutation.isPending}
                            >
                              {t('admin.marchants.validateAction')}
                            </AdminButton>
                          )}
                          <Link to={`/admin/marchants/${m.id}`}>
                            <AdminButton variant="ghost" size="sm">
                              {t('admin.common.view')}
                            </AdminButton>
                          </Link>
                        </div>
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
            itemLabel={t('admin.marchants.itemLabel')}
            onChange={setPage}
            isFetching={isFetching}
          />
        )}
      </div>
    </AdminPageShell>
  )
}
