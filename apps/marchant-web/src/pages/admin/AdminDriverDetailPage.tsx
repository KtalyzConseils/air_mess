import { useState, type ReactNode } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import AdminHeader from '../../components/AdminHeader'
import KpiCard from '../../components/KpiCard'
import { fetchDriver, validateDriver, openDriverDocument } from '../../api/admin'
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
  const queryClient = useQueryClient()
  const [docError, setDocError] = useState<string | null>(null)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'driver', id],
    queryFn: () => fetchDriver(id!),
    enabled: !!id,
  })

  const validateMutation = useMutation({
    mutationFn: () => validateDriver(Number(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'driver', id] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'drivers'] })
    },
  })

  async function handleOpenDocument(type: 'photo' | 'cni' | 'driving_license') {
    setDocError(null)
    try {
      await openDriverDocument(Number(id), type)
    } catch (err) {
      setDocError(
        err instanceof AxiosError
          ? (err.response?.data as { message?: string })?.message ?? 'Impossible d\'ouvrir ce document.'
          : 'Erreur inattendue.',
      )
    }
  }

  const validateError =
    validateMutation.error instanceof AxiosError
      ? (validateMutation.error.response?.data as { message?: string })?.message ?? 'Erreur lors de la validation.'
      : null

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />
      <main className="max-w-4xl mx-auto p-4 md:p-6">
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

            {/* Bandeau de validation (visible uniquement si pending) */}
            {data.driver.activation_status === 'pending' && (
              <section className="mt-6 bg-amber-50 border-2 border-amber-300 rounded-2xl p-5">
                <h3 className="font-bold text-amber-900 mb-2">⏳ Validation en attente</h3>
                <p className="text-sm text-amber-800 mb-3">
                  Ce livreur attend la vérification de ses documents (CNI + permis). Vérifiez-les ci-dessous
                  avant d'activer son compte.
                </p>
                <button
                  onClick={() => validateMutation.mutate()}
                  disabled={validateMutation.isPending}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg font-semibold text-sm hover:bg-green-700 disabled:opacity-50"
                >
                  {validateMutation.isPending ? 'Validation…' : '✓ Valider ce livreur'}
                </button>
                {validateError && (
                  <p className="text-sm text-red-600 mt-2">⚠️ {validateError}</p>
                )}
              </section>
            )}

            {/* Documents */}
            <section className="mt-6 bg-white rounded-2xl shadow-sm p-6">
              <h3 className="font-semibold text-airmess-dark mb-3">📄 Documents</h3>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => handleOpenDocument('cni')}
                  disabled={!data.driver.cni_url}
                  className="px-4 py-2 bg-airmess-dark text-white rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-30"
                >
                  🪪 Voir CNI
                </button>
                <button
                  onClick={() => handleOpenDocument('driving_license')}
                  disabled={!data.driver.driving_license_url}
                  className="px-4 py-2 bg-airmess-dark text-white rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-30"
                >
                  🛂 Voir Permis
                </button>
                <button
                  onClick={() => handleOpenDocument('photo')}
                  disabled={!data.driver.photo_url}
                  className="px-4 py-2 bg-gray-200 text-airmess-dark rounded-lg text-sm font-semibold hover:bg-gray-300 disabled:opacity-30"
                >
                  📷 {data.driver.photo_url ? 'Voir photo' : 'Pas de photo'}
                </button>
              </div>
              {docError && <p className="text-sm text-red-600 mt-2">⚠️ {docError}</p>}
              <p className="text-xs text-gray-500 mt-3">
                Les documents s'ouvrent dans un nouvel onglet (autorisez les popups pour ce site).
              </p>
            </section>

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
