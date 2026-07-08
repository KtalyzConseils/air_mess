import { useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import { useTranslation } from 'react-i18next'
import AdminPageShell from '../../components/admin/AdminPageShell'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import { AdminButton } from '../../components/admin/AdminToolbar'
import {
  ArrowLeftIcon,
  AlertTriangleIcon,
  CheckIcon,
  ClockIcon,
  ArrowRightIcon,
} from '../../components/ui/icons'
import {
  fetchWithdrawRequest,
  approveWithdrawRequest,
  rejectWithdrawRequest,
  markWithdrawRequestPaid,
  retryWithdrawPayout,
  type WithdrawRequestRecentTx,
} from '../../api/admin'

const STATUS_BADGE_CLASSES: Record<string, string> = {
  pending: 'bg-warning-bg text-warning border border-warning/20',
  approved: 'bg-success-bg text-success border border-success/20',
  rejected: 'bg-danger-bg text-airmess-red border border-airmess-red/30',
  cancelled: 'bg-warm-100 text-warm-600 border border-warm-200',
}

const TX_META: Record<WithdrawRequestRecentTx['type'], { i18nKey: string; positive: boolean }> = {
  deposit: { i18nKey: 'admin.withdraws.txDeposit', positive: true },
  withdraw: { i18nKey: 'admin.withdraws.txWithdraw', positive: false },
  pickup_debit: { i18nKey: 'admin.withdraws.txPickupDebit', positive: false },
  refund: { i18nKey: 'admin.withdraws.txRefund', positive: true },
  earning: { i18nKey: 'admin.withdraws.txEarning', positive: true },
}

function formatFcfa(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—'
  return n.toLocaleString('fr-FR') + ' FCFA'
}

function formatDateTime(value: string | null, locale: string = 'fr-FR'): string {
  if (!value) return '—'
  return new Date(value).toLocaleString(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function Section({
  title,
  action,
  children,
  className = '',
}: {
  title: string
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`bg-off-white border border-warm-200 rounded-lg ${className}`}>
      <div className="flex items-center justify-between gap-3 px-5 py-2.5 border-b border-warm-200">
        <h2 className="text-body-s font-bold text-ink">{title}</h2>
        {action}
      </div>
      <div className="px-5 py-4">{children}</div>
    </section>
  )
}

function AlertBand({
  tone,
  children,
}: {
  tone: 'warning' | 'danger' | 'info' | 'success'
  children: ReactNode
}) {
  const tones = {
    warning: 'bg-warning-bg border-warning/30 text-warning',
    danger: 'bg-danger-bg border-airmess-red/30 text-airmess-red',
    info: 'bg-cream border-warm-300 text-ink',
    success: 'bg-success-bg border-success/30 text-success',
  }[tone]
  return (
    <div className={`border rounded-md px-4 py-3 text-body-s ${tones}`}>{children}</div>
  )
}

export default function AdminWithdrawRequestDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  const [showRejectPanel, setShowRejectPanel] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [showMarkPaidPanel, setShowMarkPaidPanel] = useState(false)
  const [payoutReference, setPayoutReference] = useState('')

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin', 'withdraw-requests', 'detail', id],
    queryFn: () => fetchWithdrawRequest(id!),
    enabled: !!id,
  })

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['admin', 'withdraw-requests'] })
    queryClient.invalidateQueries({ queryKey: ['admin', 'withdraw-requests', 'detail', id] })
  }

  function alertApi(err: unknown, fallback: string) {
    const message =
      err instanceof AxiosError ? err.response?.data?.message ?? fallback : fallback
    window.alert(message)
  }

  const approveMutation = useMutation({
    mutationFn: () => approveWithdrawRequest(Number(id)),
    onSuccess: invalidate,
    onError: (err) => alertApi(err, t('admin.withdraws.approveError')),
  })
  const rejectMutation = useMutation({
    mutationFn: (reason: string) => rejectWithdrawRequest(Number(id), reason),
    onSuccess: () => {
      invalidate()
      setShowRejectPanel(false)
      setRejectReason('')
    },
    onError: (err) => alertApi(err, t('admin.withdraws.rejectErrorMsg')),
  })
  const markPaidMutation = useMutation({
    mutationFn: (reference: string) => markWithdrawRequestPaid(Number(id), reference),
    onSuccess: () => {
      invalidate()
      setShowMarkPaidPanel(false)
      setPayoutReference('')
    },
    onError: (err) => alertApi(err, t('admin.withdraws.markPaidError')),
  })
  const retryPayoutMutation = useMutation({
    mutationFn: () => retryWithdrawPayout(Number(id)),
    onSuccess: invalidate,
    onError: (err) => alertApi(err, t('admin.withdraws.retryPayoutError')),
  })

  if (isLoading) {
    return (
      <AdminPageShell>
        <AdminPageHeader title={t('admin.withdraws.detailHeader')} />
        <div className="px-6 py-10 text-warm-500 text-body-s">{t('admin.common.loading')}</div>
      </AdminPageShell>
    )
  }

  if (isError || !data) {
    const msg = error instanceof AxiosError ? error.response?.data?.message : null
    return (
      <AdminPageShell>
        <AdminPageHeader title={t('admin.withdraws.detailHeader')} />
        <div className="px-4 md:px-6 lg:px-8 py-5">
          <div className="bg-off-white border border-warm-200 rounded-lg p-8 text-center">
            <p className="text-body font-semibold text-airmess-red">
              {t('admin.withdraws.notFoundTitle')}
            </p>
            <p className="text-body-s text-warm-500 mt-2">
              {msg ?? t('common.loadingError')}
            </p>
            <AdminButton
              variant="secondary"
              className="mt-4"
              onClick={() => navigate('/admin/withdraw-requests')}
              leftIcon={<ArrowLeftIcon size={14} />}
            >
              {t('admin.withdraws.backToList')}
            </AdminButton>
          </div>
        </div>
      </AdminPageShell>
    )
  }

  const { request, active_course, recent_transactions, past_requests } = data
  const { driver, user: userOwner } = request

  // Déclarés AVANT les early returns : renderUserWithdrawView() (appelé juste
  // en dessous pour un retrait marchand/particulier) référence statusLabels →
  // sinon TDZ « Cannot access before initialization » = page blanche.
  const statusLabels: Record<string, string> = {
    pending: t('admin.withdraws.statusPending'),
    approved: t('admin.withdraws.statusApproved'),
    rejected: t('admin.withdraws.statusRejected'),
    cancelled: t('admin.withdraws.statusCancelled'),
  }
  const statusClasses =
    STATUS_BADGE_CLASSES[request.status] ?? 'bg-warm-100 text-warm-600 border border-warm-200'
  const statusLabel = statusLabels[request.status] ?? request.status

  // La demande peut être portée par un user marchand/particulier au lieu d'un driver.
  // La vue driver ci-dessous n'a pas de sens dans ce cas ; on route vers une vue
  // simplifiée qui affiche les infos user + les actions (les endpoints admin
  // approve/reject/mark-paid sont polymorphes côté back).
  if (!driver && userOwner) {
    return renderUserWithdrawView()
  }

  if (!driver) {
    return (
      <AdminPageShell>
        <div className="p-8 text-warm-500 text-center">Demande sans propriétaire — état incohérent.</div>
      </AdminPageShell>
    )
  }

  const wallet = driver.wallet

  /**
   * Vue simplifiée pour un retrait porté par un user marchand/particulier.
   * Les actions (approve/reject/mark-paid) réutilisent les mêmes mutations
   * — les endpoints admin sont polymorphes côté back.
   */
  function renderUserWithdrawView() {
    if (!userOwner) return null
    const wallet = data?.user_wallet
    const displayName =
      userOwner.marchant?.raison_sociale ??
      (userOwner.individual
        ? `${userOwner.individual.first_name} ${userOwner.individual.last_name}`.trim()
        : null) ??
      userOwner.name
    const canApprove = request.status === 'pending' && wallet && wallet.available >= request.amount_fcfa
    const canReject = request.status === 'pending'
    const canMarkPaid = request.status === 'approved' && !request.paid_at
    return (
      <AdminPageShell>
        <AdminPageHeader
          title={`Retrait #${request.id}`}
          subtitle="Retrait wallet marchand/particulier"
        />
        <div className="px-4 md:px-6 lg:px-8 py-5 space-y-4 max-w-4xl">
          <AdminButton
            variant="ghost"
            onClick={() => navigate('/admin/withdraw-requests')}
            leftIcon={<ArrowLeftIcon size={14} />}
          >
            {t('admin.withdraws.backToList')}
          </AdminButton>

          {/* Demande + owner */}
          <div className="bg-off-white border border-warm-200 rounded-lg p-5">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <p className="text-eyebrow uppercase text-info font-bold">🏢 Marchand / particulier</p>
                <p className="text-h2 text-ink font-bold mt-1">{displayName}</p>
                <p className="text-body-s text-warm-500">
                  {userOwner.phone ?? '—'} · {userOwner.email}
                </p>
              </div>
              <span
                className={`inline-block px-2 py-0.5 rounded text-caption font-semibold ${
                  STATUS_BADGE_CLASSES[request.status] ?? 'bg-warm-100 text-warm-600 border border-warm-200'
                }`}
              >
                {statusLabels[request.status] ?? request.status}
              </span>
            </div>
            <dl className="grid grid-cols-2 md:grid-cols-4 gap-4 text-body-s">
              <div>
                <dt className="text-caption text-warm-500">Montant demandé</dt>
                <dd className="text-h3 text-ink font-bold tabular-nums">{formatFcfa(request.amount_fcfa)}</dd>
              </div>
              <div>
                <dt className="text-caption text-warm-500">Méthode</dt>
                <dd className="text-body font-medium text-ink">{request.target_method.toUpperCase()}</dd>
                <dd className="text-caption text-warm-500 font-mono">{request.target_account}</dd>
              </div>
              <div>
                <dt className="text-caption text-warm-500">Créée</dt>
                <dd className="text-body-s text-ink">{formatDateTime(request.created_at)}</dd>
              </div>
              {wallet && (
                <div>
                  <dt className="text-caption text-warm-500">Solde disponible</dt>
                  <dd className="text-body font-bold text-ink tabular-nums">{formatFcfa(wallet.available)}</dd>
                  <dd className="text-caption text-warm-500 tabular-nums">
                    balance {formatFcfa(wallet.balance)}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Actions */}
          {(canApprove || canReject || canMarkPaid) && (
            <div className="bg-off-white border border-warm-200 rounded-lg p-5 space-y-3">
              <p className="text-eyebrow uppercase text-warm-600 font-bold">Actions</p>
              <div className="flex flex-wrap gap-2">
                {canApprove && (
                  <AdminButton
                    variant="primary"
                    onClick={() => approveMutation.mutate()}
                    disabled={approveMutation.isPending}
                  >
                    Approuver et lancer le payout
                  </AdminButton>
                )}
                {canReject && (
                  <AdminButton variant="secondary" onClick={() => setShowRejectPanel(true)}>
                    Refuser
                  </AdminButton>
                )}
                {canMarkPaid && (
                  <AdminButton variant="secondary" onClick={() => setShowMarkPaidPanel(true)}>
                    Marquer comme viré manuellement
                  </AdminButton>
                )}
              </div>
              {canApprove === false && request.status === 'pending' && wallet && (
                <p className="text-caption text-airmess-red">
                  ⚠️ Solde disponible insuffisant ({formatFcfa(wallet.available)}) pour approuver{' '}
                  {formatFcfa(request.amount_fcfa)}.
                </p>
              )}
              {request.status === 'rejected' && request.rejection_reason && (
                <p className="text-body-s text-warm-600">
                  Motif du refus : {request.rejection_reason}
                </p>
              )}
              {request.status === 'approved' && request.paid_at && (
                <p className="text-body-s text-success">
                  ✅ Viré le {formatDateTime(request.paid_at)}
                  {request.external_payout_reference && ` — réf: ${request.external_payout_reference}`}
                </p>
              )}
            </div>
          )}

          {/* Panels reject + mark-paid (réutilisation des états déjà présents) */}
          {showRejectPanel && (
            <div className="bg-off-white border border-warm-200 rounded-lg p-5">
              <p className="text-body font-semibold text-ink mb-2">Motif du refus</p>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                className="w-full bg-off-white border border-warm-300 rounded-md px-3 py-2 text-body-s"
                placeholder="Ex : compte inactif, doute sur les coordonnées MoMo…"
              />
              <div className="flex justify-end gap-2 mt-3">
                <AdminButton variant="ghost" onClick={() => setShowRejectPanel(false)}>Annuler</AdminButton>
                <AdminButton
                  variant="danger"
                  onClick={() => rejectMutation.mutate(rejectReason)}
                  disabled={rejectMutation.isPending || rejectReason.trim().length < 3}
                >
                  Confirmer le refus
                </AdminButton>
              </div>
            </div>
          )}
          {showMarkPaidPanel && (
            <div className="bg-off-white border border-warm-200 rounded-lg p-5">
              <p className="text-body font-semibold text-ink mb-2">
                Référence externe du virement
              </p>
              <input
                value={payoutReference}
                onChange={(e) => setPayoutReference(e.target.value)}
                className="w-full bg-off-white border border-warm-300 rounded-md px-3 py-2 text-body-s font-mono"
                placeholder="Ex : TX-2026-070312345"
              />
              <div className="flex justify-end gap-2 mt-3">
                <AdminButton variant="ghost" onClick={() => setShowMarkPaidPanel(false)}>Annuler</AdminButton>
                <AdminButton
                  variant="primary"
                  onClick={() => markPaidMutation.mutate(payoutReference)}
                  disabled={markPaidMutation.isPending || payoutReference.trim().length < 3}
                >
                  Marquer comme viré
                </AdminButton>
              </div>
            </div>
          )}

          {/* Historique des transactions récentes du user */}
          {recent_transactions.length > 0 && (
            <div className="bg-off-white border border-warm-200 rounded-lg p-5">
              <p className="text-eyebrow uppercase text-warm-600 font-bold mb-2">
                10 dernières transactions wallet
              </p>
              <ul className="divide-y divide-warm-200">
                {recent_transactions.map((tx) => (
                  <li key={tx.id} className="py-2 flex items-center justify-between text-body-s">
                    <span className="text-warm-600 font-mono uppercase text-caption">{tx.type}</span>
                    <span className={`tabular-nums font-bold ${tx.amount_fcfa < 0 ? 'text-airmess-red' : 'text-success'}`}>
                      {tx.amount_fcfa > 0 ? '+' : ''}{tx.amount_fcfa.toLocaleString('fr-FR')}
                    </span>
                    <span className="text-caption text-warm-500">{formatDateTime(tx.created_at)}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-caption text-warm-500">
                Retraits passés : {past_requests.approved_count} approuvés
                ({formatFcfa(past_requests.approved_total)}), {past_requests.rejected_count} refusés,{' '}
                {past_requests.cancelled_count} annulés.
              </p>
            </div>
          )}
        </div>
      </AdminPageShell>
    )
  }
  const isBusy = !!active_course
  const balanceShort = wallet ? wallet.balance < request.amount_fcfa : false
  const isPending = request.status === 'pending'
  const busyBlocksApproval = isPending && isBusy
  const isApproved = request.status === 'approved'
  const isPaid = request.paid_at !== null
  const canMarkPaid = isApproved && !isPaid
  const payoutInitiated = request.payout_initiated_at !== null
  const payoutFailed = request.payout_failed_at !== null
  const payoutInFlight = payoutInitiated && !payoutFailed && !isPaid

  return (
    <AdminPageShell>
      <AdminPageHeader
        title={t('admin.withdraws.detailTitle', { id: request.id })}
        subtitle={t('admin.withdraws.requestedOn', { date: formatDateTime(request.created_at) })}
        actions={
          <span
            className={`inline-block px-3 py-1 rounded-md text-body-s font-semibold ${statusClasses}`}
          >
            {statusLabel}
          </span>
        }
      />

      <div className="px-4 md:px-6 lg:px-8 py-5 max-w-5xl mx-auto space-y-4">
        <button
          onClick={() => navigate('/admin/withdraw-requests')}
          className="inline-flex items-center gap-1 text-caption text-warm-500 hover:text-ink"
        >
          <ArrowLeftIcon size={14} />
          {t('admin.withdraws.backToList')}
        </button>

        {/* Bandeaux d'alerte (pending) */}
        {busyBlocksApproval && (
          <AlertBand tone="danger">
            <strong>{driver.first_name}</strong>{' '}
            {t('admin.withdraws.driverInCourseWarningPart1')}
            {active_course.reference}
            {t('admin.withdraws.driverInCourseWarningPart2')}
          </AlertBand>
        )}
        {isPending && !isBusy && balanceShort && (
          <AlertBand tone="warning">
            {t('admin.withdraws.balanceShortWarning', {
              balance: formatFcfa(wallet?.balance ?? 0),
            })}
          </AlertBand>
        )}

        {/* États du payout API FedaPay */}
        {canMarkPaid && payoutInFlight && (
          <AlertBand tone="info">
            <div className="flex items-start gap-2">
              <ClockIcon size={16} />
              <div>
                <strong>{t('admin.withdraws.payoutInFlightTitle')}</strong>{' '}
                {t('admin.withdraws.payoutInFlightBodyPart1', {
                  date: formatDateTime(request.payout_initiated_at),
                })}
                <span className="font-mono">{request.payout_provider_ref}</span>
                {t('admin.withdraws.payoutInFlightBodyPart2')}
              </div>
            </div>
          </AlertBand>
        )}
        {canMarkPaid && payoutFailed && (
          <AlertBand tone="danger">
            <div className="flex items-start gap-2">
              <AlertTriangleIcon size={16} />
              <div className="flex-1">
                <strong>{t('admin.withdraws.payoutFailedTitle')}</strong>{' '}
                {t('admin.withdraws.payoutFailedAt', {
                  date: formatDateTime(request.payout_failed_at),
                })}
                <div className="mt-1 font-mono text-caption bg-white/40 rounded px-2 py-1">
                  {request.payout_failure_reason ?? t('admin.withdraws.payoutFailureUnknown')}
                </div>
                <div className="mt-2 flex gap-2 items-center flex-wrap">
                  <AdminButton
                    variant="danger"
                    size="sm"
                    onClick={() => retryPayoutMutation.mutate()}
                    disabled={retryPayoutMutation.isPending}
                  >
                    {retryPayoutMutation.isPending
                      ? t('admin.withdraws.payoutRetrying')
                      : t('admin.withdraws.payoutRetryCta')}
                  </AdminButton>
                  <span className="text-caption">
                    {t('admin.withdraws.payoutRetryHint')}
                  </span>
                </div>
              </div>
            </div>
          </AlertBand>
        )}
        {canMarkPaid && !payoutInitiated && (
          <AlertBand tone="info">
            {t('admin.withdraws.payoutManualIntro')}
            {request.target_method === 'momo' ? (
              <>
                {t('admin.withdraws.payoutManualMomoIntro')}
                <span className="font-mono">{request.target_account}</span>
                {t('admin.withdraws.payoutManualEnd')}
              </>
            ) : (
              <>
                {t('admin.withdraws.payoutManualBankIntro')}
                <span className="font-mono">{request.target_account}</span>
                {t('admin.withdraws.payoutManualEnd')}
              </>
            )}
          </AlertBand>
        )}

        {/* Métadonnées de décision si déjà tranchée */}
        {request.decided_at && (
          <Section title={t('admin.withdraws.decisionTitle')}>
            <dl className="text-body-s space-y-1.5">
              <div className="flex justify-between gap-4">
                <dt className="text-warm-500">{t('admin.withdraws.decidedOn')}</dt>
                <dd className="font-medium text-ink">{formatDateTime(request.decided_at)}</dd>
              </div>
              {request.decided_by_admin && (
                <div className="flex justify-between gap-4">
                  <dt className="text-warm-500">{t('admin.withdraws.decidedBy')}</dt>
                  <dd className="font-medium text-ink">
                    {request.decided_by_admin.first_name} {request.decided_by_admin.last_name}
                  </dd>
                </div>
              )}
            </dl>
            {request.rejection_reason && (
              <div className="mt-3 bg-danger-bg border border-airmess-red/20 rounded-md p-3">
                <p className="text-caption uppercase tracking-wide text-airmess-red font-bold mb-1">
                  {t('admin.withdraws.rejectionReasonLabel')}
                </p>
                <p className="text-body-s text-airmess-red">{request.rejection_reason}</p>
              </div>
            )}
            {isPaid && (
              <div className="mt-3 bg-success-bg border border-success/20 rounded-md p-3">
                <p className="text-caption uppercase tracking-wide text-success font-bold mb-1 flex items-center gap-1">
                  <CheckIcon size={12} /> {t('admin.withdraws.transferDoneTitle')}
                </p>
                <dl className="text-body-s text-success space-y-0.5">
                  <div>
                    <span className="font-medium">{t('admin.withdraws.transferDoneOn')}</span>{' '}
                    {formatDateTime(request.paid_at)}
                  </div>
                  {request.paid_by_admin && (
                    <div>
                      <span className="font-medium">{t('admin.withdraws.transferDoneBy')}</span>{' '}
                      {request.paid_by_admin.first_name} {request.paid_by_admin.last_name}
                    </div>
                  )}
                  <div>
                    <span className="font-medium">{t('admin.withdraws.transferDoneRef')}</span>{' '}
                    <span className="font-mono">{request.external_payout_reference}</span>
                  </div>
                </dl>
              </div>
            )}
          </Section>
        )}

        {/* Livreur + wallet */}
        <div className="grid md:grid-cols-2 gap-4">
          <Section title={t('admin.withdraws.driverTitle')}>
            <p className="text-body font-bold text-ink">
              {driver.first_name} {driver.last_name}
            </p>
            <p className="text-body-s text-warm-600">{driver.user.phone ?? '—'}</p>
            <p className="text-body-s text-warm-500">{driver.user.email}</p>
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              {driver.availability_status === 'busy' ? (
                <span className="bg-danger-bg text-airmess-red border border-airmess-red/30 text-caption px-2 py-0.5 rounded font-semibold">
                  {t('admin.withdraws.busyBadge')}
                </span>
              ) : driver.availability_status === 'available' ? (
                <span className="bg-success-bg text-success border border-success/20 text-caption px-2 py-0.5 rounded font-semibold">
                  {t('admin.withdraws.availableBadge')}
                </span>
              ) : (
                <span className="bg-warm-100 text-warm-600 border border-warm-200 text-caption px-2 py-0.5 rounded font-semibold">
                  {driver.availability_status}
                </span>
              )}
              <span className="bg-warm-100 text-warm-600 border border-warm-200 text-caption px-2 py-0.5 rounded">
                {driver.activation_status}
              </span>
            </div>
            <Link
              to={`/admin/drivers/${driver.id}`}
              className="mt-4 inline-flex items-center gap-1 text-caption font-medium text-ink hover:text-airmess-red"
            >
              {t('admin.withdraws.viewDriverProfile')} <ArrowRightIcon size={12} />
            </Link>
          </Section>

          <Section title={t('admin.withdraws.walletTitle')}>
            {wallet ? (
              <>
                <p className="text-h1 font-bold text-ink tabular-nums leading-none">
                  {formatFcfa(wallet.balance)}
                </p>
                <p className="text-caption text-warm-500 mt-1">
                  {t('admin.withdraws.balanceCurrent')}
                </p>
                <dl className="mt-4 space-y-1 text-body-s">
                  <div className="flex justify-between">
                    <dt className="text-warm-500">{t('admin.withdraws.totalDeposited')}</dt>
                    <dd className="font-medium text-ink tabular-nums">
                      {formatFcfa(wallet.total_deposited)}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-warm-500">{t('admin.withdraws.totalWithdrawn')}</dt>
                    <dd className="font-medium text-ink tabular-nums">
                      {formatFcfa(wallet.total_withdrawn)}
                    </dd>
                  </div>
                </dl>
              </>
            ) : (
              <p className="text-body-s text-warm-500 italic">
                {t('admin.withdraws.noWalletAnomaly')}
              </p>
            )}
          </Section>
        </div>

        {/* Détail de la demande */}
        <Section title={t('admin.withdraws.requestSectionTitle')}>
          <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-body-s">
            <div>
              <dt className="text-warm-500">{t('admin.withdraws.amountToTransfer')}</dt>
              <dd className="text-h1 font-bold text-ink tabular-nums mt-0.5">
                {formatFcfa(request.amount_fcfa)}
              </dd>
            </div>
            <div>
              <dt className="text-warm-500">{t('admin.withdraws.methodLabel')}</dt>
              <dd className="text-body font-medium text-ink mt-0.5">
                {request.target_method === 'momo'
                  ? t('admin.withdraws.methodMomo')
                  : t('admin.withdraws.methodBank')}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-warm-500">{t('admin.withdraws.targetAccount')}</dt>
              <dd className="text-body font-mono font-semibold text-ink mt-0.5 break-all">
                {request.target_account}
              </dd>
            </div>
          </dl>
        </Section>

        {/* Historique transactions */}
        <Section title={t('admin.withdraws.walletHistoryTitle')}>
          {recent_transactions.length === 0 ? (
            <p className="text-body-s text-warm-500 italic">
              {t('admin.withdraws.noTransactions')}
            </p>
          ) : (
            <ul className="divide-y divide-warm-200">
              {recent_transactions.map((tx) => {
                const meta = TX_META[tx.type]
                return (
                  <li
                    key={tx.id}
                    className="py-2 flex items-start justify-between gap-3 text-body-s"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-ink">{t(meta.i18nKey)}</p>
                      <p className="text-caption text-warm-500">
                        {formatDateTime(tx.created_at)}
                        {tx.course && (
                          <>
                            {' '}· {t('admin.withdraws.courseLine')}{' '}
                            <span className="font-mono">{tx.course.reference}</span>
                          </>
                        )}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p
                        className={`font-bold tabular-nums ${meta.positive ? 'text-success' : 'text-airmess-red'}`}
                      >
                        {meta.positive ? '+' : ''}
                        {tx.amount_fcfa.toLocaleString('fr-FR')}
                      </p>
                      <p className="text-caption text-warm-400 tabular-nums">
                        {t('admin.withdraws.balancePrefix')}{' '}
                        {tx.balance_after.toLocaleString('fr-FR')}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </Section>

        {/* Agrégats retraits passés */}
        <Section title={t('admin.withdraws.pastRequestsTitle')}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <KpiBox
              label={t('admin.withdraws.kpiApproved')}
              value={past_requests.approved_count}
              tone="success"
            />
            <KpiBox
              label={t('admin.withdraws.kpiTotalPaid')}
              value={formatFcfa(past_requests.approved_total)}
              tone="success"
              compact
            />
            <KpiBox
              label={t('admin.withdraws.kpiRejected')}
              value={past_requests.rejected_count}
              tone="danger"
            />
            <KpiBox
              label={t('admin.withdraws.kpiCancelled')}
              value={past_requests.cancelled_count}
            />
          </div>
        </Section>

        {/* Actions — pending */}
        {isPending && (
          <Section title={t('admin.withdraws.decideTitle')}>
            {!showRejectPanel ? (
              <div className="flex flex-col sm:flex-row gap-2">
                <AdminButton
                  variant="primary"
                  onClick={() => {
                    if (
                      window.confirm(
                        t('admin.withdraws.approveConfirm', {
                          amount: formatFcfa(request.amount_fcfa),
                          method:
                            request.target_method === 'momo'
                              ? t('admin.withdraws.momoShort')
                              : t('admin.withdraws.bankAccountShort'),
                        }),
                      )
                    ) {
                      approveMutation.mutate()
                    }
                  }}
                  disabled={approveMutation.isPending}
                  className="flex-1"
                  leftIcon={<CheckIcon size={14} />}
                >
                  {approveMutation.isPending
                    ? t('admin.withdraws.approvingLabel')
                    : t('admin.withdraws.approveAndDebit')}
                </AdminButton>
                <AdminButton
                  variant="danger"
                  onClick={() => setShowRejectPanel(true)}
                  className="flex-1"
                >
                  {t('admin.withdraws.rejectAction')}
                </AdminButton>
              </div>
            ) : (
              <div>
                <p className="text-body-s font-bold text-ink mb-1">
                  {t('admin.withdraws.rejectReasonTitle')}
                </p>
                <p className="text-caption text-warm-500 mb-2">
                  {t('admin.withdraws.rejectReasonHint')}
                </p>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder={t('admin.withdraws.rejectPlaceholder')}
                  rows={3}
                  className="w-full px-3 py-2 bg-off-white border border-warm-300 rounded-md text-body-s text-ink placeholder:text-warm-400 focus:outline-none focus:border-airmess-yellow focus:shadow-glow-yellow transition-all"
                />
                <div className="flex gap-2 mt-3">
                  <AdminButton
                    variant="secondary"
                    onClick={() => {
                      setShowRejectPanel(false)
                      setRejectReason('')
                    }}
                    className="flex-1"
                  >
                    {t('common.cancel')}
                  </AdminButton>
                  <AdminButton
                    variant="danger"
                    onClick={() => rejectMutation.mutate(rejectReason.trim())}
                    disabled={rejectReason.trim().length < 5 || rejectMutation.isPending}
                    className="flex-1"
                  >
                    {rejectMutation.isPending
                      ? t('admin.withdraws.sendingLabel')
                      : t('admin.withdraws.confirmRejectCta')}
                  </AdminButton>
                </div>
              </div>
            )}
          </Section>
        )}

        {/* Actions — approuvée non virée */}
        {canMarkPaid && (
          <Section title={t('admin.withdraws.markPaidTitle')}>
            {!showMarkPaidPanel ? (
              <AdminButton
                variant="primary"
                onClick={() => setShowMarkPaidPanel(true)}
                className="w-full"
              >
                {t('admin.withdraws.markPaidCta')}
              </AdminButton>
            ) : (
              <div>
                <p className="text-body-s font-bold text-ink mb-1">
                  {t('admin.withdraws.payoutReferenceTitle')}
                </p>
                <p className="text-caption text-warm-500 mb-2">
                  {request.target_method === 'momo'
                    ? t('admin.withdraws.payoutReferenceHintMomo')
                    : t('admin.withdraws.payoutReferenceHintBank')}
                </p>
                <input
                  type="text"
                  value={payoutReference}
                  onChange={(e) => setPayoutReference(e.target.value)}
                  placeholder={t('admin.withdraws.payoutReferencePlaceholder')}
                  className="w-full px-3 py-2 bg-off-white border border-warm-300 rounded-md text-body-s font-mono text-ink placeholder:text-warm-400 focus:outline-none focus:border-airmess-yellow focus:shadow-glow-yellow transition-all"
                />
                <div className="flex gap-2 mt-3">
                  <AdminButton
                    variant="secondary"
                    onClick={() => {
                      setShowMarkPaidPanel(false)
                      setPayoutReference('')
                    }}
                    className="flex-1"
                  >
                    {t('common.cancel')}
                  </AdminButton>
                  <AdminButton
                    variant="primary"
                    onClick={() => markPaidMutation.mutate(payoutReference.trim())}
                    disabled={payoutReference.trim().length < 3 || markPaidMutation.isPending}
                    className="flex-1"
                  >
                    {markPaidMutation.isPending
                      ? t('admin.withdraws.sendingLabel')
                      : t('admin.withdraws.confirmTransferCta')}
                  </AdminButton>
                </div>
              </div>
            )}
          </Section>
        )}
      </div>
    </AdminPageShell>
  )
}

interface KpiBoxProps {
  label: string
  value: number | string
  tone?: 'default' | 'success' | 'danger'
  compact?: boolean
}
function KpiBox({ label, value, tone = 'default', compact = false }: KpiBoxProps) {
  const borderClass =
    tone === 'success'
      ? 'border-success/30'
      : tone === 'danger'
        ? 'border-airmess-red/30'
        : 'border-warm-200'
  const valueColor =
    tone === 'success' ? 'text-success' : tone === 'danger' ? 'text-airmess-red' : 'text-ink'
  return (
    <div className={`bg-off-white border ${borderClass} rounded-md px-3 py-2.5`}>
      <p className="text-[10px] uppercase tracking-wider font-bold text-warm-600">{label}</p>
      <p
        className={`${compact ? 'text-body font-bold' : 'text-h2 font-bold'} tabular-nums leading-none mt-1 ${valueColor}`}
      >
        {value}
      </p>
    </div>
  )
}
