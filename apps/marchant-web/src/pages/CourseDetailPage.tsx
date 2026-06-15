import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import AppHeader from '../components/AppHeader'
import AdminHeader from '../components/AdminHeader'
import StatusBadge from '../components/StatusBadge'
import Timeline from '../components/Timeline'
import { fetchCourse, fetchCourseHistory, cancelCourse } from '../api/courses'
import { useAuthStore } from '../stores/authStore'

export default function CourseDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.type === 'admin'
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [cancelReason, setCancelReason] = useState('')

  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  async function copy(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedKey(key)
      setTimeout(() => setCopiedKey(null), 2000)
    } catch {
      alert('Impossible de copier — copie manuelle requise.')
    }
  }


  const courseQuery = useQuery({
    queryKey: ['course', id],
    queryFn: () => fetchCourse(id!),
    enabled: !!id,
  })

  const historyQuery = useQuery({
    queryKey: ['course', id, 'history'],
    queryFn: () => fetchCourseHistory(id!),
    enabled: !!id,
  })

  const cancelMutation = useMutation({
    mutationFn: () => cancelCourse(id!, cancelReason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course', id] })
      queryClient.invalidateQueries({ queryKey: ['course', id, 'history'] })
      queryClient.invalidateQueries({ queryKey: ['courses'] })
      setConfirmCancel(false)
    },
  })

  if (courseQuery.isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        {isAdmin ? <AdminHeader /> : <AppHeader />}
        <main className="max-w-5xl mx-auto p-6 text-gray-500">Chargement...</main>
      </div>
    )
  }

  if (courseQuery.error) {
    return (
      <div className="min-h-screen bg-gray-50">
        {isAdmin ? <AdminHeader /> : <AppHeader />}
        <main className="max-w-5xl mx-auto p-6 text-red-600">
          Erreur de chargement. <button onClick={() => navigate(-1)} className="underline">Retour</button>
        </main>
      </div>
    )
  }

  const course = courseQuery.data!
  const isTerminal = ['delivered', 'cancelled', 'failed'].includes(course.status)
  const canCancel = !isTerminal && !['picked_up', 'at_dropoff'].includes(course.status)

  // Lien WhatsApp pré-rempli pour le destinataire : suivi + code de livraison.
  const trackingUrl = `${window.location.origin}/t/${course.tracking_token}`
  const waMessage =
    `Bonjour, votre colis Air Mess (réf. ${course.reference}) arrive.\n` +
    `Suivez la livraison ici : ${trackingUrl}\n` +
    `🔑 Code de livraison à remettre au livreur : ${course.delivery_code}`
  const waLink = `https://wa.me/${waNumber(course.destination_phone)}?text=${encodeURIComponent(waMessage)}`

  const apiError =
    cancelMutation.error instanceof AxiosError
      ? cancelMutation.error.response?.data?.message ?? 'Erreur.'
      : null

  return (
    <div className="min-h-screen bg-gray-50">
      {isAdmin ? <AdminHeader /> : <AppHeader />}

      <main className="max-w-5xl mx-auto p-6">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <Link to={isAdmin ? '/admin/courses' : '/dashboard'} className="text-sm text-gray-500 hover:underline">
              {isAdmin ? '← Retour aux courses' : '← Retour au tableau de bord'}
            </Link>
            <div className="flex items-center gap-3 mt-2">
              <h2 className="text-2xl font-bold text-airmess-dark font-mono">{course.reference}</h2>
              <StatusBadge status={course.status} />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() =>
                copy(`${window.location.origin}/t/${course.tracking_token}`, 'link')
              }
              className="text-sm px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 flex items-center gap-1"
            >
              {copiedKey === 'link' ? '✓ Copié !' : '🔗 Copier le lien de suivi'}
            </button>

            {canCancel && (
              <button
                onClick={() => setConfirmCancel(true)}
                className="text-airmess-red hover:underline text-sm"
              >
                Annuler la course
              </button>
            )}
          </div>
        </div>

        {/* ===== Panneau OPS (admin uniquement) ===== */}
        {isAdmin && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-5 mb-6">
            <h4 className="text-xs uppercase tracking-wider text-indigo-700 font-semibold mb-3">
              🛠️ Vue ops — informations internes
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-3 text-sm">
              {/* Expéditeur */}
              <div>
                <p className="text-gray-500">Expéditeur</p>
                <p className="font-medium text-airmess-dark">{course.sender?.name ?? course.origin_name}</p>
                <p className="text-xs text-gray-500">{course.sender?.phone ?? '—'}</p>
              </div>

              {/* Livreur + lien fiche */}
              <div>
                <p className="text-gray-500">Livreur</p>
                {course.driver ? (
                  <>
                    <Link
                      to={`/admin/drivers/${course.driver.id}`}
                      className="font-medium text-airmess-dark hover:underline"
                    >
                      {course.driver.user.name}
                    </Link>
                    <p className="text-xs text-gray-500">{course.driver.user.phone}</p>
                  </>
                ) : (
                  <p className="font-medium text-gray-400 italic">Non assigné</p>
                )}
              </div>

              {/* Marge transporteur */}
              <div>
                <p className="text-gray-500">Marge transporteur</p>
                <p className="font-medium text-airmess-dark">
                  {(course.delivery_fee - course.driver_earnings).toLocaleString('fr-FR')} FCFA
                </p>
                <p className="text-xs text-gray-500">
                  {course.delivery_fee.toLocaleString('fr-FR')} − {course.driver_earnings.toLocaleString('fr-FR')}
                </p>
              </div>
            </div>

            {/* Codes opérationnels (support) */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm mt-4 pt-4 border-t border-indigo-200">
              <div>
                <p className="text-gray-500">Code de retrait</p>
                <p className="font-mono font-bold text-airmess-dark tracking-widest text-lg">{course.pickup_code}</p>
              </div>
              <div>
                <p className="text-gray-500">Code de livraison</p>
                <p className="font-mono font-bold text-airmess-dark tracking-widest text-lg">{course.delivery_code}</p>
              </div>
            </div>

            {/* Jalons temporels + durées */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-3 text-sm mt-4 pt-4 border-t border-indigo-200">
              <div>
                <p className="text-gray-500">Créée</p>
                <p className="font-medium text-airmess-dark">{fmtDateTime(course.created_at)}</p>
              </div>
              <div>
                <p className="text-gray-500">Attribuée</p>
                <p className="font-medium text-airmess-dark">{fmtDateTime(course.assigned_at)}</p>
                <p className="text-xs text-gray-500">délai : {duration(course.created_at, course.assigned_at)}</p>
              </div>
              <div>
                <p className="text-gray-500">Récupérée</p>
                <p className="font-medium text-airmess-dark">{fmtDateTime(course.picked_up_at)}</p>
              </div>
              <div>
                <p className="text-gray-500">Livrée</p>
                <p className="font-medium text-airmess-dark">{fmtDateTime(course.delivered_at)}</p>
                <p className="text-xs text-gray-500">transit : {duration(course.picked_up_at, course.delivered_at)}</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Colonne gauche : infos course */}
          <div className="lg:col-span-2 space-y-4">
            {/* Origine */}
            <Section title="Origine">
              <KV label="Expéditeur" value={course.origin_name} />
              <KV label="Quartier" value={`${course.origin_quartier}, ${course.origin_city}`} />
            </Section>

            {/* Codes de validation — affiché dès qu'un livreur est assigné */}
            {course.driver && !isTerminal && (
              <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-airmess-yellow">
                <h4 className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-3">
                  🔑 Codes de validation
                </h4>

                <p className="text-xs text-gray-600 mb-3">
                  Donne le <strong>code de retrait</strong> au livreur quand il arrive.
                  Le <strong>code de livraison</strong> est pour le destinataire (visible sur son lien de suivi).
                </p>

                {/* Code de retrait — gros et copiable */}
                <div className="bg-airmess-yellow/10 rounded-lg p-4 flex items-center justify-between mb-3">
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-semibold">Code de retrait</p>
                    <p className="text-3xl font-bold font-mono text-airmess-dark tracking-[0.5em] mt-1">
                      {course.pickup_code}
                    </p>
                  </div>
                  <button
                    onClick={() => copy(course.pickup_code, 'pickup')}
                    className="px-3 py-2 rounded-lg bg-airmess-dark text-white text-sm font-semibold hover:bg-gray-700"
                  >
                    {copiedKey === 'pickup' ? '✓ Copié' : '📋 Copier'}
                  </button>
                </div>

                {/* Code de livraison — discret */}
                <div className="bg-gray-50 rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Code de livraison (destinataire)</p>
                    <p className="text-lg font-bold font-mono text-airmess-dark tracking-widest mt-0.5">
                      {course.delivery_code}
                    </p>
                  </div>
                  <button
                    onClick={() => copy(course.delivery_code, 'delivery')}
                    className="text-xs text-gray-500 hover:text-airmess-dark underline"
                  >
                    {copiedKey === 'delivery' ? '✓ Copié' : 'Copier'}
                  </button>
                </div>

                {/* Envoi WhatsApp au destinataire : lien de suivi + code de livraison */}
                <a
                  href={waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 w-full flex items-center justify-center gap-2 bg-[#25D366] text-white font-semibold py-2.5 rounded-lg hover:opacity-90"
                >
                  <span className="text-lg">📲</span>
                  Envoyer au destinataire (WhatsApp)
                </a>
              </div>
            )}

            {/* Destination */}
            <Section title="Destination">
              <KV label="Destinataire" value={course.destination_name} />
              <KV label="Téléphone" value={course.destination_phone} />
              <KV label="Quartier" value={`${course.destination_quartier}, ${course.destination_city}`} />
            </Section>

            {/* Colis */}
            <Section title="Colis">
              <KV label="Description" value={course.package_description} />
              <KV label="Taille" value={course.package_size} />
              <KV label="Catégorie" value={course.package_category?.name ?? '—'} />
              <KV label="Urgence" value={course.urgency === 'express' ? '⚡ Express' : 'Standard'} />
            </Section>

            {/* Tarification */}
            <Section title="Tarification & encaissement">
              <KV label="Frais de livraison" value={`${course.delivery_fee.toLocaleString('fr-FR')} FCFA`} />
              <KV label="Gain livreur" value={`${course.driver_earnings.toLocaleString('fr-FR')} FCFA`} />
              {course.has_collection && (
                <>
                  <KV label="À encaisser" value={`${course.collection_amount?.toLocaleString('fr-FR')} FCFA`} />
                  <KV label="Méthode" value={course.collection_method ?? '—'} />
                </>
              )}
            </Section>
          </div>

          {/* Colonne droite : livreur + timeline */}
          <div className="space-y-4">
            <Section title="Livreur">
              {course.driver ? (
                <>
                  <KV label="Nom" value={course.driver.user.name} />
                  <KV label="Téléphone" value={course.driver.user.phone} />
                </>
              ) : (
                <p className="text-sm text-gray-500 italic">Aucun livreur assigné</p>
              )}
            </Section>

            <Section title="Historique">
              {historyQuery.isLoading ? (
                <p className="text-sm text-gray-500">Chargement...</p>
              ) : (
                <Timeline items={historyQuery.data ?? []} />
              )}
            </Section>
          </div>
        </div>

        {/* Modal d'annulation */}
        {confirmCancel && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
              <h3 className="text-lg font-bold text-airmess-dark">Annuler cette course ?</h3>
              <p className="text-sm text-gray-500 mt-2">
                Cette action est définitive. Donne un motif pour l'historique.
              </p>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={3}
                className="w-full mt-3 px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-airmess-yellow"
                placeholder="ex: Client a changé d'avis"
              />
              {apiError && <p className="text-red-600 text-sm mt-2">{apiError}</p>}
              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => setConfirmCancel(false)}
                  className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50"
                >
                  Retour
                </button>
                <button
                  onClick={() => cancelMutation.mutate()}
                  disabled={cancelMutation.isPending}
                  className="px-4 py-2 rounded-lg bg-airmess-red text-white disabled:opacity-50"
                >
                  {cancelMutation.isPending ? 'Annulation...' : 'Confirmer l\'annulation'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

// ===== Helpers de présentation =====
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-5">
      <h4 className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-3">{title}</h4>
      <dl className="space-y-2">{children}</dl>
    </div>
  )
}

function KV({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between items-start gap-3 text-sm">
      <dt className="text-gray-500 flex-shrink-0">{label}</dt>
      <dd className="text-airmess-dark font-medium text-right break-words">{value}</dd>
    </div>
  )
}

// Formate une date ISO en "12/06 14:30"
function fmtDateTime(v?: string | null): string {
  if (!v) return '—'
  return new Date(v).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  })
}

// Durée entre deux instants : "45 min" ou "2 h 05"
function duration(from?: string | null, to?: string | null): string {
  if (!from || !to) return '—'
  const ms = new Date(to).getTime() - new Date(from).getTime()
  if (ms < 0) return '—'
  const min = Math.round(ms / 60000)
  if (min < 60) return `${min} min`
  return `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')}`
}

// Normalise un numéro pour wa.me : chiffres seuls, + préfixe Bénin (229) si numéro local.
function waNumber(phone: string): string {
  let d = phone.replace(/\D/g, '')
  if (d.startsWith('00')) d = d.slice(2) // 00229... → 229...
  if (d.length <= 8) d = '229' + d       // numéro local béninois (8 chiffres) → +229
  return d
}
