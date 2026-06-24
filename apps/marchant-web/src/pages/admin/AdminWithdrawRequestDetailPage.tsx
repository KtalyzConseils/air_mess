import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import AdminHeader from '../../components/AdminHeader'
import {
  fetchWithdrawRequest,
  approveWithdrawRequest,
  rejectWithdrawRequest,
  markWithdrawRequestPaid,
  type WithdrawRequestRecentTx,
} from '../../api/admin'

const STATUS_BADGE: Record<string, { label: string; classes: string }> = {
  pending:   { label: 'En attente', classes: 'bg-amber-100 text-amber-800' },
  approved:  { label: 'Approuvée',  classes: 'bg-green-100 text-green-800' },
  rejected:  { label: 'Rejetée',    classes: 'bg-red-100 text-red-800' },
  cancelled: { label: 'Annulée',    classes: 'bg-gray-200 text-gray-700' },
}

const TX_META: Record<WithdrawRequestRecentTx['type'], { label: string; icon: string; positive: boolean }> = {
  deposit:      { label: 'Recharge',       icon: '⬇️', positive: true  },
  withdraw:     { label: 'Retrait',        icon: '⬆️', positive: false },
  pickup_debit: { label: 'Débit caution',  icon: '📤', positive: false },
  refund:       { label: 'Remboursement',  icon: '↩️', positive: true  },
  earning:      { label: 'Gain de course', icon: '🏆', positive: true  },
}

function formatFcfa(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—'
  return n.toLocaleString('fr-FR') + ' FCFA'
}

function formatDateTime(value: string | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
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

  const approveMutation = useMutation({
    mutationFn: () => approveWithdrawRequest(Number(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'withdraw-requests'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'withdraw-requests', 'detail', id] })
    },
    onError: (err) => {
      const message =
        err instanceof AxiosError
          ? err.response?.data?.message ?? "Erreur lors de l'approbation."
          : 'Erreur inattendue.'
      window.alert(`⚠️ ${message}`)
    },
  })

  const rejectMutation = useMutation({
    mutationFn: (reason: string) => rejectWithdrawRequest(Number(id), reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'withdraw-requests'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'withdraw-requests', 'detail', id] })
      setShowRejectPanel(false)
      setRejectReason('')
    },
    onError: (err) => {
      const message =
        err instanceof AxiosError
          ? err.response?.data?.message ?? 'Erreur lors du rejet.'
          : 'Erreur inattendue.'
      window.alert(`⚠️ ${message}`)
    },
  })

  const markPaidMutation = useMutation({
    mutationFn: (reference: string) => markWithdrawRequestPaid(Number(id), reference),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'withdraw-requests'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'withdraw-requests', 'detail', id] })
      setShowMarkPaidPanel(false)
      setPayoutReference('')
    },
    onError: (err) => {
      const message =
        err instanceof AxiosError
          ? err.response?.data?.message ?? 'Erreur lors de la confirmation.'
          : 'Erreur inattendue.'
      window.alert(`⚠️ ${message}`)
    },
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminHeader />
        <main className="max-w-4xl mx-auto p-6">
          <div className="text-center py-20 text-gray-500">Chargement…</div>
        </main>
      </div>
    )
  }

  if (isError || !data) {
    const msg = error instanceof AxiosError ? error.response?.data?.message : null
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminHeader />
        <main className="max-w-4xl mx-auto p-6">
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            <p className="text-red-600 font-semibold">Demande introuvable</p>
            <p className="text-sm text-gray-500 mt-2">{msg ?? 'Erreur de chargement.'}</p>
            <button
              onClick={() => navigate('/admin/withdraw-requests')}
              className="mt-4 px-4 py-2 bg-airmess-dark text-white rounded-lg text-sm hover:opacity-90"
            >
              ← Retour à la liste
            </button>
          </div>
        </main>
      </div>
    )
  }

  const { request, active_course, recent_transactions, past_requests } = data
  const { driver } = request
  const wallet = driver.wallet
  const statusMeta = STATUS_BADGE[request.status] ?? { label: request.status, classes: 'bg-gray-100 text-gray-700' }

  const isBusy = !!active_course
  const balanceShort = wallet ? wallet.balance < request.amount_fcfa : false
  const isPending = request.status === 'pending'
  const busyBlocksApproval = isPending && isBusy
  const isApproved = request.status === 'approved'
  const isPaid = request.paid_at !== null
  const canMarkPaid = isApproved && !isPaid

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />
      <main className="max-w-4xl mx-auto p-4 md:p-6">
        {/* Fil d'Ariane */}
        <button
          onClick={() => navigate('/admin/withdraw-requests')}
          className="text-sm text-gray-500 hover:text-airmess-dark mb-4 inline-flex items-center gap-1"
        >
          ← Retour à la liste
        </button>

        {/* Bandeaux d'alerte (pending uniquement) */}
        {busyBlocksApproval && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4 text-sm text-red-800">
            ⚠️ <strong>{driver.first_name}</strong> est actuellement en course (#{active_course.reference}).
            L'approbation sera refusée tant que la course n'est pas terminée.
          </div>
        )}
        {isPending && !isBusy && balanceShort && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-4 text-sm text-amber-800">
            ⚠️ La balance actuelle ({formatFcfa(wallet?.balance ?? 0)}) est inférieure au montant demandé.
            L'approbation échouera. Demande à revoir.
          </div>
        )}

        {/* Bandeau "à virer" : demande approuvée mais pas encore marquée comme payée */}
        {canMarkPaid && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-4 text-sm text-blue-900">
            🏦 Le wallet du livreur a été débité. <strong>Effectuez le virement</strong> de{' '}
            {formatFcfa(request.amount_fcfa)} sur{' '}
            {request.target_method === 'momo' ? 'MoMo' : 'le compte bancaire'}{' '}
            <span className="font-mono">{request.target_account}</span>, puis revenez ici renseigner la référence.
          </div>
        )}

        {/* En-tête */}
        <div className="bg-white rounded-2xl shadow-sm p-5 md:p-6 mb-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-airmess-dark">
                Demande de retrait #{request.id}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Demandée le {formatDateTime(request.created_at)}
              </p>
            </div>
            <span className={`inline-block px-3 py-1 rounded-lg text-sm font-semibold ${statusMeta.classes}`}>
              {statusMeta.label}
            </span>
          </div>

          {/* Métadonnées de décision si déjà tranchée */}
          {request.decided_at && (
            <div className="mt-4 pt-4 border-t border-gray-100 text-sm text-gray-600">
              <div>
                <span className="font-medium text-gray-700">Décidée le :</span> {formatDateTime(request.decided_at)}
              </div>
              {request.decided_by_admin && (
                <div className="mt-1">
                  <span className="font-medium text-gray-700">Par :</span>{' '}
                  {request.decided_by_admin.first_name} {request.decided_by_admin.last_name}
                </div>
              )}
              {request.rejection_reason && (
                <div className="mt-2 bg-red-50 border border-red-100 rounded-lg p-3">
                  <p className="text-xs uppercase text-red-700 font-semibold mb-1">Raison du rejet</p>
                  <p className="text-red-900">{request.rejection_reason}</p>
                </div>
              )}

              {/* Trace du virement réel — preuve traçable du payout (anti-litige). */}
              {isPaid && (
                <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-xs uppercase text-green-700 font-semibold mb-1">✅ Virement effectué</p>
                  <div className="text-sm text-green-900 space-y-0.5">
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
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Grille 2 colonnes md+ */}
        <div className="grid md:grid-cols-2 gap-4 mb-4">
          {/* Livreur */}
          <section className="bg-white rounded-2xl shadow-sm p-5">
            <h3 className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-3">🧍 Livreur</h3>
            <p className="text-lg font-semibold text-airmess-dark">
              {driver.first_name} {driver.last_name}
            </p>
            <p className="text-sm text-gray-600">{driver.user.phone ?? '—'}</p>
            <p className="text-sm text-gray-500">{driver.user.email}</p>
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              {driver.availability_status === 'busy' ? (
                <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded font-medium">🚗 En course</span>
              ) : driver.availability_status === 'available' ? (
                <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded font-medium">✅ Disponible</span>
              ) : (
                <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded font-medium">
                  {driver.availability_status}
                </span>
              )}
              <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded">
                {driver.activation_status}
              </span>
            </div>
            <Link
              to={`/admin/drivers/${driver.id}`}
              className="mt-4 inline-block text-sm text-airmess-dark underline hover:no-underline"
            >
              → Voir profil livreur
            </Link>
          </section>

          {/* État du wallet */}
          <section className="bg-white rounded-2xl shadow-sm p-5">
            <h3 className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-3">💰 État du wallet</h3>
            {wallet ? (
              <>
                <p className="text-3xl font-bold text-airmess-dark">{formatFcfa(wallet.balance)}</p>
                <p className="text-xs text-gray-500 mt-1">Balance actuelle</p>
                <dl className="mt-4 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Total déposé</dt>
                    <dd className="font-medium text-gray-800">{formatFcfa(wallet.total_deposited)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Total retiré</dt>
                    <dd className="font-medium text-gray-800">{formatFcfa(wallet.total_withdrawn)}</dd>
                  </div>
                </dl>
              </>
            ) : (
              <p className="text-sm text-gray-500">Aucun wallet (impossible — anomalie).</p>
            )}
          </section>
        </div>

        {/* Détail de la demande */}
        <section className="bg-white rounded-2xl shadow-sm p-5 mb-4">
          <h3 className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-3">📤 Demande</h3>
          <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <dt className="text-gray-500">Montant à verser</dt>
              <dd className="text-2xl font-bold text-airmess-dark mt-0.5">{formatFcfa(request.amount_fcfa)}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Méthode</dt>
              <dd className="text-base font-medium mt-0.5">
                {request.target_method === 'momo' ? '📱 Mobile Money' : '🏦 Banque'}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-gray-500">Compte / numéro cible</dt>
              <dd className="text-base font-mono font-semibold mt-0.5 break-all">{request.target_account}</dd>
            </div>
          </dl>
        </section>

        {/* Historique transactions */}
        <section className="bg-white rounded-2xl shadow-sm p-5 mb-4">
          <h3 className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-3">
            📜 Historique wallet (10 dernières)
          </h3>
          {recent_transactions.length === 0 ? (
            <p className="text-sm text-gray-500">Aucune transaction.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {recent_transactions.map((tx) => {
                const meta = TX_META[tx.type]
                return (
                  <li key={tx.id} className="py-2 flex items-start justify-between gap-3 text-sm">
                    <div className="flex items-start gap-2 min-w-0">
                      <span className="text-base">{meta.icon}</span>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-800">{meta.label}</p>
                        <p className="text-xs text-gray-500">
                          {formatDateTime(tx.created_at)}
                          {tx.course && <> · course <span className="font-mono">{tx.course.reference}</span></>}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`font-semibold ${meta.positive ? 'text-green-700' : 'text-red-700'}`}>
                        {meta.positive ? '+' : ''}{tx.amount_fcfa.toLocaleString('fr-FR')}
                      </p>
                      <p className="text-xs text-gray-400">solde : {tx.balance_after.toLocaleString('fr-FR')}</p>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        {/* Agrégats retraits passés */}
        <section className="bg-white rounded-2xl shadow-sm p-5 mb-6">
          <h3 className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-3">
            🏦 Historique des retraits du livreur
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
            <div className="bg-green-50 rounded-lg p-3">
              <p className="text-2xl font-bold text-green-700">{past_requests.approved_count}</p>
              <p className="text-xs text-green-700 mt-1">Approuvés</p>
            </div>
            <div className="bg-green-50 rounded-lg p-3">
              <p className="text-base font-bold text-green-700">{formatFcfa(past_requests.approved_total)}</p>
              <p className="text-xs text-green-700 mt-1">Total versé</p>
            </div>
            <div className="bg-red-50 rounded-lg p-3">
              <p className="text-2xl font-bold text-red-700">{past_requests.rejected_count}</p>
              <p className="text-xs text-red-700 mt-1">Rejetés</p>
            </div>
            <div className="bg-gray-100 rounded-lg p-3">
              <p className="text-2xl font-bold text-gray-700">{past_requests.cancelled_count}</p>
              <p className="text-xs text-gray-600 mt-1">Annulés</p>
            </div>
          </div>
        </section>

        {/* Actions — uniquement si pending */}
        {isPending && (
          <section className="bg-white rounded-2xl shadow-sm p-5 sticky bottom-4">
            {!showRejectPanel ? (
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => {
                    if (window.confirm(
                      `Confirmer l'approbation du retrait de ${formatFcfa(request.amount_fcfa)} ?\n\nLe wallet sera débité immédiatement. Vous devrez ensuite effectuer le virement réel sur ${request.target_method === 'momo' ? 'MoMo' : 'le compte bancaire'}.`
                    )) {
                      approveMutation.mutate()
                    }
                  }}
                  disabled={approveMutation.isPending}
                  className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 transition"
                >
                  {approveMutation.isPending ? 'Approbation…' : '✅ Approuver et débiter'}
                </button>
                <button
                  onClick={() => setShowRejectPanel(true)}
                  className="flex-1 bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 transition"
                >
                  ❌ Rejeter…
                </button>
              </div>
            ) : (
              <div>
                <h4 className="font-semibold text-gray-800 mb-2">Raison du rejet</h4>
                <p className="text-xs text-gray-500 mb-3">
                  Le livreur sera notifié avec cette raison. Aucun débit ne sera effectué.
                </p>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="ex: Compte MoMo invalide, fraude suspectée…"
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-airmess-yellow outline-none"
                />
                <div className="flex gap-3 mt-3">
                  <button
                    onClick={() => { setShowRejectPanel(false); setRejectReason('') }}
                    className="flex-1 px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 text-sm font-medium"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={() => rejectMutation.mutate(rejectReason.trim())}
                    disabled={rejectReason.trim().length < 5 || rejectMutation.isPending}
                    className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg font-semibold text-sm hover:bg-red-700 disabled:opacity-50"
                  >
                    {rejectMutation.isPending ? 'Envoi…' : 'Confirmer le rejet'}
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Actions — demande approuvée mais pas encore marquée comme virée */}
        {canMarkPaid && (
          <section className="bg-white rounded-2xl shadow-sm p-5 sticky bottom-4">
            {!showMarkPaidPanel ? (
              <button
                onClick={() => setShowMarkPaidPanel(true)}
                className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
              >
                🏦 Marquer le virement comme effectué…
              </button>
            ) : (
              <div>
                <h4 className="font-semibold text-gray-800 mb-2">Référence du virement</h4>
                <p className="text-xs text-gray-500 mb-3">
                  Saisissez la référence retournée par {request.target_method === 'momo' ? 'MoMo' : 'votre banque'}{' '}
                  (numéro de transaction, identifiant unique). Le livreur sera notifié.
                </p>
                <input
                  type="text"
                  value={payoutReference}
                  onChange={(e) => setPayoutReference(e.target.value)}
                  placeholder="ex: MP240624.1234.A56789"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-airmess-yellow outline-none"
                />
                <div className="flex gap-3 mt-3">
                  <button
                    onClick={() => { setShowMarkPaidPanel(false); setPayoutReference('') }}
                    className="flex-1 px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 text-sm font-medium"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={() => markPaidMutation.mutate(payoutReference.trim())}
                    disabled={payoutReference.trim().length < 3 || markPaidMutation.isPending}
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold text-sm hover:bg-blue-700 disabled:opacity-50"
                  >
                    {markPaidMutation.isPending ? 'Envoi…' : 'Confirmer le virement'}
                  </button>
                </div>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  )
}
