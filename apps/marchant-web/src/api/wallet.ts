import api from './client'

export type WalletTransactionType =
  | 'deposit'
  | 'course_charge'
  | 'refund'
  | 'adjustment_credit'
  | 'adjustment_debit'

export interface WalletTransaction {
  id: number
  type: WalletTransactionType
  amount_fcfa: number
  balance_after: number
  course_id: number | null
  created_at: string
  course: { id: number; reference: string } | null
}

export interface WalletState {
  balance: number
  pending_reserved: number
  available: number
  total_deposited: number
  total_spent: number
  min_recommended_fcfa: number
  is_low: boolean
  recent_transactions: WalletTransaction[]
}

export async function fetchWallet(): Promise<WalletState> {
  const { data } = await api.get('/me/wallet')
  return data
}

export interface TopUpResponse {
  payment_id: number
  checkout_url: string
  amount: number
  min_recommended: number
}

export async function requestTopUp(amount: number, callbackUrl?: string): Promise<TopUpResponse> {
  const { data } = await api.post('/me/wallet/top-up', {
    amount,
    callback_url: callbackUrl,
  })
  return data
}
