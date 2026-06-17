import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import AdminHeader from '../../components/AdminHeader'
import { fetchIncidents, resolveIncident, INCIDENT_TYPE_LABELS } from '../../api/admin'

type StatusFilter = 'open' | 'all' | 'resolved'

const FILTERS: { key: StatusFilter; label: string; status?: string }[] = [
  { key: 'open',     label: 'Ouverts',  status: 'open' },
  { key: 'all',      label: 'Tous' },
  { key: 'resolved', label: 'Résolus',  status: 'resolved' },
]

const STATUS_BADGE: Record<string, { label: string; classes: string }> = {
  open:      { label: 'Ouvert',   classes: 'bg-amber-100 text-amber-800' },
  resolved:  { label: 'Résolu',   classes: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Annulé',   classes: 'bg-gray-200 text-gray-600' },
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  })
}

export default function AdminIncidentsPage() {
  const queryClient = useQueryClient()
  const [filterKey, setFilterKey] = useState<StatusFilter>('open')
  const [page, setPage] = useState(1)

  const activeFilter = FILTERS.find((f) => f.key === filterKey)!

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['admin', 'incidents', filterKey, page],
    queryFn: () => fetchIncidents({ status: activeFilter.status, page }),
    placeholderData: keepPreviousData,
  })

  const resolveMutation = useMutation({
    mutationFn: ({ id, note }: { id: number; note: string }) => resolveIncident(id, note),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'incidents'] }),
  })

  function handleResolve(id: number) {
    const note = window.prompt('Note de résolution (obligatoire) :')
    if (note && note.trim()) {
      resolveMutation.mutate({ id, note: note.trim() })
    }
  }

  const incidents = data?.data ?? []

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />
      <main className="max-w-6xl mx-auto p-4 md:p-6">
        <h2 className="text-2xl font-bold text-airmess-dark mb-6">Incidents</h2>

        <div className="flex gap-1 bg-white rounded-lg p-1 shadow-sm w-fit mb-4">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => { setFilterKey(f.key); setPage(1) }}
              className={`px-3 py-1.5 rounded text-sm font-medium transition ${
                filterKey === f.key ? 'bg-airmess-dark text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm overflow-x-auto">
          {isLoading && <div className="p-10 text-center text-gray-500">Chargement...</div>}
          {!isLoading && incidents.length === 0 && (
            <div className="p-10 text-center text-gray-500">Aucun incident.</div>
          )}
          {incidents.length > 0 && (
            <table className="w-full text-sm min-w-[800px]">
              <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-left">Course</th>
                  <th className="px-4 py-3 text-left">Signalé par</th>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Statut</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {incidents.map((inc) => (
                  <tr key={inc.id} className="hover:bg-gray-50 align-top">
                    <td className="px-4 py-3">
                      <div className="font-medium text-airmess-dark">
                        {INCIDENT_TYPE_LABELS[inc.type] ?? inc.type}
                      </div>
                      {inc.description && (
                        <div className="text-xs text-gray-500 mt-1 max-w-xs">{inc.description}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {inc.course ? (
                        <Link to={`/courses/${inc.course.id}`} className="font-mono text-xs text-airmess-dark hover:underline">
                          {inc.course.reference}
                        </Link>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {inc.reported_by?.name ?? '—'}
                      <div className="text-xs text-gray-400">{inc.reporter_type}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{formatDateTime(inc.created_at)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${(STATUS_BADGE[inc.status] ?? STATUS_BADGE.cancelled).classes}`}>
                        {(STATUS_BADGE[inc.status] ?? { label: inc.status }).label}
                      </span>
                      {inc.status === 'resolved' && inc.resolution_note && (
                        <div className="text-xs text-gray-400 mt-1 max-w-xs">→ {inc.resolution_note}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {inc.status === 'open' && (
                        <button
                          onClick={() => handleResolve(inc.id)}
                          disabled={resolveMutation.isPending}
                          className="bg-airmess-yellow text-airmess-dark font-bold px-3 py-1 rounded hover:opacity-90 disabled:opacity-50 text-xs"
                        >
                          Résoudre
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {data && data.last_page > 1 && (
          <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
            <span>Page {data.current_page} / {data.last_page} — {data.total} incident(s){isFetching && ' · …'}</span>
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
