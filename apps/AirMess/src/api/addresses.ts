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
  /** Cle d'idempotence envoyee par le formulaire, null pour les autres clients. */
  client_reference: string | null
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
  /**
   * Reference d'appel : rejouer le meme enregistrement (double tap, retry
   * reseau) ne cree qu'une seule adresse cote API.
   */
  client_reference?: string | null
}

export async function fetchAddresses(): Promise<Address[]> {
  const { data } = await api.get<{ addresses: Address[] }>('/addresses')
  return data.addresses
}

export async function createAddress(payload: AddressPayload): Promise<Address> {
  const { data } = await api.post<{ address: Address }>('/addresses', payload)
  return data.address
}

export async function updateAddress(id: number, payload: AddressPayload): Promise<Address> {
  const { data } = await api.patch<{ address: Address }>(`/addresses/${id}`, payload)
  return data.address
}

export async function deleteAddress(id: number): Promise<void> {
  await api.delete(`/addresses/${id}`)
}
