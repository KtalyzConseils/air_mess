import { useState, type ReactNode } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import AdminPageShell from '../../components/admin/AdminPageShell'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import AdminModal from '../../components/admin/AdminModal'
import { AdminButton } from '../../components/admin/AdminToolbar'
import { ArrowLeftIcon, SettingsIcon, AlertTriangleIcon } from '../../components/ui/icons'
import WalletAdjustmentModal from '../../components/WalletAdjustmentModal'
import SupportNotesPanel from '../../components/SupportNotesPanel'
import { fetchIndividual, suspendIndividual, reactivateIndividual } from '../../api/admin'
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

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2 border-b border-warm-200 last:border-0">
      <span className="text-body-s text-warm-500">{label}</span>
      <span className="text-body-s font-medium text-ink text-right">{children}</span>
    </div>
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

interface KpiBoxProps {
  label: string
  value: number | string
  tone?: 'default' | 'success' | 'danger'
}
function KpiBox({ label, value, tone = 'default' }: KpiBoxProps) {
  const styles =
    tone === 'success'
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

const PAYMENT_STATUS_BADGE: Record<string, { label: string; classes: string }> = {
  paid: { label: 'Payé', classes: 'bg-success-bg text-success border border-success/20' },
  pending: { label: 'En attente', classes: 'bg-warning-bg text-warning border border-warning/20' },
  processing: { label: 'En cours', classes: 'bg-cream text-ink border border-warm-300' },
  failed: { label: 'Échoué', classes: 'bg-danger-bg text-airmess-red border border-airmess-red/30' },
  refunded: { label: 'Remboursé', classes: 'bg-warm-100 text-warm-600 border border-warm-200' },
}

export default function AdminIndividualDetailPage() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const [showSuspendModal, setShowSuspendModal] = useState(false)
  const [suspendReason, setSuspendReason] = useState('')
  const [walletAdjustOpen, setWalletAdjustOpen] = useState(false)
  const currentUser = useAuthStore((s) => s.user)
  const isSuperAdmin = hasAdminRole(currentUser, 'super')
  const canManageIndividual = hasAdminRole(currentUser, 'commercial')

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'individual', id],
    queryFn: () => fetchIndividual(id!),
    enabled: !!id,
  })

  const suspendMutation = useMutation({
    mutationFn: () => suspendIndividual(Number(id), suspendReason.trim()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'individual', id] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'individuals'] })
      setShowSuspendModal(false)
      setSuspendReason('')
    },
  })

  const reactivateMutation = useMutation({
    mutationFn: () => reactivateIndividual(Number(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'individual', id] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'individuals'] })
    },
  })

  const lastError = suspendMutation.error ?? reactivateMutation.error
  const actionError: string | null =
    lastError instanceof AxiosError
      ? (lastError.response?.data as { message?: string } | undefined)?.message ??
        "Erreur lors de l'action."
      : null

  const isSuspended =
    data?.individual.subscription_status === 'suspended' ||
    data?.individual.user.is_active === false

  const renderStatusBadge = () => {
    if (!data) return null
    if (isSuspended)
      return (
        <span className="inline-block px-2 py-0.5 rounded text-caption font-semibold bg-danger-bg text-airmess-red border border-airmess-red/30">
          Suspendu
        </span>
      )
    if (data.individual.subscription_status === 'active')
      return (
        <span className="inline-block px-2 py-0.5 rounded text-caption font-semibold bg-success-bg text-success border border-success/20">
          Abonné · {data.individual.subscription_plan}
        </span>
      )
    return (
      <span className="inline-block px-2 py-0.5 rounded text-caption font-semibold bg-cream text-ink border border-warm-300">
        Quota gratuit
      </span>
    )
  }

  return (
    <AdminPageShell>
      <AdminPageHeader
        title={
          data ? `${data.individual.first_name} ${data.individual.last_name}` : 'Particulier'
        }
        subtitle={data ? data.individual.user.email : undefined}
        actions={
          <>
            {renderStatusBadge()}
            {data && canManageIndividual && (
              <>
                {isSuspended ? (
                  <AdminButton
                    variant="primary"
                    onClick={() => reactivateMutation.mutate()}
                    disabled={reactivateMutation.isPending}
                  >
                    {reactivateMutation.isPending ? 'Réactivation…' : 'Réactiver'}
                  </AdminButton>
                ) : (
                  <AdminButton variant="danger" onClick={() => setShowSuspendModal(true)}>
                    Suspendre
                  </AdminButton>
                )}
              </>
            )}
          </>
        }
      />

      <div className="px-4 md:px-6 lg:px-8 py-5 max-w-5xl mx-auto space-y-6">
        <Link
          to="/admin/individuals"
          className="inline-flex items-center gap-1 text-caption text-warm-500 hover:text-ink"
        >
          <ArrowLeftIcon size={14} />
          Retour aux particuliers
        </Link>

        {isLoading && <p className="text-body-s text-warm-500">Chargement…</p>}
        {isError && <p className="text-body-s text-airmess-red">Particulier introuvable.</p>}

        {actionError && (
          <p className="text-body-s text-airmess-red flex items-center gap-1.5">
            <AlertTriangleIcon size={14} /> {actionError}
          </p>
        )}

        {data && (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <Section title="Identité & contact">
                <Row label="Email">{data.individual.user.email}</Row>
                <Row label="Téléphone">{data.individual.user.phone ?? '—'}</Row>
                <Row label="Compte actif">{data.individual.user.is_active ? 'Oui' : 'Non'}</Row>
              </Section>

              <Section
                title="Wallet"
                action={
                  isSuperAdmin && data.individual.user.wallet ? (
                    <AdminButton
                      variant="ghost"
                      size="sm"
                      onClick={() => setWalletAdjustOpen(true)}
                      leftIcon={<SettingsIcon size={14} />}
                    >
                      Ajuster
                    </AdminButton>
                  ) : null
                }
              >
                {data.individual.user.wallet ? (
                  <>
                    <Row label="Balance">
                      <strong>
                        {data.individual.user.wallet.balance.toLocaleString('fr-FR')} FCFA
                      </strong>
                    </Row>
                    <Row label="Réservé (en cours)">
                      {data.individual.user.wallet.pending_reserved.toLocaleString('fr-FR')} FCFA
                    </Row>
                    <Row label="Total rechargé">
                      {data.individual.user.wallet.total_deposited.toLocaleString('fr-FR')} FCFA
                    </Row>
                    <Row label="Total dépensé">
                      {data.individual.user.wallet.total_spent.toLocaleString('fr-FR')} FCFA
                    </Row>
                  </>
                ) : (
                  <p className="text-body-s text-warm-500 italic">Aucun wallet associé.</p>
                )}
              </Section>
            </div>

            <Section title="Quota mensuel">
              <Row label="Utilisé">
                {data.individual.monthly_courses_used}/{data.individual.monthly_courses_limit}
              </Row>
            </Section>

            <Section title="Activité — courses">
              <div className="grid gap-2 grid-cols-2 md:grid-cols-4">
                <KpiBox label="Total" value={data.stats.courses_total} />
                <KpiBox label="Livrées" value={data.stats.courses_delivered} tone="success" />
                <KpiBox label="En cours" value={data.stats.courses_in_progress} />
                <KpiBox
                  label="Annulées/Échec"
                  value={data.stats.courses_cancelled}
                  tone="danger"
                />
              </div>
              <p className="text-body-s text-warm-600 mt-3">
                Dernière course : {formatDate(data.stats.last_course_at)}
              </p>
            </Section>

            <Section
              title="Paiements à la course (one-shot)"
              action={
                <div className="text-right">
                  <p className="text-body-s font-bold text-ink tabular-nums">
                    {data.one_shot_summary.total_paid_fcfa.toLocaleString('fr-FR')} FCFA
                  </p>
                  <p className="text-caption text-warm-500">
                    {data.one_shot_summary.count_paid} paiement
                    {data.one_shot_summary.count_paid > 1 ? 's' : ''} réussi
                    {data.one_shot_summary.count_paid > 1 ? 's' : ''}
                  </p>
                </div>
              }
            >
              {data.one_shot_payments.length === 0 ? (
                <p className="text-body-s text-warm-500 italic">Aucun paiement à la course.</p>
              ) : (
                <table className="w-full text-body-s">
                  <thead className="text-[10px] uppercase tracking-wider font-bold text-warm-600 border-b border-warm-200">
                    <tr>
                      <th className="text-left py-2">Date</th>
                      <th className="text-left py-2">Montant</th>
                      <th className="text-left py-2">Statut</th>
                      <th className="text-left py-2">Provider</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-warm-200">
                    {data.one_shot_payments.map((p) => {
                      const badge = PAYMENT_STATUS_BADGE[p.status] ?? {
                        label: p.status,
                        classes: 'bg-warm-100 text-warm-600 border border-warm-200',
                      }
                      return (
                        <tr key={p.id}>
                          <td className="py-2 text-warm-600 tabular-nums">
                            {formatDateTime(p.paid_at ?? p.created_at)}
                          </td>
                          <td className="py-2 font-medium text-ink tabular-nums">
                            {p.amount_fcfa.toLocaleString('fr-FR')} FCFA
                          </td>
                          <td className="py-2">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-caption font-semibold ${badge.classes}`}
                            >
                              {badge.label}
                            </span>
                          </td>
                          <td className="py-2 text-warm-600">{p.provider}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </Section>

            {/* Modal d'ajustement wallet */}
            {isSuperAdmin && data.individual.user.wallet && (
              <WalletAdjustmentModal
                open={walletAdjustOpen}
                onClose={() => setWalletAdjustOpen(false)}
                target="user"
                targetId={data.individual.user.id}
                targetName={data.individual.user.name}
                currentBalance={data.individual.user.wallet.balance}
                onSuccessInvalidate={[['admin', 'individual', id]]}
              />
            )}

            {/* Notes internes */}
            <SupportNotesPanel
              notableType="user"
              notableId={data.individual.user.id}
              title="Notes internes (particulier)"
            />
          </>
        )}
      </div>

      {/* Modal de suspension */}
      <AdminModal
        open={showSuspendModal}
        onClose={() => {
          setShowSuspendModal(false)
          setSuspendReason('')
        }}
        title="Suspendre ce particulier"
        subtitle="L'accès au compte sera coupé immédiatement (tokens révoqués)."
        footer={
          <>
            <AdminButton
              variant="secondary"
              onClick={() => {
                setShowSuspendModal(false)
                setSuspendReason('')
              }}
            >
              Annuler
            </AdminButton>
            <AdminButton
              variant="danger"
              onClick={() => suspendMutation.mutate()}
              disabled={suspendReason.trim().length < 5 || suspendMutation.isPending}
            >
              {suspendMutation.isPending ? 'Suspension…' : 'Confirmer'}
            </AdminButton>
          </>
        }
      >
        <label className="block mb-1.5 text-caption font-medium text-warm-600">
          Motif (obligatoire — 5 caractères min.)
        </label>
        <textarea
          value={suspendReason}
          onChange={(e) => setSuspendReason(e.target.value)}
          placeholder="ex : comportement abusif, plaintes répétées…"
          rows={3}
          className="w-full px-3 py-2 bg-off-white border border-warm-300 rounded-md text-body-s text-ink placeholder:text-warm-400 focus:outline-none focus:border-airmess-yellow focus:shadow-glow-yellow transition-all"
        />
      </AdminModal>
    </AdminPageShell>
  )
}
