export type UserType = 'marchant' | 'individual' | 'driver' | 'admin'

export interface User {
  id: number
  name: string
  email: string
  phone: string | null
  type: UserType
  is_active: boolean
  driver?: Driver
}

export interface Driver {
  id: number
  user_id: number
  first_name: string
  last_name: string
  availability_status: 'offline' | 'available' | 'busy' | 'on_break'
  activation_status: 'pending' | 'validated' | 'active' | 'suspended' | 'banned'
  vehicle_type: string
  vehicle_plate: string | null
  vehicle_color: string | null
  acceptance_rate: number | null
  current_lat: number | null
  current_lng: number | null
}

