import api from './client'

export interface NotificationItem {
  id: number
  type: string
  title: string
  body: string
  data: Record<string, any> | null
  course_id: number | null
  read_at: string | null
  created_at: string
}

export async function fetchNotifications(page = 1) {
  const { data } = await api.get('/notifications', { params: { page, per_page: 30 } })
  return data as {
    data: NotificationItem[]
    current_page: number
    last_page: number
    total: number
  }
}

export async function fetchUnreadCount(): Promise<number> {
  const { data } = await api.get('/notifications/unread-count')
  return data.unread
}

export async function markNotificationRead(id: number) {
  await api.post(`/notifications/${id}/read`)
}
