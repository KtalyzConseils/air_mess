import api from './client'

/**
 * Codes de motif d'ajustement — mirror du côté back (WalletAdjustment::REASON_*).
 * Le back valide via CHECK Postgres ; on garde ici une source de vérité TS pour
 * les selects côté panneau d'arbitrage.
 */
export const ADJUSTMENT_REASON_CODES = {
  incident_refund:      { side: 'marchand' as const, sign: 'credit' as const, label: 'Remboursement marchand (incident)' },
  no_show_refund:       { side: 'marchand' as const, sign: 'credit' as const, label: 'Remboursement marchand (no-show partiel)' },
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

/**
 * Cas 3 — No-show partiel confirmé (1 clic).
 * Applique automatiquement les % configurés dans app_settings
 * (conflicts_no_show_marchand_refund_percent + conflicts_no_show_driver_earnings_percent) :
 *   - capture partielle du hold marchand
 *   - crédit partiel de la caution driver
 *   - course → failed, incident → resolved
 * Seul le motif "resolution_note" est demandé.
 */
export interface NoShowPartialResponse {
  message: string
  incident: {
    id: number
    status: 'resolved'
    resolution_note: string
    resolved_at: string
  }
  preset: {
    marchand_refund_pct: number
    driver_earnings_pct: number
    delivery_fee: number
    captured_amount: number
    refunded_amount: number
    driver_earnings: number
    partial_earnings: number
  }
  transactions: {
    marchand_charge: unknown | null
    driver_earning:  unknown | null
  }
}

export async function noShowPartial(
  incidentId: number,
  resolutionNote: string,
): Promise<NoShowPartialResponse> {
  const { data } = await api.post(`/admin/incidents/${incidentId}/no-show-partial`, {
    resolution_note: resolutionNote,
  })
  return data
}

/**
 * Cas 4 — Course retour confirmée (1 clic).
 * Applique les % configurés :
 *   - conflicts_return_marchand_shipping_fee_percent (capture marchand)
 *   - conflicts_return_driver_return_earnings_percent (bonus retour driver)
 * Prérequis côté back : course en `failed` via `return_confirmed` +
 * incident `recipient_refused` encore ouvert.
 */
export interface ReturnTripConfirmedResponse {
  message: string
  incident: {
    id: number
    status: 'resolved'
    resolution_note: string
    resolved_at: string
  }
  preset: {
    marchand_shipping_pct: number
    driver_return_pct: number
    delivery_fee: number
    captured_amount: number
    refunded_amount: number
    driver_earnings_base: number
    total_driver_amount: number
  }
  transactions: {
    marchand_charge: unknown | null
    driver_earning:  unknown | null
  }
}

export async function returnTripConfirmed(
  incidentId: number,
  resolutionNote: string,
): Promise<ReturnTripConfirmedResponse> {
  const { data } = await api.post(`/admin/incidents/${incidentId}/return-trip-confirmed`, {
    resolution_note: resolutionNote,
  })
  return data
}

/**
 * Cas 6 — Annulation marchand confirmée (1 clic).
 * Même structure que returnTripConfirmed : partage les settings
 * `conflicts_return_*_percent`. Applique capture marchand + crédit driver
 * (earnings + bonus retour). Prérequis : incident `marchand_cancelled`,
 * course `failed` avec `is_return_trip=true`.
 */
export async function marchandCancelConfirmed(
  incidentId: number,
  resolutionNote: string,
): Promise<ReturnTripConfirmedResponse> {
  const { data } = await api.post(`/admin/incidents/${incidentId}/marchand-cancel-confirmed`, {
    resolution_note: resolutionNote,
  })
  return data
}
