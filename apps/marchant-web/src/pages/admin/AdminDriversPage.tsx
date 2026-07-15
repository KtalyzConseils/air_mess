import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { AxiosError } from 'axios'
import { useTranslation } from 'react-i18next'
import AdminPageShell from '../../components/admin/AdminPageShell'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import AdminTabs from '../../components/admin/AdminTabs'
import { fetchAdminDrivers, toggleDriverActive } from '../../api/admin'
import DriversMap, { DRIVER_STATUS_COLOR } from '../../components/DriversMap'

// Badge de disponibilité (état temps réel du livreur)
const AVAILABILITY_KEYS = ['available', 'busy', 'on_break', 'offline'] as const
const AVAILABILITY_CLASSES: Record<string, string> = {
  available: 'bg-success-bg text-success border border-success/20',
  busy: 'bg-warning-bg text-warning border border-warning/20',
  on_break: 'bg-warm-100 text-warm-600 border border-warm-200',
  offline: 'bg-warm-100 text-warm-500 border border-warm-200',
}

// Badge d'activation (état administratif du compte livreur)
const ACTIVATION_CLASSES: Record<string, string> = {
  pending: 'bg-warning-bg text-warning border border-warning/20',
  validated: 'bg-cream text-ink border border-warm-300',
  active: 'bg-success-bg text-success border border-success/20',
  suspended: 'bg-danger-bg text-airmess-red border border-airmess-red/30',
}

function Badge({
  label,
  classes,
}: {
  label: string
  classes: string
}) {
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-caption font-semibold ${classes}`}
    >
      {label}
    </span>
  )
}

type AvailFilter = 'all' | 'available' | 'busy' | 'offline'

export default function AdminDriversPage() {
  const { t } = useTranslation()
  const [filter, setFilter] = useState<AvailFilter>('all')
  const [view, setView] = useState<'list' | 'map'>('list')

  const FILTERS: readonly { key: AvailFilter; label: string }[] = [
    { key: 'all', label: t('admin.drivers.filterAll') },
    { key: 'available', label: t('admin.drivers.filterAvailable') },
    { key: 'busy', label: t('admin.drivers.filterBusy') },
    { key: 'offline', label: t('admin.drivers.filterOffline') },
  ]

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
          ? err.response?.data?.message ?? t('admin.drivers.actionImpossible')
          : t('admin.drivers.actionImpossible')
      window.alert(message)
    },
  })

  function handleToggle(id: number, name: string, isActive: boolean) {
    if (
      isActive &&
      !window.confirm(t('admin.drivers.confirmDeactivate', { name }))
    ) {
      return
    }
    toggleMutation.mutate(id)
  }

  function availabilityLabel(value: string): string {
    return t(`admin.drivers.availability.${value}`, { defaultValue: value })
  }

  function activationLabel(value: string): string {
    return t(`admin.drivers.activation.${value}`, { defaultValue: value })
  }

  return (
    <AdminPageShell>
      <AdminPageHeader
        title={t('admin.drivers.title')}
        subtitle={t('admin.drivers.refreshInfo', {
          filtered: filtered.length,
          total: drivers.length,
        })}
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
                  {v === 'list' ? t('admin.drivers.viewList') : t('admin.drivers.viewMap')}
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
              {AVAILABILITY_KEYS.map((k) => (
                <span key={k} className="flex items-center gap-1.5">
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: DRIVER_STATUS_COLOR[k] }}
                  />
                  {availabilityLabel(k)}
                </span>
              ))}
              {filtered.some((d) => d.current_lat == null || d.current_lng == null) && (
                <span className="text-warm-400">
                  ·{' '}
                  {
                    filtered.filter((d) => d.current_lat == null || d.current_lng == null)
                      .length
                  }{' '}
                  {t('admin.drivers.noGpsPosition')}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Vue liste */}
        {view === 'list' && (
          <div className="bg-off-white border border-warm-200 rounded-lg overflow-hidden">
            {isLoading ? (
              <div className="p-10 text-center text-warm-500 text-body-s">{t('common.loading')}</div>
            ) : filtered.length === 0 ? (
              <div className="p-10 text-center text-warm-500 text-body-s italic">
                {t('admin.drivers.empty')}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-body-s min-w-[800px]">
                  <thead className="bg-cream/60 text-[10px] uppercase tracking-wider font-bold text-warm-600 border-b border-warm-200">
                    <tr>
                      <th className="px-5 py-2.5 text-left">{t('admin.drivers.colDriver')}</th>
                      <th className="px-5 py-2.5 text-left">{t('admin.drivers.colPhone')}</th>
                      <th className="px-5 py-2.5 text-left">{t('admin.drivers.colVehicle')}</th>
                      <th className="px-5 py-2.5 text-left">{t('admin.drivers.colAvailability')}</th>
                      <th className="px-5 py-2.5 text-left">{t('admin.drivers.colAccount')}</th>
                      <th className="px-5 py-2.5 text-right">{t('admin.drivers.colPendingBalance')}</th>
                      <th className="px-5 py-2.5 text-center">{t('admin.drivers.colActivate')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-warm-200">
                    {filtered.map((d) => (
                      <tr key={d.id} className="hover:bg-cream/40 transition-colors">
                        <td className="px-5 py-2.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Link
                              to={`/admin/drivers/${d.id}`}
                              className="font-semibold text-ink hover:text-airmess-red"
                            >
                              {d.first_name} {d.last_name}
                            </Link>
                            {d.kind === 'airmess' && (
                              <span
                                className="text-[10px] font-extrabold uppercase tracking-widest px-1.5 py-0.5 rounded bg-airmess-yellow/20 text-ink border border-airmess-yellow/50"
                                title={t('admin.drivers.kindAirmessTooltip')}
                              >
                                {t('admin.drivers.kindAirmessBadge')}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-2.5 text-warm-600 tabular-nums">{d.user.phone}</td>
                        <td className="px-5 py-2.5 text-warm-600">{d.vehicle_type ?? '—'}</td>
                        <td className="px-5 py-2.5">
                          <Badge
                            label={availabilityLabel(d.availability_status)}
                            classes={
                              AVAILABILITY_CLASSES[d.availability_status] ??
                              'bg-warm-100 text-warm-600 border border-warm-200'
                            }
                          />
                        </td>
                        <td className="px-5 py-2.5">
                          <Badge
                            label={activationLabel(d.activation_status)}
                            classes={
                              ACTIVATION_CLASSES[d.activation_status] ??
                              'bg-warm-100 text-warm-600 border border-warm-200'
                            }
                          />
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
                                ? t('admin.drivers.toggleTitleBusy')
                                : d.activation_status === 'active'
                                  ? t('admin.drivers.toggleTitleActive')
                                  : t('admin.drivers.toggleTitleInactive')
                            }
                            className={[
                              'relative inline-flex h-5 w-9 items-center rounded-full transition',
                              'disabled:opacity-50 disabled:cursor-not-allowed',
                              d.activation_status === 'active' ? 'bg-success' : 'bg-warm-300',
                            ].join(' ')}
                            aria-label={t('admin.drivers.toggleAriaLabel')}
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
