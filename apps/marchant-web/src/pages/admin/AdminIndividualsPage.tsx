import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import AdminHeader from '../../components/AdminHeader'
import { fetchIndividuals, type IndividualListParams } from '../../api/admin'

type FilterKey = 'all' | 'free' | 'active' | 'expired' | 'suspended'

const FILTERS: { key: FilterKey; label: string; params: IndividualListParams }[] = [
  { key: 'all',       label: 'Tous',          params: {} },
  { key: 'free',      label: 'Quota gratuit', params: { subscription_status: 'free' } },
  { key: 'active',    label: 'Abonnés',       params: { subscription_status: 'active' } },
  { key: 'expired',   label: 'Expirés',       params: { subscription_status: 'expired' } },
  { key: 'suspended', label: 'Suspendus',     params: { subscription_status: 'suspended' } },
]

const STATUS_BADGE: Record<string, { label: string; classes: string }> = {
  active:    { label: 'Abonné',        classes: 'bg-green-100 text-green-800' },
  expired:   { label: 'Abo expiré',    classes: 'bg-amber-100 text-amber-800' },
  suspended: { label: 'Suspendu',      classes: 'bg-red-100 text-red-800' },
  churned:   { label: 'Désabonné',     classes: 'bg-gray-200 text-gray-700' },
}

function Badge({ status }: { status: string | null }) {
  if (!status) {
    return (
      <span className="inline-block px-2 py-1 rounded text-xs font-semibold bg-blue-100 text-blue-800">
        🆓 Quota gratuit
      </span>
    )
  }
  const meta = STATUS_BADGE[status] ?? { label: status, classes: 'bg-gray-100 text-gray-700' }
  return <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${meta.classes}`}>{meta.label}</span>
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
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />

      <main className="max-w-6xl mx-auto p-4 md:p-6">
        <h2 className="text-2xl font-bold text-airmess-dark mb-6">Particuliers</h2>

        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex gap-1 bg-white rounded-lg p-1 shadow-sm flex-wrap">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => changeFilter(f.key)}
                className={`px-3 py-1.5 rounded text-sm font-medium transition ${
                  filterKey === f.key
                    ? 'bg-airmess-dark text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
              setPage(1)
            }}
            placeholder="Rechercher (nom, email, téléphone)…"
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full sm:w-80 focus:outline-none focus:ring-2 focus:ring-airmess-yellow"
          />
        </div>

        {search && (
          <p className="text-xs text-gray-500 mb-3">
            🔎 Recherche sur <strong>tous</strong> les particuliers — les filtres de statut sont ignorés.{' '}
            <button onClick={() => setQ('')} className="text-airmess-dark font-semibold hover:underline">
              Effacer
            </button>
          </p>
        )}

        <div className="bg-white rounded-2xl shadow-sm overflow-x-auto">
          {isLoading && <div className="p-10 text-center text-gray-500">Chargement...</div>}

          {!isLoading && individuals.length === 0 && (
            <div className="p-10 text-center text-gray-500">Aucun particulier trouvé.</div>
          )}

          {individuals.length > 0 && (
            <table className="w-full text-sm min-w-[700px]">
              <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                <tr>
                  <th className="px-6 py-3 text-left">Nom</th>
                  <th className="px-6 py-3 text-left">Contact</th>
                  <th className="px-6 py-3 text-left">Quota</th>
                  <th className="px-6 py-3 text-left">Statut</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {individuals.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3">
                      <Link to={`/admin/individuals/${p.id}`} className="font-medium text-airmess-dark hover:underline">
                        {p.first_name} {p.last_name}
                      </Link>
                    </td>
                    <td className="px-6 py-3">
                      <div>{p.user.email}</div>
                      <div className="text-xs text-gray-500">{p.user.phone ?? '—'}</div>
                    </td>
                    <td className="px-6 py-3 text-gray-700">
                      {p.monthly_courses_used}/{p.monthly_courses_limit}
                    </td>
                    <td className="px-6 py-3">
                      <Badge status={p.subscription_status} />
                    </td>
                    <td className="px-6 py-3 text-right whitespace-nowrap">
                      <Link
                        to={`/admin/individuals/${p.id}`}
                        className="text-airmess-dark font-semibold px-3 py-1 rounded hover:bg-gray-100 text-xs"
                      >
                        Voir
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {data && data.last_page > 1 && (
          <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
            <span>
              Page {data.current_page} / {data.last_page} — {data.total} particulier(s)
              {isFetching && ' · …'}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={data.current_page <= 1}
                className="px-3 py-1.5 rounded border border-gray-200 disabled:opacity-40 hover:bg-white"
              >
                Précédent
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={data.current_page >= data.last_page}
                className="px-3 py-1.5 rounded border border-gray-200 disabled:opacity-40 hover:bg-white"
              >
                Suivant
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
