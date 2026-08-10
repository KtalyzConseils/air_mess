import api from './client'

export interface Course {
  id: number
  reference: string
  status: string
  origin_name: string
  origin_phone?: string
  origin_quartier: string
  origin_city: string
  origin_lat?: number
  origin_lng?: number
  origin_street?: string | null
  destination_name: string
  destination_phone: string
  destination_quartier: string
  destination_city: string
  destination_lat?: number
  destination_lng?: number
  destination_street?: string | null
  destination_instructions?: string | null
  package_description: string
  package_size: 'S' | 'M' | 'L' | 'XL'
  package_weight_kg?: number | string | null
  package_declared_value?: number | null
  urgency: 'standard' | 'express'
  delivery_fee: number
  has_collection?: boolean
  collection_amount?: number | null
  collection_method?: string | null
  delivery_fee_paid_by?: 'sender' | 'recipient'
  status_label?: string
  created_at: string
  delivered_at: string | null
  assigned_at?: string | null
  picked_up_at?: string | null
  driver?: { id: number; user: { name: string; phone: string } } | null
  package_category?: { id: number; name: string } | null
  pickup_code?: string
  delivery_code?: string
  tracking_token: string
  distance_km?: number | null
}

export interface CourseStatusHistoryItem {
  id: number
  course_id: number
  from_status: string | null
  to_status: string
  reason: string | null
  created_at: string
}

export async function fetchCourseHistory(id: number): Promise<CourseStatusHistoryItem[]> {
  const { data } = await api.get(`/courses/${id}/history`)
  return data.history ?? []
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
} = {}): Promise<Paginated<Course>> {
  const { data } = await api.get('/courses', { params })
  return data
}

export async function fetchCourse(id: number): Promise<Course> {
  const { data } = await api.get(`/courses/${id}`)
  return data.course ?? data
}

export async function cancelCourse(id: number, reason?: string): Promise<Course> {
  const { data } = await api.post(`/courses/${id}/cancel`, { reason })
  return data.course ?? data
}

export interface CourseFeeEstimate {
  distance_km: number
  raw_haversine_km: number
  detour_factor: number
  per_km: number
  min: number
  max: number
  multiplier: number
  urgency: 'standard' | 'express'
  fee_before_round: number
  fee: number
  capped: boolean
}

export interface EstimateFeeParams {
  origin_lat: number
  origin_lng: number
  destination_lat: number
  destination_lng: number
  urgency?: 'standard' | 'express'
}

export async function estimateCourseFee(
  params: EstimateFeeParams,
): Promise<CourseFeeEstimate> {
  const { data } = await api.post('/courses/estimate', params)
  return data
}

export interface CreateCoursePayload {
  package_category_id: number
  urgency: 'standard' | 'express'
  package_description: string
  package_size: 'S' | 'M' | 'L' | 'XL'
  package_weight_kg?: number
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
  delivery_fee_paid_by?: 'sender' | 'recipient'
}

export interface CreateCourseResult {
  course?: Course
  payment_required?: boolean
  payment_id?: number
  checkout_url?: string
  message?: string
  quota_reached?: boolean
  used?: number
  limit?: number
  is_high_value?: boolean
}

export async function createCourse(
  payload: CreateCoursePayload & { callback_url?: string },
): Promise<CreateCourseResult> {
  try {
    const { data } = await api.post('/courses', payload)
    return data as CreateCourseResult
  } catch (err: unknown) {
    const axiosErr = err as { response?: { status?: number; data?: CreateCourseResult } }
    if (axiosErr?.response?.status === 402) {
      return axiosErr.response.data as CreateCourseResult
    }
    throw err
  }
}
