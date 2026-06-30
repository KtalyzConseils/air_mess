import { useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'
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

const STATUS_BADGE: Record<string, { label: string; classes: string }> = {
  pending: { label: 'En attente', classes: 'bg-warning-bg text-warning border border-warning/20' },
  approved: { label: 'Approuvée', classes: 'bg-success-bg text-success border border-success/20' },
  rejected: { label: 'Rejetée', classes: 'bg-danger-bg text-airmess-red border border-airmess-red/30' },
  cancelled: { label: 'Annulée', classes: 'bg-warm-100 text-warm-600 border border-warm-200' },
}

const TX_META: Record<WithdrawRequestRecentTx['type'], { label: string; positive: boolean }> = {
  deposit: { label: 'Recharge', positive: true },
  withdraw: { label: 'Retrait', positive: false },
  pickup_debit: { label: 'Débit caution', positive: false },
  refund: { label: 'Remboursement', positive: true },
  earning: { label: 'Gain de course', positive: true },
}

function formatFcfa(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—'
  return n.toLocaleString('fr-FR') + ' FCFA'
}

function formatDateTime(value: string | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleString('fr-FR', {
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
    onError: (err) => alertApi(err, "Erreur lors de l'approbation."),
  })
  const rejectMutation = useMutation({
    mutationFn: (reason: string) => rejectWithdrawRequest(Number(id), reason),
    onSuccess: () => {
      invalidate()
      setShowRejectPanel(false)
      setRejectReason('')
    },
    onError: (err) => alertApi(err, 'Erreur lors du rejet.'),
  })
  const markPaidMutation = useMutation({
    mutationFn: (reference: string) => markWithdrawRequestPaid(Number(id), reference),
    onSuccess: () => {
      invalidate()
      setShowMarkPaidPanel(false)
      setPayoutReference('')
    },
    onError: (err) => alertApi(err, 'Erreur lors de la confirmation.'),
  })
  const retryPayoutMutation = useMutation({
    mutationFn: () => retryWithdrawPayout(Number(id)),
    onSuccess: invalidate,
    onError: (err) => alertApi(err, 'Erreur lors de la retentative.'),
  })

  if (isLoading) {
    return (
      <AdminPageShell>
        <AdminPageHeader title="Demande de retrait" />
        <div className="px-6 py-10 text-warm-500 text-body-s">Chargement…</div>
      </AdminPageShell>
    )
  }

  if (isError || !data) {
    const msg = error instanceof AxiosError ? error.response?.data?.message : null
    return (
      <AdminPageShell>
        <AdminPageHeader title="Demande de retrait" />
        <div className="px-4 md:px-6 lg:px-8 py-5">
          <div className="bg-off-white border border-warm-200 rounded-lg p-8 text-center">
            <p className="text-body font-semibold text-airmess-red">Demande introuvable</p>
            <p className="text-body-s text-warm-500 mt-2">{msg ?? 'Erreur de chargement.'}</p>
            <AdminButton
              variant="secondary"
              className="mt-4"
              onClick={() => navigate('/admin/withdraw-requests')}
              leftIcon={<ArrowLeftIcon size={14} />}
            >
              Retour à la liste
            </AdminButton>
          </div>
        </div>
      </AdminPageShell>
    )
  }

  const { request, active_course, recent_transactions, past_requests } = data
  const { driver } = request
  const wallet = driver.wallet
  const statusMeta = STATUS_BADGE[request.status] ?? {
    label: request.status,
    classes: 'bg-warm-100 text-warm-600 border border-warm-200',
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
        title={`Demande de retrait #${request.id}`}
        subtitle={`Demandée le ${formatDateTime(request.created_at)}`}
        actions={
          <span
            className={`inline-block px-3 py-1 rounded-md text-body-s font-semibold ${statusMeta.classes}`}
          >
            {statusMeta.label}
          </span>
        }
      />

      <div className="px-4 md:px-6 lg:px-8 py-5 max-w-5xl mx-auto space-y-4">
        <button
          onClick={() => navigate('/admin/withdraw-requests')}
          className="inline-flex items-center gap-1 text-caption text-warm-500 hover:text-ink"
        >
          <ArrowLeftIcon size={14} />
          Retour à la liste
        </button>

        {/* Bandeaux d'alerte (pending) */}
        {busyBlocksApproval && (
          <AlertBand tone="danger">
            <strong>{driver.first_name}</strong> est actuellement en course (#
            {active_course.reference}). L'approbation sera refusée tant que la course n'est pas
            terminée.
          </AlertBand>
        )}
        {isPending && !isBusy && balanceShort && (
          <AlertBand tone="warning">
            La balance actuelle ({formatFcfa(wallet?.balance ?? 0)}) est inférieure au montant
            demandé. L'approbation échouera. Demande à revoir.
          </AlertBand>
        )}

        {/* États du payout API FedaPay */}
        {canMarkPaid && payoutInFlight && (
          <AlertBand tone="info">
            <div className="flex items-start gap-2">
              <ClockIcon size={16} />
              <div>
                <strong>Payout FedaPay lancé automatiquement</strong> à{' '}
                {formatDateTime(request.payout_initiated_at)} (ref :{' '}
                <span className="font-mono">{request.payout_provider_ref}</span>). En attente du
                webhook de confirmation. Aucune action requise — la trace sera complétée
                automatiquement.
              </div>
            </div>
          </AlertBand>
        )}
        {canMarkPaid && payoutFailed && (
          <AlertBand tone="danger">
            <div className="flex items-start gap-2">
              <AlertTriangleIcon size={16} />
              <div className="flex-1">
                <strong>Le payout FedaPay a échoué</strong> (
                {formatDateTime(request.payout_failed_at)}).
                <div className="mt-1 font-mono text-caption bg-white/40 rounded px-2 py-1">
                  {request.payout_failure_reason ?? 'Erreur inconnue'}
                </div>
                <div className="mt-2 flex gap-2 items-center flex-wrap">
                  <AdminButton
                    variant="danger"
                    size="sm"
                    onClick={() => retryPayoutMutation.mutate()}
                    disabled={retryPayoutMutation.isPending}
                  >
                    {retryPayoutMutation.isPending ? 'Tentative…' : 'Retenter le payout'}
                  </AdminButton>
                  <span className="text-caption">
                    ou utilise le bouton « Marquer comme viré » ci-dessous pour le faire
                    manuellement.
                  </span>
                </div>
              </div>
            </div>
          </AlertBand>
        )}
        {canMarkPaid && !payoutInitiated && (
          <AlertBand tone="info">
            Le wallet du livreur a été débité.{' '}
            {request.target_method === 'momo' ? (
              <>
                Le payout FedaPay n'a pas été lancé (numéro non éligible ou tentative manuelle
                attendue). Effectue le virement vers{' '}
                <span className="font-mono">{request.target_account}</span>, puis renseigne la
                référence.
              </>
            ) : (
              <>
                Effectue le virement bancaire vers{' '}
                <span className="font-mono">{request.target_account}</span>, puis renseigne la
                référence.
              </>
            )}
          </AlertBand>
        )}

        {/* Métadonnées de décision si déjà tranchée */}
        {request.decided_at && (
          <Section title="Décision">
            <dl className="text-body-s space-y-1.5">
              <div className="flex justify-between gap-4">
                <dt className="text-warm-500">Décidée le</dt>
                <dd className="font-medium text-ink">{formatDateTime(request.decided_at)}</dd>
              </div>
              {request.decided_by_admin && (
                <div className="flex justify-between gap-4">
                  <dt className="text-warm-500">Par</dt>
                  <dd className="font-medium text-ink">
                    {request.decided_by_admin.first_name} {request.decided_by_admin.last_name}
                  </dd>
                </div>
              )}
            </dl>
            {request.rejection_reason && (
              <div className="mt-3 bg-danger-bg border border-airmess-red/20 rounded-md p-3">
                <p className="text-caption uppercase tracking-wide text-airmess-red font-bold mb-1">
                  Raison du rejet
                </p>
                <p className="text-body-s text-airmess-red">{request.rejection_reason}</p>
              </div>
            )}
            {isPaid && (
              <div className="mt-3 bg-success-bg border border-success/20 rounded-md p-3">
                <p className="text-caption uppercase tracking-wide text-success font-bold mb-1 flex items-center gap-1">
                  <CheckIcon size={12} /> Virement effectué
                </p>
                <dl className="text-body-s text-success space-y-0.5">
                  <div>
                    <span className="font-medium">Le :</span> {formatDateTime(request.paid_at)}
                  </div>
                  {request.paid_by_admin && (
                    <div>
                      <span className="font-medium">Par :</span>{' '}
                      {request.paid_by_admin.first_name} {request.paid_by_admin.last_name}
                    </div>
                  )}
                  <div>
                    <span className="font-medium">Référence :</span>{' '}
                    <span className="font-mono">{request.external_payout_reference}</span>
                  </div>
                </dl>
              </div>
            )}
          </Section>
        )}

        {/* Livreur + wallet */}
        <div className="grid md:grid-cols-2 gap-4">
          <Section title="Livreur">
            <p className="text-body font-bold text-ink">
              {driver.first_name} {driver.last_name}
            </p>
            <p className="text-body-s text-warm-600">{driver.user.phone ?? '—'}</p>
            <p className="text-body-s text-warm-500">{driver.user.email}</p>
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              {driver.availability_status === 'busy' ? (
                <span className="bg-danger-bg text-airmess-red border border-airmess-red/30 text-caption px-2 py-0.5 rounded font-semibold">
                  En course
                </span>
              ) : driver.availability_status === 'available' ? (
                <span className="bg-success-bg text-success border border-success/20 text-caption px-2 py-0.5 rounded font-semibold">
                  Disponible
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
              Voir profil livreur <ArrowRightIcon size={12} />
            </Link>
          </Section>

          <Section title="État du wallet">
            {wallet ? (
              <>
                <p className="text-h1 font-bold text-ink tabular-nums leading-none">
                  {formatFcfa(wallet.balance)}
                </p>
                <p className="text-caption text-warm-500 mt-1">Balance actuelle</p>
                <dl className="mt-4 space-y-1 text-body-s">
                  <div className="flex justify-between">
                    <dt className="text-warm-500">Total déposé</dt>
                    <dd className="font-medium text-ink tabular-nums">
                      {formatFcfa(wallet.total_deposited)}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-warm-500">Total retiré</dt>
                    <dd className="font-medium text-ink tabular-nums">
                      {formatFcfa(wallet.total_withdrawn)}
                    </dd>
                  </div>
                </dl>
              </>
            ) : (
              <p className="text-body-s text-warm-500 italic">
                Aucun wallet (impossible — anomalie).
              </p>
            )}
          </Section>
        </div>

        {/* Détail de la demande */}
        <Section title="Demande">
          <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-body-s">
            <div>
              <dt className="text-warm-500">Montant à verser</dt>
              <dd className="text-h1 font-bold text-ink tabular-nums mt-0.5">
                {formatFcfa(request.amount_fcfa)}
              </dd>
            </div>
            <div>
              <dt className="text-warm-500">Méthode</dt>
              <dd className="text-body font-medium text-ink mt-0.5">
                {request.target_method === 'momo' ? 'Mobile Money' : 'Banque'}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-warm-500">Compte / numéro cible</dt>
              <dd className="text-body font-mono font-semibold text-ink mt-0.5 break-all">
                {request.target_account}
              </dd>
            </div>
          </dl>
        </Section>

        {/* Historique transactions */}
        <Section title="Historique wallet (10 dernières)">
          {recent_transactions.length === 0 ? (
            <p className="text-body-s text-warm-500 italic">Aucune transaction.</p>
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
                      <p className="font-medium text-ink">{meta.label}</p>
                      <p className="text-caption text-warm-500">
                        {formatDateTime(tx.created_at)}
                        {tx.course && (
                          <>
                            {' '}· course <span className="font-mono">{tx.course.reference}</span>
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
                        solde : {tx.balance_after.toLocaleString('fr-FR')}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </Section>

        {/* Agrégats retraits passés */}
        <Section title="Historique des retraits du livreur">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <KpiBox label="Approuvés" value={past_requests.approved_count} tone="success" />
            <KpiBox
              label="Total versé"
              value={formatFcfa(past_requests.approved_total)}
              tone="success"
              compact
            />
            <KpiBox label="Rejetés" value={past_requests.rejected_count} tone="danger" />
            <KpiBox label="Annulés" value={past_requests.cancelled_count} />
          </div>
        </Section>

        {/* Actions — pending */}
        {isPending && (
          <Section title="Décider">
            {!showRejectPanel ? (
              <div className="flex flex-col sm:flex-row gap-2">
                <AdminButton
                  variant="primary"
                  onClick={() => {
                    if (
                      window.confirm(
                        `Confirmer l'approbation du retrait de ${formatFcfa(request.amount_fcfa)} ?\n\nLe wallet sera débité immédiatement. Vous devrez ensuite effectuer le virement réel sur ${request.target_method === 'momo' ? 'MoMo' : 'le compte bancaire'}.`,
                      )
                    ) {
                      approveMutation.mutate()
                    }
                  }}
                  disabled={approveMutation.isPending}
                  className="flex-1"
                  leftIcon={<CheckIcon size={14} />}
                >
                  {approveMutation.isPending ? 'Approbation…' : 'Approuver et débiter'}
                </AdminButton>
                <AdminButton
                  variant="danger"
                  onClick={() => setShowRejectPanel(true)}
                  className="flex-1"
                >
                  Rejeter…
                </AdminButton>
              </div>
            ) : (
              <div>
                <p className="text-body-s font-bold text-ink mb-1">Raison du rejet</p>
                <p className="text-caption text-warm-500 mb-2">
                  Le livreur sera notifié avec cette raison. Aucun débit ne sera effectué.
                </p>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="ex : compte MoMo invalide, fraude suspectée…"
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
                    Annuler
                  </AdminButton>
                  <AdminButton
                    variant="danger"
                    onClick={() => rejectMutation.mutate(rejectReason.trim())}
                    disabled={rejectReason.trim().length < 5 || rejectMutation.isPending}
                    className="flex-1"
                  >
                    {rejectMutation.isPending ? 'Envoi…' : 'Confirmer le rejet'}
                  </AdminButton>
                </div>
              </div>
            )}
          </Section>
        )}

        {/* Actions — approuvée non virée */}
        {canMarkPaid && (
          <Section title="Confirmer le virement">
            {!showMarkPaidPanel ? (
              <AdminButton
                variant="primary"
                onClick={() => setShowMarkPaidPanel(true)}
                className="w-full"
              >
                Marquer le virement comme effectué…
              </AdminButton>
            ) : (
              <div>
                <p className="text-body-s font-bold text-ink mb-1">Référence du virement</p>
                <p className="text-caption text-warm-500 mb-2">
                  Saisis la référence retournée par{' '}
                  {request.target_method === 'momo' ? 'MoMo' : 'la banque'} (numéro de
                  transaction, identifiant unique). Le livreur sera notifié.
                </p>
                <input
                  type="text"
                  value={payoutReference}
                  onChange={(e) => setPayoutReference(e.target.value)}
                  placeholder="ex : MP240624.1234.A56789"
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
                    Annuler
                  </AdminButton>
                  <AdminButton
                    variant="primary"
                    onClick={() => markPaidMutation.mutate(payoutReference.trim())}
                    disabled={payoutReference.trim().length < 3 || markPaidMutation.isPending}
                    className="flex-1"
                  >
                    {markPaidMutation.isPending ? 'Envoi…' : 'Confirmer le virement'}
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
