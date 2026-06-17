import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import AdminHeader from '../../components/AdminHeader'
import { fetchAdminDrivers , toggleDriverActive} from '../../api/admin'
import { Link } from 'react-router-dom'
import { AxiosError } from 'axios'
import DriversMap, { DRIVER_STATUS_COLOR } from '../../components/DriversMap'


// Badge de disponibilité (état temps réel du livreur)
const AVAILABILITY: Record<string, { label: string; classes: string }> = {
  available: { label: 'Disponible', classes: 'bg-green-100 text-green-800' },
  busy:      { label: 'Occupé',     classes: 'bg-amber-100 text-amber-800' },
  on_break:  { label: 'En pause',   classes: 'bg-gray-100 text-gray-700' },
  offline:   { label: 'Hors-ligne', classes: 'bg-gray-200 text-gray-500' },
}

// Badge d'activation (état administratif du compte livreur)
const ACTIVATION: Record<string, { label: string; classes: string }> = {
  pending:   { label: 'En attente', classes: 'bg-amber-100 text-amber-800' },
  validated: { label: 'Validé',     classes: 'bg-blue-100 text-blue-800' },
  active:    { label: 'Actif',      classes: 'bg-green-100 text-green-800' },
  suspended: { label: 'Suspendu',   classes: 'bg-red-100 text-red-800' },
}

function Badge({ map, value }: { map: typeof AVAILABILITY; value: string }) {
  const meta = map[value] ?? { label: value, classes: 'bg-gray-100 text-gray-700' }
  return <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${meta.classes}`}>{meta.label}</span>
}

type AvailFilter = 'all' | 'available' | 'busy' | 'offline'

const FILTERS: { key: AvailFilter; label: string }[] = [
  { key: 'all',       label: 'Tous' },
  { key: 'available', label: 'Disponibles' },
  { key: 'busy',      label: 'Occupés' },
  { key: 'offline',   label: 'Hors-ligne' },
]

export default function AdminDriversPage() {
  const [filter, setFilter] = useState<AvailFilter>('all')
  const [view, setView] = useState<'list' | 'map'>('list')

  const { data: drivers = [], isLoading } = useQuery({
    queryKey: ['admin', 'drivers'],
    queryFn: fetchAdminDrivers,
    refetchInterval: 15_000, // vue "live" : on rafraîchit toutes les 15s
  })

  const filtered = filter === 'all' ? drivers : drivers.filter((d) => d.availability_status === filter)

  const queryClient = useQueryClient()

  const toggleMutation = useMutation({
    mutationFn: (id: number) => toggleDriverActive(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'drivers'] }),
    onError: (err) => {
      const message =
        err instanceof AxiosError
          ? err.response?.data?.message ?? 'Action impossible.'
          : 'Action impossible.'
      window.alert(message)
    },
  })

  function handleToggle(id: number, name: string, isActive: boolean) {
    // Confirmation seulement à la désactivation (action impactante)
    if (isActive && !window.confirm(`Désactiver le compte de ${name} ? Il sera déconnecté.`)) {
      return
    }
    toggleMutation.mutate(id)
  }


  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />
      <main className="max-w-6xl mx-auto p-4 md:p-6">
        <h2 className="text-2xl font-bold text-airmess-dark mb-6">Livreurs</h2>

        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          {/* Filtres de disponibilité */}
          <div className="flex gap-1 bg-white rounded-lg p-1 shadow-sm w-fit">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-3 py-1.5 rounded text-sm font-medium transition ${
                  filter === f.key ? 'bg-airmess-dark text-white' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Bascule Liste / Carte */}
          <div className="flex gap-1 bg-white rounded-lg p-1 shadow-sm w-fit">
            {(['list', 'map'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 rounded text-sm font-medium transition ${
                  view === v ? 'bg-airmess-dark text-white' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {v === 'list' ? '☰ Liste' : '🗺️ Carte'}
              </button>
            ))}
          </div>
        </div>

        {/* Vue carte */}
        {view === 'map' && (
          <>
            <DriversMap drivers={filtered} />
            <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-gray-600">
              {(['available', 'busy', 'on_break', 'offline'] as const).map((k) => (
                <span key={k} className="flex items-center gap-1.5">
                  <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: DRIVER_STATUS_COLOR[k] }} />
                  {AVAILABILITY[k].label}
                </span>
              ))}
              {filtered.some((d) => d.current_lat == null || d.current_lng == null) && (
                <span className="text-gray-400">
                  · {filtered.filter((d) => d.current_lat == null || d.current_lng == null).length} sans position GPS
                </span>
              )}
            </div>
          </>
        )}

        {/* Vue liste */}
        {view === 'list' && (
        <div className="bg-white rounded-2xl shadow-sm overflow-x-auto">
          {isLoading && <div className="p-10 text-center text-gray-500">Chargement...</div>}
          {!isLoading && filtered.length === 0 && (
            <div className="p-10 text-center text-gray-500">Aucun livreur.</div>
          )}
          {filtered.length > 0 && (
            <table className="w-full text-sm min-w-[800px]">
              <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                <tr>
                <th className="px-6 py-3 text-left">Livreur</th>
                  <th className="px-6 py-3 text-left">Téléphone</th>
                  <th className="px-6 py-3 text-left">Véhicule</th>
                  <th className="px-6 py-3 text-left">Disponibilité</th>
                  <th className="px-6 py-3 text-left">Compte</th>
                  <th className="px-6 py-3 text-right">Solde en attente</th>
                  <th className="px-6 py-3 text-center">Activer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3">
                      <Link
                        to={`/admin/drivers/${d.id}`}
                        className="font-medium text-airmess-dark hover:underline"
                      >
                        {d.first_name} {d.last_name}
                      </Link>
                    </td>

                    <td className="px-6 py-3 text-gray-600">{d.user.phone}</td>
                    <td className="px-6 py-3 text-gray-600">{d.vehicle_type ?? '—'}</td>
                    <td className="px-6 py-3"><Badge map={AVAILABILITY} value={d.availability_status} /></td>
                    <td className="px-6 py-3"><Badge map={ACTIVATION} value={d.activation_status} /></td>
                    <td className="px-6 py-3 text-right">
                      {(d.pending_balance_fcfa ?? 0) > 0 ? (
                        <span className="font-semibold text-airmess-dark">
                          {(d.pending_balance_fcfa ?? 0).toLocaleString('fr-FR')}{' '}
                          <span className="text-xs text-gray-500 font-normal">FCFA</span>
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-center">
                      <button
                        onClick={() => handleToggle(d.id, `${d.first_name} ${d.last_name}`, d.activation_status === 'active')}
                        disabled={
                          toggleMutation.isPending ||
                          (d.activation_status === 'active' && d.availability_status === 'busy')
                        }
                        title={
                          d.activation_status === 'active' && d.availability_status === 'busy'
                            ? 'Livreur en course — réaffectez la course avant de désactiver'
                            : d.activation_status === 'active'
                            ? 'Compte actif — cliquer pour désactiver'
                            : 'Compte inactif — cliquer pour activer'
                        }
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition disabled:opacity-50 disabled:cursor-not-allowed ${
                          d.activation_status === 'active' ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                            d.activation_status === 'active' ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        )}
      </main>
    </div>
  )
}
