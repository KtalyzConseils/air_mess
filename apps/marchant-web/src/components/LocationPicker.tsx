import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'

import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import iconUrl from 'leaflet/dist/images/marker-icon.png'
import shadowUrl from 'leaflet/dist/images/marker-shadow.png'

delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: () => string })._getIconUrl
L.Icon.Default.mergeOptions({ iconRetinaUrl, iconUrl, shadowUrl })

interface Props {
  lat?: number
  lng?: number
  onChange: (lat: number, lng: number) => void
  height?: string
}

const COTONOU_CENTER: [number, number] = [6.3703, 2.3912]

/**
 * Extrait (lat, lng) d'une URL Google Maps. Formats supportés :
 *   .../@6.3703,2.3912,15z   (le plus courant)
 *   ?q=6.3703,2.3912         (lien partagé)
 *   "6.3703,2.3912"          (collage brut)
 */
function parseMapsUrl(input: string): { lat: number; lng: number } | null {
  if (!input) return null
  const cleaned = input.trim()

  const patterns = [
    /@(-?\d+\.\d+),(-?\d+\.\d+)/,        // /@lat,lng
    /[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/,   // ?q=lat,lng
    /^(-?\d+\.\d+),\s*(-?\d+\.\d+)$/,    // lat,lng tout court
  ]
  for (const re of patterns) {
    const m = cleaned.match(re)
    if (m) {
      const lat = parseFloat(m[1])
      const lng = parseFloat(m[2])
      if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return { lat, lng }
    }
  }
  return null
}

export default function LocationPicker({ lat, lng, onChange, height = '300px' }: Props) {
  const initial: [number, number] = lat && lng ? [lat, lng] : COTONOU_CENTER
  const [linkInput, setLinkInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [locating, setLocating] = useState(false)

  function useCurrentPosition() {
    setError(null)
    if (!navigator.geolocation) {
      setError('Votre navigateur ne supporte pas la géolocalisation.')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false)
        onChange(pos.coords.latitude, pos.coords.longitude)
      },
      (err) => {
        setLocating(false)
        setError(
          err.code === err.PERMISSION_DENIED
            ? 'Permission refusée. Active la localisation dans ton navigateur.'
            : 'Impossible de récupérer ta position.',
        )
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    )
  }

  function applyLink() {
    setError(null)
    const parsed = parseMapsUrl(linkInput)
    if (!parsed) {
      setError("Lien non reconnu. Copie l'URL complète depuis Google Maps (format @lat,lng).")
      return
    }
    onChange(parsed.lat, parsed.lng)
    setLinkInput('')
  }

  return (
    <div className="space-y-2">
      {/* Chemin #1 : position actuelle */}
      <div className="flex gap-2 items-start">
        <button
          type="button"
          onClick={useCurrentPosition}
          disabled={locating}
          className="flex-1 bg-airmess-dark text-white text-sm font-semibold py-2 px-3 rounded-lg hover:opacity-90 disabled:opacity-50"
        >
          {locating ? 'Localisation…' : '📍 Ma position actuelle'}
        </button>
      </div>

      {/* Chemin #3 : lien Google Maps */}
      <div className="flex gap-2">
        <input
          type="text"
          value={linkInput}
          onChange={(e) => setLinkInput(e.target.value)}
          placeholder="🔗 Colle un lien Google Maps ici…"
          className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-airmess-yellow outline-none"
        />
        <button
          type="button"
          onClick={applyLink}
          disabled={!linkInput}
          className="bg-airmess-yellow text-airmess-dark font-bold text-sm px-3 py-2 rounded-lg hover:opacity-90 disabled:opacity-50"
        >
          Appliquer
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-xs">
          {error}
        </div>
      )}

      {/* Chemin #2 : carte interactive (existait déjà) */}
      <div className="rounded-lg overflow-hidden border border-gray-200" style={{ height }}>
        <MapContainer center={initial} zoom={13} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickHandler onChange={onChange} />
          <RecenterOnChange lat={lat} lng={lng} />
          {lat && lng && <Marker position={[lat, lng]} />}
        </MapContainer>
      </div>

      <p className="text-xs text-gray-500">
        💡 3 façons : ton GPS, un lien Maps, ou un clic sur la carte.
      </p>
    </div>
  )
}

function ClickHandler({ onChange }: { onChange: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onChange(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

function RecenterOnChange({ lat, lng }: { lat?: number; lng?: number }) {
  const map = useMap()
  useEffect(() => {
    if (lat && lng) map.flyTo([lat, lng], 15, { duration: 0.5 })
  }, [lat, lng, map])
  return null
}
