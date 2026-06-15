import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import StatusBadge from '../components/StatusBadge'
import { fetchTracking } from '../api/tracking'

const STATUS_FR: Record<string, string> = {
  awaiting_assignment:  'Recherche de livreur en cours',
  assigned:             'Un livreur a accepté votre course',
  driver_to_pickup:     'Le livreur va chercher votre colis',
  at_pickup:            'Le livreur est sur place pour le retrait',
  picked_up:            'Le colis est en route vers vous',
  at_dropoff:           'Votre livreur est arrivé',
  delivered:            'Colis livré ✅',
  cancelled:            'Livraison annulée',
  failed:               'Livraison échouée',
}

export default function TrackingPage() {
  const { token } = useParams<{ token: string }>()

  const { data, isLoading, error } = useQuery({
    queryKey: ['tracking', token],
    queryFn: () => fetchTracking(token!),
    enabled: !!token,
    refetchInterval: 10_000, // refresh toutes les 10s pour suivi quasi temps réel
  })

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Chargement de votre livraison...</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-airmess-red">Lien invalide</h1>
          <p className="text-gray-500 mt-2">
            Ce lien de suivi n'existe pas ou a expiré.
          </p>
        </div>
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
    <div className="min-h-screen bg-gray-50">
      {/* Header simple */}
      <header className="bg-airmess-dark text-white px-6 py-4 flex items-center gap-3">
        <div className="w-10 h-10 bg-airmess-yellow rounded-lg flex items-center justify-center text-airmess-dark font-bold">
          AM
        </div>
        <div>
          <h1 className="text-lg font-bold leading-none">Air Mess</h1>
          <p className="text-xs text-gray-400">Suivi de livraison</p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4">
        {/* Statut principal */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-4 text-center">
          <p className="text-xs text-gray-500 font-mono">{data.reference}</p>
          <h2 className="text-2xl font-bold text-airmess-dark mt-2">
            {STATUS_FR[data.status] ?? data.status}
          </h2>
          <div className="mt-3"><StatusBadge status={data.status} /></div>

          {data.driver && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 uppercase">Votre livreur</p>
              <p className="text-lg font-semibold text-airmess-dark mt-1">
                {data.driver.first_name}
              </p>
              {data.driver.phone && (
                <a
                  href={`tel:${data.driver.phone}`}
                  className="inline-block mt-2 bg-airmess-yellow text-airmess-dark font-bold px-4 py-2 rounded-lg"
                >
                  📞 Appeler le livreur
                </a>
              )}
            </div>
          )}
        </div>

        {/* Code de livraison — visible uniquement quand le colis est en route */}
        {data.delivery_code && (
          <div className="bg-airmess-dark rounded-2xl shadow-sm p-6 mb-4 text-center">
            <p className="text-xs uppercase font-bold text-gray-300 tracking-wider">
              🔑 Votre code de livraison
            </p>
            <p className="text-4xl font-bold font-mono text-airmess-yellow tracking-[0.4em] mt-3">
              {data.delivery_code}
            </p>
            <p className="text-xs text-gray-300 mt-3 leading-relaxed">
              Donnez ce code au livreur à l'arrivée{'\n'}pour confirmer la réception du colis.
            </p>
          </div>
        )}


        {/* Carte */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-4" style={{ height: '350px' }}>
          <MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
            <Marker position={destPosition}>
              <Popup>📍 Votre adresse</Popup>
            </Marker>
            {driverPosition && (
              <Marker position={driverPosition}>
                <Popup>🛵 Votre livreur</Popup>
              </Marker>
            )}
          </MapContainer>
        </div>

        {/* Détails colis */}
        <div className="bg-white rounded-2xl shadow-sm p-5 mb-4">
          <h3 className="font-bold text-airmess-dark mb-3">Votre colis</h3>
          <p className="text-sm">{data.package.description}</p>
          {data.package.category && (
            <p className="text-xs text-gray-500 mt-1">{data.package.category}</p>
          )}
        </div>

        {/* Timeline */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h3 className="font-bold text-airmess-dark mb-4">Historique</h3>
          <ol className="relative border-l-2 border-gray-200 ml-2">
            {data.timeline.map((t, idx) => (
              <li key={idx} className="mb-4 ml-5">
                <span className={`absolute -left-2 w-3 h-3 rounded-full
                  ${idx === data.timeline.length - 1 ? 'bg-airmess-yellow' : 'bg-gray-300'}`}
                />
                <p className="text-sm font-medium">{STATUS_FR[t.status] ?? t.status}</p>
                <p className="text-xs text-gray-500">
                  {new Date(t.created_at).toLocaleString('fr-FR', {
                    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
                  })}
                </p>
              </li>
            ))}
          </ol>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6 mb-4">
          © 2026 Air Mess · Auto-rafraîchissement toutes les 10 secondes
        </p>
      </main>
    </div>
  )
}
