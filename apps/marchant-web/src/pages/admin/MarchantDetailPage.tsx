import { useState, type ReactNode } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import AdminHeader from '../../components/AdminHeader'
import MarchantStatusBadge from '../../components/MarchantStatusBadge'
import KpiCard from '../../components/KpiCard'
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
  supermarche: '🛒 Supermarché',
  restaurant:  '🍽️ Restaurant',
  boutique:    '🛍️ Boutique',
  pharmacie:   '💊 Pharmacie',
  ecommerce:   '📦 E-commerce',
  autre:       '🏷️ Autre',
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
    title: '✅ Valider ce marchand ?',
    description: 'Le marchand pourra immédiatement créer des courses.',
    confirmLabel: 'Valider l\'inscription',
    confirmVariant: 'primary',
    reasonRequired: false,
  },
  reactivate: {
    title: '▶️ Réactiver ce marchand ?',
    description: 'Il pourra de nouveau se connecter et créer des courses.',
    confirmLabel: 'Réactiver',
    confirmVariant: 'success',
    reasonRequired: false,
  },
  suspend: {
    title: '⏸️ Suspendre ce marchand ?',
    description: 'Le compte sera désactivé. Le marchand sera déconnecté immédiatement et ne pourra plus créer de courses.',
    confirmLabel: 'Suspendre',
    confirmVariant: 'danger',
    reasonRequired: true,
    reasonPlaceholder: 'ex: Documents manquants, suspicion de fraude…',
  },
  reject: {
    title: '❌ Refuser l\'inscription ?',
    description: 'L\'inscription sera marquée comme refusée. Le marchand sera déconnecté.',
    confirmLabel: 'Refuser l\'inscription',
    confirmVariant: 'danger',
    reasonRequired: true,
    reasonPlaceholder: 'ex: Documents non conformes, doublon…',
  },
  delete: {
    title: '🗑️ Supprimer définitivement ?',
    description: 'Cette action est irréversible. Le compte et toutes ses données seront supprimés.',
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
    <div className="flex justify-between py-2 border-b border-gray-50 last:border-0">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-airmess-dark text-right">{children}</span>
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
  // Les actions sur le marchand (valider / suspendre / refuser / supprimer) sont
  // réservées au rôle commercial (support ne fait que lire et ajouter des notes).
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
        validate:   validateMut.isPending,
        reactivate: reactivateMut.isPending,
        suspend:    suspendMut.isPending,
        reject:     rejectMut.isPending,
        delete:     deleteMut.isPending,
      }[confirmAction]
    : false

  const config = confirmAction ? CONFIRM_CONFIG[confirmAction] : null

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />
      <main className="max-w-4xl mx-auto p-4 md:p-6">
        <Link
          to="/admin/marchants"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-airmess-dark mb-4"
        >
          ← Retour aux marchands
        </Link>

        {isLoading && <p className="text-gray-500">Chargement…</p>}
        {isError && <p className="text-red-600">Marchand introuvable.</p>}

        {data && (
          <>
            {/* En-tête */}
            <div className="flex items-center gap-3 mb-6">
              <h2 className="text-2xl font-bold text-airmess-dark">
                {data.marchant.raison_sociale}
              </h2>
              <MarchantStatusBadge status={data.marchant.subscription_status} />
              {!data.marchant.validated_at && (
                <span className="text-xs text-amber-600 font-semibold">• à valider</span>
              )}
              {canManageMarchant && (
                <div className="ml-auto flex gap-2">
                  {data.marchant.subscription_status === 'suspended' && (
                    <button
                      onClick={() => setConfirmAction('reactivate')}
                      className="bg-green-600 text-white font-semibold px-4 py-2 rounded-lg hover:opacity-90 text-sm"
                    >
                      ▶️ Réactiver
                    </button>
                  )}

                  {!data.marchant.validated_at && data.marchant.subscription_status !== 'churned' && (
                    <>
                      <button
                        onClick={() => setConfirmAction('validate')}
                        className="bg-airmess-yellow text-airmess-dark font-bold px-4 py-2 rounded-lg hover:opacity-90 text-sm"
                      >
                        ✅ Valider l'inscription
                      </button>
                      <button
                        onClick={() => setConfirmAction('reject')}
                        className="bg-white border border-gray-300 text-gray-700 font-semibold px-4 py-2 rounded-lg hover:bg-gray-50 text-sm"
                      >
                        ❌ Refuser
                      </button>
                    </>
                  )}

                  {data.marchant.validated_at && data.marchant.subscription_status === 'active' && (
                    <button
                      onClick={() => setConfirmAction('suspend')}
                      className="bg-airmess-red text-white font-semibold px-4 py-2 rounded-lg hover:opacity-90 text-sm"
                    >
                      ⏸️ Suspendre
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Zone de danger — uniquement pour le commercial */}
            {canManageMarchant && (
              <section className="my-8 border border-red-200 rounded-2xl p-6 bg-red-50">
                <h3 className="font-semibold text-red-700 mb-1">Zone de danger</h3>
                <p className="text-sm text-red-600 mb-4">
                  La suppression est définitive. Elle est impossible si le marchand a déjà des courses
                  (suspendez-le plutôt).
                </p>
                <button
                  onClick={() => setConfirmAction('delete')}
                  className="bg-red-600 text-white font-semibold px-4 py-2 rounded-lg hover:opacity-90 text-sm"
                >
                  Supprimer définitivement
                </button>
              </section>
            )}

            <div className="grid gap-6 md:grid-cols-2">
              {/* Carte 1 : identité & contact */}
              <section className="bg-white rounded-2xl shadow-sm p-6">
                <h3 className="font-semibold text-airmess-dark mb-3">Identité & contact</h3>
                <Row label="Secteur">{SECTEUR_LABEL[data.marchant.secteur_activite] ?? data.marchant.secteur_activite}</Row>
                <Row label="IFU / RCCM">{data.marchant.ifu_rccm ?? '—'}</Row>
                <Row label="Responsable">{data.marchant.user.name}</Row>
                <Row label="Email">{data.marchant.user.email}</Row>
                <Row label="Téléphone">{data.marchant.user.phone ?? '—'}</Row>
              </section>

              {/* Carte 2 : wallet (remplace l'ancienne carte abonnement) */}
              <section className="bg-white rounded-2xl shadow-sm p-6">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h3 className="font-semibold text-airmess-dark">💰 Wallet</h3>
                  {isSuperAdmin && data.marchant.user.wallet && (
                    <button
                      onClick={() => setWalletAdjustOpen(true)}
                      className="text-xs px-3 py-1.5 rounded border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium"
                    >
                      ⚙️ Ajuster…
                    </button>
                  )}
                </div>
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
                  <p className="text-sm text-gray-500">Aucun wallet associé.</p>
                )}
              </section>
            </div>

            {/* Modal d'ajustement wallet (super-admin uniquement) */}
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

            {/* Stats de courses */}
            <section className="mt-6">
              <h3 className="font-semibold text-airmess-dark mb-3">Activité — courses</h3>
              <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
                <KpiCard label="Total" value={data.stats.courses_total} accent="dark" />
                <KpiCard label="Livrées" value={data.stats.courses_delivered} accent="yellow" />
                <KpiCard label="En cours" value={data.stats.courses_in_progress} accent="gray" />
                <KpiCard label="Annulées" value={data.stats.courses_cancelled} accent="red" />
              </div>
              <p className="text-xs text-gray-400 mt-3">
                Dernière course : {formatDate(data.stats.last_course_at)}
              </p>
            </section>

            {/* Notes internes — tous les rôles admin peuvent lire/écrire */}
            <section className="mt-6">
              <SupportNotesPanel
                notableType="user"
                notableId={data.marchant.user.id}
                title="📝 Notes internes (marchand)"
              />
            </section>
          </>
        )}
      </main>

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
    </div>
  )
}
