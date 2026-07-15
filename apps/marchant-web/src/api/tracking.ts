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
  /**
   * Uniquement présent pour les courses "aux frais du destinataire".
   * Le destinataire doit préparer `total_to_pay` en cash à la livraison.
   * Null si le marchand a déjà payé la livraison.
   */
  payment: {
    paid_by: 'recipient'
    delivery_fee: number
    collection_amount: number
    collection_method: 'cash' | 'mobile_money' | 'prepaid' | null
    total_to_pay: number
  } | null
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

/**
 * Cas 8 — Le destinataire conteste la livraison depuis le lien tracking.
 * Anti-abus back : autorisé uniquement dans la fenêtre de contestation
 * (`dispute_window_days`, défaut 7 jours) et un seul incident par course.
 */
export interface DisputeTrackingPayload {
  name: string
  phone: string
  description: string
}

export async function disputeTracking(
  token: string,
  payload: DisputeTrackingPayload,
): Promise<{ message: string; incident: { id: number; type: string; status: string } }> {
  const { data } = await api.post(`/tracking/${token}/dispute`, payload)
  return data
}
