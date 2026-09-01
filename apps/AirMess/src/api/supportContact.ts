import api from './client'

export interface SupportContact {
  phone: string
  whatsapp: string
  email: string
}

export async function fetchSupportContact(): Promise<SupportContact> {
  const { data } = await api.get('/support-contact')
  return data
}
