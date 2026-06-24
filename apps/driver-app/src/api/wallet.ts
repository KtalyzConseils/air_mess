import api from './client'

export type WalletTransactionType = 'deposit' | 'withdraw' | 'pickup_debit' | 'refund' | 'earning'

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
