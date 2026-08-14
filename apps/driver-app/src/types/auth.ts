export type UserType = 'marchant' | 'individual' | 'driver' | 'admin'

export interface User {
  id: number
  name: string
  email: string
  phone: string | null
  type: UserType
  is_active: boolean
  driver?: Driver
  // Multi-rôles : un même User peut cumuler des profils. Rempli par /auth/me.
  marchant?: Marchant
  individual?: Individual
}

export interface Marchant {
  id: number
  user_id: number
  raison_sociale: string
  ifu_rccm: string | null
  secteur_activite: 'supermarche' | 'restaurant' | 'boutique' | 'pharmacie' | 'ecommerce' | 'autre'
  subscription_status: 'trial' | 'active' | 'suspended' | 'churned' | 'expired'
  validated_at: string | null
}

export interface Individual {
  id: number
  user_id: number
  first_name: string
  last_name: string
}

export interface Driver {
  id: number
  user_id: number
  first_name: string
  last_name: string
  photo_url?: string | null
  kind?: 'independent' | 'airmess'
  availability_status: 'offline' | 'available' | 'busy' | 'on_break'
  activation_status: 'pending' | 'validated' | 'active' | 'suspended' | 'banned'
  vehicle_type: string
  vehicle_plate: string | null
  vehicle_brand: string | null
  preferred_response_channel?: 'email' | 'sms' | 'whatsapp' | null
  acceptance_rate: number | null
  current_lat: number | null
  current_lng: number | null
  created_at?: string
}

