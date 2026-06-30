import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import AdminPageShell from '../../components/admin/AdminPageShell'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import { AdminButton } from '../../components/admin/AdminToolbar'
import {
  AlertTriangleIcon,
  PackageIcon,
  BikeIcon,
  CheckIcon,
  BellIcon,
} from '../../components/ui/icons'
import { fetchNotifications, markNotificationRead, type AppNotification } from '../../api/notifications'

type IconKey =
  | 'alert'
  | 'package'
  | 'driver'
  | 'check'
  | 'default'

const TYPE_META: Record<string, { iconKey: IconKey; label: string; tone: 'danger' | 'warning' | 'success' | 'info' }> = {
  'incident.reported': { iconKey: 'alert', label: 'Nouvel incident', tone: 'danger' },
  'incident.resolved': { iconKey: 'check', label: 'Incident résolu', tone: 'success' },
  'course.incident': { iconKey: 'alert', label: 'Incident signalé', tone: 'warning' },
  'course.assigned_to_you': { iconKey: 'package', label: 'Course attribuée', tone: 'info' },
  'course.removed': { iconKey: 'package', label: 'Course retirée', tone: 'warning' },
  'course.driver_changed': { iconKey: 'driver', label: 'Changement de livreur', tone: 'info' },
  'course.accepted': { iconKey: 'check', label: 'Course acceptée', tone: 'success' },
  'course.delivered': { iconKey: 'check', label: 'Livré', tone: 'success' },
  'course.failed': { iconKey: 'alert', label: 'Échec', tone: 'danger' },
}

function NotifIcon({ iconKey, tone }: { iconKey: IconKey; tone: string }) {
  const color = {
    danger: 'bg-danger-bg text-airmess-red',
    warning: 'bg-warning-bg text-warning',
    success: 'bg-success-bg text-success',
    info: 'bg-cream text-ink',
  }[tone] ?? 'bg-warm-100 text-warm-600'

  const Icon = {
    alert: AlertTriangleIcon,
    package: PackageIcon,
    driver: BikeIcon,
    check: CheckIcon,
    default: BellIcon,
  }[iconKey]

  return (
    <span
      className={`shrink-0 w-9 h-9 rounded-md flex items-center justify-center ${color}`}
    >
      <Icon size={18} />
    </span>
  )
}

function timeAgo(iso: string, nowMs: number): string {
  const diff = (nowMs - new Date(iso).getTime()) / 1000
  if (diff < 60) return "à l'instant"
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`
  return new Date(iso).toLocaleDateString('fr-FR')
}

export default function AdminNotificationsPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [nowMs] = useState(() => Date.now())

  const { data, isLoading, error } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => fetchNotifications({ per_page: 50 }),
    refetchInterval: 20_000,
  })

  const markRead = useMutation({
    mutationFn: (id: number) => markNotificationRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const notifications: AppNotification[] = data?.data ?? []
  const unreadCount = notifications.filter((n) => n.read_at === null).length

  function handleClick(notif: AppNotification) {
    if (notif.read_at === null) markRead.mutate(notif.id)
    if (notif.course_id) navigate(`/courses/${notif.course_id}`)
  }

  function handleMarkAllRead() {
    notifications
      .filter((n) => n.read_at === null)
      .forEach((n) => markRead.mutate(n.id))
  }

  return (
    <AdminPageShell>
      <AdminPageHeader
        title="Notifications"
        subtitle={
          unreadCount > 0
            ? `${unreadCount} non lue${unreadCount > 1 ? 's' : ''}`
            : 'Toutes lues'
        }
        actions={
          unreadCount > 0 ? (
            <AdminButton variant="primary" onClick={handleMarkAllRead}>
              Tout marquer lu ({unreadCount})
            </AdminButton>
          ) : null
        }
      />

      <div className="px-4 md:px-6 lg:px-8 py-5 max-w-3xl mx-auto">
        {isLoading && (
          <p className="text-body-s text-warm-500 text-center py-10">Chargement…</p>
        )}

        {error && (
          <p className="text-body-s text-airmess-red text-center py-10">
            Erreur de chargement. Vérifie que l'API tourne.
          </p>
        )}

        {!isLoading && !error && notifications.length === 0 && (
          <p className="text-body-s text-warm-500 text-center py-10 italic">
            Aucune notification pour le moment.
          </p>
        )}

        {notifications.length > 0 && (
          <ul className="space-y-1.5">
            {notifications.map((notif) => {
              const meta = TYPE_META[notif.type] ?? {
                iconKey: 'default' as IconKey,
                label: 'Notification',
                tone: 'info' as const,
              }
              const isUnread = notif.read_at === null
              const reference =
                notif.data && typeof notif.data.reference === 'string'
                  ? notif.data.reference
                  : null

              return (
                <li
                  key={notif.id}
                  onClick={() => handleClick(notif)}
                  className={[
                    'flex items-start gap-3 px-4 py-3 rounded-lg cursor-pointer transition-all border',
                    isUnread
                      ? 'bg-off-white border-warm-300 hover:border-warm-400 shadow-xs'
                      : 'bg-cream/40 border-transparent hover:bg-cream/70 opacity-75',
                  ].join(' ')}
                >
                  <NotifIcon iconKey={meta.iconKey} tone={meta.tone} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-body-s font-semibold text-ink truncate">
                        {notif.title}
                      </h3>
                      {isUnread && (
                        <span className="w-1.5 h-1.5 rounded-full bg-airmess-red shrink-0" />
                      )}
                    </div>
                    <p className="text-body-s text-warm-600 mt-0.5">{notif.body}</p>
                    {reference && (
                      <p className="text-caption font-mono text-warm-400 mt-1">
                        Réf : {reference}
                      </p>
                    )}
                  </div>

                  <span className="text-caption text-warm-500 shrink-0 whitespace-nowrap tabular-nums">
                    {timeAgo(notif.created_at, nowMs)}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </AdminPageShell>
  )
}
