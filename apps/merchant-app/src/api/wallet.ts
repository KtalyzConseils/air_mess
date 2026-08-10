import api from './client'

export type WalletTransactionType =
  | 'deposit'
  | 'course_charge'
  | 'refund'
  | 'adjustment_credit'
  | 'adjustment_debit'
  | 'withdraw'
  | 'collection_credit'
  | 'adjustment_incident'

export interface WalletTransaction {
  id: number
  type: WalletTransactionType
  amount_fcfa: number
  balance_after: number
  course_id: number | null
  created_at: string
  course: { id: number; reference: string } | null
}

export type WithdrawMethod = 'momo' | 'bank'

export interface PendingWithdrawRequest {
  id: number
  amount_fcfa: number
  target_method: WithdrawMethod
  target_account: string
  created_at: string
}

export interface WithdrawLimits {
  max_per_day_count: number
  max_per_week_count: number
  max_per_day_fcfa: number
  max_per_week_fcfa: number
  used: {
    count_24h: number
    count_7d: number
    amount_24h: number
    amount_7d: number
  }
}

export interface WalletState {
  balance: number
  pending_reserved: number
  available: number
  total_deposited: number
  total_spent: number
  min_recommended_fcfa: number
  min_withdraw_fcfa: number
  is_low: boolean
  recent_transactions: WalletTransaction[]
  pending_withdraw_request: PendingWithdrawRequest | null
  withdraw_limits: WithdrawLimits
}

export async function fetchWallet(): Promise<WalletState> {
  const { data } = await api.get('/me/wallet')
  return data
}

export async function requestTopUp(
  amount: number,
  callbackUrl?: string,
): Promise<{ payment_id: number; checkout_url: string; amount: number }> {
  const { data } = await api.post('/me/wallet/top-up', {
    amount,
    ...(callbackUrl ? { callback_url: callbackUrl } : {}),
  })
  return data
}

export async function requestWithdraw(payload: {
  amount: number
  target_method: WithdrawMethod
  target_account: string
}): Promise<PendingWithdrawRequest> {
  const { data } = await api.post('/me/wallet/withdraw-request', payload)
  return data.request
}

export async function cancelWithdraw(withdrawId: number): Promise<void> {
  await api.post(`/me/wallet/withdraw-requests/${withdrawId}/cancel`)
}
