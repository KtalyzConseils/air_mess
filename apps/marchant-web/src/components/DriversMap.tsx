import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import { Link } from 'react-router-dom'
import type { DriverFull } from '../api/admin'

const COTONOU: [number, number] = [6.3703, 2.3912]

// Une couleur par état de disponibilité (réutilisée par la légende dans la page)
export const DRIVER_STATUS_COLOR: Record<string, string> = {
  available: '#22c55e', // vert
  busy:      '#f59e0b', // orange
  on_break:  '#3b82f6', // bleu
  offline:   '#9ca3af', // gris
}

const STATUS_LABEL: Record<string, string> = {
  available: 'Disponible',
  busy: 'Occupé',
  on_break: 'En pause',
  offline: 'Hors-ligne',
}

export default function DriversMap({ drivers }: { drivers: DriverFull[] }) {
  // On ne peut placer que les livreurs ayant une position connue
  const located = drivers.filter((d) => d.current_lat != null && d.current_lng != null)

  // Centre = barycentre des livreurs localisés, sinon Cotonou (appliqué au montage seulement)
  const center: [number, number] = located.length
    ? [
        located.reduce((s, d) => s + (d.current_lat as number), 0) / located.length,
        located.reduce((s, d) => s + (d.current_lng as number), 0) / located.length,
      ]
    : COTONOU

  return (
    <div className="rounded-2xl overflow-hidden border border-gray-200" style={{ height: 520 }}>
      <MapContainer center={center} zoom={12} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution="&copy; OpenStreetMap"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {located.map((d) => (
          <CircleMarker
            key={d.id}
            center={[d.current_lat as number, d.current_lng as number]}
            radius={9}
            pathOptions={{
              color: '#ffffff',
              weight: 2,
              fillColor: DRIVER_STATUS_COLOR[d.availability_status] ?? '#9ca3af',
              fillOpacity: 0.9,
            }}
          >
            <Popup>
              <div className="text-sm space-y-0.5">
                <p className="font-semibold">{d.first_name} {d.last_name}</p>
                <p>
                  {STATUS_LABEL[d.availability_status] ?? d.availability_status}
                  {d.vehicle_type ? ` · ${d.vehicle_type}` : ''}
                </p>
                <p className="text-xs text-gray-500">{d.user.phone}</p>
                <Link to={`/admin/drivers/${d.id}`} className="text-airmess-dark underline">
                  Voir la fiche →
                </Link>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  )
}
