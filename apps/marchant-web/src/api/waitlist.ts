import api from './client'

export interface MerchantWaitlistPayload {
  commerce_type: string
  commerce_type_other?: string
  zone: string
  zone_other?: string
  weekly_orders: string
  source?: string
  source_other?: string
  delivery_methods: string[]
  delivery_methods_other?: string
  problems: string[]
  problems_other?: string
  worst_experience: string
  cash_collection_issue: string
  time_lost_weekly: string
  orders_lost_weekly: string
  expected_benefit: string
  commission_acceptance: string
  reasonable_fee: string
  mobile_money_trust: string
  interest_level: number
  trial_interest: string
  shop_name?: string
  contact_name?: string
  email?: string
  whatsapp?: string
}

export interface MerchantWaitlistResponse {
  message: string
  waitlist: {
    id: number
    status: string
    bonus_amount: number
    created_at: string | null
  }
}

export async function submitMerchantWaitlist(
  payload: MerchantWaitlistPayload,
): Promise<MerchantWaitlistResponse> {
  const { data } = await api.post('/waitlist/merchants', payload)
  return data
}

export interface DriverWaitlistPayload {
  vehicle_type: string
  zone: string
  zone_other?: string
  experience: string
  availability: string
  source?: string
  source_other?: string
  platforms_used: string[]
  platforms_used_other?: string
  weekly_deliveries: string
  weekly_income: string
  problems: string[]
  problems_other?: string
  worst_experience: string
  expected_payment_model: string
  expected_weekly_income: string
  mobile_money_trust: string
  interest_level: number
  launch_availability: string
  full_name: string
  email: string
  whatsapp: string
}

export interface DriverWaitlistResponse {
  message: string
  waitlist: {
    id: number
    status: string
    created_at: string | null
  }
}

export async function submitDriverWaitlist(
  payload: DriverWaitlistPayload,
): Promise<DriverWaitlistResponse> {
  const { data } = await api.post('/waitlist/drivers', payload)
  return data
}

export interface WaitlistActivationPrefill {
  kind: 'merchant' | 'driver'
  email: string
  phone?: string | null
  name?: string | null
  raison_sociale?: string | null
  secteur_activite?: 'supermarche' | 'restaurant' | 'boutique' | 'pharmacie' | 'ecommerce' | 'autre'
  first_name?: string
  last_name?: string
  vehicle_type?: 'scooter' | 'moto' | 'voiture' | 'velo'
}

export async function fetchWaitlistActivation(token: string): Promise<WaitlistActivationPrefill> {
  const { data } = await api.get(`/waitlist/activation/${encodeURIComponent(token)}`)
  return data.prefill
}
