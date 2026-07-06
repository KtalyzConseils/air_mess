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
  contact_attempts?: number
  last_contact_attempt_at?: string | null
  is_return_trip?: boolean
  return_code?: string | null
  return_confirmed_at?: string | null
  created_at: string
}

export type Availability = 'offline' | 'available' | 'on_break'

export type TransitionAction =
  | 'start_to_pickup'
  | 'arrived_pickup'
  | 'pickup_confirmed'
  | 'arrived_dropoff'
  | 'delivered'
  | 'return_confirmed'
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

export type DeclineReason =
  | 'too_far'
  | 'wrong_quartier'
  | 'no_helmet'
  | 'vehicle_unfit'
  | 'personal'
  | 'other'

export async function declineCourse(
  courseId: number,
  reason: DeclineReason,
  customReason?: string,
): Promise<void> {
  await api.post(`/driver/courses/${courseId}/decline`, {
    reason,
    custom_reason: customReason ?? null,
  })
}

export async function transition(
  courseId: number,
  action: TransitionAction,
  extra: { pickup_code?: string; delivery_code?: string; return_code?: string; reason?: string } = {},
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

// NB : fetchDriverBalance / fetchDriverEarnings / fetchDriverPayouts ont été supprimées
// le 2026-06-23. Les gains sont désormais crédités directement dans le wallet.

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

/**
 * Cas 3 — Client injoignable.
 * Incrément silencieux du compteur de tentatives d'appel (server rate-limité à 1/30s).
 * À appeler juste avant d'ouvrir le composeur tel:// côté client.
 */
export async function registerCallAttempt(courseId: number): Promise<{
  contact_attempts: number
  last_contact_attempt_at: string | null
}> {
  const { data } = await api.post(`/driver/courses/${courseId}/call-attempt`)
  return data
}

/**
 * Correction manuelle du compteur (le driver a appelé depuis son tel perso).
 * Une note justificative est exigée par le back si `new > current`.
 */
export async function patchContactAttempts(
  courseId: number,
  contactAttempts: number,
  note?: string,
): Promise<{ contact_attempts: number; last_contact_attempt_at: string | null }> {
  const { data } = await api.patch(`/driver/courses/${courseId}/contact-attempts`, {
    contact_attempts: contactAttempts,
    note,
  })
  return data
}
