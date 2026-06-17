import { useState, type ReactNode } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import AdminHeader from '../../components/AdminHeader'
import KpiCard from '../../components/KpiCard'
import { fetchIndividual, suspendIndividual, reactivateIndividual } from '../../api/admin'

function formatDate(value: string | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}

function formatDateTime(value: string | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between py-2 border-b border-gray-50 last:border-0">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-airmess-dark text-right">{children}</span>
    </div>
  )
}

const PAYMENT_STATUS_BADGE: Record<string, { label: string; classes: string }> = {
  paid:       { label: 'Payé',      classes: 'bg-green-100 text-green-800' },
  pending:    { label: 'En attente', classes: 'bg-amber-100 text-amber-800' },
  processing: { label: 'En cours',  classes: 'bg-blue-100 text-blue-800' },
  failed:     { label: 'Échoué',    classes: 'bg-red-100 text-red-800' },
  refunded:   { label: 'Remboursé', classes: 'bg-gray-200 text-gray-700' },
}

export default function AdminIndividualDetailPage() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const [showSuspendModal, setShowSuspendModal] = useState(false)
  const [suspendReason, setSuspendReason] = useState('')

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
      ? (lastError.response?.data as { message?: string } | undefined)?.message ?? 'Erreur lors de l\'action.'
      : null

  const isSuspended = data?.individual.subscription_status === 'suspended' || data?.individual.user.is_active === false

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />
      <main className="max-w-4xl mx-auto p-4 md:p-6">
        <Link to="/admin/individuals" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-airmess-dark mb-4">
          ← Retour aux particuliers
        </Link>

        {isLoading && <p className="text-gray-500">Chargement…</p>}
        {isError && <p className="text-red-600">Particulier introuvable.</p>}

        {data && (
          <>
            <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-2xl font-bold text-airmess-dark">
                  {data.individual.first_name} {data.individual.last_name}
                </h2>
                {isSuspended ? (
                  <span className="inline-block px-2 py-1 rounded text-xs font-semibold bg-red-100 text-red-800">
                    Suspendu
                  </span>
                ) : data.individual.subscription_status === 'active' ? (
                  <span className="inline-block px-2 py-1 rounded text-xs font-semibold bg-green-100 text-green-800">
                    Abonné · {data.individual.subscription_plan}
                  </span>
                ) : (
                  <span className="inline-block px-2 py-1 rounded text-xs font-semibold bg-blue-100 text-blue-800">
                    🆓 Quota gratuit
                  </span>
                )}
              </div>

              <div className="flex gap-2">
                {isSuspended ? (
                  <button
                    onClick={() => reactivateMutation.mutate()}
                    disabled={reactivateMutation.isPending}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg font-semibold text-sm hover:bg-green-700 disabled:opacity-50"
                  >
                    {reactivateMutation.isPending ? 'Réactivation…' : '✓ Réactiver'}
                  </button>
                ) : (
                  <button
                    onClick={() => setShowSuspendModal(true)}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold text-sm hover:bg-red-700"
                  >
                    🚫 Suspendre
                  </button>
                )}
              </div>
            </div>

            {actionError && (
              <p className="text-sm text-red-600 mb-3">⚠️ {actionError}</p>
            )}

            <div className="grid gap-6 md:grid-cols-2">
              <section className="bg-white rounded-2xl shadow-sm p-6">
                <h3 className="font-semibold text-airmess-dark mb-3">Identité & contact</h3>
                <Row label="Email">{data.individual.user.email}</Row>
                <Row label="Téléphone">{data.individual.user.phone ?? '—'}</Row>
                <Row label="Compte actif">{data.individual.user.is_active ? '✓ Oui' : '✗ Non'}</Row>
              </section>

              <section className="bg-white rounded-2xl shadow-sm p-6">
                <h3 className="font-semibold text-airmess-dark mb-3">Abonnement</h3>
                <Row label="Plan">{data.individual.subscription_plan ?? '— (gratuit)'}</Row>
                <Row label="Statut">{data.individual.subscription_status ?? 'free'}</Row>
                <Row label="Début">{formatDate(data.individual.subscription_started_at)}</Row>
                <Row label="Prochain renouvellement">{formatDate(data.individual.subscription_next_billing_at)}</Row>
              </section>

              <section className="bg-white rounded-2xl shadow-sm p-6 md:col-span-2">
                <h3 className="font-semibold text-airmess-dark mb-3">Quota mensuel</h3>
                <Row label="Utilisé">
                  {data.individual.monthly_courses_used}/{data.individual.monthly_courses_limit}
                </Row>
              </section>
            </div>

            <section className="mt-6">
              <h3 className="font-semibold text-airmess-dark mb-3">Activité — courses</h3>
              <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
                <KpiCard label="Total" value={data.stats.courses_total} accent="dark" />
                <KpiCard label="Livrées" value={data.stats.courses_delivered} accent="yellow" />
                <KpiCard label="En cours" value={data.stats.courses_in_progress} accent="gray" />
                <KpiCard label="Annulées/Échec" value={data.stats.courses_cancelled} accent="red" />
              </div>
              <p className="text-sm text-gray-600 mt-3">
                Dernière course : {formatDate(data.stats.last_course_at)}
              </p>
            </section>

            <section className="mt-6 bg-white rounded-2xl shadow-sm p-6">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold text-airmess-dark">💳 Paiements à la course (one-shot)</h3>
                <div className="text-right text-sm">
                  <p className="font-bold text-airmess-dark">
                    {data.one_shot_summary.total_paid_fcfa.toLocaleString('fr-FR')} FCFA
                  </p>
                  <p className="text-xs text-gray-500">{data.one_shot_summary.count_paid} paiement(s) réussi(s)</p>
                </div>
              </div>

              {data.one_shot_payments.length === 0 ? (
                <p className="text-sm text-gray-500">Aucun paiement à la course.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="text-gray-500 uppercase text-xs border-b border-gray-100">
                    <tr>
                      <th className="text-left py-2">Date</th>
                      <th className="text-left py-2">Montant</th>
                      <th className="text-left py-2">Statut</th>
                      <th className="text-left py-2">Provider</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {data.one_shot_payments.map((p) => {
                      const badge = PAYMENT_STATUS_BADGE[p.status] ?? { label: p.status, classes: 'bg-gray-100 text-gray-700' }
                      return (
                        <tr key={p.id}>
                          <td className="py-2">{formatDateTime(p.paid_at ?? p.created_at)}</td>
                          <td className="py-2 font-medium">{p.amount_fcfa.toLocaleString('fr-FR')} FCFA</td>
                          <td className="py-2">
                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${badge.classes}`}>
                              {badge.label}
                            </span>
                          </td>
                          <td className="py-2 text-gray-600">{p.provider}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </section>
          </>
        )}
      </main>

      {/* Modal de suspension */}
      {showSuspendModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
            <h3 className="text-lg font-bold text-airmess-dark">Suspendre ce particulier</h3>
            <p className="text-sm text-gray-600 mt-2 mb-4">
              L'accès au compte sera coupé immédiatement (tokens révoqués).
              Renseignez la raison pour traçabilité.
            </p>
            <textarea
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              placeholder="ex: comportement abusif, plaintes répétées…"
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-airmess-yellow outline-none"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => {
                  setShowSuspendModal(false)
                  setSuspendReason('')
                }}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 text-sm font-medium"
              >
                Annuler
              </button>
              <button
                onClick={() => suspendMutation.mutate()}
                disabled={suspendReason.trim().length < 5 || suspendMutation.isPending}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg font-semibold text-sm hover:bg-red-700 disabled:opacity-50"
              >
                {suspendMutation.isPending ? 'Suspension…' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
