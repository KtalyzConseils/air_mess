import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import { useTranslation } from 'react-i18next'
import StatusBadge from '../components/StatusBadge'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Highlight from '../components/Highlight'
import { AlertTriangleIcon, HelpCircleIcon } from '../components/ui/icons'
import { fetchTracking, disputeTracking } from '../api/tracking'
import SupportContactModal from '../components/SupportContactModal'
import mark from '../assets/logo/airmess-mark.svg'
import wordmarkWhite from '../assets/logo/airmess-wordmark-white.svg'

// Cas 8 — Fenêtre de contestation. Doit rester en phase avec le setting back
// `dispute_window_days` (défaut 7). Utilisé pour l'affichage conditionnel du
// bouton "Ce n'est pas moi qui ai reçu". Le back reste seul juge en cas de
// désaccord (renvoie 422 si dépassé).
const DISPUTE_WINDOW_DAYS = 7

export default function TrackingPage() {
  const { t } = useTranslation()
  const { token } = useParams<{ token: string }>()

  const { data, isLoading, error } = useQuery({
    queryKey: ['tracking', token],
    queryFn: () => fetchTracking(token!),
    enabled: !!token,
    refetchInterval: 10_000,
  })

  const statusLabel = (s: string) => {
    const key = `tracking.status.${s}`
    const translated = t(key)
    return translated === key ? s : translated
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="text-center">
          <img src={mark} alt="" aria-hidden className="h-12 w-auto mx-auto mb-4 opacity-50 ams-anim-fade-in" />
          <p className="text-body text-warm-500">{t('tracking.loadingDelivery')}</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream p-6">
        <Card variant="signature" padding="lg" className="max-w-md w-full text-center">
          <img src={mark} alt="" aria-hidden className="h-12 w-auto mx-auto mb-4 opacity-30" />
          <h1 className="text-h2 text-airmess-red">{t('tracking.invalidLink')}</h1>
          <p className="text-body-s text-warm-500 mt-2">
            {t('tracking.invalidLinkBody')}
          </p>
        </Card>
      </div>
    )
  }

  const driverPosition: [number, number] | null =
    data.driver?.current_lat && data.driver?.current_lng
      ? [data.driver.current_lat, data.driver.current_lng]
      : null

  const destPosition: [number, number] = [data.destination.lat, data.destination.lng]
  const mapCenter: [number, number] = driverPosition ?? destPosition

  return (
    <div className="min-h-screen bg-cream">
      {/* ============================================================
          HEADER public — fond sombre + mark
          ============================================================ */}
      <header className="bg-airmess-dark text-cream px-4 md:px-6 py-3 md:py-4 border-b border-warm-600/20">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <img src={mark} alt="" aria-hidden className="h-9 w-auto md:h-10" />
          <div className="min-w-0">
            <h1 className="text-body font-bold leading-none">Air Mess</h1>
            <p className="text-caption text-warm-400 mt-0.5">{t('tracking.headerSubtitle')}</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-8">
        {/* ============================================================
            STATUT principal
            ============================================================ */}
        <Card variant="signature" padding="lg" className="mb-4 text-center">
          <p className="text-eyebrow text-warm-500 uppercase font-mono">{data.reference}</p>
          <h2 className="text-h2 md:text-h1 text-ink mt-3">
            {statusLabel(data.status)}
          </h2>
          <div className="mt-4">
            <StatusBadge status={data.status} />
          </div>

          {data.driver && (
            <div className="mt-6 p-4 bg-warm-100 rounded-lg">
              <p className="text-eyebrow text-warm-500 uppercase">{t('tracking.yourDriver')}</p>
              <p className="text-h3 text-ink mt-1.5 font-bold">
                {data.driver.first_name}
              </p>
              {data.driver.phone && (
                <a
                  href={`tel:${data.driver.phone}`}
                  className="inline-flex items-center gap-2 mt-3 bg-airmess-yellow text-ink font-bold px-5 py-2.5 rounded-full hover:bg-airmess-yellow-light transition-colors shadow-sm"
                >
                  {t('tracking.callDriver')}
                </a>
              )}
            </div>
          )}

          {/* Bandeau "À préparer" — uniquement si le destinataire paie à la livraison.
              Affiché dès l'assignation pour laisser au client le temps de préparer
              le cash ou d'aller retirer du Mobile Money. */}
          {data.payment && data.status !== 'delivered' && data.status !== 'cancelled' && data.status !== 'failed' && (
            <div className="mt-6 p-5 bg-airmess-yellow rounded-lg text-left">
              <p className="text-eyebrow text-ink/70 uppercase font-mono">
                {t('tracking.paymentEyebrow')}
              </p>
              <p className="text-h1 text-ink mt-2 font-bold tabular-nums">
                {data.payment.total_to_pay.toLocaleString('fr-FR')}{' '}
                <span className="text-body-l font-bold">FCFA</span>
              </p>
              {data.payment.collection_amount > 0 && (
                <p className="text-body-s text-ink/80 mt-2 leading-relaxed">
                  {t('tracking.paymentBreakdown', {
                    product: data.payment.collection_amount.toLocaleString('fr-FR'),
                    fee: data.payment.delivery_fee.toLocaleString('fr-FR'),
                  })}
                </p>
              )}
              {data.payment.collection_amount === 0 && (
                <p className="text-body-s text-ink/80 mt-2">
                  {t('tracking.paymentFeeOnlyNote')}
                </p>
              )}
              <p className="text-caption text-ink/70 mt-3 pt-3 border-t border-ink/10">
                {t('tracking.paymentPrepareHint')}
              </p>
            </div>
          )}
        </Card>

        {/* ============================================================
            Code de livraison — visible uniquement si en route
            ============================================================ */}
        {data.delivery_code && (
          <Card variant="dark" padding="lg" className="mb-4 text-center relative overflow-hidden">
            {/* Halo jaune ambiant */}
            <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-airmess-yellow/10 blur-3xl pointer-events-none" aria-hidden />

            <p className="text-eyebrow text-warm-300 uppercase relative">
              {t('tracking.deliveryCodeLabel')}
            </p>
            <p className="text-display-2 font-bold font-mono text-airmess-yellow tracking-[0.4em] mt-4 relative">
              {data.delivery_code}
            </p>
            <p className="text-body-s text-warm-300 mt-4 leading-relaxed relative">
              {t('tracking.deliveryCodeHintLine1')}
              <br />
              {t('tracking.deliveryCodeHintLine2')}
            </p>
          </Card>
        )}

        {/* ============================================================
            Carte
            ============================================================ */}
        <Card variant="default" padding="none" className="overflow-hidden mb-4" style={{ height: '350px' }}>
          <MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; OpenStreetMap"
            />
            <Marker position={destPosition}>
              <Popup>{t('tracking.mapYourAddress')}</Popup>
            </Marker>
            {driverPosition && (
              <Marker position={driverPosition}>
                <Popup>{t('tracking.mapYourDriver')}</Popup>
              </Marker>
            )}
          </MapContainer>
        </Card>

        {/* ============================================================
            Colis
            ============================================================ */}
        <Card variant="default" padding="md" className="mb-4">
          <h3 className="text-h3 text-ink mb-2 font-bold">
            {t('tracking.yourPackagePrefix')} <Highlight>{t('tracking.yourPackageHighlight')}</Highlight>
          </h3>
          <p className="text-body text-ink">{data.package.description}</p>
          {data.package.category && (
            <p className="text-caption text-warm-500 mt-1">{data.package.category}</p>
          )}
        </Card>

        {/* ============================================================
            Timeline
            ============================================================ */}
        <Card variant="default" padding="md" className="mb-6">
          <h3 className="text-h3 text-ink mb-4 font-bold">{t('tracking.history')}</h3>
          <ol className="relative border-l-2 border-warm-200 ml-2">
            {data.timeline.map((tItem, idx) => {
              const isLast = idx === data.timeline.length - 1
              return (
                <li key={idx} className="mb-4 ml-5 last:mb-0">
                  <span
                    className={
                      'absolute -left-[7px] w-3 h-3 rounded-full ' +
                      (isLast ? 'bg-airmess-yellow ring-4 ring-airmess-yellow/20' : 'bg-warm-300')
                    }
                  />
                  <p className={'text-body-s ' + (isLast ? 'font-bold text-ink' : 'text-warm-600')}>
                    {statusLabel(tItem.status)}
                  </p>
                  <p className="text-caption text-warm-500">
                    {new Date(tItem.created_at).toLocaleString('fr-FR', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </li>
              )
            })}
          </ol>
        </Card>

        {/* Cas 8 — Bouton de contestation destinataire (course delivered, fenêtre ouverte) */}
        {data.status === 'delivered' && data.delivered_at && (
          <DisputeSection
            token={token!}
            deliveredAt={data.delivered_at}
            reference={data.reference}
          />
        )}

        {/* Footer */}
        <div className="text-center pt-4 pb-2 flex flex-col items-center gap-3 opacity-60">
          <img src={wordmarkWhite} alt="" aria-hidden className="h-5 w-auto invert opacity-40" />
          <p className="text-caption text-warm-500">
            {t('tracking.footerAutoRefresh')}
          </p>
          <TrackingSupportLink reference={data.reference} />
        </div>
      </main>
    </div>
  )
}

/* ============================================================
   Lien "Un problème ?" — expose la modale support au destinataire
   depuis la page tracking publique (aucun compte requis).
   ============================================================ */
function TrackingSupportLink({ reference }: { reference: string }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-caption text-warm-500 hover:text-ink transition-colors underline-offset-2 hover:underline"
      >
        <HelpCircleIcon size={14} />
        {t('support.needHelpLink')}
      </button>
      <SupportContactModal
        open={open}
        onClose={() => setOpen(false)}
        context={`Tracking ${reference}`}
      />
    </>
  )
}

/* ============================================================
   Cas 8 — Section contestation destinataire
   ============================================================ */
function DisputeSection({
  token,
  deliveredAt,
  reference,
}: {
  token: string
  deliveredAt: string
  reference: string
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [description, setDescription] = useState('')
  const [confirmed, setConfirmed] = useState<{ id: number } | null>(null)

  const daysSince = Math.floor((Date.now() - new Date(deliveredAt).getTime()) / (1000 * 60 * 60 * 24))
  const withinWindow = daysSince <= DISPUTE_WINDOW_DAYS

  const mutation = useMutation({
    mutationFn: () =>
      disputeTracking(token, {
        name: name.trim(),
        phone: phone.trim(),
        description: description.trim(),
      }),
    onSuccess: (data) => {
      setConfirmed({ id: data.incident.id })
    },
  })

  const apiError =
    mutation.error instanceof AxiosError
      ? mutation.error.response?.data?.message ?? 'Erreur inattendue.'
      : null

  // Une fois soumis avec succès, on remplace la carte par la confirmation
  if (confirmed) {
    return (
      <Card variant="signature" padding="lg" className="mb-6 border-l-4 border-l-success!">
        <div className="flex items-start gap-3">
          <div className="shrink-0 text-success mt-0.5">
            <AlertTriangleIcon size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-eyebrow uppercase text-success font-bold mb-1">
              Contestation enregistrée
            </p>
            <p className="text-body-s text-warm-700">
              Merci. L'équipe support va enquêter et vous recontacter au numéro fourni.
            </p>
          </div>
        </div>
      </Card>
    )
  }

  if (!withinWindow) {
    return null
  }

  return (
    <Card variant="default" padding="md" className="mb-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <p className="text-eyebrow uppercase text-warm-500 font-bold mb-1">
            Ce colis ne vous a pas été remis&nbsp;?
          </p>
          <p className="text-body-s text-warm-600">
            Vous pouvez le signaler pendant {DISPUTE_WINDOW_DAYS} jours après la livraison.
            Notre équipe enquêtera et reviendra vers vous.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
          Signaler un problème
        </Button>
      </div>

      {open && (
        <div className="fixed inset-0 bg-ink/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <Card variant="signature" padding="lg" className="max-w-md w-full">
            <div className="flex items-start gap-3 mb-3">
              <div className="shrink-0 text-airmess-red mt-1">
                <AlertTriangleIcon size={20} />
              </div>
              <div className="min-w-0">
                <h3 className="text-h3 text-ink font-bold">Contester la livraison</h3>
                <p className="text-caption text-warm-500 mt-1">Course {reference}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-caption font-medium text-warm-600 mb-1">
                  Votre nom
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Prénom et nom"
                  className="w-full bg-off-white border border-warm-300 rounded-md px-3 py-2 text-body-s focus:outline-none focus:border-airmess-yellow"
                />
              </div>
              <div>
                <label className="block text-caption font-medium text-warm-600 mb-1">
                  Votre téléphone
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+229 ..."
                  className="w-full bg-off-white border border-warm-300 rounded-md px-3 py-2 text-body-s focus:outline-none focus:border-airmess-yellow"
                />
              </div>
              <div>
                <label className="block text-caption font-medium text-warm-600 mb-1">
                  Décrivez ce qui s'est passé (min. 20 caractères)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder="Ex : je n'ai jamais reçu ce colis, personne n'est venu à mon adresse…"
                  className="w-full bg-off-white border border-warm-300 rounded-md px-3 py-2 text-body-s focus:outline-none focus:border-airmess-yellow"
                />
              </div>
            </div>

            {apiError && (
              <p className="text-body-s text-airmess-red mt-2">{apiError}</p>
            )}

            <div className="flex justify-end gap-3 mt-4">
              <Button variant="secondary" size="md" onClick={() => setOpen(false)}>
                Annuler
              </Button>
              <Button
                variant="danger"
                size="md"
                pill
                onClick={() => mutation.mutate()}
                loading={mutation.isPending}
                disabled={
                  name.trim().length < 2
                  || phone.trim().length < 6
                  || description.trim().length < 20
                }
              >
                Envoyer la contestation
              </Button>
            </div>
          </Card>
        </div>
      )}
    </Card>
  )
}
