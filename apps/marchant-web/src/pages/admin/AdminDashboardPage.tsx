import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import AdminPageShell from '../../components/admin/AdminPageShell'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import StatusBadge from '../../components/StatusBadge'
import {
  ClockIcon,
  AlertTriangleIcon,
  StoreIcon,
  ArrowRightIcon,
  PackageIcon,
  BikeIcon,
} from '../../components/ui/icons'
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

const AVAILABILITY_ACCENTS: Record<string, string> = {
  available: 'text-success',
  busy: 'text-warning',
  on_break: 'text-warm-500',
  offline: 'text-warm-400',
}

export default function AdminDashboardPage() {
  const user = useAuthStore((s) => s.user)
  const canOps = hasAdminRole(user, 'ops')
  const canCommercial = hasAdminRole(user, 'commercial')

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: fetchAdminDashboard,
    refetchInterval: 15_000,
  })

  if (isLoading || !data) {
    return (
      <AdminPageShell>
        <AdminPageHeader title="Vue d'ensemble" subtitle="Pilotage temps réel" />
        <div className="p-6 text-warm-500 text-body-s">Chargement…</div>
      </AdminPageShell>
    )
  }

  const { kpi, courses_by_status, drivers_by_availability, awaiting_queue, recent_incidents } = data

  // Alertes actionnables, filtrées par rôle.
  const alerts = [
    canOps && kpi.courses_awaiting > 0 && {
      to: '/admin/courses',
      Icon: ClockIcon,
      label: `${kpi.courses_awaiting} course${kpi.courses_awaiting > 1 ? 's' : ''} à attribuer`,
      tone: 'warning' as const,
    },
    canOps && kpi.incidents_open > 0 && {
      to: '/admin/incidents',
      Icon: AlertTriangleIcon,
      label: `${kpi.incidents_open} incident${kpi.incidents_open > 1 ? 's' : ''} ouvert${kpi.incidents_open > 1 ? 's' : ''}`,
      tone: 'danger' as const,
    },
    canCommercial && kpi.marchants_pending > 0 && {
      to: '/admin/marchants',
      Icon: StoreIcon,
      label: `${kpi.marchants_pending} marchand${kpi.marchants_pending > 1 ? 's' : ''} à valider`,
      tone: 'info' as const,
    },
  ].filter(Boolean) as Array<{
    to: string
    Icon: typeof ClockIcon
    label: string
    tone: 'warning' | 'danger' | 'info'
  }>

  return (
    <AdminPageShell>
      <AdminPageHeader
        title="Vue d'ensemble"
        subtitle="Pilotage temps réel — rafraîchi toutes les 15 s"
      />

      <div className="px-4 md:px-6 lg:px-8 py-5 md:py-6 space-y-6">
        {/* Bandeau d'alertes actionnables ─ s'affiche uniquement si quelque chose réclame attention */}
        {alerts.length > 0 && (
          <section aria-label="Alertes" className="flex flex-wrap gap-2">
            {alerts.map((a) => (
              <AlertChip key={a.to} {...a} />
            ))}
          </section>
        )}

        {/* KPI ─ 6 chiffres clés, neutres + 1 seul accent brand sur le plus stratégique */}
        <section aria-label="Chiffres clés" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 md:gap-3">
          <KpiTile label="Courses jour" value={kpi.courses_today} />
          <KpiTile label="En cours" value={kpi.courses_in_progress} accent="brand" />
          <KpiTile label="Attribution" value={kpi.courses_awaiting} hint="livreur recherché" />
          <KpiTile label="Livrées jour" value={kpi.courses_delivered_today} />
          <KpiTile label="Livreurs online" value={kpi.drivers_online} />
          {canOps ? (
            <KpiTile label="Incidents" value={kpi.incidents_open} danger={kpi.incidents_open > 0} />
          ) : (
            <KpiTile label="Marchands à valider" value={kpi.marchants_pending} />
          )}
        </section>

        {/* Blocs ops : file d'attribution + incidents + livreurs */}
        {canOps && (
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* File d'attribution — colonne large */}
            <Panel
              className="lg:col-span-2"
              title="File d'attribution"
              icon={<PackageIcon size={16} />}
              link={{ to: '/admin/courses', label: 'Toutes les courses' }}
            >
              {awaiting_queue.length === 0 ? (
                <EmptyState text="Aucune course en attente." />
              ) : (
                <ul className="divide-y divide-warm-200">
                  {awaiting_queue.map((c) => (
                    <li
                      key={c.id}
                      className="py-2.5 flex items-center justify-between gap-3 hover:bg-cream/40 -mx-4 px-4 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2">
                          <Link
                            to={`/admin/courses?focus=${c.id}`}
                            className="font-mono text-caption font-bold text-ink hover:text-airmess-red"
                          >
                            {c.reference}
                          </Link>
                          {c.urgency === 'express' && (
                            <span className="text-caption font-bold text-airmess-red uppercase tracking-wide">
                              Express
                            </span>
                          )}
                        </div>
                        <p className="text-body-s text-warm-600 truncate mt-0.5">
                          {c.origin_quartier} → {c.destination_quartier}
                        </p>
                      </div>
                      <span className="text-caption text-warm-500 whitespace-nowrap tabular-nums">
                        {ago(c.created_at)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            {/* Livreurs ─ disponibilité */}
            <Panel title="Livreurs" icon={<BikeIcon size={16} />}>
              <ul className="space-y-1.5">
                {['available', 'busy', 'on_break', 'offline'].map((k) => (
                  <li key={k} className="flex items-center justify-between py-1">
                    <span className="text-body-s text-warm-600">{AVAILABILITY_LABELS[k]}</span>
                    <span className={`text-body font-bold tabular-nums ${AVAILABILITY_ACCENTS[k]}`}>
                      {drivers_by_availability[k] ?? 0}
                    </span>
                  </li>
                ))}
              </ul>
            </Panel>
          </section>
        )}

        {/* Incidents + statuts */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {canOps && (
            <Panel
              title="Incidents ouverts"
              icon={<AlertTriangleIcon size={16} className="text-airmess-red" />}
              link={{ to: '/admin/incidents', label: 'Tout voir' }}
            >
              {recent_incidents.length === 0 ? (
                <EmptyState text="Aucun incident ouvert." />
              ) : (
                <ul className="divide-y divide-warm-200">
                  {recent_incidents.map((i) => (
                    <li key={i.id} className="py-2.5 flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-body-s font-semibold text-ink truncate">
                          {INCIDENT_TYPE_LABELS[i.type] ?? i.type}
                        </p>
                        <p className="text-caption text-warm-500 truncate mt-0.5">
                          {i.course?.reference ?? '—'}
                          {i.description ? ` · ${i.description}` : ''}
                        </p>
                      </div>
                      <span className="text-caption text-warm-500 whitespace-nowrap tabular-nums">
                        {ago(i.created_at)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          )}

          <Panel title="Courses par statut" className={canOps ? '' : 'lg:col-span-2'}>
            {Object.keys(courses_by_status).length === 0 ? (
              <EmptyState text="Aucune course pour le moment." />
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(courses_by_status).map(([status, count]) => (
                  <div
                    key={status}
                    className="inline-flex items-center gap-1.5 bg-cream border border-warm-200 px-2 py-1 rounded-md"
                  >
                    <StatusBadge status={status} />
                    <span className="text-body-s font-bold text-ink tabular-nums">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </section>
      </div>
    </AdminPageShell>
  )
}

/* ============================================================
   Sous-composants — colocation, ne sortent pas du fichier tant
   qu'ils ne sont pas réutilisés ailleurs.
   ============================================================ */

interface KpiTileProps {
  label: string
  value: number | string
  hint?: string
  accent?: 'default' | 'brand'
  danger?: boolean
}

function KpiTile({ label, value, hint, accent = 'default', danger }: KpiTileProps) {
  const styles =
    accent === 'brand'
      ? 'bg-airmess-yellow border-transparent text-ink'
      : danger
        ? 'bg-off-white border-airmess-red/30'
        : 'bg-off-white border-warm-200'

  return (
    <div className={`border rounded-md px-3 py-2.5 ${styles}`}>
      <p className="text-[10px] uppercase tracking-wider font-bold text-warm-600">{label}</p>
      <p
        className={`text-h2 font-bold tabular-nums leading-none mt-1 ${
          danger ? 'text-airmess-red' : 'text-ink'
        }`}
      >
        {value}
      </p>
      {hint && <p className="text-caption text-warm-500 mt-1">{hint}</p>}
    </div>
  )
}

interface PanelProps {
  title: string
  icon?: React.ReactNode
  link?: { to: string; label: string }
  className?: string
  children: React.ReactNode
}

function Panel({ title, icon, link, className = '', children }: PanelProps) {
  return (
    <div className={`bg-off-white border border-warm-200 rounded-lg ${className}`}>
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-warm-200">
        <div className="flex items-center gap-2 min-w-0">
          {icon && <span className="shrink-0 text-warm-600">{icon}</span>}
          <h2 className="text-body-s font-bold text-ink truncate">{title}</h2>
        </div>
        {link && (
          <Link
            to={link.to}
            className="inline-flex items-center gap-1 text-caption font-medium text-warm-600 hover:text-airmess-red shrink-0"
          >
            {link.label}
            <ArrowRightIcon size={12} />
          </Link>
        )}
      </div>
      <div className="px-4 py-3">{children}</div>
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return <p className="text-body-s text-warm-500 italic py-2">{text}</p>
}

interface AlertChipProps {
  to: string
  Icon: typeof ClockIcon
  label: string
  tone: 'warning' | 'danger' | 'info'
}

function AlertChip({ to, Icon, label, tone }: AlertChipProps) {
  const tones = {
    warning: 'bg-warning-bg border-warning/30 text-warning hover:border-warning/50',
    danger: 'bg-danger-bg border-airmess-red/30 text-airmess-red hover:border-airmess-red/60',
    info: 'bg-cream border-warm-300 text-ink hover:border-warm-400',
  }
  return (
    <Link
      to={to}
      className={`inline-flex items-center gap-2 px-3 py-2 rounded-md border text-body-s font-semibold transition-colors ${tones[tone]}`}
    >
      <Icon size={16} />
      <span>{label}</span>
      <ArrowRightIcon size={14} />
    </Link>
  )
}
