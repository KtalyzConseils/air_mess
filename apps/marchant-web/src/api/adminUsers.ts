import api from './client'
import type { Paginated } from './courses'

export type AdminRole = 'super' | 'ops' | 'commercial' | 'support'

export interface ManagedAdmin {
  id: number
  user_id: number
  first_name: string
  last_name: string
  sub_role: AdminRole
  activity_logs_count?: number
  activity_logs_max_created_at?: string | null
  created_at: string
  updated_at: string
  user: {
    id: number
    name: string
    email: string
    phone: string | null
    is_active: boolean
    last_login_at: string | null
    created_at: string
  }
}

export interface AdminActivityLog {
  id: number
  action: string
  summary: string
  changes: Record<string, unknown> | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
  admin: {
    id: number
    user: { id: number; name: string; email: string }
  } | null
}

export interface AdminUserListParams {
  page?: number
  q?: string
  role?: AdminRole | ''
  active?: boolean | ''
}

export interface CreateAdminUserPayload {
  first_name: string
  last_name: string
  email: string
  phone?: string
  password: string
  sub_role: AdminRole
}

export interface UpdateAdminUserPayload {
  first_name?: string
  last_name?: string
  phone?: string | null
  password?: string
  sub_role?: AdminRole
  is_active?: boolean
}

export async function fetchAdminUsers(
  params: AdminUserListParams = {},
): Promise<Paginated<ManagedAdmin>> {
  const { data } = await api.get('/admin/admins', { params })
  return data
}

export async function createAdminUser(payload: CreateAdminUserPayload): Promise<ManagedAdmin> {
  const { data } = await api.post('/admin/admins', payload)
  return data.admin
}

export async function updateAdminUser(
  id: number,
  payload: UpdateAdminUserPayload,
): Promise<ManagedAdmin> {
  const { data } = await api.patch(`/admin/admins/${id}`, payload)
  return data.admin
}

export async function fetchAdminUserActivity(
  id: number,
): Promise<Paginated<AdminActivityLog>> {
  const { data } = await api.get(`/admin/admins/${id}/activity`, { params: { per_page: 10 } })
  return data
}
