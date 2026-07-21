import { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchNotifications } from '../api/notifications'
import { useAuthStore } from '../stores/authStore'

const STORAGE_KEY = 'airmess-last-notif-id'

function getLastSeenId(): number {
  const v = localStorage.getItem(STORAGE_KEY)
  return v ? Number(v) : 0
}

function setLastSeenId(id: number) {
  localStorage.setItem(STORAGE_KEY, String(id))
}

export function useDesktopNotifications() {
  const { user } = useAuthStore()
  const lastSeenRef = useRef<number>(getLastSeenId())
  const firstRunRef = useRef<boolean>(true)

  // Web push FCM : si la permission est déjà accordée, on (re)enregistre le
  // token de ce navigateur au chargement (idempotent — met à jour last_seen_at
  // côté API et rattrape les rotations de token FCM).
  useEffect(() => {
    if (!user) return
    if (typeof window === 'undefined' || !('Notification' in window)) return
    if (Notification.permission !== 'granted') return
    void import('../lib/fcm').then(({ enableWebPush }) => enableWebPush())
  }, [user])

  // Récupère la liste (on partage la queryKey avec NotificationsPage → 1 seul fetch)
  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => fetchNotifications({ per_page: 10 }),
    refetchInterval: 30_000,
    enabled: !!user,
  })

  useEffect(() => {
    if (!data?.data) return
    if (typeof window === 'undefined' || !('Notification' in window)) return
    if (Notification.permission !== 'granted') return

    const notifs = data.data
    if (notifs.length === 0) return

    const maxId = Math.max(...notifs.map((n) => n.id))

    // Au premier run, on initialise le marqueur sans rien afficher
    // (sinon on flood le user au reload de l'app)
    if (firstRunRef.current) {
      firstRunRef.current = false
      lastSeenRef.current = maxId
      setLastSeenId(maxId)
      return
    }

    // Filtrer les nouvelles depuis la dernière fois
    const newOnes = notifs
      .filter((n) => n.id > lastSeenRef.current)
      .sort((a, b) => a.id - b.id) // ordre chronologique

    newOnes.forEach((n) => {
      const notif = new Notification(n.title, {
        body: n.body,
        tag: `airmess-${n.id}`,        // évite les doublons OS-level
        icon: '/favicon.ico',
        requireInteraction: false,
      })
      notif.onclick = () => {
        window.focus()
        if (n.course_id) {
          window.location.href = `/courses/${n.course_id}`
        } else {
          window.location.href = '/notifications'
        }
        notif.close()
      }
    })

    if (newOnes.length > 0) {
      lastSeenRef.current = maxId
      setLastSeenId(maxId)
    }
  }, [data])
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
  return Notification.permission
}

export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
  return Notification.requestPermission()
}
