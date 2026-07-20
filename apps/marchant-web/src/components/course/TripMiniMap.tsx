import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import { ORIGIN_ICON, DEST_ICON } from './tripPins'

interface Props {
  originLat?: number
  originLng?: number
  destLat?: number
  destLng?: number
  height?: string
}

/**
 * Force Leaflet à recalculer sa taille au montage et à réappliquer les
 * bounds aux 2 pins. Sans invalidateSize(), la carte montée à l'intérieur
 * d'une modal/sheet peut garder une taille de 0 durant la 1ʳᵉ frame et
 * afficher un état "fantôme" (tuiles décalées + pin apparemment doublé).
 */
function EnsureFit({
  bounds,
  singleCenter,
}: {
  bounds?: L.LatLngBoundsLiteral
  singleCenter?: [number, number]
}) {
  const map = useMap()
  useEffect(() => {
    map.invalidateSize({ animate: false })
    if (bounds) {
      map.fitBounds(bounds, { padding: [24, 24], maxZoom: 15, animate: false })
    } else if (singleCenter) {
      map.setView(singleCenter, 14, { animate: false })
    }
  }, [map, bounds, singleCenter])
  return null
}

/**
 * Mini-carte read-only du trajet A→B. Deux pins colorés reliés par une
 * ligne pointillée. Sert de "preview" dans le panneau récap ou une sheet.
 * Zoom/pan désactivés pour ne pas voler le focus du formulaire parent.
 */
export default function TripMiniMap({
  originLat,
  originLng,
  destLat,
  destLng,
  height = '200px',
}: Props) {
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

  if (!hasOrigin && !hasDest) {
    return (
      <div
        style={{ height }}
        className="rounded-lg bg-warm-100 border border-warm-200 grid place-items-center text-caption text-warm-500 text-center px-4"
      >
        Positions à définir pour voir le trajet
      </div>
    )
  }

  const bothPoints = hasOrigin && hasDest
  const bounds: L.LatLngBoundsLiteral | undefined = bothPoints
    ? [
        [originLat!, originLng!],
        [destLat!, destLng!],
      ]
    : undefined
  const singleCenter: [number, number] | undefined = !bothPoints
    ? hasOrigin
      ? [originLat!, originLng!]
      : [destLat!, destLng!]
    : undefined

  return (
    <div
      className="rounded-lg overflow-hidden border border-warm-200"
      style={{ height }}
    >
      <MapContainer
        {...(bounds
          ? { bounds, boundsOptions: { padding: [24, 24], maxZoom: 15 } }
          : { center: singleCenter!, zoom: 14 })}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
        attributionControl={false}
        dragging={false}
        scrollWheelZoom={false}
        doubleClickZoom={false}
        touchZoom={false}
        keyboard={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {hasOrigin && (
          <Marker position={[originLat!, originLng!]} icon={ORIGIN_ICON} />
        )}
        {hasDest && <Marker position={[destLat!, destLng!]} icon={DEST_ICON} />}
        {bothPoints && (
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
        <EnsureFit bounds={bounds} singleCenter={singleCenter} />
      </MapContainer>
    </div>
  )
}
