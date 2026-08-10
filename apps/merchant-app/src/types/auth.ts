export type UserType = 'marchant' | 'individual' | 'driver' | 'admin'

export type SecteurActivite =
  | 'supermarche'
  | 'restaurant'
  | 'boutique'
  | 'pharmacie'
  | 'ecommerce'
  | 'autre'

export interface User {
  id: number
  name: string
  email: string
  phone: string | null
  type: UserType
  is_active: boolean
  email_verified_at?: string | null
  phone_verified_at?: string | null
  marchant?: Marchant
  individual?: Individual
}

export interface Marchant {
  id: number
  user_id: number
  raison_sociale: string
  ifu_rccm: string | null
  secteur_activite: SecteurActivite
  subscription_plan: 'trial' | 'starter' | 'pro' | 'business'
  subscription_status: 'trial' | 'active' | 'suspended' | 'churned' | 'expired'
  monthly_courses_used: number
  validated_at: string | null
  logo_url: string | null
}

export interface Individual {
  id: number
  user_id: number
  first_name: string
  last_name: string
  monthly_courses_used: number
  monthly_courses_limit: number
}

export const CLIENT_TYPES: UserType[] = ['marchant', 'individual']

export function isClientUser(type: UserType | undefined): boolean {
  return type === 'marchant' || type === 'individual'
}
