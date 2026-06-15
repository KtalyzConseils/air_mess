import api from '../client'

// ===== Types =====

export interface AdminPayout {
  id: number
  driver_id: number
  total_amount_fcfa: number
  earnings_count: number
  status: 'pending' | 'paid' | 'failed'
  method: 'mobile_money' | 'bank_transfer' | 'cash'
  destination: string | null
  period_start: string
  period_end: string
  paid_at: string | null
  failure_reason: string | null
  created_at: string
}

export interface AdminEarning {
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
    delivered_at: string | null
  }
}

export interface DriverEarningsResponse {
  driver: { id: number; first_name: string; last_name: string }
  pending_balance_fcfa: number
  total_paid_out_fcfa: number
  earnings: {
    data: AdminEarning[]
    current_page: number
    last_page: number
    total: number
  }
}

// ===== Fonctions API =====

/** Détail des gains d'un livreur (balance + liste). */
export async function fetchDriverEarnings(driverId: number): Promise<DriverEarningsResponse> {
  const { data } = await api.get(`/admin/drivers/${driverId}/earnings`)
  return data
}

/** Génère un payout pour un livreur (regroupe les earnings pending). */
export async function generatePayout(
  driverId: number,
  payload: { method: 'mobile_money' | 'bank_transfer' | 'cash'; destination?: string },
): Promise<AdminPayout> {
  const { data } = await api.post(`/admin/drivers/${driverId}/payouts`, payload)
  return data.payout
}

/** Marque un payout comme payé (transition pending → paid). */
export async function markPayoutPaid(payoutId: number): Promise<AdminPayout> {
  const { data } = await api.post(`/admin/payouts/${payoutId}/mark-paid`)
  return data.payout
}

// ===== Liste globale des payouts (page /admin/payouts) =====

export interface AdminPayoutWithDriver extends AdminPayout {
  driver: {
    id: number
    first_name: string
    last_name: string
    user: { id: number; name: string; phone: string | null }
  } | null
}

export interface PaginatedPayouts {
  data: AdminPayoutWithDriver[]
  current_page: number
  last_page: number
  total: number
  per_page: number
}

export async function fetchAllPayouts(params: {
  status?: 'pending' | 'paid' | 'failed'
  page?: number
} = {}): Promise<PaginatedPayouts> {
  const { data } = await api.get<PaginatedPayouts>('/admin/payouts', { params })
  return data
}
