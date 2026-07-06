import api from './client'

/**
 * Codes de motif d'ajustement — mirror du côté back (WalletAdjustment::REASON_*).
 * Le back valide via CHECK Postgres ; on garde ici une source de vérité TS pour
 * les selects côté panneau d'arbitrage.
 */
export const ADJUSTMENT_REASON_CODES = {
  incident_refund:      { side: 'marchand' as const, sign: 'credit' as const, label: 'Refund marchand (incident)' },
  no_show_refund:       { side: 'marchand' as const, sign: 'credit' as const, label: 'Refund marchand (no-show partiel)' },
  return_shipping_fee:  { side: 'marchand' as const, sign: 'debit'  as const, label: 'Frais course retour (marchand)' },
  incident_debit:       { side: 'driver'   as const, sign: 'debit'  as const, label: 'Débit driver (incident)' },
  caution_seizure:      { side: 'driver'   as const, sign: 'debit'  as const, label: 'Saisie caution (fraude)' },
  manual_credit:        { side: 'both'     as const, sign: 'credit' as const, label: 'Crédit manuel (super-admin)' },
  manual_debit:         { side: 'both'     as const, sign: 'debit'  as const, label: 'Débit manuel (super-admin)' },
} as const

export type AdjustmentReasonCode = keyof typeof ADJUSTMENT_REASON_CODES

export interface WalletAdjustment {
  id: number
  wallet_type: 'driver' | 'user'
  wallet_owner_id: number
  amount_fcfa: number
  reason_code: AdjustmentReasonCode
  notes: string | null
  course_id: number | null
  incident_id: number | null
  admin_id: number | null
  balance_after: number | null
  created_at: string
}

export interface ArbitratePayload {
  resolution_note: string
  reason_code_marchand?: AdjustmentReasonCode | null
  amount_marchand?: number | null       // signé
  reason_code_driver?: AdjustmentReasonCode | null
  amount_driver?: number | null         // signé
}

export interface ArbitrateResponse {
  message: string
  incident: {
    id: number
    status: 'resolved'
    resolution_note: string
    resolved_at: string
  }
  adjustments: {
    marchand: WalletAdjustment | null
    driver: WalletAdjustment | null
  }
  /**
   * True si le débit driver a été capé sur la caution disponible (Cas 2/7).
   * Le driver est alors auto-suspendu jusqu'à rechargement.
   */
  caution_short: boolean
}

/**
 * Arbitre un incident : résout + applique 0..2 ajustements wallet dans une
 * seule transaction. Le back rollback tout si un des ajustements échoue.
 */
export async function arbitrateIncident(
  incidentId: number,
  payload: ArbitratePayload,
): Promise<ArbitrateResponse> {
  const { data } = await api.post(`/admin/incidents/${incidentId}/arbitrate`, payload)
  return data
}
