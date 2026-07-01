import api from './client'

/**
 * Client API pour le "mode développeur" : gestion des ApiApplications
 * (apps dev) et de leurs clés, plus la lecture des plans API disponibles.
 *
 * Endpoints back correspondants :
 *   GET    /api-plans
 *   GET    /me/api-apps
 *   POST   /me/api-apps
 *   GET    /me/api-apps/{id}
 *   PATCH  /me/api-apps/{id}
 *   DELETE /me/api-apps/{id}
 *   GET    /me/api-apps/{id}/keys
 *   POST   /me/api-apps/{id}/keys
 *   DELETE /me/api-apps/{id}/keys/{keyId}
 */

export interface ApiPlan {
  id: number
  code: string
  name: string
  monthly_price_fcfa: number
  api_requests_monthly: number // 0 = illimité
  description: string | null
  features: string[]
}

export interface ApiAppPlan {
  id: number
  code: string
  name: string
  monthly_price_fcfa: number
  api_requests_monthly: number
}

export interface ApiApp {
  id: number
  name: string
  description: string | null
  status: 'active' | 'suspended'
  quota_used: number
  quota_limit: number // 0 = illimité
  quota_remaining: number | null // null = illimité
  quota_period_started_at: string | null
  paid_until: string | null   // null = plan gratuit (jamais d'expiration)
  is_expired: boolean
  webhook_url: string | null
  has_webhook: boolean
  plan: ApiAppPlan | null
  created_at: string
}

export interface ApiKey {
  id: number
  name: string
  last_used_at: string | null
  created_at: string
}

// ─── Plans ─────────────────────────────────────────────────────────────

export async function fetchApiPlans(): Promise<ApiPlan[]> {
  const { data } = await api.get('/api-plans')
  return data.data
}

// ─── Apps ──────────────────────────────────────────────────────────────

export async function fetchMyApiApps(): Promise<ApiApp[]> {
  const { data } = await api.get('/me/api-apps')
  return data.data
}

export async function createApiApp(payload: {
  name: string
  description?: string
  subscription_plan_id: number
}): Promise<ApiApp> {
  const { data } = await api.post('/me/api-apps', payload)
  return data.data
}

export async function updateApiApp(
  id: number,
  payload: Partial<{ name: string; description: string; subscription_plan_id: number }>,
): Promise<ApiApp> {
  const { data } = await api.patch(`/me/api-apps/${id}`, payload)
  return data.data
}

export async function deleteApiApp(id: number): Promise<void> {
  await api.delete(`/me/api-apps/${id}`)
}

export interface SubscribeResponse {
  message?: string
  app?: ApiApp
  payment_id?: number
  checkout_url?: string
}

/**
 * Souscription / renouvellement d'un plan. Si plan gratuit → activation
 * immédiate (retourne `app`). Si plan payant → retourne `checkout_url` à
 * ouvrir pour finaliser le paiement Fedapay.
 */
export async function subscribeToPlan(
  appId: number,
  planCode: string,
  callbackUrl: string,
): Promise<SubscribeResponse> {
  const { data } = await api.post(`/me/api-apps/${appId}/subscribe`, {
    plan_code: planCode,
    callback_url: callbackUrl,
  })
  return data
}

// ─── Clés ──────────────────────────────────────────────────────────────

export async function fetchApiAppKeys(appId: number): Promise<ApiKey[]> {
  const { data } = await api.get(`/me/api-apps/${appId}/keys`)
  return data.data
}

/**
 * La valeur en clair (`key`) n'est renvoyée qu'à la création — elle disparaît
 * ensuite. Le front doit la présenter à l'user pour copie immédiate.
 */
export async function createApiAppKey(appId: number): Promise<{
  id: number
  key: string
  message: string
}> {
  const { data } = await api.post(`/me/api-apps/${appId}/keys`)
  return data
}

export async function revokeApiAppKey(appId: number, keyId: number): Promise<void> {
  await api.delete(`/me/api-apps/${appId}/keys/${keyId}`)
}

// ─── Webhooks ──────────────────────────────────────────────────────────

export interface WebhookDelivery {
  id: number
  event_id: string
  event_type: string
  course_id: number | null
  url: string
  status: 'pending' | 'delivered' | 'failed'
  attempts: number
  last_http_status: number | null
  last_error: string | null
  delivered_at: string | null
  last_attempted_at: string | null
  created_at: string
}

export interface PaginatedDeliveries {
  data: WebhookDelivery[]
  current_page: number
  last_page: number
  total: number
}

export async function configureWebhook(
  appId: number,
  webhookUrl: string,
): Promise<{ webhook_url: string; secret: string; message: string }> {
  const { data } = await api.put(`/me/api-apps/${appId}/webhook`, {
    webhook_url: webhookUrl,
  })
  return data
}

export async function disableWebhook(appId: number): Promise<void> {
  await api.delete(`/me/api-apps/${appId}/webhook`)
}

export async function fetchDeliveries(
  appId: number,
  params: { page?: number; status?: 'pending' | 'delivered' | 'failed' } = {},
): Promise<PaginatedDeliveries> {
  const { data } = await api.get(`/me/api-apps/${appId}/deliveries`, { params })
  return data
}

export async function retryDelivery(appId: number, deliveryId: number): Promise<void> {
  await api.post(`/me/api-apps/${appId}/deliveries/${deliveryId}/retry`)
}
