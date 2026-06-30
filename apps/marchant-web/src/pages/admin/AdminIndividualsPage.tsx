import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import AdminPageShell from '../../components/admin/AdminPageShell'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import AdminTabs from '../../components/admin/AdminTabs'
import AdminPagination from '../../components/admin/AdminPagination'
import { AdminSearchInput, AdminButton } from '../../components/admin/AdminToolbar'
import { fetchIndividuals, type IndividualListParams } from '../../api/admin'

type FilterKey = 'all' | 'free' | 'active' | 'expired' | 'suspended'

const FILTERS: readonly { key: FilterKey; label: string; params: IndividualListParams }[] = [
  { key: 'all', label: 'Tous', params: {} },
  { key: 'free', label: 'Quota gratuit', params: { subscription_status: 'free' } },
  { key: 'active', label: 'Abonnés', params: { subscription_status: 'active' } },
  { key: 'expired', label: 'Expirés', params: { subscription_status: 'expired' } },
  { key: 'suspended', label: 'Suspendus', params: { subscription_status: 'suspended' } },
] as const

const STATUS_BADGE: Record<string, { label: string; classes: string }> = {
  active: { label: 'Abonné', classes: 'bg-success-bg text-success border border-success/20' },
  expired: { label: 'Abo expiré', classes: 'bg-warning-bg text-warning border border-warning/20' },
  suspended: { label: 'Suspendu', classes: 'bg-danger-bg text-airmess-red border border-airmess-red/30' },
  churned: { label: 'Désabonné', classes: 'bg-warm-100 text-warm-600 border border-warm-200' },
}

function Badge({ status }: { status: string | null }) {
  if (!status) {
    return (
      <span className="inline-block px-2 py-0.5 rounded text-caption font-semibold bg-cream text-ink border border-warm-300">
        Quota gratuit
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
  const [filterKey, setFilterKey] = useState<FilterKey>('all')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)

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
        title="Particuliers"
        subtitle="Comptes individuels et leur consommation de quota"
        toolbar={
          <div className="flex flex-wrap items-center justify-between gap-3 w-full">
            <AdminTabs tabs={FILTERS} value={filterKey} onChange={changeFilter} />
            <AdminSearchInput
              value={q}
              onChange={(e) => {
                setQ(e.target.value)
                setPage(1)
              }}
              placeholder="Nom, email, téléphone…"
              minWidthClass="min-w-[260px]"
            />
          </div>
        }
      />

      <div className="px-4 md:px-6 lg:px-8 py-5">
        {search && (
          <p className="text-caption text-warm-500 mb-3">
            Recherche globale — filtre <strong className="text-ink">{activeFilter.label}</strong>{' '}
            ignoré.{' '}
            <button
              onClick={() => setQ('')}
              className="text-airmess-red font-semibold hover:underline"
            >
              Effacer
            </button>
          </p>
        )}

        <div className="bg-off-white border border-warm-200 rounded-lg overflow-hidden">
          {isLoading ? (
            <div className="p-10 text-center text-warm-500 text-body-s">Chargement…</div>
          ) : individuals.length === 0 ? (
            <div className="p-10 text-center text-warm-500 text-body-s italic">
              Aucun particulier trouvé.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-body-s min-w-[700px]">
                <thead className="bg-cream/60 text-[10px] uppercase tracking-wider font-bold text-warm-600 border-b border-warm-200">
                  <tr>
                    <th className="px-5 py-2.5 text-left">Nom</th>
                    <th className="px-5 py-2.5 text-left">Contact</th>
                    <th className="px-5 py-2.5 text-left">Quota</th>
                    <th className="px-5 py-2.5 text-left">Statut</th>
                    <th className="px-5 py-2.5 text-right">Action</th>
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
                            Voir
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
            itemLabel="particulier"
            onChange={setPage}
            isFetching={isFetching}
          />
        )}
      </div>
    </AdminPageShell>
  )
}
