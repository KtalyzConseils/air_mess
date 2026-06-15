import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import AdminHeader from '../../components/AdminHeader'
import { fetchNotifications, markNotificationRead, type AppNotification } from '../../api/notifications'

const TYPE_META: Record<string, { icon: string; label: string }> = {
  'incident.reported':      { icon: '🚨', label: 'Nouvel incident' },
  'incident.resolved':      { icon: '✅', label: 'Incident résolu' },
  'course.incident':        { icon: '⚠️', label: 'Incident signalé' },
  'course.assigned_to_you': { icon: '📦', label: 'Course attribuée' },
  'course.removed':         { icon: '↩️', label: 'Course retirée' },
  'course.driver_changed':  { icon: '🔄', label: 'Changement de livreur' },
  'course.accepted':        { icon: '✅', label: 'Course acceptée' },
  'course.delivered':       { icon: '🎉', label: 'Livré' },
  'course.failed':          { icon: '⚠️', label: 'Échec' },
}

function timeAgo(iso: string, nowMs: number): string {
  const diff = (nowMs - new Date(iso).getTime()) / 1000
  if (diff < 60) return 'à l\'instant'
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
    notifications.filter((n) => n.read_at === null).forEach((n) => markRead.mutate(n.id))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />
      <main className="max-w-3xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-airmess-dark">🔔 Notifications</h2>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="px-3 py-1.5 text-sm font-semibold text-white bg-airmess-dark rounded hover:bg-gray-700 transition"
            >
              Tout marquer lu ({unreadCount})
            </button>
          )}
        </div>

        {isLoading && <div className="text-center text-gray-500 py-10">Chargement...</div>}

        {error && (
          <div className="text-center text-red-600 py-10">
            Erreur de chargement. Vérifie que l'API tourne.
          </div>
        )}

        {!isLoading && !error && notifications.length === 0 && (
          <div className="text-center text-gray-500 py-10">Aucune notification pour le moment.</div>
        )}

        {notifications.length > 0 && (
          <div className="space-y-2">
            {notifications.map((notif) => {
              const meta = TYPE_META[notif.type] ?? { icon: '🔔', label: 'Notification' }
              const isUnread = notif.read_at === null
              const reference =
                notif.data && typeof notif.data.reference === 'string' ? notif.data.reference : null

              return (
                <div
                  key={notif.id}
                  onClick={() => handleClick(notif)}
                  className={`p-4 rounded-lg shadow-sm hover:shadow-md cursor-pointer transition flex items-start gap-3 ${
                    isUnread ? 'bg-blue-50 border-l-4 border-blue-500' : 'bg-white opacity-70'
                  }`}
                >
                  <div className="text-2xl leading-none pt-0.5">{meta.icon}</div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-airmess-dark truncate">{notif.title}</h3>
                      {isUnread && <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />}
                    </div>
                    <p className="text-sm text-gray-600 mt-0.5">{notif.body}</p>
                    {reference && (
                      <p className="text-xs font-mono text-gray-400 mt-1">Réf : {reference}</p>
                    )}
                  </div>

                  <div className="text-xs text-gray-500 shrink-0 whitespace-nowrap">
                    {timeAgo(notif.created_at, nowMs)}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
