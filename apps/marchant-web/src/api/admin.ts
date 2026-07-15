import api from './client'
import type { Course, Paginated } from './courses'
import type { Marchant, Individual } from '../types/auth'

export interface DashboardKpi {
  courses_today: number
  courses_in_progress: number
  courses_awaiting: number
  courses_delivered_today: number
  drivers_online: number
  marchants_pending: number
  incidents_open: number
}

export interface DashboardAwaiting {
  id: number
  reference: string
  origin_quartier: string
  destination_quartier: string
  urgency: string
  created_at: string
}

export interface DashboardIncident {
  id: number
  course_id: number
  type: string
  description: string | null
  created_at: string
  course: { id: number; reference: string } | null
}

export interface DashboardResponse {
  kpi: DashboardKpi
  courses_by_status: Record<string, number>
  drivers_by_availability: Record<string, number>
  awaiting_queue: DashboardAwaiting[]
  recent_incidents: DashboardIncident[]
}

export type DriverKind = 'independent' | 'airmess'

export interface DriverFull {
  id: number
  first_name: string
  last_name: string
  availability_status: string
  activation_status: string
  kind: DriverKind
  vehicle_type: string
  current_lat: number | null
  current_lng: number | null
  user: { name: string; phone: string }
  pending_balance_fcfa: number | null
}
export interface DriverStats {
  courses_total: number
  courses_delivered: number
  courses_in_progress: number
  courses_failed: number
  total_earnings: number
  last_delivery_at: string | null
}

export interface DriverWallet {
  id: number
  balance: number
  total_deposited: number
  total_withdrawn: number
}

export interface UserWallet {
  id: number
  balance: number
  pending_reserved: number
  total_deposited: number
  total_spent: number
}

export interface DriverDetail {
  id: number
  first_name: string
  last_name: string
  gender: string | null
  birth_date: string | null
  vehicle_type: string
  vehicle_plate: string | null
  vehicle_color: string | null
  availability_status: string
  activation_status: string
  acceptance_rate: number
  incidents_count: number
  last_position_at: string | null
  current_lat: number | null
  current_lng: number | null
  photo_url: string | null
  cni_url: string | null
  cni_type: 'cnib' | 'cip' | 'passeport' | null
  cni_back_url: string | null
  driving_license_url: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  emergency_contact2_name: string | null
  emergency_contact2_phone: string | null
  preferred_response_channel: 'email' | 'sms' | 'whatsapp' | null
  kind: DriverKind
  user: { id: number; name: string; email: string; phone: string | null }
  wallet: DriverWallet | null
}

export type DeclineReason =
  | 'too_far'
  | 'wrong_quartier'
  | 'no_helmet'
  | 'vehicle_unfit'
  | 'personal'
  | 'other'

export interface DeclineRecord {
  id: number
  driver_id: number
  course_id: number
  reason: DeclineReason
  custom_reason: string | null
  created_at: string
  course: {
    id: number
    reference: string
    origin_quartier: string
    destination_quartier: string
  } | null
}

export interface DriverDeclines {
  total_30d: number
  by_reason: Partial<Record<DeclineReason, number>>
  recent: DeclineRecord[]
}

export async function fetchDriver(
  id: number | string,
): Promise<{ driver: DriverDetail; stats: DriverStats; declines: DriverDeclines }> {
  const { data } = await api.get(`/admin/drivers/${id}`)
  return data
}

/**
 * Bascule le type d'un livreur : freelance ↔ salarié Air Mess.
 * Réservé au super-admin (403 sinon). Trace automatique dans support_notes.
 */
export async function updateDriverKind(
  id: number | string,
  kind: DriverKind,
): Promise<{ driver: DriverDetail; message: string }> {
  const { data } = await api.patch(`/admin/drivers/${id}/kind`, { kind })
  return data
}


export async function fetchAdminDashboard(): Promise<DashboardResponse> {
  const { data } = await api.get('/admin/dashboard')
  return data
}

export async function fetchAdminCourses(params: {
  status?: string
  q?: string
  page?: number
  per_page?: number
}): Promise<Paginated<Course>> {
  const { data } = await api.get('/admin/courses', { params })
  return data
}

export type MarchantWithUser = Marchant & {
  user: { id: number; name: string; email: string; phone: string | null; wallet?: UserWallet | null }
}

export async function fetchPendingMarchants(): Promise<MarchantWithUser[]> {
  const { data } = await api.get('/admin/marchants/pending')
  return data.marchants
}

export interface MarchantListParams {
  subscription_status?: string
  validation?: 'pending' | 'validated'
  secteur_activite?: string
  q?: string
  page?: number
  per_page?: number
}

export const INCIDENT_TYPE_LABELS: Record<string, string> = {
  recipient_absent: 'Destinataire absent',
  recipient_unreachable: 'Injoignable',
  wrong_address: 'Adresse erronée',
  recipient_refused: 'Refus du colis',
  package_damaged: 'Colis endommagé',
  package_lost: 'Colis perdu',
  vehicle_breakdown: 'Panne véhicule',
  accident: 'Accident',
  payment_issue: 'Problème de paiement',
  other: 'Autre',
}

export interface AdminIncident {
  id: number
  course_id: number
  type: string
  description: string | null
  status: 'open' | 'resolved' | 'cancelled'
  reporter_type: string
  resolution_note: string | null
  resolved_at: string | null
  created_at: string
  course: { id: number; reference: string; status: string } | null
  reported_by: { id: number; name: string; type: string } | null
}

export interface IncidentListParams {
  status?: string
  type?: string
  page?: number
  per_page?: number
}




// ------------------FONCTIONS API -------------


export async function fetchMarchants(params: MarchantListParams): Promise<Paginated<MarchantWithUser>> {
  const { data } = await api.get('/admin/marchants', { params })
  return data
}

export interface MarchantStats {
  courses_total: number
  courses_delivered: number
  courses_in_progress: number
  courses_cancelled: number
  last_course_at: string | null
}

export async function fetchMarchant(
  id: number | string,
): Promise<{ marchant: MarchantWithUser; stats: MarchantStats }> {
  const { data } = await api.get(`/admin/marchants/${id}`)
  return data
}

export async function validateMarchant(id: number): Promise<void> {
  await api.post(`/admin/marchants/${id}/validate`)
}

export async function fetchAdminDrivers(): Promise<DriverFull[]> {
  const { data } = await api.get('/admin/drivers')
  return data.drivers
}

/**
 * Cas 7 — Marque une course comme fraude driver.
 * Super-admin uniquement. Bannit le driver, saisit sa caution,
 * rembourse le marchand. Irréversible.
 */
export interface MarkFraudResponse {
  message: string
  course: Course
  summary: {
    refund_owed: number
    package_value: number
    collection: number
    seized_amount: number
    shortfall: number
  }
  incident: unknown
}

export async function markCourseFraud(
  courseId: number,
  note: string,
): Promise<MarkFraudResponse> {
  const { data } = await api.post(`/admin/courses/${courseId}/mark-fraud`, { note })
  return data
}

export interface ReassignOptions {
  /** Cas 5 — Le colis est chez le driver précédent (panne/accident post-pickup). */
  pickupFromPreviousDriver?: boolean
  /** Coords du transfert. Si omis, le back utilise la current position du driver initial. */
  transferLat?: number
  transferLng?: number
}

export async function reassignCourse(
  courseId: number,
  newDriverId: number,
  reason?: string,
  options: ReassignOptions = {},
): Promise<Course> {
  const { data } = await api.post(`/admin/courses/${courseId}/reassign`, {
    new_driver_id: newDriverId,
    reason,
    pickup_from_previous_driver: options.pickupFromPreviousDriver ?? undefined,
    transfer_lat: options.transferLat ?? undefined,
    transfer_lng: options.transferLng ?? undefined,
  })
  return data.course
}

export async function suspendMarchant(id: number, reason: string): Promise<void> {
  await api.post(`/admin/marchants/${id}/suspend`, { reason })
}

export async function reactivateMarchant(id: number): Promise<void> {
  await api.post(`/admin/marchants/${id}/reactivate`)
}

export async function rejectMarchant(id: number, reason: string): Promise<void> {
  await api.post(`/admin/marchants/${id}/reject`, { reason })
}

export async function deleteMarchant(id: number): Promise<void> {
  await api.delete(`/admin/marchants/${id}`)
}

export async function toggleDriverActive(id: number): Promise<void> {
  await api.post(`/admin/drivers/${id}/toggle-active`)
}

/**
 * Valide un livreur fraîchement inscrit (pending → active). Envoie un email au driver.
 */
export async function validateDriver(id: number): Promise<void> {
  await api.post(`/admin/drivers/${id}/validate`)
}

/**
 * Récupère un document privé d'un livreur (photo/CNI/permis) en blob et l'ouvre dans un nouvel onglet.
 * Le token Sanctum est ajouté automatiquement par l'intercepteur axios.
 */
export async function openDriverDocument(
  driverId: number,
  type: 'photo' | 'cni' | 'cni_back' | 'driving_license',
): Promise<void> {
  const response = await api.get(`/admin/drivers/${driverId}/document/${type}`, {
    responseType: 'blob',
  })
  const url = window.URL.createObjectURL(response.data)
  const win = window.open(url, '_blank')
  if (!win) {
    // Le navigateur a bloqué le popup : fallback en téléchargement
    const a = document.createElement('a')
    a.href = url
    a.download = `${type}-driver-${driverId}`
    document.body.appendChild(a)
    a.click()
    a.remove()
  }
  // Libération du blob URL après un délai (laisse le temps au nouvel onglet de le lire)
  setTimeout(() => window.URL.revokeObjectURL(url), 60_000)
}

export async function fetchIncidents(params: IncidentListParams): Promise<Paginated<AdminIncident>> {
  const { data } = await api.get('/admin/incidents', { params })
  return data
}

export async function resolveIncident(id: number, resolution_note: string): Promise<void> {
  await api.post(`/admin/incidents/${id}/resolve`, { resolution_note })
}

// ============== PARTICULIERS (ADMIN) ==============

export type IndividualWithUser = Individual & {
  user: { id: number; name: string; email: string; phone: string | null; is_active: boolean; wallet?: UserWallet | null }
}

export interface IndividualListParams {
  subscription_status?: 'free' | 'active' | 'expired' | 'suspended' | 'churned'
  q?: string
  page?: number
  per_page?: number
}

export interface IndividualStats {
  courses_total: number
  courses_delivered: number
  courses_in_progress: number
  courses_cancelled: number
  last_course_at: string | null
}

export interface IndividualOneShotPayment {
  id: number
  amount_fcfa: number
  status: 'pending' | 'processing' | 'paid' | 'failed' | 'refunded'
  provider: string
  paid_at: string | null
  created_at: string
}

export interface IndividualOneShotSummary {
  total_paid_fcfa: number
  count_paid: number
}

export interface IndividualDetailResponse {
  individual: IndividualWithUser
  stats: IndividualStats
  one_shot_payments: IndividualOneShotPayment[]
  one_shot_summary: IndividualOneShotSummary
}

export async function fetchIndividuals(
  params: IndividualListParams,
): Promise<Paginated<IndividualWithUser>> {
  const { data } = await api.get('/admin/individuals', { params })
  return data
}

export async function fetchIndividual(id: number | string): Promise<IndividualDetailResponse> {
  const { data } = await api.get(`/admin/individuals/${id}`)
  return data
}

export async function suspendIndividual(id: number, reason: string): Promise<void> {
  await api.post(`/admin/individuals/${id}/suspend`, { reason })
}

export async function reactivateIndividual(id: number): Promise<void> {
  await api.post(`/admin/individuals/${id}/reactivate`)
}

// ============== WALLET WITHDRAW REQUESTS (ADMIN) ==============

/**
 * Une demande de retrait est portée SOIT par un driver (retrait de caution)
 * SOIT par un user marchand/particulier (retrait wallet payeur). Exactement UN
 * des deux champs est renseigné — l'UI branche sur celui qui n'est pas null.
 */
export interface WithdrawRequestOwner {
  id: number
  driver_id: number | null
  user_id: number | null
  amount_fcfa: number
  target_method: 'momo' | 'bank'
  target_account: string
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  decided_by_admin_id: number | null
  decided_at: string | null
  rejection_reason: string | null
  created_at: string
  updated_at: string
  driver: {
    id: number
    user_id: number
    first_name: string
    last_name: string
    user: { id: number; phone: string | null; email: string }
  } | null
  user: {
    id: number
    name: string
    phone: string | null
    email: string
    type: 'marchant' | 'individual'
    marchant?: { id: number; user_id: number; raison_sociale: string } | null
    individual?: { id: number; user_id: number; first_name: string; last_name: string } | null
  } | null
}

/** @deprecated — alias historique, utiliser WithdrawRequestOwner qui est polymorphe. */
export type WithdrawRequestWithDriver = WithdrawRequestOwner

export interface WithdrawRequestListParams {
  status?: 'pending' | 'approved' | 'rejected' | 'cancelled'
  owner_type?: 'driver' | 'user'
  page?: number
  per_page?: number
}

export async function fetchWithdrawRequests(
  params: WithdrawRequestListParams,
): Promise<Paginated<WithdrawRequestOwner>> {
  const { data } = await api.get('/admin/withdraw-requests', { params })
  return data
}

// ----- Détail d'une demande (page de revue admin) -----

export interface WithdrawRequestDetailDriver {
  id: number
  user_id: number
  first_name: string
  last_name: string
  availability_status: string
  activation_status: string
  user: { id: number; phone: string | null; email: string }
  wallet: {
    id: number
    balance: number
    total_deposited: number
    total_withdrawn: number
  } | null
}

export interface WithdrawRequestDetailUser {
  id: number
  name: string
  phone: string | null
  email: string
  type: 'marchant' | 'individual'
  marchant?: { id: number; user_id: number; raison_sociale: string } | null
  individual?: { id: number; user_id: number; first_name: string; last_name: string } | null
}

export interface WithdrawRequestDetailRequest {
  id: number
  driver_id: number | null
  user_id: number | null
  amount_fcfa: number
  target_method: 'momo' | 'bank'
  target_account: string
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  decided_by_admin_id: number | null
  decided_at: string | null
  rejection_reason: string | null
  external_payout_reference: string | null
  paid_at: string | null
  paid_by_admin_id: number | null
  payout_initiated_at: string | null
  payout_provider_ref: string | null
  payout_failed_at: string | null
  payout_failure_reason: string | null
  created_at: string
  updated_at: string
  driver: WithdrawRequestDetailDriver | null
  user: WithdrawRequestDetailUser | null
  decided_by_admin: { id: number; first_name: string; last_name: string } | null
  paid_by_admin: { id: number; first_name: string; last_name: string } | null
}

export interface WithdrawRequestActiveCourse {
  id: number
  reference: string
  status: string
  has_collection: boolean
  collection_amount: number | null
}

export interface WithdrawRequestRecentTx {
  id: number
  type: 'deposit' | 'withdraw' | 'pickup_debit' | 'refund' | 'earning'
  amount_fcfa: number
  balance_after: number
  course_id: number | null
  created_at: string
  course: { id: number; reference: string } | null
}

export interface WithdrawRequestPastAggregates {
  approved_count: number
  approved_total: number
  rejected_count: number
  cancelled_count: number
}

export interface WithdrawRequestDetailResponse {
  request: WithdrawRequestDetailRequest
  owner_type: 'driver' | 'user'
  active_course?: WithdrawRequestActiveCourse | null
  user_wallet?: {
    balance: number
    pending_reserved: number
    available: number
    total_deposited: number
    total_spent: number
  } | null
  recent_transactions: WithdrawRequestRecentTx[]
  past_requests: WithdrawRequestPastAggregates
}

export async function fetchWithdrawRequest(id: number | string): Promise<WithdrawRequestDetailResponse> {
  const { data } = await api.get(`/admin/withdraw-requests/${id}`)
  return data
}

export async function approveWithdrawRequest(id: number): Promise<void> {
  await api.post(`/admin/withdraw-requests/${id}/approve`)
}

export async function rejectWithdrawRequest(id: number, reason: string): Promise<void> {
  await api.post(`/admin/withdraw-requests/${id}/reject`, { reason })
}

export async function markWithdrawRequestPaid(id: number, externalReference: string): Promise<void> {
  await api.post(`/admin/withdraw-requests/${id}/mark-paid`, {
    external_payout_reference: externalReference,
  })
}

export async function retryWithdrawPayout(id: number): Promise<void> {
  await api.post(`/admin/withdraw-requests/${id}/retry-payout`)
}

// ============== AJUSTEMENT MANUEL DES WALLETS (SUPER-ADMIN) ==============

export type WalletAdjustmentTarget = 'driver' | 'user'
export type WalletAdjustmentDirection = 'credit' | 'debit'

export interface WalletAdjustmentPayload {
  direction: WalletAdjustmentDirection
  amount: number
  reason: string
}

/**
 * Ajustement manuel d'un wallet driver. Réservé super-admin (gardé côté API).
 * Le wallet est crédité ou débité immédiatement, une transaction immuable est créée
 * avec admin_id + raison.
 */
export async function adjustDriverWallet(driverId: number, payload: WalletAdjustmentPayload): Promise<void> {
  await api.post(`/admin/drivers/${driverId}/wallet-adjustment`, payload)
}

/**
 * Ajustement manuel d'un wallet user (marchand ou particulier).
 */
export async function adjustUserWallet(userId: number, payload: WalletAdjustmentPayload): Promise<void> {
  await api.post(`/admin/users/${userId}/wallet-adjustment`, payload)
}

// ============== RÉCONCILIATION COMPTABLE (SUPER-ADMIN) ==============

export interface ReconciliationFlow {
  type: string
  n: number
  total: number
}

export interface ReconciliationResponse {
  period: { from: string; to: string }
  snapshot: {
    drivers: { wallets_count: number; total_balance: number }
    users: { wallets_count: number; total_balance: number; total_reserved: number }
    grand_total: number
  }
  flows: {
    driver: Record<string, ReconciliationFlow>
    user: Record<string, ReconciliationFlow>
    withdraws_paid: { count: number; total: number }
  }
  margin: {
    delivered_courses: number
    gross_revenue: number
    driver_commission: number
    platform_margin: number
  }
  anomalies: {
    dormant_drivers: Array<{ id: number; first_name: string; last_name: string; balance: number; last_tx: string | null }>
    high_balance_drivers: Array<{ id: number; first_name: string; last_name: string; balance: number }>
    drift_drivers: Array<{ driver_id: number; first_name: string; last_name: string; balance: number; sum_tx: number; drift: number }>
    drift_users: Array<{ user_id: number; name: string; balance: number; sum_tx: number; drift: number }>
    has_any: boolean
  }
}

export async function fetchReconciliation(from?: string, to?: string): Promise<ReconciliationResponse> {
  const { data } = await api.get('/admin/reconciliation', { params: { from, to } })
  return data
}

/**
 * Construit l'URL absolue pour télécharger le CSV avec params from/to.
 * Le téléchargement passe par axios pour bénéficier du Bearer token, puis on génère un Blob.
 */
export async function downloadReconciliationCsv(from?: string, to?: string): Promise<void> {
  const response = await api.get('/admin/reconciliation/export.csv', {
    params: { from, to },
    responseType: 'blob',
  })
  const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8' })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `reconciliation_${from ?? 'auto'}_${to ?? 'auto'}.csv`
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => window.URL.revokeObjectURL(url), 30_000)
}
