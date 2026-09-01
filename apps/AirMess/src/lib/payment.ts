import { confirmPayment, type PaymentConfirmation } from '../api/wallet'

export function getPaymentCallbackUrl(context: 'course' | 'wallet') {
  const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/+$/, '')
  if (!apiBaseUrl) {
    throw new Error("L'URL de l'API AirMess n'est pas configuree.")
  }

  const serverUrl = apiBaseUrl.replace(/\/api$/, '')
  return `${serverUrl}/billing/return?context=${context}`
}

export async function waitForPaymentConfirmation(paymentId: number): Promise<PaymentConfirmation> {
  let confirmation: PaymentConfirmation = { status: 'pending', processed: false }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    confirmation = await confirmPayment(paymentId)
    if (confirmation.status === 'paid') return confirmation
    await new Promise((resolve) => setTimeout(resolve, 2_000))
  }

  return confirmation
}
