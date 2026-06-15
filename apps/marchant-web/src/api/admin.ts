import api from './client'
import type { Course, Paginated } from './courses'
import type { Marchant } from '../types/auth'

export interface DashboardKpi {
  courses_today: number
  courses_in_progress: number
  courses_awaiting: number
  courses_delivered_today: number
  drivers_online: number
  marchants_pending: number
  incidents_open: number
}

export interface DashboardAwaiting {
  id: number
  reference: string
  origin_quartier: string
  destination_quartier: string
  urgency: string
  created_at: string
}

export interface DashboardIncident {
  id: number
  course_id: number
  type: string
  description: string | null
  created_at: string
  course: { id: number; reference: string } | null
}

export interface DashboardResponse {
  kpi: DashboardKpi
  courses_by_status: Record<string, number>
  drivers_by_availability: Record<string, number>
  awaiting_queue: DashboardAwaiting[]
  recent_incidents: DashboardIncident[]
}

export interface DriverFull {
  id: number
  first_name: string
  last_name: string
  availability_status: string
  activation_status: string
  vehicle_type: string
  current_lat: number | null
  current_lng: number | null
  user: { name: string; phone: string }
  pending_balance_fcfa: number | null 
}
export interface DriverStats {
  courses_total: number
  courses_delivered: number
  courses_in_progress: number
  courses_failed: number
  total_earnings: number
  last_delivery_at: string | null
}

export interface DriverDetail {
  id: number
  first_name: string
  last_name: string
  gender: string | null
  birth_date: string | null
  vehicle_type: string
  vehicle_plate: string | null
  vehicle_color: string | null
  availability_status: string
  activation_status: string
  acceptance_rate: number
  incidents_count: number
  last_position_at: string | null
  current_lat: number | null
  current_lng: number | null
  photo_url: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  user: { name: string; email: string; phone: string | null }
}

export async function fetchDriver(
  id: number | string,
): Promise<{ driver: DriverDetail; stats: DriverStats }> {
  const { data } = await api.get(`/admin/drivers/${id}`)
  return data
}


export async function fetchAdminDashboard(): Promise<DashboardResponse> {
  const { data } = await api.get('/admin/dashboard')
  return data
}

export async function fetchAdminCourses(params: {
  status?: string
  q?: string
  page?: number
  per_page?: number
}): Promise<Paginated<Course>> {
  const { data } = await api.get('/admin/courses', { params })
  return data
}

export type MarchantWithUser = Marchant & {
  user: { id: number; name: string; email: string; phone: string | null }
}

export async function fetchPendingMarchants(): Promise<MarchantWithUser[]> {
  const { data } = await api.get('/admin/marchants/pending')
  return data.marchants
}

export interface MarchantListParams {
  subscription_status?: string
  validation?: 'pending' | 'validated'
  secteur_activite?: string
  q?: string
  page?: number
  per_page?: number
}

export const INCIDENT_TYPE_LABELS: Record<string, string> = {
  recipient_absent: 'Destinataire absent',
  recipient_unreachable: 'Injoignable',
  wrong_address: 'Adresse erronée',
  recipient_refused: 'Refus du colis',
  package_damaged: 'Colis endommagé',
  package_lost: 'Colis perdu',
  vehicle_breakdown: 'Panne véhicule',
  accident: 'Accident',
  payment_issue: 'Problème de paiement',
  other: 'Autre',
}

export interface AdminIncident {
  id: number
  course_id: number
  type: string
  description: string | null
  status: 'open' | 'resolved' | 'cancelled'
  reporter_type: string
  resolution_note: string | null
  resolved_at: string | null
  created_at: string
  course: { id: number; reference: string; status: string } | null
  reported_by: { id: number; name: string; type: string } | null
}

export interface IncidentListParams {
  status?: string
  type?: string
  page?: number
  per_page?: number
}




// ------------------FONCTIONS API -------------


export async function fetchMarchants(params: MarchantListParams): Promise<Paginated<MarchantWithUser>> {
  const { data } = await api.get('/admin/marchants', { params })
  return data
}

export interface MarchantStats {
  courses_total: number
  courses_delivered: number
  courses_in_progress: number
  courses_cancelled: number
  last_course_at: string | null
}

export async function fetchMarchant(
  id: number | string,
): Promise<{ marchant: MarchantWithUser; stats: MarchantStats }> {
  const { data } = await api.get(`/admin/marchants/${id}`)
  return data
}

export async function validateMarchant(id: number): Promise<void> {
  await api.post(`/admin/marchants/${id}/validate`)
}

export async function fetchAdminDrivers(): Promise<DriverFull[]> {
  const { data } = await api.get('/admin/drivers')
  return data.drivers
}

export async function reassignCourse(courseId: number, newDriverId: number, reason?: string): Promise<Course> {
  const { data } = await api.post(`/admin/courses/${courseId}/reassign`, {
    new_driver_id: newDriverId,
    reason,
  })
  return data.course
}

export async function suspendMarchant(id: number, reason: string): Promise<void> {
  await api.post(`/admin/marchants/${id}/suspend`, { reason })
}

export async function reactivateMarchant(id: number): Promise<void> {
  await api.post(`/admin/marchants/${id}/reactivate`)
}

export async function rejectMarchant(id: number, reason: string): Promise<void> {
  await api.post(`/admin/marchants/${id}/reject`, { reason })
}

export async function deleteMarchant(id: number): Promise<void> {
  await api.delete(`/admin/marchants/${id}`)
}

export async function toggleDriverActive(id: number): Promise<void> {
  await api.post(`/admin/drivers/${id}/toggle-active`)
}

export async function fetchIncidents(params: IncidentListParams): Promise<Paginated<AdminIncident>> {
  const { data } = await api.get('/admin/incidents', { params })
  return data
}

export async function resolveIncident(id: number, resolution_note: string): Promise<void> {
  await api.post(`/admin/incidents/${id}/resolve`, { resolution_note })
}
