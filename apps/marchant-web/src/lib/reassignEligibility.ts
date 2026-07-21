import type { Course } from '../api/courses'
import type { DriverFull } from '../api/admin'

export type EligibilityReasonCode =
  | 'premium_needs_airmess'
  | 'paid_by_recipient_needs_airmess'
  | 'collection_exceeds_wallet'
  | 'not_available'
  | 'not_active'

export interface EligibilityReason {
  code: EligibilityReasonCode
  /** Contexte chiffré pour i18n (ex: {amount, balance}). */
  context?: Record<string, number | string>
}

export interface EligibilityResult {
  eligible: boolean
  reasons: EligibilityReason[]
}

/**
 * Calcule si un driver est éligible pour prendre en charge une course donnée.
 * Miroir exact des règles appliquées côté back dans DriverController::offeredCourses.
 * Sert au front admin pour empêcher (ou signaler) une réassignation incohérente.
 *
 * Les règles :
 *  1. Course premium (is_high_value) → réservé aux Airmess
 *  2. Course "aux frais du destinataire" → réservé aux Airmess (modèle salarié)
 *  3. Course avec encaissement > caution driver → seul Airmess bypass
 *  4. Le driver doit être available + activation active
 */
export function computeEligibility(course: Course, driver: DriverFull): EligibilityResult {
  const reasons: EligibilityReason[] = []
  const isAirmess = driver.kind === 'airmess'

  if (driver.availability_status !== 'available') {
    reasons.push({ code: 'not_available' })
  }

  if (driver.activation_status !== 'active') {
    reasons.push({ code: 'not_active' })
  }

  if (course.is_high_value && !isAirmess) {
    reasons.push({ code: 'premium_needs_airmess' })
  }

  if (course.delivery_fee_paid_by === 'recipient' && !isAirmess) {
    reasons.push({ code: 'paid_by_recipient_needs_airmess' })
  }

  if (
    course.has_collection &&
    course.collection_amount &&
    !isAirmess &&
    (driver.wallet?.balance ?? 0) < course.collection_amount
  ) {
    reasons.push({
      code: 'collection_exceeds_wallet',
      context: {
        amount: course.collection_amount,
        balance: driver.wallet?.balance ?? 0,
      },
    })
  }

  return { eligible: reasons.length === 0, reasons }
}
