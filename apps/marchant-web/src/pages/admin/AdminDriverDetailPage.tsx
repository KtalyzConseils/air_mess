import { type ReactNode } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import AdminHeader from '../../components/AdminHeader'
import KpiCard from '../../components/KpiCard'
import { fetchDriver } from '../../api/admin'
import DriverPayoutsSection from '../../components/admin/DriverPayoutsSection'

function formatDate(value: string | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between py-2 border-b border-gray-50 last:border-0">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-airmess-dark text-right">{children}</span>
    </div>
  )
}

const AVAILABILITY: Record<string, { label: string; classes: string }> = {
  available: { label: 'Disponible', classes: 'bg-green-100 text-green-800' },
  busy:      { label: 'Occupé',     classes: 'bg-amber-100 text-amber-800' },
  on_break:  { label: 'En pause',   classes: 'bg-gray-100 text-gray-700' },
  offline:   { label: 'Hors-ligne', classes: 'bg-gray-200 text-gray-500' },
}
const ACTIVATION: Record<string, { label: string; classes: string }> = {
  pending:   { label: 'En attente', classes: 'bg-amber-100 text-amber-800' },
  validated: { label: 'Validé',     classes: 'bg-blue-100 text-blue-800' },
  active:    { label: 'Actif',      classes: 'bg-green-100 text-green-800' },
  suspended: { label: 'Suspendu',   classes: 'bg-red-100 text-red-800' },
}
function Badge({ map, value }: { map: Record<string, { label: string; classes: string }>; value: string }) {
  const meta = map[value] ?? { label: value, classes: 'bg-gray-100 text-gray-700' }
  return <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${meta.classes}`}>{meta.label}</span>
}

export default function AdminDriverDetailPage() {
  const { id } = useParams<{ id: string }>()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'driver', id],
    queryFn: () => fetchDriver(id!),
    enabled: !!id,
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />
      <main className="max-w-4xl mx-auto p-6">
        <Link to="/admin/drivers" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-airmess-dark mb-4">
          ← Retour aux livreurs
        </Link>

        {isLoading && <p className="text-gray-500">Chargement…</p>}
        {isError && <p className="text-red-600">Livreur introuvable.</p>}

        {data && (
          <>
            {/* En-tête */}
            <div className="flex items-center gap-3 mb-6">
              <h2 className="text-2xl font-bold text-airmess-dark">
                {data.driver.first_name} {data.driver.last_name}
              </h2>
              <Badge map={AVAILABILITY} value={data.driver.availability_status} />
              <Badge map={ACTIVATION} value={data.driver.activation_status} />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {/* Identité & contact */}
              <section className="bg-white rounded-2xl shadow-sm p-6">
                <h3 className="font-semibold text-airmess-dark mb-3">Identité & contact</h3>
                <Row label="Genre">{data.driver.gender ?? '—'}</Row>
                <Row label="Naissance">{formatDate(data.driver.birth_date)}</Row>
                <Row label="Téléphone">{data.driver.user.phone ?? '—'}</Row>
                <Row label="Email">{data.driver.user.email}</Row>
              </section>

              {/* Véhicule */}
              <section className="bg-white rounded-2xl shadow-sm p-6">
                <h3 className="font-semibold text-airmess-dark mb-3">Véhicule</h3>
                <Row label="Type">{data.driver.vehicle_type}</Row>
                <Row label="Plaque">{data.driver.vehicle_plate ?? '—'}</Row>
                <Row label="Couleur">{data.driver.vehicle_color ?? '—'}</Row>
              </section>

              {/* Contact d'urgence */}
              <section className="bg-white rounded-2xl shadow-sm p-6">
                <h3 className="font-semibold text-airmess-dark mb-3">Contact d'urgence</h3>
                <Row label="Nom">{data.driver.emergency_contact_name ?? '—'}</Row>
                <Row label="Téléphone">{data.driver.emergency_contact_phone ?? '—'}</Row>
                <Row label="Dernière position">{formatDate(data.driver.last_position_at)}</Row>
              </section>

              {/* Performance */}
              <section className="bg-white rounded-2xl shadow-sm p-6">
                <h3 className="font-semibold text-airmess-dark mb-3">Performance</h3>
                <Row label="Taux d'acceptation">{data.driver.acceptance_rate}%</Row>
                <Row label="Incidents">{data.driver.incidents_count}</Row>
              </section>
            </div>

            {/* Stats de courses */}
            <section className="mt-6">
              <h3 className="font-semibold text-airmess-dark mb-3">Activité — courses</h3>
              <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
                <KpiCard label="Total" value={data.stats.courses_total} accent="dark" />
                <KpiCard label="Livrées" value={data.stats.courses_delivered} accent="yellow" />
                <KpiCard label="En cours" value={data.stats.courses_in_progress} accent="gray" />
                <KpiCard label="Échecs" value={data.stats.courses_failed} accent="red" />
              </div>
              <p className="text-sm text-gray-600 mt-3">
                Gains cumulés : <strong>{data.stats.total_earnings.toLocaleString('fr-FR')} FCFA</strong>
                {' · '}Dernière livraison : {formatDate(data.stats.last_delivery_at)}
              </p>
            </section>
            <DriverPayoutsSection driverId={data.driver.id} />
          </>
        )}
      </main>
    </div>
  )
}
