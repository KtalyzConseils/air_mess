import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { AxiosError } from 'axios'
import AdminPageShell from '../../components/admin/AdminPageShell'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import AdminTabs from '../../components/admin/AdminTabs'
import { fetchAdminDrivers, toggleDriverActive } from '../../api/admin'
import DriversMap, { DRIVER_STATUS_COLOR } from '../../components/DriversMap'

// Badge de disponibilité (état temps réel du livreur)
const AVAILABILITY: Record<string, { label: string; classes: string }> = {
  available: { label: 'Disponible', classes: 'bg-success-bg text-success border border-success/20' },
  busy: { label: 'Occupé', classes: 'bg-warning-bg text-warning border border-warning/20' },
  on_break: { label: 'En pause', classes: 'bg-warm-100 text-warm-600 border border-warm-200' },
  offline: { label: 'Hors-ligne', classes: 'bg-warm-100 text-warm-500 border border-warm-200' },
}

// Badge d'activation (état administratif du compte livreur)
const ACTIVATION: Record<string, { label: string; classes: string }> = {
  pending: { label: 'En attente', classes: 'bg-warning-bg text-warning border border-warning/20' },
  validated: { label: 'Validé', classes: 'bg-cream text-ink border border-warm-300' },
  active: { label: 'Actif', classes: 'bg-success-bg text-success border border-success/20' },
  suspended: { label: 'Suspendu', classes: 'bg-danger-bg text-airmess-red border border-airmess-red/30' },
}

function Badge({ map, value }: { map: typeof AVAILABILITY; value: string }) {
  const meta = map[value] ?? {
    label: value,
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

type AvailFilter = 'all' | 'available' | 'busy' | 'offline'

const FILTERS: readonly { key: AvailFilter; label: string }[] = [
  { key: 'all', label: 'Tous' },
  { key: 'available', label: 'Disponibles' },
  { key: 'busy', label: 'Occupés' },
  { key: 'offline', label: 'Hors-ligne' },
] as const

export default function AdminDriversPage() {
  const [filter, setFilter] = useState<AvailFilter>('all')
  const [view, setView] = useState<'list' | 'map'>('list')

  const { data: drivers = [], isLoading } = useQuery({
    queryKey: ['admin', 'drivers'],
    queryFn: fetchAdminDrivers,
    refetchInterval: 15_000,
  })

  const filtered =
    filter === 'all' ? drivers : drivers.filter((d) => d.availability_status === filter)

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
    if (isActive && !window.confirm(`Désactiver le compte de ${name} ? Il sera déconnecté.`)) {
      return
    }
    toggleMutation.mutate(id)
  }

  return (
    <AdminPageShell>
      <AdminPageHeader
        title="Livreurs"
        subtitle={`${filtered.length} sur ${drivers.length} · rafraîchi toutes les 15 s`}
        toolbar={
          <div className="flex flex-wrap items-center justify-between gap-3 w-full">
            <AdminTabs tabs={FILTERS} value={filter} onChange={setFilter} />
            <div className="inline-flex items-center bg-warm-100 border border-warm-200 rounded-md p-0.5">
              {(['list', 'map'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={[
                    'h-8 px-3 rounded text-body-s font-medium transition-colors',
                    view === v
                      ? 'bg-airmess-dark text-white shadow-sm'
                      : 'text-warm-600 hover:text-ink',
                  ].join(' ')}
                >
                  {v === 'list' ? 'Liste' : 'Carte'}
                </button>
              ))}
            </div>
          </div>
        }
      />

      <div className="px-4 md:px-6 lg:px-8 py-5">
        {/* Vue carte */}
        {view === 'map' && (
          <div className="space-y-3">
            <DriversMap drivers={filtered} />
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-caption text-warm-600">
              {(['available', 'busy', 'on_break', 'offline'] as const).map((k) => (
                <span key={k} className="flex items-center gap-1.5">
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: DRIVER_STATUS_COLOR[k] }}
                  />
                  {AVAILABILITY[k].label}
                </span>
              ))}
              {filtered.some((d) => d.current_lat == null || d.current_lng == null) && (
                <span className="text-warm-400">
                  ·{' '}
                  {
                    filtered.filter((d) => d.current_lat == null || d.current_lng == null)
                      .length
                  }{' '}
                  sans position GPS
                </span>
              )}
            </div>
          </div>
        )}

        {/* Vue liste */}
        {view === 'list' && (
          <div className="bg-off-white border border-warm-200 rounded-lg overflow-hidden">
            {isLoading ? (
              <div className="p-10 text-center text-warm-500 text-body-s">Chargement…</div>
            ) : filtered.length === 0 ? (
              <div className="p-10 text-center text-warm-500 text-body-s italic">
                Aucun livreur.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-body-s min-w-[800px]">
                  <thead className="bg-cream/60 text-[10px] uppercase tracking-wider font-bold text-warm-600 border-b border-warm-200">
                    <tr>
                      <th className="px-5 py-2.5 text-left">Livreur</th>
                      <th className="px-5 py-2.5 text-left">Téléphone</th>
                      <th className="px-5 py-2.5 text-left">Véhicule</th>
                      <th className="px-5 py-2.5 text-left">Disponibilité</th>
                      <th className="px-5 py-2.5 text-left">Compte</th>
                      <th className="px-5 py-2.5 text-right">Solde en attente</th>
                      <th className="px-5 py-2.5 text-center">Activer</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-warm-200">
                    {filtered.map((d) => (
                      <tr key={d.id} className="hover:bg-cream/40 transition-colors">
                        <td className="px-5 py-2.5">
                          <Link
                            to={`/admin/drivers/${d.id}`}
                            className="font-semibold text-ink hover:text-airmess-red"
                          >
                            {d.first_name} {d.last_name}
                          </Link>
                        </td>
                        <td className="px-5 py-2.5 text-warm-600 tabular-nums">{d.user.phone}</td>
                        <td className="px-5 py-2.5 text-warm-600">{d.vehicle_type ?? '—'}</td>
                        <td className="px-5 py-2.5">
                          <Badge map={AVAILABILITY} value={d.availability_status} />
                        </td>
                        <td className="px-5 py-2.5">
                          <Badge map={ACTIVATION} value={d.activation_status} />
                        </td>
                        <td className="px-5 py-2.5 text-right tabular-nums">
                          {(d.pending_balance_fcfa ?? 0) > 0 ? (
                            <span className="font-semibold text-ink">
                              {(d.pending_balance_fcfa ?? 0).toLocaleString('fr-FR')}
                              <span className="text-caption text-warm-500 font-normal ml-1">
                                FCFA
                              </span>
                            </span>
                          ) : (
                            <span className="text-caption text-warm-400">—</span>
                          )}
                        </td>
                        <td className="px-5 py-2.5 text-center">
                          <button
                            onClick={() =>
                              handleToggle(
                                d.id,
                                `${d.first_name} ${d.last_name}`,
                                d.activation_status === 'active',
                              )
                            }
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
                            className={[
                              'relative inline-flex h-5 w-9 items-center rounded-full transition',
                              'disabled:opacity-50 disabled:cursor-not-allowed',
                              d.activation_status === 'active' ? 'bg-success' : 'bg-warm-300',
                            ].join(' ')}
                            aria-label="Activer/désactiver"
                          >
                            <span
                              className={[
                                'inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition',
                                d.activation_status === 'active' ? 'translate-x-5' : 'translate-x-1',
                              ].join(' ')}
                            />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminPageShell>
  )
}
