import api from './client'

export interface AppNotification {
  id: number
  type: string
  title: string
  body: string
  data: Record<string, unknown> | null
  course_id: number | null
  read_at: string | null
  created_at: string
}

export async function fetchNotifications(): Promise<AppNotification[]> {
  const { data } = await api.get<{ data: AppNotification[] }>('/notifications', {
    params: { per_page: 50 },
  })
  return data.data
}

export async function markNotificationRead(id: number) {
  await api.post(`/notifications/${id}/read`)
}

export async function fetchUnreadCount(): Promise<number> {
  const { data } = await api.get<{ unread: number }>('/notifications/unread-count')
  return data.unread
}
