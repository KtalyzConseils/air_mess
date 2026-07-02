import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
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

const TYPE_META: Record<string, { iconKey: IconKey; tone: 'danger' | 'warning' | 'success' | 'info' }> = {
  'incident.reported': { iconKey: 'alert', tone: 'danger' },
  'incident.resolved': { iconKey: 'check', tone: 'success' },
  'course.incident': { iconKey: 'alert', tone: 'warning' },
  'course.assigned_to_you': { iconKey: 'package', tone: 'info' },
  'course.removed': { iconKey: 'package', tone: 'warning' },
  'course.driver_changed': { iconKey: 'driver', tone: 'info' },
  'course.accepted': { iconKey: 'check', tone: 'success' },
  'course.delivered': { iconKey: 'check', tone: 'success' },
  'course.failed': { iconKey: 'alert', tone: 'danger' },
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

export default function AdminNotificationsPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [nowMs] = useState(() => Date.now())

  function timeAgo(iso: string): string {
    const diff = (nowMs - new Date(iso).getTime()) / 1000
    if (diff < 60) return t('admin.notifications.timeNow')
    if (diff < 3600)
      return t('admin.notifications.timeMinutes', { count: Math.floor(diff / 60) })
    if (diff < 86400)
      return t('admin.notifications.timeHours', { count: Math.floor(diff / 3600) })
    return new Date(iso).toLocaleDateString('fr-FR')
  }

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
        title={t('admin.notifications.title')}
        subtitle={
          unreadCount > 0
            ? t('admin.notifications.unreadCount', { count: unreadCount })
            : t('admin.notifications.allRead')
        }
        actions={
          unreadCount > 0 ? (
            <AdminButton variant="primary" onClick={handleMarkAllRead}>
              {t('admin.notifications.markAllReadCount', { count: unreadCount })}
            </AdminButton>
          ) : null
        }
      />

      <div className="px-4 md:px-6 lg:px-8 py-5 max-w-3xl mx-auto">
        {isLoading && (
          <p className="text-body-s text-warm-500 text-center py-10">{t('common.loading')}</p>
        )}

        {error && (
          <p className="text-body-s text-airmess-red text-center py-10">
            {t('common.loadingError')}
          </p>
        )}

        {!isLoading && !error && notifications.length === 0 && (
          <p className="text-body-s text-warm-500 text-center py-10 italic">
            {t('admin.notifications.emptyList')}
          </p>
        )}

        {notifications.length > 0 && (
          <ul className="space-y-1.5">
            {notifications.map((notif) => {
              const meta = TYPE_META[notif.type] ?? {
                iconKey: 'default' as IconKey,
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
                        {t('admin.notifications.refLabel')} {reference}
                      </p>
                    )}
                  </div>

                  <span className="text-caption text-warm-500 shrink-0 whitespace-nowrap tabular-nums">
                    {timeAgo(notif.created_at)}
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
