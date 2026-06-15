import api from './client'

export interface Address {
  id: number
  user_id: number
  label: string | null
  recipient_name: string
  recipient_phone: string
  street: string | null
  landmark: string | null
  quartier: string
  city: string
  lat: number | null      
  lng: number | null
  maps_link: string | null
  instructions: string | null
  is_default: boolean
  usage_count: number
  created_at: string
  updated_at: string
}

export interface AddressPayload {
  label?: string | null
  recipient_name: string
  recipient_phone: string
  street?: string | null
  landmark?: string | null
  quartier: string
  city: string
  maps_link?: string | null   
  instructions?: string | null
  is_default?: boolean
}


export async function fetchAddresses(): Promise<Address[]> {
  const { data } = await api.get('/addresses')
  return data.addresses
}

export async function createAddress(payload: AddressPayload): Promise<Address> {
  const { data } = await api.post('/addresses', payload)
  return data.address
}

export async function updateAddress(id: number, payload: AddressPayload): Promise<Address> {
  const { data } = await api.patch(`/addresses/${id}`, payload)
  return data.address
}

export async function deleteAddress(id: number): Promise<void> {
  await api.delete(`/addresses/${id}`)
}
