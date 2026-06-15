export type UserType = 'marchant' | 'individual' | 'driver' | 'admin'

export interface User {
  id: number
  name: string
  email: string
  phone: string | null
  type: UserType
  is_active: boolean
  email_verified_at: string | null
  phone_verified_at: string | null
  last_login_at: string | null
  marchant?: Marchant
  individual?: Individual
  driver?: Driver
  admin?: Admin
}

export interface Marchant {
  id: number
  user_id: number
  raison_sociale: string
  ifu_rccm: string | null
  secteur_activite: 'supermarche' | 'restaurant' | 'boutique' | 'pharmacie' | 'ecommerce' | 'autre'
  subscription_plan: 'trial' | 'starter' | 'pro' | 'business'
  subscription_status: 'trial' | 'active' | 'suspended' | 'churned' |'expired'
  subscription_started_at: string | null
  subscription_next_billing_at: string | null
  monthly_courses_used: number
  monthly_period_started_at: string | null
  validated_at: string | null
  logo_url: string | null
  created_at: string
}

export const PLAN_LIMITS: Record<string, number> = {
  trial:    10,
  starter:  30,
  pro:      100,
  business: 500,
}

export interface Individual {
  id: number
  user_id: number
  first_name: string
  last_name: string
  monthly_courses_used: number
  monthly_courses_limit: number
  subscription_plan: 'starter' | 'pro' | 'business' | null
  subscription_status: 'active' | 'expired' | 'suspended' | 'churned' | null
  subscription_started_at: string | null
  subscription_next_billing_at: string | null
}

export interface Driver {
  id: number
  user_id: number
  first_name: string
  last_name: string
  availability_status: 'offline' | 'available' | 'busy' | 'on_break'
  activation_status: 'pending' | 'validated' | 'active' | 'suspended'
}

export interface Admin {
  id: number
  user_id: number
  first_name: string
  last_name: string
  sub_role: 'super' | 'ops' | 'commercial' | 'support'
}

export interface LoginResponse {
  user: User
  token: string
}
