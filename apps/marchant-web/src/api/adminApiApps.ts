import api from './client'
import type { Paginated } from './courses'

/**
 * Panel admin des ApiApplications (plateforme).
 * Séparé de `admin.ts` (déjà bien lourd) pour rester scoped à la feature.
 *
 * Endpoints back :
 *   GET  /admin/api-apps
 *   GET  /admin/api-apps/{id}
 *   POST /admin/api-apps/{id}/suspend
 *   POST /admin/api-apps/{id}/reactivate
 */

export interface AdminApiApp {
  id: number
  name: string
  description: string | null
  status: 'active' | 'suspended'
  quota_used: number
  quota_limit: number
  quota_remaining: number | null
  courses_count: number
  created_at: string
  owner: {
    id: number
    type: 'marchant' | 'individual' | 'driver' | 'admin'
    email: string
    phone: string | null
    full_name: string
  } | null
  plan: {
    id: number
    code: string
    name: string
    api_requests_monthly: number
  } | null
}

export interface AdminApiAppListParams {
  search?: string
  status?: 'active' | 'suspended'
  page?: number
}

export async function fetchAdminApiApps(
  params: AdminApiAppListParams = {},
): Promise<Paginated<AdminApiApp>> {
  const { data } = await api.get('/admin/api-apps', { params })
  return data
}

export async function fetchAdminApiApp(id: number): Promise<AdminApiApp> {
  const { data } = await api.get(`/admin/api-apps/${id}`)
  return data.data
}

export async function suspendAdminApiApp(id: number): Promise<AdminApiApp> {
  const { data } = await api.post(`/admin/api-apps/${id}/suspend`)
  return data.data
}

export async function reactivateAdminApiApp(id: number): Promise<AdminApiApp> {
  const { data } = await api.post(`/admin/api-apps/${id}/reactivate`)
  return data.data
}
