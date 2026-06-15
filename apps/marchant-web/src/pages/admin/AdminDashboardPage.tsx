import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import AdminHeader from '../../components/AdminHeader'
import KpiCard from '../../components/KpiCard'
import StatusBadge from '../../components/StatusBadge'
import { fetchAdminDashboard, INCIDENT_TYPE_LABELS } from '../../api/admin'
import { useAuthStore } from '../../stores/authStore'
import { hasAdminRole } from '../../lib/permissions'

// "il y a 12 min" à partir d'une date ISO
function ago(dateStr: string): string {
  const min = Math.round((Date.now() - new Date(dateStr).getTime()) / 60000)
  if (min < 1) return "à l'instant"
  if (min < 60) return `il y a ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `il y a ${h} h`
  return `il y a ${Math.floor(h / 24)} j`
}

const AVAILABILITY_LABELS: Record<string, string> = {
  available: 'Disponibles',
  busy: 'Occupés',
  on_break: 'En pause',
  offline: 'Hors-ligne',
}

export default function AdminDashboardPage() {
  const user = useAuthStore((s) => s.user)
  const canOps = hasAdminRole(user, 'ops')
  const canCommercial = hasAdminRole(user, 'commercial')

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: fetchAdminDashboard,
    refetchInterval: 15_000, // auto-refresh toutes les 15s
  })

  if (isLoading || !data) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminHeader />
        <main className="p-6 text-gray-500">Chargement...</main>
      </div>
    )
  }

  const { kpi, courses_by_status, drivers_by_availability, awaiting_queue, recent_incidents } = data

  // Alertes actionnables, filtrées selon le rôle
  const alerts = [
    canOps && kpi.courses_awaiting > 0 && {
      to: '/admin/courses', icon: '🕒',
      label: `${kpi.courses_awaiting} course(s) à attribuer`,
      classes: 'bg-amber-50 border-amber-200 text-amber-800',
    },
    canOps && kpi.incidents_open > 0 && {
      to: '/admin/incidents', icon: '⚠️',
      label: `${kpi.incidents_open} incident(s) ouvert(s)`,
      classes: 'bg-red-50 border-red-200 text-red-800',
    },
    canCommercial && kpi.marchants_pending > 0 && {
      to: '/admin/marchants', icon: '🏪',
      label: `${kpi.marchants_pending} marchand(s) à valider`,
      classes: 'bg-indigo-50 border-indigo-200 text-indigo-800',
    },
  ].filter(Boolean) as { to: string; icon: string; label: string; classes: string }[]

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />

      <main className="max-w-7xl mx-auto p-6">
        <h2 className="text-2xl font-bold text-airmess-dark mb-6">Vue d'ensemble</h2>

        {/* Barre d'alertes actionnables */}
        {alerts.length > 0 && (
          <div className="flex flex-wrap gap-3 mb-6">
            {alerts.map((a) => (
              <Link
                key={a.to}
                to={a.to}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-semibold hover:opacity-90 ${a.classes}`}
              >
                <span>{a.icon}</span>
                {a.label}
                <span aria-hidden>→</span>
              </Link>
            ))}
          </div>
        )}

        {/* KPI */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <KpiCard label="Courses aujourd'hui" value={kpi.courses_today} accent="yellow" />
          <KpiCard label="En cours" value={kpi.courses_in_progress} accent="dark" />
          <KpiCard label="En attribution" value={kpi.courses_awaiting} accent="red" />
          <KpiCard label="Livrées (jour)" value={kpi.courses_delivered_today} accent="yellow" />
          <KpiCard label="Livreurs en ligne" value={kpi.drivers_online} accent="dark" />
          {canOps ? (
            <KpiCard label="Incidents ouverts" value={kpi.incidents_open} accent="red" />
          ) : (
            <KpiCard label="Marchands à valider" value={kpi.marchants_pending} accent="red" />
          )}
        </div>

        {/* Blocs ops : file d'attribution + incidents + répartition livreurs */}
        {canOps && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* File d'attribution */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-airmess-dark">File d'attribution</h3>
                <Link to="/admin/courses" className="text-xs text-gray-500 hover:underline">Tout voir →</Link>
              </div>
              {awaiting_queue.length === 0 ? (
                <p className="text-sm text-gray-500">Aucune course en attente. 👍</p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {awaiting_queue.map((c) => (
                    <li key={c.id} className="py-2 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <Link to={`/courses/${c.id}`} className="font-mono text-xs font-semibold text-airmess-dark hover:underline">
                          {c.reference}
                        </Link>
                        {c.urgency === 'express' && (
                          <span className="ml-2 text-xs font-bold text-airmess-red">⚡ Express</span>
                        )}
                        <p className="text-xs text-gray-500 truncate">
                          {c.origin_quartier} → {c.destination_quartier}
                        </p>
                      </div>
                      <span className="text-xs text-gray-400 whitespace-nowrap">{ago(c.created_at)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Incidents ouverts + répartition livreurs */}
            <div className="space-y-6">
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-airmess-dark">Incidents ouverts</h3>
                  <Link to="/admin/incidents" className="text-xs text-gray-500 hover:underline">Tout voir →</Link>
                </div>
                {recent_incidents.length === 0 ? (
                  <p className="text-sm text-gray-500">Aucun incident ouvert. 🎉</p>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {recent_incidents.map((i) => (
                      <li key={i.id} className="py-2 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <span className="text-sm font-medium text-airmess-dark">
                            {INCIDENT_TYPE_LABELS[i.type] ?? i.type}
                          </span>
                          <p className="text-xs text-gray-500 truncate">
                            {i.course?.reference ?? '—'}{i.description ? ` · ${i.description}` : ''}
                          </p>
                        </div>
                        <span className="text-xs text-gray-400 whitespace-nowrap">{ago(i.created_at)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="bg-white rounded-2xl shadow-sm p-6">
                <h3 className="font-bold text-airmess-dark mb-4">Livreurs — disponibilité</h3>
                <div className="grid grid-cols-2 gap-3">
                  {['available', 'busy', 'on_break', 'offline'].map((k) => (
                    <div key={k} className="bg-gray-50 rounded-lg px-4 py-3 flex items-center justify-between">
                      <span className="text-sm text-gray-600">{AVAILABILITY_LABELS[k]}</span>
                      <span className="font-bold text-airmess-dark">{drivers_by_availability[k] ?? 0}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Courses par statut (commun) */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h3 className="font-bold text-airmess-dark mb-4">Courses par statut</h3>
          <div className="flex flex-wrap gap-3">
            {Object.entries(courses_by_status).map(([status, count]) => (
              <div key={status} className="bg-gray-50 px-4 py-2 rounded-lg flex items-center gap-2">
                <StatusBadge status={status} />
                <span className="font-bold text-airmess-dark">{count}</span>
              </div>
            ))}
            {Object.keys(courses_by_status).length === 0 && (
              <p className="text-sm text-gray-500">Aucune course pour le moment.</p>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
