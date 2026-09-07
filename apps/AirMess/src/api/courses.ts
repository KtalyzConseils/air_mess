import api from './client'

export interface Course {
  id: number
  reference: string
  status: string
  status_label?: string
  origin_name?: string
  origin_phone?: string
  origin_quartier: string
  origin_city: string
  destination_name: string
  destination_phone?: string
  destination_quartier: string
  destination_city: string
  package_description?: string
  package_size?: 'S' | 'M' | 'L' | 'XL'
  urgency?: 'standard' | 'express'
  delivery_fee: number
  created_at: string
  delivered_at: string | null
  assigned_at?: string | null
  picked_up_at?: string | null
  pickup_code?: string
  delivery_code?: string
  tracking_token?: string
  driver?: { id: number; user: { name: string; phone: string } } | null
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

export async function fetchCourse(id: number | string): Promise<Course> {
  const { data } = await api.get(`/courses/${id}`)
  return data.course
}

export async function cancelCourse(
  id: number | string,
  payload: { reason?: string; confirm_post_pickup?: boolean } = {},
): Promise<Course> {
  const { data } = await api.post<{ course: Course }>(`/courses/${id}/cancel`, payload)
  return data.course
}

export interface PackageCategory {
  id: number
  code: string
  name: string
  requires_isothermal_bag: boolean
}

export async function fetchPackageCategories(): Promise<PackageCategory[]> {
  const { data } = await api.get<PackageCategory[]>('/package-categories')
  return data
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

export async function estimateCourseFee(params: EstimateFeeParams): Promise<CourseFeeEstimate> {
  const { data } = await api.post<CourseFeeEstimate>('/courses/estimate', params)
  return data
}

export interface CreateCoursePayload {
  package_category_id: number
  urgency: 'standard' | 'express'
  package_description?: string
  package_size: 'S' | 'M' | 'L' | 'XL'
  package_declared_value?: number
  origin_name: string
  origin_phone: string
  origin_phone_secondary?: string
  origin_street?: string
  origin_quartier: string
  origin_city: string
  origin_lat: number
  origin_lng: number
  destination_name: string
  destination_phone: string
  destination_phone_secondary?: string
  destination_street?: string
  destination_quartier: string
  destination_city: string
  destination_lat: number
  destination_lng: number
  has_collection: boolean
  collection_amount?: number
  collection_method?: 'cash' | 'mobile_money' | 'prepaid'
  delivery_fee_paid_by?: 'sender' | 'recipient'
  callback_url?: string
}

export interface CreateCourseResult {
  course?: Course
  payment_id?: number
  payment_required?: boolean
  checkout_url?: string
  message?: string
}

export async function createCourse(payload: CreateCoursePayload): Promise<CreateCourseResult> {
  const { data } = await api.post<CreateCourseResult>('/courses', payload)
  return data
}
