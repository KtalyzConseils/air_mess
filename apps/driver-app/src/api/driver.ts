import api from './client'

export interface DriverCourseSummary {
  id: number
  reference: string
  status: string
  origin_name: string
  origin_quartier: string
  destination_name: string
  destination_quartier: string
  destination_city: string
  package_description: string
  delivery_fee: number
  driver_earnings: number
  has_collection: boolean
  collection_amount: number | null
  collection_method: string | null
  urgency: 'standard' | 'express'
  package_category?: { id: number; name: string }
  distance_km?: number  
  origin_lat: number
  origin_lng: number
  destination_lat: number
  destination_lng: number
  package_weight_kg: number | null
  package_size: 'XS' | 'S' | 'M' | 'L' | 'XL' | null
  origin_street: string | null
  origin_landmark: string | null
  origin_instructions: string | null
  destination_street: string | null
  destination_landmark: string | null
  destination_instructions: string | null
  created_at: string
}

export type Availability = 'offline' | 'available' | 'on_break'

export type TransitionAction =
  | 'start_to_pickup'
  | 'arrived_pickup'
  | 'pickup_confirmed'
  | 'arrived_dropoff'
  | 'delivered'
  | 'failed'

export async function updateAvailability(status: Availability) {
  const { data } = await api.post('/driver/availability', { availability_status: status })
  return data.driver
}

export async function updatePosition(lat: number, lng: number) {
  await api.post('/driver/position', { lat, lng })
}

export async function fetchOfferedCourses(): Promise<DriverCourseSummary[]> {
  const { data } = await api.get('/driver/offered-courses')
  return data.courses
}

export async function acceptCourse(courseId: number): Promise<DriverCourseSummary> {
  const { data } = await api.post(`/driver/courses/${courseId}/accept`)
  return data.course
}

export async function transition(
  courseId: number,
  action: TransitionAction,
  extra: { pickup_code?: string; delivery_code?: string; reason?: string } = {},
) {
  const { data } = await api.post(`/driver/courses/${courseId}/transition`, { action, ...extra })
  return data.course
}

export async function fetchMyActiveCourses(): Promise<DriverCourseSummary[]> {
  // statuts non-terminaux du workflow livreur
  const statuses = ['assigned', 'driver_to_pickup', 'at_pickup', 'picked_up', 'at_dropoff'].join(',')
  const { data } = await api.get('/courses', { params: { status: statuses, per_page: 5 } })
  return data.data
}

export type StatPeriod = 'today' | 'last_7' | 'last_30' | 'all_time'

export interface PeriodStat {
  courses: number
  earnings: number
}

export type DriverStats = Record<StatPeriod, PeriodStat>

export async function fetchDriverStats(): Promise<DriverStats> {
  const { data } = await api.get('/driver/stats')
  return data
}

// ===== Gains réels (driver_earnings table) =====

export interface DriverBalance {
  pending_balance_fcfa: number
  total_paid_out_fcfa: number
  pending_count: number
}

export async function fetchDriverBalance(): Promise<DriverBalance> {
  const { data } = await api.get('/driver/balance')
  return data
}

export interface EarningItem {
  id: number
  driver_id: number
  course_id: number
  amount_fcfa: number
  status: 'pending' | 'paid' | 'void'
  payout_id: number | null
  credited_at: string | null
  course?: {
    id: number
    reference: string
    origin_quartier: string
    destination_quartier: string
    delivered_at: string | null
  }
}

export async function fetchDriverEarnings(page = 1): Promise<{
  data: EarningItem[]
  current_page: number
  last_page: number
  total: number
}> {
  const { data } = await api.get('/driver/earnings', { params: { page } })
  return data
}

export interface PayoutItem {
  id: number
  total_amount_fcfa: number
  earnings_count: number
  status: 'pending' | 'paid' | 'failed'
  method: string
  destination: string | null
  period_start: string
  period_end: string
  paid_at: string | null
  created_at: string
}

export async function fetchDriverPayouts(page = 1): Promise<{
  data: PayoutItem[]
  current_page: number
  last_page: number
  total: number
}> {
  const { data } = await api.get('/driver/payouts', { params: { page } })
  return data
}

export interface CourseHistoryItem {
  id: number
  reference: string
  status: string
  origin_quartier: string
  destination_quartier: string
  destination_city: string
  driver_earnings: number
  delivered_at: string | null
  created_at: string
}

export async function fetchDriverHistory(page = 1): Promise<{
  data: CourseHistoryItem[]
  current_page: number
  last_page: number
  total: number
}> {
  const { data } = await api.get('/courses', {
    params: { status: 'delivered,failed', per_page: 20, page },
  })
  return data
}

export const INCIDENT_TYPES: { value: string; label: string }[] = [
  { value: 'recipient_absent',      label: 'Destinataire absent' },
  { value: 'recipient_unreachable', label: 'Injoignable' },
  { value: 'wrong_address',         label: 'Adresse erronée' },
  { value: 'recipient_refused',     label: 'Refus du colis' },
  { value: 'package_damaged',       label: 'Colis endommagé' },
  { value: 'package_lost',          label: 'Colis perdu' },
  { value: 'vehicle_breakdown',     label: 'Panne véhicule' },
  { value: 'accident',              label: 'Accident' },
  { value: 'payment_issue',         label: 'Problème de paiement' },
  { value: 'other',                 label: 'Autre' },
]

export async function reportIncident(
  courseId: number,
  payload: { type: string; description?: string; lat?: number; lng?: number },
) {
  const { data } = await api.post(`/driver/courses/${courseId}/incident`, payload)
  return data.incident
}
