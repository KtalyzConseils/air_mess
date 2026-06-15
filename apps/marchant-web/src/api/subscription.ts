import api from './client'

export interface SubscriptionPlan {
  id: number
  code: 'trial' | 'starter' | 'pro' | 'business'
  name: string
  monthly_price_fcfa: number
  included_courses: number
  description: string | null
  features: string[] | null
  is_active: boolean
  sort_order: number
}

export async function fetchPlans(): Promise<SubscriptionPlan[]> {
  const { data } = await api.get<{ plans: SubscriptionPlan[] }>('/subscription/plans')
  return data.plans
}

export interface CheckoutResponse {
  payment_id: number
  checkout_url: string
}

export async function createCheckout(planCode: string): Promise<CheckoutResponse> {
  const callbackUrl = `${window.location.origin}/billing/return`
  const { data } = await api.post<CheckoutResponse>('/subscription/checkout', {
    plan_code: planCode,
    callback_url: callbackUrl,
  })
  return data
}
