import api from '../client'

export interface AdminPlan {
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

export async function fetchAdminPlans(): Promise<AdminPlan[]> {
  const { data } = await api.get<{ plans: AdminPlan[] }>('/admin/plans')
  return data.plans
}

export async function updateAdminPlan(
  planId: number,
  payload: { monthly_price_fcfa: number; included_courses: number; is_active?: boolean },
): Promise<AdminPlan> {
  const { data } = await api.patch<{ plan: AdminPlan }>(`/admin/plans/${planId}`, payload)
  return data.plan
}
