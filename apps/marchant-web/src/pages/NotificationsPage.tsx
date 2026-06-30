import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import PageEyebrow from '../components/ui/PageEyebrow'
import { cn } from '../lib/cn'
import { fetchNotifications, markNotificationRead, type AppNotification } from '../api/notifications'

const TYPE_META: Record<string, { icon: string; label: string }> = {
  'course.accepted':         { icon: '✅', label: 'Course acceptée' },
  'course.driver_to_pickup': { icon: '🚀', label: 'Livreur en route' },
  'course.at_pickup':        { icon: '📍', label: 'Livreur au retrait' },
  'course.picked_up':        { icon: '📦', label: 'Colis récupéré' },
  'course.at_dropoff':       { icon: '🚦', label: 'Livreur arrive' },
  'course.delivered':        { icon: '🎉', label: 'Livré' },
  'course.failed':           { icon: '⚠️', label: 'Échec' },
  'wallet.deposited':        { icon: '💰', label: 'Wallet crédité' },
  'wallet.low':              { icon: '⚠️', label: 'Wallet bas' },
}

function timeAgo(iso: string, nowMs: number): string {
  const diff = (nowMs - new Date(iso).getTime()) / 1000
  if (diff < 60)    return "à l'instant"
  if (diff < 3600)  return `il y a ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`
  return new Date(iso).toLocaleDateString('fr-FR')
}

export default function NotificationsPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [nowMs] = useState(() => Date.now())

  const { data, isLoading, error } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => fetchNotifications({ per_page: 50 }),
  })

  const markRead = useMutation({
    mutationFn: (id: number) => markNotificationRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
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
    <div className="min-h-screen bg-cream">
      <AppHeader />
      <main className="max-w-3xl mx-auto px-4 md:px-6 py-8 md:py-12">
        <PageEyebrow label="Notifications" className="mb-4" />
        <div className="flex items-end justify-between gap-4 mb-10">
          <div>
            <h1 className="text-h1 md:text-display-2 text-ink leading-tight">
              🔔 Centre de notifications
            </h1>
            {unreadCount > 0 && (
              <p className="text-body-l text-warm-500 mt-3">
                <strong className="text-ink tabular-nums">{unreadCount}</strong> notification{unreadCount > 1 ? 's' : ''} non lue{unreadCount > 1 ? 's' : ''}.
              </p>
            )}
          </div>
          {unreadCount > 0 && (
            <Button variant="dark" size="md" pill onClick={handleMarkAllRead}>
              Tout marquer lu
            </Button>
          )}
        </div>

        {isLoading && (
          <Card padding="lg" className="text-center text-warm-500">Chargement…</Card>
        )}

        {error && (
          <Card padding="lg" className="text-center bg-danger-bg! border-airmess-red/20! text-airmess-red">
            Erreur de chargement. Vérifie que l'API tourne.
          </Card>
        )}

        {!isLoading && !error && notifications.length === 0 && (
          <Card padding="lg" className="text-center">
            <p className="text-h3 text-ink mb-2">📭 Aucune notification</p>
            <p className="text-body-s text-warm-500">
              Vous serez notifié à chaque étape de vos courses et mouvements de wallet.
            </p>
          </Card>
        )}

        {notifications.length > 0 && (
          <div className="space-y-2">
            {notifications.map((notif) => {
              const meta = TYPE_META[notif.type] ?? { icon: '🔔', label: 'Notification' }
              const isUnread = notif.read_at === null
              const reference =
                notif.data && typeof notif.data.reference === 'string' ? notif.data.reference : null

              return (
                <button
                  key={notif.id}
                  onClick={() => handleClick(notif)}
                  className={cn(
                    'w-full text-left p-4 rounded-lg border transition-all duration-200 hover:shadow-md flex items-start gap-3',
                    isUnread
                      ? 'bg-off-white border-airmess-yellow/40 border-l-4 border-l-airmess-yellow'
                      : 'bg-off-white/60 border-warm-200 opacity-75',
                  )}
                >
                  <div className="text-h2 leading-none pt-0.5" aria-hidden>{meta.icon}</div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-body font-bold text-ink truncate">{notif.title}</h3>
                      {isUnread && (
                        <span
                          className="w-2 h-2 rounded-full bg-airmess-red shrink-0"
                          aria-label="Non lue"
                        />
                      )}
                    </div>
                    <p className="text-body-s text-warm-600 mt-0.5">{notif.body}</p>
                    {reference && (
                      <p className="text-caption font-mono text-warm-400 mt-1">Réf : {reference}</p>
                    )}
                  </div>

                  <div className="text-caption text-warm-500 shrink-0 whitespace-nowrap">
                    {timeAgo(notif.created_at, nowMs)}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
