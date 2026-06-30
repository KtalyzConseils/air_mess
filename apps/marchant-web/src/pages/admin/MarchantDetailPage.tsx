import { useState, type ReactNode } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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

const SECTEUR_LABEL: Record<string, string> = {
  supermarche: 'Supermarché',
  restaurant: 'Restaurant',
  boutique: 'Boutique',
  pharmacie: 'Pharmacie',
  ecommerce: 'E-commerce',
  autre: 'Autre',
}

type ConfirmAction = 'validate' | 'reactivate' | 'suspend' | 'reject' | 'delete'

type ConfirmConfig = {
  title: string
  description: string
  confirmLabel: string
  confirmVariant: 'primary' | 'success' | 'danger'
  reasonRequired: boolean
  reasonPlaceholder?: string
}

const CONFIRM_CONFIG: Record<ConfirmAction, ConfirmConfig> = {
  validate: {
    title: 'Valider ce marchand ?',
    description: 'Le marchand pourra immédiatement créer des courses.',
    confirmLabel: "Valider l'inscription",
    confirmVariant: 'primary',
    reasonRequired: false,
  },
  reactivate: {
    title: 'Réactiver ce marchand ?',
    description: 'Il pourra de nouveau se connecter et créer des courses.',
    confirmLabel: 'Réactiver',
    confirmVariant: 'success',
    reasonRequired: false,
  },
  suspend: {
    title: 'Suspendre ce marchand ?',
    description:
      'Le compte sera désactivé. Le marchand sera déconnecté immédiatement et ne pourra plus créer de courses.',
    confirmLabel: 'Suspendre',
    confirmVariant: 'danger',
    reasonRequired: true,
    reasonPlaceholder: 'ex : documents manquants, suspicion de fraude…',
  },
  reject: {
    title: "Refuser l'inscription ?",
    description: "L'inscription sera marquée comme refusée. Le marchand sera déconnecté.",
    confirmLabel: "Refuser l'inscription",
    confirmVariant: 'danger',
    reasonRequired: true,
    reasonPlaceholder: 'ex : documents non conformes, doublon…',
  },
  delete: {
    title: 'Supprimer définitivement ?',
    description:
      'Cette action est irréversible. Le compte et toutes ses données seront supprimés.',
    confirmLabel: 'Supprimer',
    confirmVariant: 'danger',
    reasonRequired: false,
  },
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
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null)
  const [walletAdjustOpen, setWalletAdjustOpen] = useState(false)
  const currentUser = useAuthStore((s) => s.user)
  const isSuperAdmin = hasAdminRole(currentUser, 'super')
  const canManageMarchant = hasAdminRole(currentUser, 'commercial')

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
    onError: (err) => showApiError(err, 'Validation impossible.'),
  })
  const reactivateMut = useMutation({
    mutationFn: () => reactivateMarchant(Number(id)),
    onSuccess: () => { invalidate(); setConfirmAction(null) },
    onError: (err) => showApiError(err, 'Réactivation impossible.'),
  })
  const suspendMut = useMutation({
    mutationFn: (reason: string) => suspendMarchant(Number(id), reason),
    onSuccess: () => { invalidate(); setConfirmAction(null) },
    onError: (err) => showApiError(err, 'Suspension impossible.'),
  })
  const rejectMut = useMutation({
    mutationFn: (reason: string) => rejectMarchant(Number(id), reason),
    onSuccess: () => { invalidate(); setConfirmAction(null) },
    onError: (err) => showApiError(err, 'Refus impossible.'),
  })
  const deleteMut = useMutation({
    mutationFn: () => deleteMarchant(Number(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'marchants'] })
      setConfirmAction(null)
      navigate('/admin/marchants')
    },
    onError: (err) => showApiError(err, 'Suppression impossible.'),
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
            Réactiver
          </AdminButton>
        )}
        {!m.validated_at && m.subscription_status !== 'churned' && (
          <>
            <AdminButton variant="primary" onClick={() => setConfirmAction('validate')}>
              Valider
            </AdminButton>
            <AdminButton variant="secondary" onClick={() => setConfirmAction('reject')}>
              Refuser
            </AdminButton>
          </>
        )}
        {m.validated_at && m.subscription_status === 'active' && (
          <AdminButton variant="danger" onClick={() => setConfirmAction('suspend')}>
            Suspendre
          </AdminButton>
        )}
      </>
    )
  }

  return (
    <AdminPageShell>
      <AdminPageHeader
        title={data?.marchant.raison_sociale ?? 'Marchand'}
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
                    À valider
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
          Retour aux marchands
        </Link>

        {isLoading && <p className="text-body-s text-warm-500">Chargement…</p>}
        {isError && <p className="text-body-s text-airmess-red">Marchand introuvable.</p>}

        {data && (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              {/* Identité & contact */}
              <section className="bg-off-white border border-warm-200 rounded-lg">
                <div className="px-5 py-2.5 border-b border-warm-200">
                  <h2 className="text-body-s font-bold text-ink">Identité & contact</h2>
                </div>
                <div className="px-5 py-3">
                  <Row label="Secteur">{SECTEUR_LABEL[data.marchant.secteur_activite] ?? data.marchant.secteur_activite}</Row>
                  <Row label="IFU / RCCM">{data.marchant.ifu_rccm ?? '—'}</Row>
                  <Row label="Responsable">{data.marchant.user.name}</Row>
                  <Row label="Email">{data.marchant.user.email}</Row>
                  <Row label="Téléphone">{data.marchant.user.phone ?? '—'}</Row>
                </div>
              </section>

              {/* Wallet */}
              <section className="bg-off-white border border-warm-200 rounded-lg">
                <div className="px-5 py-2.5 border-b border-warm-200 flex items-center justify-between">
                  <h2 className="text-body-s font-bold text-ink">Wallet</h2>
                  {isSuperAdmin && data.marchant.user.wallet && (
                    <AdminButton
                      variant="ghost"
                      size="sm"
                      onClick={() => setWalletAdjustOpen(true)}
                      leftIcon={<SettingsIcon size={14} />}
                    >
                      Ajuster
                    </AdminButton>
                  )}
                </div>
                <div className="px-5 py-3">
                  {data.marchant.user.wallet ? (
                    <>
                      <Row label="Balance">
                        <strong>{data.marchant.user.wallet.balance.toLocaleString('fr-FR')} FCFA</strong>
                      </Row>
                      <Row label="Réservé (en cours)">
                        {data.marchant.user.wallet.pending_reserved.toLocaleString('fr-FR')} FCFA
                      </Row>
                      <Row label="Total rechargé">
                        {data.marchant.user.wallet.total_deposited.toLocaleString('fr-FR')} FCFA
                      </Row>
                      <Row label="Total dépensé">
                        {data.marchant.user.wallet.total_spent.toLocaleString('fr-FR')} FCFA
                      </Row>
                      <Row label="Validé le">{formatDate(data.marchant.validated_at)}</Row>
                    </>
                  ) : (
                    <p className="text-body-s text-warm-500 italic">Aucun wallet associé.</p>
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
                <h2 className="text-body-s font-bold text-ink">Activité — courses</h2>
              </div>
              <div className="px-5 py-3">
                <div className="grid gap-2 grid-cols-2 md:grid-cols-4">
                  <KpiBox label="Total" value={data.stats.courses_total} />
                  <KpiBox label="Livrées" value={data.stats.courses_delivered} tone="success" />
                  <KpiBox label="En cours" value={data.stats.courses_in_progress} />
                  <KpiBox label="Annulées" value={data.stats.courses_cancelled} tone="danger" />
                </div>
                <p className="text-caption text-warm-500 mt-3">
                  Dernière course : {formatDate(data.stats.last_course_at)}
                </p>
              </div>
            </section>

            {/* Notes internes */}
            <SupportNotesPanel
              notableType="user"
              notableId={data.marchant.user.id}
              title="Notes internes (marchand)"
            />

            {/* Zone de danger */}
            {canManageMarchant && (
              <section className="bg-danger-bg border border-airmess-red/30 rounded-lg px-5 py-4">
                <h2 className="text-body font-bold text-airmess-red mb-1">Zone de danger</h2>
                <p className="text-body-s text-airmess-red/80 mb-3">
                  La suppression est définitive. Elle est impossible si le marchand a déjà des
                  courses — préfère la suspension.
                </p>
                <AdminButton variant="danger" onClick={() => setConfirmAction('delete')}>
                  Supprimer définitivement
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
