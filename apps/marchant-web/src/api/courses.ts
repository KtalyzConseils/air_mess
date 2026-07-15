import api from './client'

export type CourseIncidentStatus = 'open' | 'resolved' | 'cancelled'

export interface CourseIncident {
  id: number
  course_id: number
  reported_by: number | null
  reporter_type: 'driver' | 'marchant' | 'admin' | 'system'
  type: string
  description: string | null
  photo_url: string | null
  status: CourseIncidentStatus
  resolution_note: string | null
  resolved_at: string | null
  created_at: string
  updated_at: string
  reported_by_user?: { id: number; name: string; type: string } | null
}

export interface Course {
  id: number
  reference: string
  status: string
  origin_name: string
  origin_quartier: string
  origin_city: string
  destination_name: string
  destination_phone: string
  destination_quartier: string
  destination_city: string
  package_description: string
  package_size: 'S' | 'M' | 'L' | 'XL'
  urgency: 'standard' | 'express'
  delivery_fee: number
  driver_earnings: number
  package_declared_value?: number | null
  has_collection: boolean
  collection_amount: number | null
  collection_method: 'cash' | 'mobile_money' | 'prepaid' | null
  /**
   * Qui paie les frais de livraison :
   *   - 'sender'    : marchand débité via son wallet à la création (défaut, historique)
   *   - 'recipient' : destinataire paie à la remise, le driver Airmess collecte tout
   */
  delivery_fee_paid_by?: 'sender' | 'recipient'
  status_label?: string
  created_at: string
  delivered_at: string | null
  assigned_at?: string | null
  picked_up_at?: string | null
  sender?: { id: number; name: string; phone: string | null; type: string } | null
  driver?: { id: number; user: { name: string; phone: string } } | null
  package_category?: { id: number; name: string }
  pickup_code: string
  delivery_code: string
  tracking_token: string
  is_return_trip?: boolean
  return_code?: string | null
  return_confirmed_at?: string | null
  // Cas 7 — Vol livreur
  is_fraud?: boolean
  fraud_shortfall_fcfa?: number | null
  // Course premium (au-delà du seuil high_value_threshold_fcfa) : hors pool driver,
  // prise en charge manuelle par l'ops.
  is_high_value?: boolean
  incidents?: CourseIncident[]
}

export interface Paginated<T> {
  data: T[]
  current_page: number
  last_page: number
  total: number
  per_page: number
}

export async function fetchCourses(params: {
  status?: string
  page?: number
  per_page?: number
}): Promise<Paginated<Course>> {
  const { data } = await api.get('/courses', { params })
  return data
}

export interface DeliveryFees {
  standard: number
  express: number
}

export async function fetchDeliveryFees(): Promise<DeliveryFees> {
  const { data } = await api.get('/delivery-fees')
  return data
}

export interface CreateCoursePayload {
  package_category_id: number
  urgency: 'standard' | 'express'
  package_description: string
  package_size: 'S' | 'M' | 'L' | 'XL'
  package_weight_kg?: number
  /** Valeur déclarée du colis en FCFA — sert d'indemnisation en cas de vol/perte. */
  package_declared_value?: number
  origin_name: string
  origin_phone: string
  origin_street?: string
  origin_quartier: string
  origin_city: string
  origin_lat: number
  origin_lng: number
  destination_name: string
  destination_phone: string
  destination_street?: string
  destination_landmark?: string
  destination_quartier: string
  destination_city: string
  destination_lat: number
  destination_lng: number
  destination_instructions?: string
  has_collection: boolean
  collection_amount?: number
  collection_method?: 'cash' | 'mobile_money' | 'prepaid'
  /**
   * Qui paie les frais de livraison. Défaut `sender` (marchand paie via wallet).
   * `recipient` = mode "aux frais du client", exclusif aux drivers Airmess.
   */
  delivery_fee_paid_by?: 'sender' | 'recipient'
}

export interface CreateCourseResult {
  // cas 1 : course créée directement
  course?: Course
  // cas 2 : paiement requis (particulier au-dessus du quota)
  payment_required?: boolean
  payment_id?: number
  checkout_url?: string
  message?: string
  // cas 3 : quota marchand atteint
  quota_reached?: boolean
  used?: number
  limit?: number
  // course premium (seuil dépassé) : hors pool driver, prise en charge manuelle
  is_high_value?: boolean
}

export async function createCourse(
  payload: CreateCoursePayload & { callback_url?: string },
): Promise<CreateCourseResult> {
  try {
    const { data } = await api.post('/courses', payload)
    return data as CreateCourseResult
  } catch (err: any) {
    // 402 Payment Required : on remonte le payload structuré, pas une exception
    if (err?.response?.status === 402) {
      return err.response.data as CreateCourseResult
    }
    throw err
  }
}

export interface CourseStatusHistoryItem {
  id: number
  course_id: number
  from_status: string | null
  to_status: string
  reason: string | null
  metadata: Record<string, unknown> | null
  created_at: string
  changed_by?: { id: number; name: string; type: string } | null
}

export async function fetchCourse(id: number | string): Promise<Course> {
  const { data } = await api.get(`/courses/${id}`)
  return data.course
}

export async function fetchCourseHistory(id: number | string): Promise<CourseStatusHistoryItem[]> {
  const { data } = await api.get(`/courses/${id}/history`)
  return data.history
}

export async function cancelCourse(
  id: number | string,
  reason?: string,
  /** Cas 6 — requis quand la course est post-pickup, sinon 422. */
  confirmPostPickup?: boolean,
): Promise<Course> {
  const { data } = await api.post(`/courses/${id}/cancel`, {
    reason,
    confirm_post_pickup: confirmPostPickup ?? undefined,
  })
  return data.course
}

/**
 * Types d'incidents qu'un marchand/particulier peut signaler sur SA course.
 * (Le back restreint la liste ; ceci en est le mirror pour les selects.)
 */
export const MARCHAND_INCIDENT_TYPES = [
  { value: 'package_damaged',  label: 'Colis endommagé à la livraison' },
  { value: 'package_lost',     label: 'Colis perdu / jamais livré' },
  { value: 'wrong_address',    label: 'Livraison à une mauvaise adresse' },
  { value: 'wrong_recipient',  label: 'Livré au mauvais destinataire' },
  { value: 'payment_issue',    label: 'Problème d\'encaissement' },
  { value: 'other',            label: 'Autre' },
] as const

export type MarchandIncidentType = (typeof MARCHAND_INCIDENT_TYPES)[number]['value']

export interface ReportIncidentPayload {
  type: MarchandIncidentType
  description: string
}

export async function reportCourseIncident(
  courseId: number | string,
  payload: ReportIncidentPayload,
): Promise<CourseIncident> {
  const { data } = await api.post(`/courses/${courseId}/incident`, payload)
  return data.incident
}

