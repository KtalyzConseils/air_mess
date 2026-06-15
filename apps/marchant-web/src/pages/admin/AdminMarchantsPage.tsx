import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import AdminHeader from '../../components/AdminHeader'
import MarchantStatusBadge from '../../components/MarchantStatusBadge'
import { fetchMarchants, validateMarchant, type MarchantListParams } from '../../api/admin'

type FilterKey = 'pending' | 'all' | 'active' | 'suspended'

const FILTERS: { key: FilterKey; label: string; params: MarchantListParams }[] = [
  { key: 'pending',   label: 'À valider', params: { validation: 'pending' } },
  { key: 'all',       label: 'Tous',      params: {} },
  { key: 'active',    label: 'Actifs',    params: { subscription_status: 'active' } },
  { key: 'suspended', label: 'Suspendus', params: { subscription_status: 'suspended' } },
]

export default function AdminMarchantsPage() {
  const queryClient = useQueryClient()
  const [filterKey, setFilterKey] = useState<FilterKey>('pending')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)

  const activeFilter = FILTERS.find((f) => f.key === filterKey)!
  const search = q.trim()

  // Quand on recherche, on cherche dans TOUS les marchands (on ignore le filtre de statut
  // de l'onglet) ; sinon on applique le filtre de l'onglet courant.
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
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />

      <main className="max-w-6xl mx-auto p-6">
        <h2 className="text-2xl font-bold text-airmess-dark mb-6">Marchands</h2>

        {/* Barre de filtres + recherche */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex gap-1 bg-white rounded-lg p-1 shadow-sm">
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
            placeholder="Rechercher (raison sociale, IFU, email, téléphone)…"
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full sm:w-80 focus:outline-none focus:ring-2 focus:ring-airmess-yellow"
          />
        </div>

        {search && (
          <p className="text-xs text-gray-500 mb-3">
            🔎 Recherche sur <strong>tous</strong> les marchands — les filtres de statut sont ignorés.{' '}
            <button onClick={() => setQ('')} className="text-airmess-dark font-semibold hover:underline">
              Effacer
            </button>
          </p>
        )}

        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {isLoading && <div className="p-10 text-center text-gray-500">Chargement...</div>}

          {!isLoading && marchants.length === 0 && (
            <div className="p-10 text-center text-gray-500">Aucun marchand trouvé.</div>
          )}

          {marchants.length > 0 && (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                <tr>
                  <th className="px-6 py-3 text-left">Raison sociale</th>
                  <th className="px-6 py-3 text-left">Secteur</th>
                  <th className="px-6 py-3 text-left">Contact</th>
                  <th className="px-6 py-3 text-left">Statut</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {marchants.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3">
                      <Link to={`/admin/marchants/${m.id}`} className="font-medium text-airmess-dark hover:underline">
                        {m.raison_sociale}
                      </Link>
                      {!m.validated_at && (
                        <span className="ml-2 text-xs text-amber-600 font-semibold">• à valider</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-gray-600">{m.secteur_activite}</td>
                    <td className="px-6 py-3">
                      <div>{m.user.email}</div>
                      <div className="text-xs text-gray-500">{m.user.phone}</div>
                    </td>
                    <td className="px-6 py-3">
                      <MarchantStatusBadge status={m.subscription_status} />
                    </td>
                    <td className="px-6 py-3 text-right whitespace-nowrap">
                      {!m.validated_at && (
                        <button
                          onClick={() => mutation.mutate(m.id)}
                          disabled={mutation.isPending}
                          className="bg-airmess-yellow text-airmess-dark font-bold px-3 py-1 rounded hover:opacity-90 disabled:opacity-50 text-xs"
                        >
                          Valider
                        </button>
                      )}
                      <Link
                        to={`/admin/marchants/${m.id}`}
                        className="ml-2 text-airmess-dark font-semibold px-3 py-1 rounded hover:bg-gray-100 text-xs"
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

        {/* Pagination */}
        {data && data.last_page > 1 && (
          <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
            <span>
              Page {data.current_page} / {data.last_page} — {data.total} marchand(s)
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
