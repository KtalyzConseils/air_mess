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
