import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Polyline, useMapEvents, useMap } from 'react-leaflet'
import { useTranslation } from 'react-i18next'
import { ORIGIN_ICON, DEST_ICON } from './tripPins'
import PlaceSearchInput from './PlaceSearchInput'

interface Props {
  originLat?: number
  originLng?: number
  destLat?: number
  destLng?: number
  onOriginChange: (lat: number, lng: number) => void
  onDestChange: (lat: number, lng: number) => void
  /** Pin actif par défaut. Le marchand connaît son origine ⇒ 'B' est plus fréquent. */
  defaultActive?: 'A' | 'B'
  height?: string
}

const COTONOU_CENTER: [number, number] = [6.3703, 2.3912]

/**
 * Carte interactive unique pour positionner A (origine) et B (destination).
 * Toggle en haut pour choisir le pin actif — recherche Google Places, géoloc et
 * clic sur la carte s'appliquent au pin actif. Fit auto quand un nouveau pin
 * est ajouté (pas quand un pin existant est déplacé, pour éviter le jitter).
 */
export default function DualPinMap({
  originLat,
  originLng,
  destLat,
  destLng,
  onOriginChange,
  onDestChange,
  defaultActive = 'B',
  height = '340px',
}: Props) {
  const { t } = useTranslation()
  const [active, setActive] = useState<'A' | 'B'>(defaultActive)
  const [error, setError] = useState<string | null>(null)
  const [locating, setLocating] = useState(false)

  const hasOrigin =
    typeof originLat === 'number' &&
    typeof originLng === 'number' &&
    originLat !== 0 &&
    originLng !== 0
  const hasDest =
    typeof destLat === 'number' &&
    typeof destLng === 'number' &&
    destLat !== 0 &&
    destLng !== 0

  const initial: [number, number] = hasOrigin
    ? [originLat!, originLng!]
    : hasDest
      ? [destLat!, destLng!]
      : COTONOU_CENTER

  function apply(lat: number, lng: number) {
    if (active === 'A') onOriginChange(lat, lng)
    else onDestChange(lat, lng)
  }

  function useCurrentPosition() {
    setError(null)
    if (!navigator.geolocation) {
      setError(t('courses.new.dualMap.geoUnsupported'))
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false)
        apply(pos.coords.latitude, pos.coords.longitude)
      },
      (err) => {
        setLocating(false)
        setError(
          err.code === err.PERMISSION_DENIED
            ? t('courses.new.dualMap.geoDenied')
            : t('courses.new.dualMap.geoFailed'),
        )
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    )
  }

  const activeLabel =
    active === 'A' ? t('courses.new.dualMap.aLabel') : t('courses.new.dualMap.bLabel')

  return (
    <div className="space-y-2.5">
      {/* Toggle A / B */}
      <div className="flex gap-1 rounded-lg bg-warm-100 p-1">
        <button
          type="button"
          onClick={() => setActive('A')}
          className={[
            'flex-1 py-2 px-3 text-body-s font-semibold rounded-md transition-all flex items-center justify-center gap-2',
            active === 'A'
              ? 'bg-off-white text-ink shadow-sm ring-1 ring-warm-200'
              : 'text-warm-500 hover:text-ink',
          ].join(' ')}
          aria-pressed={active === 'A'}
        >
          <span
            className="inline-block w-3 h-3 rounded-full ring-2"
            style={{ background: '#F4C41F', boxShadow: 'inset 0 0 0 1px #1F1D1A' }}
            aria-hidden
          />
          {t('courses.new.dualMap.aLabel')}
          {hasOrigin && (
            <span className="text-caption text-success" aria-hidden>
              ✓
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setActive('B')}
          className={[
            'flex-1 py-2 px-3 text-body-s font-semibold rounded-md transition-all flex items-center justify-center gap-2',
            active === 'B'
              ? 'bg-off-white text-ink shadow-sm ring-1 ring-warm-200'
              : 'text-warm-500 hover:text-ink',
          ].join(' ')}
          aria-pressed={active === 'B'}
        >
          <span
            className="inline-block w-3 h-3 rounded-full"
            style={{ background: '#1F1D1A', boxShadow: 'inset 0 0 0 1px #F4C41F' }}
            aria-hidden
          />
          {t('courses.new.dualMap.bLabel')}
          {hasDest && (
            <span className="text-caption text-success" aria-hidden>
              ✓
            </span>
          )}
        </button>
      </div>

      {/* Chemin #1 : recherche Google Places → applique au pin actif */}
      <PlaceSearchInput
        resetKey={active}
        activePinLabel={activeLabel}
        onSelect={(place) => {
          setError(null)
          apply(place.lat, place.lng)
        }}
      />

      {/* Chemin #2 : position actuelle → applique au pin actif */}
      <button
        type="button"
        onClick={useCurrentPosition}
        disabled={locating}
        className="w-full bg-airmess-dark text-white text-body-s font-semibold py-2 px-3 rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
      >
        {locating
          ? t('courses.new.dualMap.geoLoading')
          : t('courses.new.dualMap.geoCta', { pin: activeLabel })}
      </button>

      {error && (
        <div className="bg-danger-bg border border-airmess-red/30 text-airmess-red px-3 py-2 rounded-md text-caption">
          {error}
        </div>
      )}

      {/* Chemin #3 : clic sur la carte → applique au pin actif */}
      <div
        className="rounded-lg overflow-hidden border border-warm-200"
        style={{ height }}
      >
        <MapContainer
          center={initial}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution="&copy; OpenStreetMap"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickHandler onClick={apply} />
          <FitPins
            originLat={hasOrigin ? originLat! : undefined}
            originLng={hasOrigin ? originLng! : undefined}
            destLat={hasDest ? destLat! : undefined}
            destLng={hasDest ? destLng! : undefined}
          />
          {hasOrigin && (
            <Marker
              position={[originLat!, originLng!]}
              icon={ORIGIN_ICON}
              eventHandlers={{ click: () => setActive('A') }}
            />
          )}
          {hasDest && (
            <Marker
              position={[destLat!, destLng!]}
              icon={DEST_ICON}
              eventHandlers={{ click: () => setActive('B') }}
            />
          )}
          {hasOrigin && hasDest && (
            <Polyline
              positions={[
                [originLat!, originLng!],
                [destLat!, destLng!],
              ]}
              pathOptions={{
                color: '#1F1D1A',
                weight: 2,
                dashArray: '6 6',
                opacity: 0.6,
              }}
            />
          )}
        </MapContainer>
      </div>

      <p className="text-caption text-warm-500">
        {t('courses.new.dualMap.hint', { pin: activeLabel })}
      </p>
    </div>
  )
}

function ClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onClick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

/**
 * Fit uniquement quand un nouveau pin apparaît (0→1, 1→2). Un déplacement
 * de pin existant ne re-cadre pas (évite les sauts irritants pendant l'édition).
 */
function FitPins({
  originLat,
  originLng,
  destLat,
  destLng,
}: {
  originLat?: number
  originLng?: number
  destLat?: number
  destLng?: number
}) {
  const map = useMap()
  const prevCount = useRef(0)

  useEffect(() => {
    const points: [number, number][] = []
    if (typeof originLat === 'number' && typeof originLng === 'number')
      points.push([originLat, originLng])
    if (typeof destLat === 'number' && typeof destLng === 'number')
      points.push([destLat, destLng])

    if (points.length === 0) {
      prevCount.current = 0
      return
    }

    if (points.length > prevCount.current) {
      if (points.length === 1) {
        map.setView(points[0], 14, { animate: false })
      } else {
        map.fitBounds(points, { padding: [30, 30], maxZoom: 15, animate: true })
      }
    }
    prevCount.current = points.length
  }, [originLat, originLng, destLat, destLng, map])

  return null
}
