import api from './client'

export interface AppNotification {
    id : number,
    user_id : number, 
    type : string , 
    title : string, 
    body : string, 
    data :  Record<string, unknown> | null, 
    course_id : number | null, 
    read_at : string | null , 
    created_at : string , 
    updated_at : string 
  }

  export interface Paginated<T> {
    data: T[]
    current_page: number
    last_page: number
    total: number
    per_page: number
  }
  
  export async function fetchNotifications(params: {
    page?: number
    per_page?: number
  }): Promise<Paginated<AppNotification>> {
    const { data } = await api.get('/notifications', { params })
    return data
  }

export async function fetchUnreadCount(): Promise<number>  {  // déballe { unread: N } → renvoie juste N
    const { data } = await api.get<{ unread: number }>('/notifications/unread-count')
    return data.unread
}                    

export async function markNotificationRead(id: number): Promise<AppNotification> {
    const {data} = await api.post(`/notifications/${id}/read`)
    return data.notification
}
