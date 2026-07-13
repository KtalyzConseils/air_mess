import api from './client'

export interface SupportContact {
  /** Téléphone à composer (format international type +229…). Vide = option masquée. */
  phone: string
  /** WhatsApp au format E.164 sans le "+" (ex. 229XXXXXXXX). Vide = option masquée. */
  whatsapp: string
  /** Email support (ex. support@…). Vide = option masquée. */
  email: string
}

/**
 * Lit les 3 contacts support depuis les AppSettings (endpoint public).
 * Les valeurs vides signifient "masquer l'option côté UI".
 * Éditable par le super-admin depuis /admin/settings.
 */
export async function fetchSupportContact(): Promise<SupportContact> {
  const { data } = await api.get('/support-contact')
  return data
}
