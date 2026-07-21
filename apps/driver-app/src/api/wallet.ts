import api from './client'

export type WalletTransactionType =
  | 'deposit'
  | 'withdraw'
  | 'pickup_debit'
  | 'refund'
  | 'earning'
  | 'adjustment_credit'
  | 'adjustment_debit'

export type PayoutMode = 'admin_approval' | 'instant'

export interface WalletTransactionItem {
  id: number
  type: WalletTransactionType
  amount_fcfa: number
  balance_after: number
  course_id: number | null
  created_at: string
}

export interface PendingWithdrawRequest {
  id: number
  driver_id: number
  amount_fcfa: number
  target_method: 'momo' | 'bank'
  target_account: string
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  created_at: string
}

export interface WalletState {
  balance: number
  total_deposited: number
  total_withdrawn: number
  min_withdraw_fcfa: number
  recent_transactions: WalletTransactionItem[]
  pending_withdraw_request: PendingWithdrawRequest | null
  /**
   * Mode de retrait paramétré côté admin :
   *  - admin_approval : la demande est mise en file, l'admin valide.
   *  - instant : le débit et l'appel Fedapay ont lieu immédiatement.
   */
  payout_mode: PayoutMode
  /** Cooldown obligatoire entre 2 retraits en mode instant (informationnel). */
  payout_cooldown_hours: number
  /** ISO8601 de la prochaine demande autorisée si en période de cooldown, sinon null. */
  next_withdraw_allowed_at: string | null
}

export async function fetchWallet(): Promise<WalletState> {
  const { data } = await api.get('/driver/wallet')
  return data
}

export async function requestTopUp(
  amount: number,
  callbackUrl?: string,
): Promise<{
  payment_id: number
  checkout_url: string
}> {
  const { data } = await api.post('/driver/wallet/top-up', {
    amount,
    ...(callbackUrl ? { callback_url: callbackUrl } : {}),
  })
  return data
}

/**
 * Demande au serveur de vérifier auprès de Fedapay si le paiement est approuvé, et de
 * créditer si c'est le cas.
 *
 * Appelé au retour de l'écran de paiement. Le webhook Fedapay reste la voie normale ;
 * ceci évite qu'un webhook en retard ou mal configuré laisse le livreur devant 0 F
 * juste après avoir payé. L'opération est idempotente côté serveur.
 */
export async function confirmTopUp(
  paymentId: number,
): Promise<{ status: string; credited: boolean }> {
  const { data } = await api.post(`/driver/wallet/top-up/${paymentId}/confirm`)
  return data
}

export async function requestWithdraw(payload: {
  amount: number
  target_method: 'momo' | 'bank'
  target_account: string
}): Promise<PendingWithdrawRequest> {
  const { data } = await api.post('/driver/wallet/withdraw-request', payload)
  return data.request
}

export async function cancelWithdrawRequest(id: number): Promise<void> {
  await api.post(`/driver/wallet/withdraw-requests/${id}/cancel`)
}
