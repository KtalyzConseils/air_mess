import { useState, type ReactNode } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { AxiosError } from 'axios'
import AdminPageShell from '../../components/admin/AdminPageShell'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import { AdminButton } from '../../components/admin/AdminToolbar'
import { ArrowLeftIcon, SettingsIcon } from '../../components/ui/icons'
import MarchantStatusBadge from '../../components/MarchantStatusBadge'
import ConfirmModal from '../../components/ConfirmModal'
import WalletAdjustmentModal from '../../components/WalletAdjustmentModal'
import SupportNotesPanel from '../../components/SupportNotesPanel'
import {
  fetchMarchant,
  validateMarchant,
  suspendMarchant,
  reactivateMarchant,
  rejectMarchant,
  deleteMarchant,
} from '../../api/admin'
import { useAuthStore } from '../../stores/authStore'
import { hasAdminRole } from '../../lib/permissions'

type ConfirmAction = 'validate' | 'reactivate' | 'suspend' | 'reject' | 'delete'

type ConfirmConfig = {
  title: string
  description: string
  confirmLabel: string
  confirmVariant: 'primary' | 'success' | 'danger'
  reasonRequired: boolean
  reasonPlaceholder?: string
}

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

interface KpiBoxProps {
  label: string
  value: number | string
  tone?: 'default' | 'success' | 'danger' | 'warning'
}
function KpiBox({ label, value, tone = 'default' }: KpiBoxProps) {
  const toneClass = {
    default: 'border-warm-200',
    success: 'border-success/30',
    danger: 'border-airmess-red/30',
    warning: 'border-warning/30',
  }[tone]
  const valueClass = {
    default: 'text-ink',
    success: 'text-success',
    danger: 'text-airmess-red',
    warning: 'text-warning',
  }[tone]
  return (
    <div className={`bg-off-white border rounded-md px-3 py-2.5 ${toneClass}`}>
      <p className="text-[10px] uppercase tracking-wider font-bold text-warm-600">{label}</p>
      <p className={`text-h2 font-bold tabular-nums leading-none mt-1 ${valueClass}`}>{value}</p>
    </div>
  )
}

export default function MarchantDetailPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null)
  const [walletAdjustOpen, setWalletAdjustOpen] = useState(false)
  const currentUser = useAuthStore((s) => s.user)
  const isSuperAdmin = hasAdminRole(currentUser, 'super')
  const canManageMarchant = hasAdminRole(currentUser, 'commercial')

  const SECTEUR_LABEL: Record<string, string> = {
    supermarche: t('admin.marchants.detail.sectorSupermarche'),
    restaurant: t('admin.marchants.detail.sectorRestaurant'),
    boutique: t('admin.marchants.detail.sectorBoutique'),
    pharmacie: t('admin.marchants.detail.sectorPharmacie'),
    ecommerce: t('admin.marchants.detail.sectorEcommerce'),
    autre: t('admin.marchants.detail.sectorAutre'),
  }

  const CONFIRM_CONFIG: Record<ConfirmAction, ConfirmConfig> = {
    validate: {
      title: t('admin.marchants.detail.confirmValidateTitle'),
      description: t('admin.marchants.detail.confirmValidateBody'),
      confirmLabel: t('admin.marchants.detail.confirmValidateCta'),
      confirmVariant: 'primary',
      reasonRequired: false,
    },
    reactivate: {
      title: t('admin.marchants.detail.confirmReactivateTitle'),
      description: t('admin.marchants.detail.confirmReactivateBody'),
      confirmLabel: t('admin.marchants.detail.confirmReactivateCta'),
      confirmVariant: 'success',
      reasonRequired: false,
    },
    suspend: {
      title: t('admin.marchants.detail.confirmSuspendTitle'),
      description: t('admin.marchants.detail.confirmSuspendBody'),
      confirmLabel: t('admin.marchants.detail.confirmSuspendCta'),
      confirmVariant: 'danger',
      reasonRequired: true,
      reasonPlaceholder: t('admin.marchants.detail.confirmSuspendReason'),
    },
    reject: {
      title: t('admin.marchants.detail.confirmRejectTitle'),
      description: t('admin.marchants.detail.confirmRejectBody'),
      confirmLabel: t('admin.marchants.detail.confirmRejectCta'),
      confirmVariant: 'danger',
      reasonRequired: true,
      reasonPlaceholder: t('admin.marchants.detail.confirmRejectReason'),
    },
    delete: {
      title: t('admin.marchants.detail.confirmDeleteTitle'),
      description: t('admin.marchants.detail.confirmDeleteBodyLong'),
      confirmLabel: t('admin.marchants.detail.confirmDeleteCta'),
      confirmVariant: 'danger',
      reasonRequired: false,
    },
  }

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'marchant', id],
    queryFn: () => fetchMarchant(id!),
    enabled: !!id,
  })

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['admin', 'marchant', id] })
    queryClient.invalidateQueries({ queryKey: ['admin', 'marchants'] })
    queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] })
  }

  function showApiError(err: unknown, fallback: string) {
    const message =
      err instanceof AxiosError ? err.response?.data?.message ?? fallback : fallback
    window.alert(message)
  }

  const validateMut = useMutation({
    mutationFn: () => validateMarchant(Number(id)),
    onSuccess: () => { invalidate(); setConfirmAction(null) },
    onError: (err) => showApiError(err, t('admin.marchants.detail.validationError')),
  })
  const reactivateMut = useMutation({
    mutationFn: () => reactivateMarchant(Number(id)),
    onSuccess: () => { invalidate(); setConfirmAction(null) },
    onError: (err) => showApiError(err, t('admin.marchants.detail.reactivationError')),
  })
  const suspendMut = useMutation({
    mutationFn: (reason: string) => suspendMarchant(Number(id), reason),
    onSuccess: () => { invalidate(); setConfirmAction(null) },
    onError: (err) => showApiError(err, t('admin.marchants.detail.suspensionError')),
  })
  const rejectMut = useMutation({
    mutationFn: (reason: string) => rejectMarchant(Number(id), reason),
    onSuccess: () => { invalidate(); setConfirmAction(null) },
    onError: (err) => showApiError(err, t('admin.marchants.detail.rejectionError')),
  })
  const deleteMut = useMutation({
    mutationFn: () => deleteMarchant(Number(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'marchants'] })
      setConfirmAction(null)
      navigate('/admin/marchants')
    },
    onError: (err) => showApiError(err, t('admin.marchants.detail.deletionError')),
  })

  function handleConfirm(reason: string) {
    switch (confirmAction) {
      case 'validate':   validateMut.mutate(); break
      case 'reactivate': reactivateMut.mutate(); break
      case 'suspend':    suspendMut.mutate(reason); break
      case 'reject':     rejectMut.mutate(reason); break
      case 'delete':     deleteMut.mutate(); break
    }
  }

  const isPending = confirmAction
    ? {
        validate: validateMut.isPending,
        reactivate: reactivateMut.isPending,
        suspend: suspendMut.isPending,
        reject: rejectMut.isPending,
        delete: deleteMut.isPending,
      }[confirmAction]
    : false

  const config = confirmAction ? CONFIRM_CONFIG[confirmAction] : null

  const renderActions = () => {
    if (!data || !canManageMarchant) return null
    const m = data.marchant
    return (
      <>
        {m.subscription_status === 'suspended' && (
          <AdminButton variant="primary" onClick={() => setConfirmAction('reactivate')}>
            {t('admin.marchants.detail.reactivate')}
          </AdminButton>
        )}
        {!m.validated_at && m.subscription_status !== 'churned' && (
          <>
            <AdminButton variant="primary" onClick={() => setConfirmAction('validate')}>
              {t('admin.marchants.validateAction')}
            </AdminButton>
            <AdminButton variant="secondary" onClick={() => setConfirmAction('reject')}>
              {t('admin.marchants.detail.reject')}
            </AdminButton>
          </>
        )}
        {m.validated_at && m.subscription_status === 'active' && (
          <AdminButton variant="danger" onClick={() => setConfirmAction('suspend')}>
            {t('admin.marchants.detail.suspend')}
          </AdminButton>
        )}
      </>
    )
  }

  return (
    <AdminPageShell>
      <AdminPageHeader
        title={data?.marchant.raison_sociale ?? t('admin.marchants.detail.fallbackTitle')}
        subtitle={
          data
            ? `${SECTEUR_LABEL[data.marchant.secteur_activite] ?? data.marchant.secteur_activite}${data.marchant.ifu_rccm ? ` · ${data.marchant.ifu_rccm}` : ''}`
            : undefined
        }
        actions={
          <>
            {data && (
              <div className="flex items-center gap-2">
                <MarchantStatusBadge status={data.marchant.subscription_status} />
                {!data.marchant.validated_at && (
                  <span className="text-caption font-bold text-warning uppercase tracking-wide">
                    {t('admin.marchants.detail.toValidate')}
                  </span>
                )}
              </div>
            )}
            {renderActions()}
          </>
        }
      />

      <div className="px-4 md:px-6 lg:px-8 py-5 max-w-5xl mx-auto space-y-6">
        <Link
          to="/admin/marchants"
          className="inline-flex items-center gap-1 text-caption text-warm-500 hover:text-ink"
        >
          <ArrowLeftIcon size={14} />
          {t('admin.marchants.detail.backToMarchants')}
        </Link>

        {isLoading && <p className="text-body-s text-warm-500">{t('admin.common.loading')}</p>}
        {isError && <p className="text-body-s text-airmess-red">{t('admin.marchants.detail.notFoundMarchant')}</p>}

        {data && (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              {/* Identité & contact */}
              <section className="bg-off-white border border-warm-200 rounded-lg">
                <div className="px-5 py-2.5 border-b border-warm-200">
                  <h2 className="text-body-s font-bold text-ink">{t('admin.marchants.detail.identityContact')}</h2>
                </div>
                <div className="px-5 py-3">
                  <Row label={t('admin.marchants.detail.sector')}>{SECTEUR_LABEL[data.marchant.secteur_activite] ?? data.marchant.secteur_activite}</Row>
                  <Row label={t('admin.marchants.detail.ifuRccm')}>{data.marchant.ifu_rccm ?? '—'}</Row>
                  <Row label={t('admin.marchants.detail.responsible')}>{data.marchant.user.name}</Row>
                  <Row label={t('admin.marchants.detail.email')}>{data.marchant.user.email}</Row>
                  <Row label={t('admin.marchants.detail.phone')}>{data.marchant.user.phone ?? '—'}</Row>
                </div>
              </section>

              {/* Wallet */}
              <section className="bg-off-white border border-warm-200 rounded-lg">
                <div className="px-5 py-2.5 border-b border-warm-200 flex items-center justify-between">
                  <h2 className="text-body-s font-bold text-ink">{t('admin.marchants.detail.wallet')}</h2>
                  {isSuperAdmin && data.marchant.user.wallet && (
                    <AdminButton
                      variant="ghost"
                      size="sm"
                      onClick={() => setWalletAdjustOpen(true)}
                      leftIcon={<SettingsIcon size={14} />}
                    >
                      {t('admin.marchants.detail.walletAdjust')}
                    </AdminButton>
                  )}
                </div>
                <div className="px-5 py-3">
                  {data.marchant.user.wallet ? (
                    <>
                      <Row label={t('admin.marchants.detail.walletBalance')}>
                        <strong>{data.marchant.user.wallet.balance.toLocaleString('fr-FR')} FCFA</strong>
                      </Row>
                      <Row label={t('admin.marchants.detail.walletReserved')}>
                        {data.marchant.user.wallet.pending_reserved.toLocaleString('fr-FR')} FCFA
                      </Row>
                      <Row label={t('admin.marchants.detail.walletTotalDeposited')}>
                        {data.marchant.user.wallet.total_deposited.toLocaleString('fr-FR')} FCFA
                      </Row>
                      <Row label={t('admin.marchants.detail.walletTotalSpent')}>
                        {data.marchant.user.wallet.total_spent.toLocaleString('fr-FR')} FCFA
                      </Row>
                      <Row label={t('admin.marchants.detail.walletValidatedAt')}>{formatDate(data.marchant.validated_at)}</Row>
                    </>
                  ) : (
                    <p className="text-body-s text-warm-500 italic">{t('admin.marchants.detail.noWallet')}</p>
                  )}
                </div>
              </section>
            </div>

            {/* Modal d'ajustement wallet */}
            {isSuperAdmin && data.marchant.user.wallet && (
              <WalletAdjustmentModal
                open={walletAdjustOpen}
                onClose={() => setWalletAdjustOpen(false)}
                target="user"
                targetId={data.marchant.user.id}
                targetName={data.marchant.raison_sociale}
                currentBalance={data.marchant.user.wallet.balance}
                onSuccessInvalidate={[['admin', 'marchant', id]]}
              />
            )}

            {/* Stats courses */}
            <section className="bg-off-white border border-warm-200 rounded-lg">
              <div className="px-5 py-2.5 border-b border-warm-200">
                <h2 className="text-body-s font-bold text-ink">{t('admin.marchants.detail.activityCourses')}</h2>
              </div>
              <div className="px-5 py-3">
                <div className="grid gap-2 grid-cols-2 md:grid-cols-4">
                  <KpiBox label={t('admin.marchants.detail.kpiTotal')} value={data.stats.courses_total} />
                  <KpiBox label={t('admin.marchants.detail.kpiDelivered')} value={data.stats.courses_delivered} tone="success" />
                  <KpiBox label={t('admin.marchants.detail.kpiInProgress')} value={data.stats.courses_in_progress} />
                  <KpiBox label={t('admin.marchants.detail.kpiCancelled')} value={data.stats.courses_cancelled} tone="danger" />
                </div>
                <p className="text-caption text-warm-500 mt-3">
                  {t('admin.marchants.detail.lastCourse')} : {formatDate(data.stats.last_course_at)}
                </p>
              </div>
            </section>

            {/* Notes internes */}
            <SupportNotesPanel
              notableType="user"
              notableId={data.marchant.user.id}
              title={t('admin.marchants.detail.internalNotesMarchant')}
            />

            {/* Zone de danger */}
            {canManageMarchant && (
              <section className="bg-danger-bg border border-airmess-red/30 rounded-lg px-5 py-4">
                <h2 className="text-body font-bold text-airmess-red mb-1">{t('admin.marchants.detail.dangerZone')}</h2>
                <p className="text-body-s text-airmess-red/80 mb-3">
                  {t('admin.marchants.detail.dangerZoneBody')}
                </p>
                <AdminButton variant="danger" onClick={() => setConfirmAction('delete')}>
                  {t('admin.marchants.detail.delete')}
                </AdminButton>
              </section>
            )}
          </>
        )}
      </div>

      {config && (
        <ConfirmModal
          visible={!!confirmAction}
          title={config.title}
          description={config.description}
          reasonRequired={config.reasonRequired}
          reasonPlaceholder={config.reasonPlaceholder}
          confirmLabel={config.confirmLabel}
          confirmVariant={config.confirmVariant}
          isPending={isPending}
          onConfirm={handleConfirm}
          onClose={() => !isPending && setConfirmAction(null)}
        />
      )}
    </AdminPageShell>
  )
}
