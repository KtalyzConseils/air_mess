import { useState, type ReactNode } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import { useTranslation } from 'react-i18next'
import AdminPageShell from '../../components/admin/AdminPageShell'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import { AdminButton } from '../../components/admin/AdminToolbar'
import { ArrowLeftIcon, SettingsIcon, CheckIcon, AlertTriangleIcon, WhatsappIcon } from '../../components/ui/icons'
import WalletAdjustmentModal from '../../components/WalletAdjustmentModal'
import SupportNotesPanel from '../../components/SupportNotesPanel'
import {
  fetchDriver,
  validateDriver,
  openDriverDocument,
  updateDriverKind,
  updateDriverWithdrawLimits,
  updateDriverKyc,
  type DriverKind,
  type DriverDetail,
  type WithdrawLimitsPayload,
  type KycPayload,
  type KycStatus,
} from '../../api/admin'
import { useAuthStore } from '../../stores/authStore'
import { hasAdminRole } from '../../lib/permissions'

function formatDate(value: string | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2 border-b border-warm-200 last:border-0">
      <span className="text-body-s text-warm-500">{label}</span>
      <span className="text-body-s font-medium text-ink text-right">{children}</span>
    </div>
  )
}

const AVAILABILITY_CLASSES: Record<string, string> = {
  available: 'bg-success-bg text-success border border-success/20',
  busy: 'bg-warning-bg text-warning border border-warning/20',
  on_break: 'bg-warm-100 text-warm-600 border border-warm-200',
  offline: 'bg-warm-100 text-warm-500 border border-warm-200',
}
const ACTIVATION_CLASSES: Record<string, string> = {
  pending: 'bg-warning-bg text-warning border border-warning/20',
  validated: 'bg-cream text-ink border border-warm-300',
  active: 'bg-success-bg text-success border border-success/20',
  suspended: 'bg-danger-bg text-airmess-red border border-airmess-red/30',
}

const DECLINE_REASON_KEY: Record<string, string> = {
  too_far: 'admin.drivers.declineReasonTooFar',
  wrong_quartier: 'admin.drivers.declineReasonWrongQuartier',
  no_helmet: 'admin.drivers.declineReasonNoHelmet',
  vehicle_unfit: 'admin.drivers.declineReasonVehicleUnfit',
  personal: 'admin.drivers.declineReasonPersonal',
  other: 'admin.drivers.declineReasonOther',
}

function Badge({
  label,
  classes,
}: {
  label: string
  classes: string
}) {
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-caption font-semibold ${classes}`}
    >
      {label}
    </span>
  )
}

interface KpiBoxProps {
  label: string
  value: number | string
  tone?: 'default' | 'success' | 'danger' | 'brand'
}
function KpiBox({ label, value, tone = 'default' }: KpiBoxProps) {
  const styles =
    tone === 'brand'
      ? 'bg-airmess-yellow border-transparent'
      : tone === 'success'
        ? 'bg-off-white border-success/30'
        : tone === 'danger'
          ? 'bg-off-white border-airmess-red/30'
          : 'bg-off-white border-warm-200'
  const valueColor =
    tone === 'success' ? 'text-success' : tone === 'danger' ? 'text-airmess-red' : 'text-ink'
  return (
    <div className={`border rounded-md px-3 py-2.5 ${styles}`}>
      <p className="text-[10px] uppercase tracking-wider font-bold text-warm-600">{label}</p>
      <p className={`text-h2 font-bold tabular-nums leading-none mt-1 ${valueColor}`}>{value}</p>
    </div>
  )
}

export default function AdminDriverDetailPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const [docError, setDocError] = useState<string | null>(null)
  const [walletAdjustOpen, setWalletAdjustOpen] = useState(false)
  const currentUser = useAuthStore((s) => s.user)
  const isSuperAdmin = hasAdminRole(currentUser, 'super')
  const canManageDriver = hasAdminRole(currentUser, 'ops')

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'driver', id],
    queryFn: () => fetchDriver(id!),
    enabled: !!id,
  })

  const validateMutation = useMutation({
    mutationFn: () => validateDriver(Number(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'driver', id] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'drivers'] })
    },
  })

  const kindMutation = useMutation({
    mutationFn: (kind: DriverKind) => updateDriverKind(Number(id), kind),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'driver', id] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'drivers'] })
    },
  })

  function handleToggleKind() {
    if (!data?.driver) return
    const nextKind: DriverKind = data.driver.kind === 'airmess' ? 'independent' : 'airmess'
    const promptMsg =
      nextKind === 'airmess'
        ? t('admin.drivers.kindConfirmPromote')
        : t('admin.drivers.kindConfirmDemote')
    if (!window.confirm(promptMsg)) return
    kindMutation.mutate(nextKind)
  }

  const kindError =
    kindMutation.error instanceof AxiosError
      ? (kindMutation.error.response?.data as { message?: string })?.message ??
        t('admin.drivers.kindErrorGeneric')
      : null

  async function handleOpenDocument(type: 'photo' | 'cni' | 'cni_back' | 'driving_license') {
    setDocError(null)
    try {
      await openDriverDocument(Number(id), type)
    } catch (err) {
      setDocError(
        err instanceof AxiosError
          ? (err.response?.data as { message?: string })?.message ??
            t('admin.drivers.docOpenError')
          : t('common.unexpectedError'),
      )
    }
  }

  const validateError =
    validateMutation.error instanceof AxiosError
      ? (validateMutation.error.response?.data as { message?: string })?.message ??
        t('admin.drivers.validationError')
      : null

  function availabilityLabel(value: string): string {
    return t(`admin.drivers.availability.${value}`, { defaultValue: value })
  }

  function activationLabel(value: string): string {
    return t(`admin.drivers.activation.${value}`, { defaultValue: value })
  }

  function declineReasonLabel(reason: string): string {
    const key = DECLINE_REASON_KEY[reason]
    return key ? t(key) : reason
  }

  return (
    <AdminPageShell>
      <AdminPageHeader
        title={data ? `${data.driver.first_name} ${data.driver.last_name}` : t('admin.drivers.driverFallback')}
        subtitle={
          data
            ? `${data.driver.vehicle_type}${data.driver.vehicle_plate ? ` · ${data.driver.vehicle_plate}` : ''}`
            : undefined
        }
        actions={
          data && (
            <div className="flex items-center gap-2">
              <Badge
                label={availabilityLabel(data.driver.availability_status)}
                classes={
                  AVAILABILITY_CLASSES[data.driver.availability_status] ??
                  'bg-warm-100 text-warm-600 border border-warm-200'
                }
              />
              <Badge
                label={activationLabel(data.driver.activation_status)}
                classes={
                  ACTIVATION_CLASSES[data.driver.activation_status] ??
                  'bg-warm-100 text-warm-600 border border-warm-200'
                }
              />
              {data.driver.kind === 'airmess' && (
                <Badge
                  label={t('admin.drivers.kindAirmessBadge')}
                  classes="bg-airmess-yellow/20 text-ink border border-airmess-yellow/50"
                />
              )}
            </div>
          )
        }
      />

      <div className="px-4 md:px-6 lg:px-8 py-5 max-w-5xl mx-auto space-y-6">
        <Link
          to="/admin/drivers"
          className="inline-flex items-center gap-1 text-caption text-warm-500 hover:text-ink"
        >
          <ArrowLeftIcon size={14} />
          {t('admin.drivers.backToList')}
        </Link>

        {isLoading && <p className="text-body-s text-warm-500">{t('common.loading')}</p>}
        {isError && <p className="text-body-s text-airmess-red">{t('admin.drivers.notFound')}</p>}

        {data && (
          <>
            {/* Bandeau validation pending */}
            {canManageDriver && data.driver.activation_status === 'pending' && (
              <section className="bg-warning-bg border border-warning/30 rounded-lg px-5 py-4">
                <h2 className="text-body font-bold text-warning mb-1">
                  {t('admin.drivers.validationPendingTitle')}
                </h2>
                <p className="text-body-s text-warning/90 mb-3">
                  {t('admin.drivers.validationPendingBody')}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <AdminButton
                    variant="primary"
                    onClick={() => validateMutation.mutate()}
                    disabled={validateMutation.isPending}
                    leftIcon={<CheckIcon size={14} />}
                  >
                    {validateMutation.isPending
                      ? t('admin.drivers.validating')
                      : t('admin.drivers.validateDriver')}
                  </AdminButton>
                  {/* Canal préféré = WhatsApp : la réponse se fait manuellement via wa.me */}
                  {data.driver.preferred_response_channel === 'whatsapp' && data.driver.user.phone && (
                    <a
                      href={`https://wa.me/${data.driver.user.phone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-md border border-success/40 bg-success-bg px-3 py-1.5 text-caption font-medium text-success hover:border-success"
                    >
                      <WhatsappIcon size={14} /> {t('admin.drivers.contactWhatsapp')}
                    </a>
                  )}
                </div>
                {validateError && (
                  <p className="text-body-s text-airmess-red mt-2 flex items-center gap-1.5">
                    <AlertTriangleIcon size={14} /> {validateError}
                  </p>
                )}
              </section>
            )}

            {/* Section : Type de livreur (indépendant ↔ salarié Airmess) — super-admin only */}
            <section className="bg-off-white border border-warm-200 rounded-lg px-5 py-4">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h2 className="text-body font-bold text-ink mb-1">
                    {t('admin.drivers.kindSectionTitle')}
                  </h2>
                  <p className="text-caption text-warm-600 max-w-lg">
                    {data.driver.kind === 'airmess'
                      ? t('admin.drivers.kindDescAirmess')
                      : t('admin.drivers.kindDescIndependent')}
                  </p>
                </div>
                {isSuperAdmin ? (
                  <AdminButton
                    variant={data.driver.kind === 'airmess' ? 'secondary' : 'primary'}
                    onClick={handleToggleKind}
                    disabled={kindMutation.isPending}
                  >
                    {kindMutation.isPending
                      ? t('common.loading')
                      : data.driver.kind === 'airmess'
                        ? t('admin.drivers.kindDemoteCta')
                        : t('admin.drivers.kindPromoteCta')}
                  </AdminButton>
                ) : (
                  <span className="text-caption text-warm-500 italic">
                    {t('admin.drivers.kindSuperOnly')}
                  </span>
                )}
              </div>
              {kindError && (
                <p className="text-body-s text-airmess-red mt-3 flex items-center gap-1.5">
                  <AlertTriangleIcon size={14} /> {kindError}
                </p>
              )}
            </section>

            {/* Plafonds retrait per-driver (override du global — super-admin only) */}
            {isSuperAdmin && (
              <WithdrawLimitsSection
                driverId={Number(id)}
                driver={data.driver}
              />
            )}

            {/* KYC — vérification d'identité tierce (super-admin only pour modifier) */}
            <KycSection
              driverId={Number(id)}
              driver={data.driver}
              canEdit={isSuperAdmin}
            />

            {/* Grille identité / véhicule / urgence / performance */}
            <div className="grid gap-4 md:grid-cols-2">
              <Section title={t('admin.drivers.sectionIdentity')}>
                <Row label={t('admin.drivers.fieldGender')}>{data.driver.gender ?? '—'}</Row>
                <Row label={t('admin.drivers.fieldBirthDate')}>{formatDate(data.driver.birth_date)}</Row>
                <Row label={t('admin.drivers.fieldPhone')}>{data.driver.user.phone ?? '—'}</Row>
                <Row label={t('admin.drivers.fieldEmail')}>{data.driver.user.email}</Row>
                <Row label={t('admin.drivers.fieldPreferredChannel')}>
                  {data.driver.preferred_response_channel
                    ? t(`admin.drivers.channel.${data.driver.preferred_response_channel}`)
                    : '—'}
                </Row>
              </Section>

              <Section title={t('admin.drivers.sectionVehicle')}>
                <Row label={t('admin.drivers.fieldType')}>{data.driver.vehicle_type}</Row>
                <Row label={t('admin.drivers.fieldPlate')}>{data.driver.vehicle_plate ?? '—'}</Row>
                <Row label={t('admin.drivers.fieldBrand')}>{data.driver.vehicle_brand ?? '—'}</Row>
              </Section>

              <Section title={t('admin.drivers.sectionEmergency')}>
                <Row label={t('admin.drivers.fieldEmergencyName')}>{data.driver.emergency_contact_name ?? '—'}</Row>
                <Row label={t('admin.drivers.fieldEmergencyPhone')}>{data.driver.emergency_contact_phone ?? '—'}</Row>
                <Row label={t('admin.drivers.fieldEmergencyName2')}>{data.driver.emergency_contact2_name ?? '—'}</Row>
                <Row label={t('admin.drivers.fieldEmergencyPhone2')}>{data.driver.emergency_contact2_phone ?? '—'}</Row>
                <Row label={t('admin.drivers.fieldLastPosition')}>{formatDate(data.driver.last_position_at)}</Row>
              </Section>

              <Section title={t('admin.drivers.sectionPerformance')}>
                <Row label={t('admin.drivers.fieldAcceptanceRate')}>{data.driver.acceptance_rate}%</Row>
                <Row label={t('admin.drivers.fieldIncidents')}>{data.driver.incidents_count}</Row>
              </Section>
            </div>

            {/* Wallet caution */}
            <Section
              title={t('admin.drivers.sectionWalletDeposit')}
              action={
                isSuperAdmin && data.driver.wallet ? (
                  <AdminButton
                    variant="ghost"
                    size="sm"
                    onClick={() => setWalletAdjustOpen(true)}
                    leftIcon={<SettingsIcon size={14} />}
                  >
                    {t('admin.drivers.walletAdjust')}
                  </AdminButton>
                ) : null
              }
            >
              {data.driver.wallet ? (
                <div className="grid grid-cols-3 gap-2">
                  <KpiBox
                    label={t('admin.drivers.walletBalance')}
                    value={data.driver.wallet.balance.toLocaleString('fr-FR')}
                    tone="brand"
                  />
                  <KpiBox
                    label={t('admin.drivers.walletTotalDeposited')}
                    value={data.driver.wallet.total_deposited.toLocaleString('fr-FR')}
                  />
                  <KpiBox
                    label={t('admin.drivers.walletTotalWithdrawn')}
                    value={data.driver.wallet.total_withdrawn.toLocaleString('fr-FR')}
                  />
                </div>
              ) : (
                <p className="text-body-s text-warm-500 italic">{t('admin.drivers.walletNone')}</p>
              )}
            </Section>

            {/* Modal d'ajustement wallet */}
            {isSuperAdmin && data.driver.wallet && (
              <WalletAdjustmentModal
                open={walletAdjustOpen}
                onClose={() => setWalletAdjustOpen(false)}
                target="driver"
                targetId={data.driver.id}
                targetName={`${data.driver.first_name} ${data.driver.last_name}`}
                currentBalance={data.driver.wallet.balance}
                onSuccessInvalidate={[['admin', 'driver', id]]}
              />
            )}

            {/* Refus de courses (rolling 30j) */}
            <Section
              title={t('admin.drivers.sectionDeclines')}
              action={
                <span className="text-caption font-bold text-warm-600 bg-warm-100 px-2 py-0.5 rounded">
                  {t('admin.drivers.declinesTotal', { count: data.declines.total_30d })}
                </span>
              }
            >
              {data.declines.total_30d === 0 ? (
                <p className="text-body-s text-warm-500 italic">{t('admin.drivers.declinesNone')}</p>
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5 mb-4">
                    {Object.entries(data.declines.by_reason).map(([reason, n]) => (
                      <div
                        key={reason}
                        className="bg-cream border border-warm-200 rounded-md px-3 py-1.5 flex justify-between items-center"
                      >
                        <span className="text-body-s text-warm-600">
                          {declineReasonLabel(reason)}
                        </span>
                        <span className="text-body-s font-bold text-ink tabular-nums">{n}</span>
                      </div>
                    ))}
                  </div>
                  <ul className="divide-y divide-warm-200">
                    {data.declines.recent.map((d) => (
                      <li
                        key={d.id}
                        className="py-2.5 flex justify-between items-start gap-3"
                      >
                        <div className="min-w-0">
                          <p className="text-body-s font-medium text-ink">
                            {declineReasonLabel(d.reason)}
                            {d.custom_reason && (
                              <span className="text-warm-500 font-normal">
                                {' '}— « {d.custom_reason} »
                              </span>
                            )}
                          </p>
                          {d.course && (
                            <p className="text-caption text-warm-500 mt-0.5">
                              {t('admin.drivers.declineCourseLabel')}{' '}
                              <span className="font-mono">{d.course.reference}</span> ·{' '}
                              {d.course.origin_quartier} → {d.course.destination_quartier}
                            </p>
                          )}
                        </div>
                        <span className="text-caption text-warm-400 shrink-0 whitespace-nowrap">
                          {formatDate(d.created_at)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </Section>

            {/* Documents */}
            <Section title={t('admin.drivers.sectionDocuments')}>
              {/* Type de pièce fournie (cnib = recto+verso, cip/passeport = 1 face) */}
              <p className="text-body-s text-warm-600 mb-3">
                {t('admin.drivers.fieldCniType')}{' '}
                <strong className="text-ink">
                  {data.driver.cni_type
                    ? t(`admin.drivers.cniType.${data.driver.cni_type}`)
                    : '—'}
                </strong>
              </p>
              <div className="flex flex-wrap gap-2">
                <AdminButton
                  variant="primary"
                  onClick={() => handleOpenDocument('cni')}
                  disabled={!data.driver.cni_url}
                >
                  {data.driver.cni_type === 'cnib'
                    ? t('admin.drivers.docViewCniFront')
                    : t('admin.drivers.docViewCni')}
                </AdminButton>
                {data.driver.cni_type === 'cnib' && (
                  <AdminButton
                    variant="primary"
                    onClick={() => handleOpenDocument('cni_back')}
                    disabled={!data.driver.cni_back_url}
                  >
                    {t('admin.drivers.docViewCniBack')}
                  </AdminButton>
                )}
                <AdminButton
                  variant="primary"
                  onClick={() => handleOpenDocument('driving_license')}
                  disabled={!data.driver.driving_license_url}
                >
                  {t('admin.drivers.docViewLicense')}
                </AdminButton>
                <AdminButton
                  variant="secondary"
                  onClick={() => handleOpenDocument('photo')}
                  disabled={!data.driver.photo_url}
                >
                  {data.driver.photo_url
                    ? t('admin.drivers.docViewPhoto')
                    : t('admin.drivers.docNoPhoto')}
                </AdminButton>
              </div>
              {docError && (
                <p className="text-body-s text-airmess-red mt-3 flex items-center gap-1.5">
                  <AlertTriangleIcon size={14} /> {docError}
                </p>
              )}
              <p className="text-caption text-warm-500 mt-3">
                {t('admin.drivers.docOpenInNewTab')}
              </p>
            </Section>

            {/* Stats courses */}
            <Section title={t('admin.drivers.sectionActivity')}>
              <div className="grid gap-2 grid-cols-2 md:grid-cols-4">
                <KpiBox label={t('admin.drivers.statTotal')} value={data.stats.courses_total} />
                <KpiBox label={t('admin.drivers.statDelivered')} value={data.stats.courses_delivered} tone="success" />
                <KpiBox label={t('admin.drivers.statInProgress')} value={data.stats.courses_in_progress} />
                <KpiBox label={t('admin.drivers.statFailed')} value={data.stats.courses_failed} tone="danger" />
              </div>
              <p className="text-body-s text-warm-600 mt-3">
                {t('admin.drivers.statEarnings')}{' '}
                <strong className="text-ink tabular-nums">
                  {data.stats.total_earnings.toLocaleString('fr-FR')} FCFA
                </strong>
                {' · '}
                {t('admin.drivers.statLastDelivery')} {formatDate(data.stats.last_delivery_at)}
              </p>
            </Section>

            {/* Notes internes */}
            <SupportNotesPanel
              notableType="user"
              notableId={data.driver.user.id}
              title={t('admin.drivers.sectionNotesTitle')}
            />
          </>
        )}
      </div>
    </AdminPageShell>
  )
}

function Section({
  title,
  action,
  children,
}: {
  title: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="bg-off-white border border-warm-200 rounded-lg">
      <div className="flex items-center justify-between gap-3 px-5 py-2.5 border-b border-warm-200">
        <h2 className="text-body-s font-bold text-ink">{title}</h2>
        {action}
      </div>
      <div className="px-5 py-3">{children}</div>
    </section>
  )
}

/**
 * Section KYC — vérification d'identité tierce, indépendante de activation_status.
 * Ops peut consulter, super-admin peut modifier (statut + provider + réf + notes).
 * Provider libre : 'manual' pour recoupement admin, sinon nom du service tiers.
 */
const KYC_STATUS_LABEL_KEYS: Record<KycStatus, string> = {
  unverified: 'admin.drivers.kycStatusUnverified',
  verified:   'admin.drivers.kycStatusVerified',
  rejected:   'admin.drivers.kycStatusRejected',
}
const KYC_STATUS_CLASSES: Record<KycStatus, string> = {
  unverified: 'bg-warm-100 text-warm-600 border border-warm-200',
  verified:   'bg-success-bg text-success border border-success/20',
  rejected:   'bg-danger-bg text-airmess-red border border-airmess-red/30',
}

function KycSection({
  driverId,
  driver,
  canEdit,
}: {
  driverId: number
  driver: DriverDetail
  canEdit: boolean
}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const [status, setStatus]       = useState<KycStatus>(driver.kyc_status)
  const [provider, setProvider]   = useState(driver.kyc_provider ?? '')
  const [reference, setReference] = useState(driver.kyc_reference ?? '')
  const [notes, setNotes]         = useState(driver.kyc_notes ?? '')

  const mutation = useMutation({
    mutationFn: (payload: KycPayload) => updateDriverKyc(driverId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'driver', String(driverId)] })
    },
  })

  function handleSubmit() {
    mutation.mutate({
      status,
      provider:  provider.trim()  || null,
      reference: reference.trim() || null,
      notes:     notes.trim()     || null,
    })
  }

  const isDirty =
    status !== driver.kyc_status ||
    provider.trim()  !== (driver.kyc_provider  ?? '') ||
    reference.trim() !== (driver.kyc_reference ?? '') ||
    notes.trim()     !== (driver.kyc_notes     ?? '')

  const error =
    mutation.error instanceof AxiosError
      ? (mutation.error.response?.data as { message?: string })?.message ??
        t('admin.drivers.kycErrorGeneric')
      : null

  return (
    <Section
      title={t('admin.drivers.kycSectionTitle')}
      action={
        <span
          className={`inline-block px-2 py-0.5 rounded text-caption font-semibold ${KYC_STATUS_CLASSES[driver.kyc_status]}`}
        >
          {t(KYC_STATUS_LABEL_KEYS[driver.kyc_status])}
        </span>
      }
    >
      <p className="text-caption text-warm-500 mb-3">{t('admin.drivers.kycSectionHelp')}</p>

      {/* Bandeau info : dernière vérification + provider */}
      {driver.kyc_verified_at && (
        <div className="mb-3 flex items-center gap-2 text-caption text-warm-600 bg-cream border border-warm-200 rounded px-3 py-2">
          <CheckIcon size={14} />
          <span>
            {t('admin.drivers.kycLastVerifiedAt', { date: formatDate(driver.kyc_verified_at) })}
            {driver.kyc_provider ? ` — ${driver.kyc_provider}` : ''}
            {driver.kyc_reference ? ` (${driver.kyc_reference})` : ''}
          </span>
        </div>
      )}

      {canEdit ? (
        <div className="space-y-3">
          <div>
            <label className="text-caption font-bold text-ink block mb-1">
              {t('admin.drivers.kycFieldStatus')}
            </label>
            <div className="flex gap-2">
              {(['unverified', 'verified', 'rejected'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={`flex-1 h-9 px-2 rounded border text-body-s font-semibold transition-colors ${
                    status === s
                      ? KYC_STATUS_CLASSES[s]
                      : 'bg-cream border-warm-200 text-warm-500 hover:border-warm-400'
                  }`}
                >
                  {t(KYC_STATUS_LABEL_KEYS[s])}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-caption font-bold text-ink block mb-1">
                {t('admin.drivers.kycFieldProvider')}
              </label>
              <input
                type="text"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                placeholder={t('admin.drivers.kycProviderPlaceholder')}
                className="w-full h-9 px-2 border border-warm-300 rounded text-body-s bg-cream focus:outline-none focus:border-airmess-yellow"
              />
            </div>
            <div>
              <label className="text-caption font-bold text-ink block mb-1">
                {t('admin.drivers.kycFieldReference')}
              </label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder={t('admin.drivers.kycReferencePlaceholder')}
                className="w-full h-9 px-2 border border-warm-300 rounded text-body-s bg-cream focus:outline-none focus:border-airmess-yellow"
              />
            </div>
          </div>
          <div>
            <label className="text-caption font-bold text-ink block mb-1">
              {t('admin.drivers.kycFieldNotes')}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder={t('admin.drivers.kycNotesPlaceholder')}
              className="w-full px-2 py-1.5 border border-warm-300 rounded text-body-s bg-cream focus:outline-none focus:border-airmess-yellow"
            />
          </div>
          <div className="flex justify-end">
            <AdminButton
              variant="primary"
              size="sm"
              onClick={handleSubmit}
              disabled={!isDirty || mutation.isPending}
            >
              {mutation.isPending ? t('common.loading') : t('common.save')}
            </AdminButton>
          </div>
          {error && (
            <p className="text-body-s text-airmess-red flex items-center gap-1.5">
              <AlertTriangleIcon size={14} /> {error}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2 text-body-s">
          <Row label={t('admin.drivers.kycFieldProvider')}>{driver.kyc_provider ?? '—'}</Row>
          <Row label={t('admin.drivers.kycFieldReference')}>{driver.kyc_reference ?? '—'}</Row>
          <Row label={t('admin.drivers.kycFieldNotes')}>{driver.kyc_notes ?? '—'}</Row>
          <p className="text-caption text-warm-500 italic mt-2">
            {t('admin.drivers.kycSuperOnly')}
          </p>
        </div>
      )}
    </Section>
  )
}

/**
 * Section "Plafonds retrait personnalisés" — laisse le super-admin surcharger
 * les 4 plafonds globaux (AppSetting) pour ce driver seulement. Vide = utilise
 * le global. Trace auto dans support_notes via l'endpoint côté API.
 */
type LimitFieldKey = keyof WithdrawLimitsPayload
const LIMIT_FIELDS: Array<{ key: LimitFieldKey; labelKey: string; unit: 'count' | 'fcfa' }> = [
  { key: 'max_per_day_count',  labelKey: 'admin.drivers.limitDayCount',  unit: 'count' },
  { key: 'max_per_week_count', labelKey: 'admin.drivers.limitWeekCount', unit: 'count' },
  { key: 'max_per_day_fcfa',   labelKey: 'admin.drivers.limitDayFcfa',   unit: 'fcfa'  },
  { key: 'max_per_week_fcfa',  labelKey: 'admin.drivers.limitWeekFcfa',  unit: 'fcfa'  },
]

function WithdrawLimitsSection({
  driverId,
  driver,
}: {
  driverId: number
  driver: DriverDetail
}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  // Le state du formulaire = chaîne saisie par l'admin. '' = pas d'override.
  // Initialise depuis les valeurs actuelles côté serveur.
  const initial: Record<LimitFieldKey, string> = {
    max_per_day_count:  driver.withdraw_max_per_day_count_override?.toString()  ?? '',
    max_per_week_count: driver.withdraw_max_per_week_count_override?.toString() ?? '',
    max_per_day_fcfa:   driver.withdraw_max_per_day_fcfa_override?.toString()   ?? '',
    max_per_week_fcfa:  driver.withdraw_max_per_week_fcfa_override?.toString()  ?? '',
  }
  const [form, setForm] = useState(initial)

  const mutation = useMutation({
    mutationFn: (payload: WithdrawLimitsPayload) =>
      updateDriverWithdrawLimits(driverId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'driver', String(driverId)] })
    },
  })

  // Compare l'état actuel du form aux valeurs serveur pour envoyer UNIQUEMENT les diffs.
  // Sémantique côté back : clé absente = pas de changement, null = suppression, entier = override.
  function buildPayload(): WithdrawLimitsPayload {
    const payload: WithdrawLimitsPayload = {}
    for (const { key } of LIMIT_FIELDS) {
      const current = driver[
        `withdraw_${key}_override` as keyof DriverDetail
      ] as number | null | undefined
      const raw = form[key].trim()
      const next = raw === '' ? null : Number(raw)
      // Skip si identique à l'existant côté serveur.
      if ((current ?? null) === next) continue
      payload[key] = next
    }
    return payload
  }

  function handleSubmit() {
    const payload = buildPayload()
    if (Object.keys(payload).length === 0) return // rien à changer
    mutation.mutate(payload)
  }

  const isDirty = Object.keys(buildPayload()).length > 0
  const error =
    mutation.error instanceof AxiosError
      ? (mutation.error.response?.data as { message?: string })?.message ??
        t('admin.drivers.limitsErrorGeneric')
      : null

  return (
    <Section
      title={t('admin.drivers.limitsSectionTitle')}
      action={
        <AdminButton
          variant="primary"
          size="sm"
          onClick={handleSubmit}
          disabled={!isDirty || mutation.isPending}
        >
          {mutation.isPending ? t('common.loading') : t('common.save')}
        </AdminButton>
      }
    >
      <p className="text-caption text-warm-500 mb-3">
        {t('admin.drivers.limitsSectionHelp')}
      </p>
      <div className="grid gap-2 md:grid-cols-2">
        {LIMIT_FIELDS.map((field) => {
          const value    = form[field.key]
          const isCustom = value !== ''
          return (
            <div key={field.key} className="border border-warm-200 rounded-lg px-3 py-2">
              <label className="flex items-center justify-between mb-1.5">
                <span className="text-caption font-bold text-ink">{t(field.labelKey)}</span>
                {isCustom ? (
                  <span className="text-[10px] uppercase tracking-widest font-bold text-airmess-yellow bg-airmess-yellow/15 px-1.5 py-0.5 rounded">
                    {t('admin.drivers.limitBadgeOverride')}
                  </span>
                ) : (
                  <span className="text-[10px] uppercase tracking-widest font-bold text-warm-500">
                    {t('admin.drivers.limitBadgeGlobal')}
                  </span>
                )}
              </label>
              <input
                type="number"
                inputMode="numeric"
                min={field.unit === 'fcfa' ? 100 : 1}
                value={value}
                onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                placeholder={t('admin.drivers.limitPlaceholder')}
                className="w-full h-9 px-2 border border-warm-300 rounded text-body-s bg-cream focus:outline-none focus:border-airmess-yellow"
              />
            </div>
          )
        })}
      </div>
      {error && (
        <p className="text-body-s text-airmess-red mt-3 flex items-center gap-1.5">
          <AlertTriangleIcon size={14} /> {error}
        </p>
      )}
    </Section>
  )
}
