import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import { useTranslation } from 'react-i18next'
import StatusBadge from '../components/StatusBadge'
import Card from '../components/ui/Card'
import Highlight from '../components/Highlight'
import { fetchTracking } from '../api/tracking'
import mark from '../assets/logo/airmess-mark.svg'
import wordmarkWhite from '../assets/logo/airmess-wordmark-white.svg'

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

        {/* Footer */}
        <div className="text-center pt-4 pb-2 flex flex-col items-center gap-3 opacity-60">
          <img src={wordmarkWhite} alt="" aria-hidden className="h-5 w-auto invert opacity-40" />
          <p className="text-caption text-warm-500">
            {t('tracking.footerAutoRefresh')}
          </p>
        </div>
      </main>
    </div>
  )
}
