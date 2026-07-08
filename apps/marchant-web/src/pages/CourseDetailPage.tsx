import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import { useTranslation } from 'react-i18next'
import AppHeader from '../components/AppHeader'
import AdminPageShell from '../components/admin/AdminPageShell'
import IncidentArbitrationPanel from '../components/admin/IncidentArbitrationPanel'
import ReportIncidentModal from '../components/ReportIncidentModal'
import StatusBadge from '../components/StatusBadge'
import Timeline from '../components/Timeline'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import PageEyebrow from '../components/ui/PageEyebrow'
import { AlertTriangleIcon } from '../components/ui/icons'
import { fetchCourse, fetchCourseHistory, cancelCourse } from '../api/courses'
import { markCourseFraud } from '../api/admin'
import { useAuthStore } from '../stores/authStore'
import { hasAdminRole } from '../lib/permissions'

export default function CourseDetailPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.type === 'admin'
  const isSuperAdmin = hasAdminRole(user, 'super')
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [reportIncidentOpen, setReportIncidentOpen] = useState(false)
  // Cas 7 — Modal signaler vol (super-admin uniquement)
  const [fraudOpen, setFraudOpen] = useState(false)
  const [fraudNote, setFraudNote] = useState('')
  const [fraudAck, setFraudAck] = useState(false)

  async function copy(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedKey(key)
      setTimeout(() => setCopiedKey(null), 2000)
    } catch {
      alert(t('common.copyImpossible'))
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

  // Cas 6 — check post-pickup renforcé : la case doit être cochée pour envoyer
  // confirm_post_pickup=true au back.
  const [postPickupAck, setPostPickupAck] = useState(false)

  const cancelMutation = useMutation({
    mutationFn: () =>
      cancelCourse(
        id!,
        cancelReason,
        // Le back n'attend le flag QUE si la course est post-pickup ; sinon undefined
        courseQuery.data && ['picked_up', 'at_dropoff'].includes(courseQuery.data.status)
          ? postPickupAck
          : undefined,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course', id] })
      queryClient.invalidateQueries({ queryKey: ['course', id, 'history'] })
      queryClient.invalidateQueries({ queryKey: ['courses'] })
      setConfirmCancel(false)
      setPostPickupAck(false)
    },
  })

  // Cas 7 — mark-fraud (super-admin uniquement)
  const fraudMutation = useMutation({
    mutationFn: () => markCourseFraud(Number(id), fraudNote.trim()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course', id] })
      queryClient.invalidateQueries({ queryKey: ['course', id, 'history'] })
      queryClient.invalidateQueries({ queryKey: ['courses'] })
      setFraudOpen(false)
      setFraudNote('')
      setFraudAck(false)
    },
  })

  const fraudError =
    fraudMutation.error instanceof AxiosError
      ? fraudMutation.error.response?.data?.message ?? t('common.unexpectedError')
      : null

  // Le wrapper de la page diffère selon le rôle :
  //  - admin : sidebar verticale (AdminPageShell) → cohérent avec le reste de /admin
  //  - autre : header horizontal marchant (AppHeader)
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    isAdmin ? (
      <AdminPageShell>{children}</AdminPageShell>
    ) : (
      <div className="min-h-screen bg-cream">
        <AppHeader />
        {children}
      </div>
    )

  if (courseQuery.isLoading) {
    return (
      <Wrapper>
        <main className="max-w-5xl mx-auto px-4 md:px-6 py-12 text-warm-500">{t('common.loading')}</main>
      </Wrapper>
    )
  }

  if (courseQuery.error) {
    return (
      <Wrapper>
        <main className="max-w-5xl mx-auto px-4 md:px-6 py-12">
          <Card padding="lg" className="text-center bg-danger-bg! border-airmess-red/20! text-airmess-red">
            {t('common.loadingError')}{' '}
            <button onClick={() => navigate(-1)} className="underline font-semibold">{t('common.back')}</button>
          </Card>
        </main>
      </Wrapper>
    )
  }

  const course = courseQuery.data!
  const isTerminal = ['delivered', 'cancelled', 'failed'].includes(course.status)
  // Cas 6 — l'annulation post-pickup est désormais autorisée pour le marchand,
  // avec confirmation renforcée dans le modal (case + facturation expliquée).
  const isPostPickup = ['picked_up', 'at_dropoff'].includes(course.status)
  // On bloque toujours quand la course est en returning_to_sender (déjà en retour).
  const canCancel = !isTerminal && !isAdmin && course.status !== 'returning_to_sender'
  // Signalement marchand : autorisé sur les courses non annulées, y compris après livraison
  // (colis endommagé constaté à réception). Interdit uniquement sur cancelled/failed.
  const canReportIncident = !isAdmin && !['cancelled', 'failed'].includes(course.status)
  const openIncidents = (course.incidents ?? []).filter((i) => i.status === 'open')

  const trackingUrl = `${window.location.origin}/t/${course.tracking_token}`
  const waMessage =
    `Bonjour, votre colis Air Mess (réf. ${course.reference}) arrive.\n` +
    `Suivez la livraison ici : ${trackingUrl}\n` +
    `🔑 Code de livraison à remettre au livreur : ${course.delivery_code}`
  const waLink = `https://wa.me/${waNumber(course.destination_phone)}?text=${encodeURIComponent(waMessage)}`

  const apiError =
    cancelMutation.error instanceof AxiosError
      ? cancelMutation.error.response?.data?.message ?? t('common.unexpectedError')
      : null

  return (
    <Wrapper>
      <main className="max-w-5xl mx-auto px-4 md:px-6 py-8 md:py-12">
        {/* ============================================================
            HERO — référence + statut + actions
            ============================================================ */}
        <div className="mb-6">
          <Link
            to={isAdmin ? '/admin/courses' : '/courses'}
            className="inline-flex items-center gap-1 text-caption text-warm-500 hover:text-ink"
          >
            {t('courses.detail.backToList')}
          </Link>
        </div>

        <PageEyebrow label={t('courses.detail.title')} className="mb-3" />

        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
          <div className="min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-h1 md:text-display-2 text-ink font-mono leading-tight">
                {course.reference}
              </h1>
              <StatusBadge status={course.status} />
            </div>
            <p className="text-body-l text-warm-500 mt-2">
              {course.origin_quartier} → {course.destination_quartier}, {course.destination_city}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => copy(trackingUrl, 'link')}
            >
              {copiedKey === 'link' ? `✓ ${t('common.copied')}` : `🔗 ${t('courses.detail.trackingLink')}`}
            </Button>
            {canReportIncident && (
              <Button variant="ghost" size="sm" onClick={() => setReportIncidentOpen(true)}>
                <span className="text-warning">⚠️ Signaler un incident</span>
              </Button>
            )}
            {canCancel && (
              <Button variant="ghost" size="sm" onClick={() => setConfirmCancel(true)}>
                <span className="text-airmess-red">{t('common.cancel')}</span>
              </Button>
            )}
            {/* Cas 7 — Signaler vol (super-admin uniquement, course non terminale, driver assigné) */}
            {isSuperAdmin && !course.is_fraud && course.driver && !['delivered', 'cancelled'].includes(course.status) && (
              <Button variant="ghost" size="sm" onClick={() => setFraudOpen(true)}>
                <span className="text-airmess-red inline-flex items-center gap-1">
                  <AlertTriangleIcon size={14} />
                  Signaler vol
                </span>
              </Button>
            )}
          </div>
        </div>

        {/* Cas 7 — Bandeau course frauduleuse */}
        {course.is_fraud && (
          <Card variant="signature" padding="lg" className="mb-6 border-l-4 border-l-airmess-red! bg-danger-bg!">
            <div className="flex items-start gap-3">
              <div className="shrink-0 text-airmess-red mt-0.5">
                <AlertTriangleIcon size={24} />
              </div>
              <div className="min-w-0">
                <p className="text-eyebrow uppercase text-airmess-red font-bold mb-1">
                  Course frauduleuse — signalée
                </p>
                <p className="text-body-s text-warm-700">
                  Le livreur a été banni, la caution saisie, et le marchand remboursé.
                  {typeof course.fraud_shortfall_fcfa === 'number' && course.fraud_shortfall_fcfa > 0 && (
                    <>
                      {' '}Manque à combler par la plateforme :{' '}
                      <strong>{course.fraud_shortfall_fcfa.toLocaleString('fr-FR')} FCFA</strong>.
                    </>
                  )}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* ============================================================
            PANNEAU D'ARBITRAGE — admin + incident ouvert
            ============================================================ */}
        {isAdmin && openIncidents.map((incident) => (
          <IncidentArbitrationPanel
            key={incident.id}
            course={course}
            incident={incident}
          />
        ))}

        {/* Bandeau discret côté marchand : « votre signalement est ouvert » */}
        {!isAdmin && openIncidents.length > 0 && (
          <Card variant="default" padding="md" className="mb-6 bg-warning-bg! border-warning/30!">
            <p className="text-eyebrow uppercase text-warning font-bold mb-1">
              ⚖️ Incident en cours de traitement
            </p>
            <p className="text-body-s text-warm-600">
              {openIncidents.length === 1
                ? `Vous avez signalé un incident sur cette course. L'équipe ops l'arbitrera sous 24h ouvrées.`
                : `${openIncidents.length} incidents en cours d'arbitrage sur cette course.`}
            </p>
          </Card>
        )}

        {/* ============================================================
            PANNEAU OPS — admin uniquement
            ============================================================ */}
        {isAdmin && (
          <Card variant="default" padding="lg" className="mb-6 bg-info-bg! border-info/20!">
            <p className="text-eyebrow uppercase text-info font-semibold mb-4">
              🛠️ Vue ops — informations internes
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4 text-body-s">
              <div>
                <p className="text-warm-500">Expéditeur</p>
                <p className="font-bold text-ink">{course.sender?.name ?? course.origin_name}</p>
                <p className="text-caption text-warm-500">{course.sender?.phone ?? '—'}</p>
              </div>

              <div>
                <p className="text-warm-500">Livreur</p>
                {course.driver ? (
                  <>
                    <Link
                      to={`/admin/drivers/${course.driver.id}`}
                      className="font-bold text-ink hover:text-airmess-red"
                    >
                      {course.driver.user.name}
                    </Link>
                    <p className="text-caption text-warm-500">{course.driver.user.phone}</p>
                  </>
                ) : (
                  <p className="font-medium text-warm-400 italic">Non assigné</p>
                )}
              </div>

              <div>
                <p className="text-warm-500">Marge transporteur</p>
                <p className="font-bold text-ink tabular-nums">
                  {(course.delivery_fee - course.driver_earnings).toLocaleString('fr-FR')} FCFA
                </p>
                <p className="text-caption text-warm-500 tabular-nums">
                  {course.delivery_fee.toLocaleString('fr-FR')} − {course.driver_earnings.toLocaleString('fr-FR')}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-3 mt-4 pt-4 border-t border-info/20">
              <div>
                <p className="text-caption text-warm-500">Code de retrait</p>
                <p className="font-mono font-bold text-ink tracking-widest text-h3">{course.pickup_code}</p>
              </div>
              <div>
                <p className="text-caption text-warm-500">Code de livraison</p>
                <p className="font-mono font-bold text-ink tracking-widest text-h3">{course.delivery_code}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-3 text-body-s mt-4 pt-4 border-t border-info/20">
              <div>
                <p className="text-caption text-warm-500">Créée</p>
                <p className="font-medium text-ink">{fmtDateTime(course.created_at)}</p>
              </div>
              <div>
                <p className="text-caption text-warm-500">Attribuée</p>
                <p className="font-medium text-ink">{fmtDateTime(course.assigned_at)}</p>
                <p className="text-caption text-warm-500">délai : {duration(course.created_at, course.assigned_at)}</p>
              </div>
              <div>
                <p className="text-caption text-warm-500">Récupérée</p>
                <p className="font-medium text-ink">{fmtDateTime(course.picked_up_at)}</p>
              </div>
              <div>
                <p className="text-caption text-warm-500">Livrée</p>
                <p className="font-medium text-ink">{fmtDateTime(course.delivered_at)}</p>
                <p className="text-caption text-warm-500">transit : {duration(course.picked_up_at, course.delivered_at)}</p>
              </div>
            </div>
          </Card>
        )}

        {/* ============================================================
            CONTENU PRINCIPAL — grid 2/3 + 1/3
            ============================================================ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-4">
            {/* Origine */}
            <Section title={t('courses.detail.pickup')}>
              <KV label={t('courses.detail.recipient')} value={course.origin_name} />
              <KV label={t('courses.new.originQuartier')} value={`${course.origin_quartier}, ${course.origin_city}`} />
            </Section>

            {/* Cas 4 — Code de retour (le driver le tape à la remise du colis) */}
            {course.status === 'returning_to_sender' && course.return_code && (
              <Card variant="signature" padding="lg" className="border-l-4 border-l-airmess-red! mb-4">
                <p className="text-eyebrow uppercase text-airmess-red font-semibold mb-2">
                  🔄 Colis en retour vers vous
                </p>
                <p className="text-body-s text-warm-600 mb-4">
                  Le client a refusé le colis. Le livreur vous le rapporte. À son arrivée, donnez-lui ce
                  <strong className="text-ink"> code de retour</strong> pour clôturer la course.
                </p>
                <div className="bg-airmess-red/10 rounded-lg p-4 flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <p className="text-caption text-warm-600 uppercase font-semibold">Code de retour</p>
                    <p className="text-h1 font-bold font-mono text-ink tracking-[0.4em] mt-1">
                      {course.return_code}
                    </p>
                  </div>
                  <Button variant="dark" size="sm" pill onClick={() => copy(course.return_code!, 'return')}>
                    {copiedKey === 'return' ? '✓ Copié' : '📋 Copier'}
                  </Button>
                </div>
              </Card>
            )}

            {/* Codes de validation — affiché quand un livreur est assigné */}
            {course.driver && !isTerminal && (
              <Card variant="signature" padding="lg" className="border-l-4 border-l-airmess-yellow!">
                <p className="text-eyebrow uppercase text-warm-500 font-semibold mb-2">
                  🔑 Codes de validation
                </p>
                <p className="text-body-s text-warm-600 mb-4">
                  Donnez le <strong className="text-ink">code de retrait</strong> au livreur quand il arrive.
                  Le <strong className="text-ink">code de livraison</strong> est pour le destinataire (visible sur son lien de suivi).
                </p>

                {/* Code de retrait — gros & copiable */}
                <div className="bg-airmess-yellow/15 rounded-lg p-4 flex items-center justify-between mb-3 flex-wrap gap-3">
                  <div>
                    <p className="text-caption text-warm-600 uppercase font-semibold">Code de retrait</p>
                    <p className="text-h1 font-bold font-mono text-ink tracking-[0.4em] mt-1">
                      {course.pickup_code}
                    </p>
                  </div>
                  <Button variant="dark" size="sm" pill onClick={() => copy(course.pickup_code, 'pickup')}>
                    {copiedKey === 'pickup' ? '✓ Copié' : '📋 Copier'}
                  </Button>
                </div>

                {/* Code de livraison — secondaire */}
                <div className="bg-warm-100 rounded-lg p-3 flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <p className="text-caption text-warm-500 uppercase">Code de livraison (destinataire)</p>
                    <p className="text-h3 font-bold font-mono text-ink tracking-widest mt-0.5">
                      {course.delivery_code}
                    </p>
                  </div>
                  <button
                    onClick={() => copy(course.delivery_code, 'delivery')}
                    className="text-caption text-warm-500 hover:text-ink underline"
                  >
                    {copiedKey === 'delivery' ? '✓ Copié' : 'Copier'}
                  </button>
                </div>

                {/* CTA WhatsApp */}
                <a
                  href={waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 w-full flex items-center justify-center gap-2 bg-[#25D366] text-white font-semibold py-3 rounded-full hover:opacity-90 transition-opacity shadow-sm"
                >
                  <span className="text-lg" aria-hidden>📲</span>
                  Envoyer au destinataire (WhatsApp)
                </a>
              </Card>
            )}

            {/* Destination */}
            <Section title={t('courses.detail.delivery')}>
              <KV label={t('courses.detail.recipient')} value={course.destination_name} />
              <KV label={t('common.phone')} value={course.destination_phone} />
              <KV label={t('courses.new.destinationQuartier')} value={`${course.destination_quartier}, ${course.destination_city}`} />
            </Section>

            {/* Colis */}
            <Section title={t('courses.detail.package')}>
              <KV label={t('common.description')} value={course.package_description} />
              <KV label={t('courses.detail.packageWeight')} value={course.package_size} />
              <KV label={t('courses.new.packageCategory')} value={course.package_category?.name ?? '—'} />
              <KV label={t('courses.new.urgencyLabel')} value={course.urgency === 'express' ? t('courses.express') : t('courses.detail.urgencyStandard')} />
            </Section>

            {/* Tarification */}
            <Section title={t('courses.detail.pricing')}>
              <KV label={t('courses.detail.deliveryFee')} value={`${course.delivery_fee.toLocaleString('fr-FR')} FCFA`} />
              <KV label={t('admin.reconciliation.driverEarnings')} value={`${course.driver_earnings.toLocaleString('fr-FR')} FCFA`} />
              {course.has_collection && (
                <>
                  <KV label={t('courses.detail.collectionAmount')} value={`${course.collection_amount?.toLocaleString('fr-FR')} FCFA`} />
                  <KV label={t('common.type')} value={course.collection_method ?? '—'} />
                </>
              )}
            </Section>
          </div>

          {/* Colonne droite : livreur + timeline */}
          <div className="space-y-4">
            <Section title={t('courses.detail.driver')}>
              {course.driver ? (
                <>
                  <KV label={t('common.name')} value={course.driver.user.name} />
                  <KV label={t('common.phone')} value={course.driver.user.phone} />
                </>
              ) : (
                <p className="text-body-s text-warm-500 italic">{t('courses.detail.waitingDriver')}</p>
              )}
            </Section>

            <Section title={t('courses.detail.history')}>
              {historyQuery.isLoading ? (
                <p className="text-body-s text-warm-500">{t('common.loading')}</p>
              ) : (
                <Timeline items={historyQuery.data ?? []} />
              )}
            </Section>
          </div>
        </div>

        {/* ============================================================
            MODAL SIGNALEMENT INCIDENT (marchand/particulier)
            ============================================================ */}
        {reportIncidentOpen && (
          <ReportIncidentModal
            courseId={course.id}
            courseReference={course.reference}
            onClose={() => setReportIncidentOpen(false)}
          />
        )}

        {/* ============================================================
            MODAL ANNULATION
            ============================================================ */}
        {confirmCancel && (
          <div className="fixed inset-0 bg-ink/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 ams-anim-fade-in">
            <Card variant="signature" padding="lg" className="max-w-md w-full ams-anim-scale-in">
              <h3 className="text-h2 text-ink font-bold">{t('courses.detail.confirmCancel')}</h3>

              {/* Cas 6 — Bloc renforcé si le colis est déjà entre les mains du livreur */}
              {isPostPickup && (
                <div className="mt-4 bg-warning-bg border border-warning/40 rounded-md p-3 flex gap-2">
                  <div className="shrink-0 text-warning mt-0.5">
                    <AlertTriangleIcon size={20} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-body-s font-bold text-ink">
                      {t('courses.detail.cancelPostPickupTitle')}
                    </p>
                    <p className="text-caption text-warm-600 mt-1">
                      {t('courses.detail.cancelPostPickupBody', {
                        fee: course.delivery_fee.toLocaleString('fr-FR'),
                      })}
                    </p>
                    <label className="flex items-start gap-2 mt-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={postPickupAck}
                        onChange={(e) => setPostPickupAck(e.target.checked)}
                        className="mt-1 accent-airmess-red"
                      />
                      <span className="text-caption text-ink font-semibold">
                        {t('courses.detail.cancelPostPickupAck')}
                      </span>
                    </label>
                  </div>
                </div>
              )}

              <p className="text-body-s text-warm-500 mt-4">
                {t('courses.detail.cancelReason')}
              </p>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={3}
                placeholder={t('courses.detail.cancelPlaceholder')}
                className="w-full mt-2 bg-off-white border border-warm-300 rounded-md px-3 py-2.5 text-body text-ink transition-all duration-200 focus:outline-none focus:border-airmess-yellow focus:shadow-glow-yellow"
              />
              {apiError && (
                <p className="text-body-s text-airmess-red mt-2">{apiError}</p>
              )}
              <div className="flex justify-end gap-3 mt-5">
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => {
                    setConfirmCancel(false)
                    setPostPickupAck(false)
                  }}
                >
                  {t('common.back')}
                </Button>
                <Button
                  variant="danger"
                  size="md"
                  pill
                  onClick={() => cancelMutation.mutate()}
                  loading={cancelMutation.isPending}
                  disabled={isPostPickup && !postPickupAck}
                >
                  {t('common.confirm')}
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* ============================================================
            Cas 7 — MODAL SIGNALER VOL (super-admin uniquement)
            ============================================================ */}
        {fraudOpen && (
          <div className="fixed inset-0 bg-ink/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 ams-anim-fade-in">
            <Card variant="signature" padding="lg" className="max-w-lg w-full ams-anim-scale-in border-l-4 border-l-airmess-red!">
              <div className="flex items-start gap-3">
                <div className="shrink-0 text-airmess-red mt-1">
                  <AlertTriangleIcon size={22} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-h2 text-ink font-bold">Signaler un vol livreur</h3>
                  <p className="text-body-s text-warm-600 mt-1">
                    Le livreur sera <strong>banni définitivement</strong>, sa caution sera saisie
                    en totalité, et le marchand sera remboursé (valeur déclarée + encaissement).
                    Cette action est <strong>irréversible</strong>.
                  </p>
                </div>
              </div>

              <div className="mt-4 bg-warm-100 rounded-md p-3 text-caption text-warm-600 space-y-1">
                <p><strong>Livreur :</strong> {course.driver?.user.name ?? '—'}</p>
                <p><strong>Valeur déclarée du colis :</strong>{' '}
                  {typeof course.package_declared_value === 'number'
                    ? course.package_declared_value.toLocaleString('fr-FR') + ' FCFA'
                    : 'non renseignée'}
                </p>
                {course.has_collection && (
                  <p><strong>Encaissement :</strong>{' '}
                    {(course.collection_amount ?? 0).toLocaleString('fr-FR')} FCFA
                  </p>
                )}
              </div>

              <label className="block mt-4 text-caption text-warm-600 font-medium">
                Note détaillée (min. 20 caractères)
              </label>
              <textarea
                value={fraudNote}
                onChange={(e) => setFraudNote(e.target.value)}
                rows={4}
                placeholder="Contexte, sources, preuves (appels marchand, GPS coupé, tentatives infructueuses…)"
                className="w-full mt-1 bg-off-white border border-warm-300 rounded-md px-3 py-2.5 text-body-s text-ink focus:outline-none focus:border-airmess-red"
              />

              <label className="flex items-start gap-2 mt-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={fraudAck}
                  onChange={(e) => setFraudAck(e.target.checked)}
                  className="mt-1 accent-airmess-red"
                />
                <span className="text-caption text-ink font-semibold">
                  Je comprends que cette action est irréversible.
                </span>
              </label>

              {fraudError && (
                <p className="text-body-s text-airmess-red mt-2">{fraudError}</p>
              )}

              <div className="flex justify-end gap-3 mt-5">
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => {
                    setFraudOpen(false)
                    setFraudNote('')
                    setFraudAck(false)
                  }}
                >
                  {t('common.back')}
                </Button>
                <Button
                  variant="danger"
                  size="md"
                  pill
                  onClick={() => fraudMutation.mutate()}
                  loading={fraudMutation.isPending}
                  disabled={!fraudAck || fraudNote.trim().length < 20}
                >
                  Bannir et rembourser
                </Button>
              </div>
            </Card>
          </div>
        )}
      </main>
    </Wrapper>
  )
}

/* ============================================================
   Helpers de présentation
   ============================================================ */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card variant="default" padding="md">
      <p className="text-eyebrow uppercase text-warm-500 font-semibold mb-3">{title}</p>
      <dl className="space-y-2">{children}</dl>
    </Card>
  )
}

function KV({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between items-start gap-3 text-body-s">
      <dt className="text-warm-500 shrink-0">{label}</dt>
      <dd className="text-ink font-medium text-right wrap-break-word">{value}</dd>
    </div>
  )
}

function fmtDateTime(v?: string | null): string {
  if (!v) return '—'
  return new Date(v).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  })
}

function duration(from?: string | null, to?: string | null): string {
  if (!from || !to) return '—'
  const ms = new Date(to).getTime() - new Date(from).getTime()
  if (ms < 0) return '—'
  const min = Math.round(ms / 60000)
  if (min < 60) return `${min} min`
  return `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')}`
}

function waNumber(phone: string): string {
  let d = phone.replace(/\D/g, '')
  if (d.startsWith('00')) d = d.slice(2)
  if (d.length <= 8) d = '229' + d
  return d
}
