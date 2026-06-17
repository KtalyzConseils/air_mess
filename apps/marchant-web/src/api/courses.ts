import api from './client'

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
  has_collection: boolean
  collection_amount: number | null
  collection_method: 'cash' | 'mobile_money' | 'prepaid' | null
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

export async function cancelCourse(id: number | string, reason?: string): Promise<Course> {
  const { data } = await api.post(`/courses/${id}/cancel`, { reason })
  return data.course
}

