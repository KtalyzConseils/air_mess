import api from './client'

export interface MerchantWaitlistPayload {
  commerce_type: string
  commerce_type_other?: string
  nda_partner: string
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
  whatsapp?: string
}

export interface MerchantWaitlistResponse {
  message: string
  waitlist: {
    id: number
    status: string
    bonus_amount: number
    bonus_code: string
    created_at: string | null
  }
}

export async function submitMerchantWaitlist(
  payload: MerchantWaitlistPayload,
): Promise<MerchantWaitlistResponse> {
  const { data } = await api.post('/waitlist/merchants', payload)
  return data
}