import api from './client'

export interface TrackingPayload {
  reference: string
  status: string
  created_at: string
  assigned_at: string | null
  picked_up_at: string | null
  delivered_at: string | null
  delivery_code: string | null 
  origin: { name: string; quartier: string; city: string }
  destination: {
    name: string
    quartier: string
    city: string
    lat: number
    lng: number
  }
  package: { description: string; category: string | null }
  driver: {
    first_name: string
    phone: string | null
    current_lat: number | null
    current_lng: number | null
    last_position_at: string | null
  } | null
  timeline: Array<{ status: string; created_at: string }>
}

export async function fetchTracking(token: string): Promise<TrackingPayload> {
  const { data } = await api.get(`/tracking/${token}`)
  return data.tracking
}
