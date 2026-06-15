import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import KpiCard from '../components/KpiCard'
import StatusBadge from '../components/StatusBadge'
import SubscriptionAlertBanner from '../components/SubscriptionAlertBanner'
import { fetchCourses, type Course } from '../api/courses'
import { useState } from 'react'
import { useAuthStore } from '../stores/authStore'


export default function DashboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['courses', { per_page: 50 }],
    queryFn: () => fetchCourses({ per_page: 50 }),
  })

  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const isPendingMarchant = user?.type === 'marchant' && !user.marchant?.validated_at

  const [copiedId, setCopiedId] = useState<number | null>(null)

  async function copyTrackingLink(course: Course, e: React.MouseEvent) {
    e.stopPropagation()   // empêche le clic de propager sur la <tr> qui navigue
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/t/${course.tracking_token}`)
      setCopiedId(course.id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      alert('Impossible de copier.')
    }
  }

  const courses: Course[] = data?.data ?? []

  // KPIs calculés depuis la liste reçue
  const today = new Date().toISOString().slice(0, 10)
  const inProgress = courses.filter((c) =>
    ['assigned', 'driver_to_pickup', 'at_pickup', 'picked_up', 'at_dropoff'].includes(c.status),
  ).length
  const awaiting = courses.filter((c) => c.status === 'awaiting_assignment').length
  const deliveredToday = courses.filter(
    (c) => c.status === 'delivered' && c.delivered_at?.startsWith(today),
  ).length
  const totalToday = courses.filter((c) => c.created_at.startsWith(today)).length

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader />

      <main className="max-w-7xl mx-auto p-6">
        <SubscriptionAlertBanner />

        {isPendingMarchant && (
            <div className="mb-6 bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg flex items-start gap-3">
            <span className="text-lg leading-none">⏳</span>
            <div className="text-sm">
              <p className="font-semibold">Compte en attente de validation</p>
              <p className="text-amber-700">
                Votre compte marchand est en cours de validation par un administrateur (sous 24h).
                Vous serez notifié dès qu'il sera actif.
              </p>
            </div>
          </div>
        )}

        {/* Action bar */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-airmess-dark">Tableau de bord</h2>
          {isPendingMarchant ? (
            <span
              className="bg-gray-200 text-gray-400 font-bold px-4 py-2 rounded-lg cursor-not-allowed"
              title="Disponible une fois votre compte validé"
            >
              + Nouvelle livraison
            </span>
          ) : (
            <Link
              to="/courses/new"
              className="bg-airmess-yellow text-airmess-dark font-bold px-4 py-2 rounded-lg hover:opacity-90"
            >
              + Nouvelle livraison
            </Link>
          )}

        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <KpiCard label="Courses du jour" value={totalToday} accent="yellow" />
          <KpiCard label="En cours" value={inProgress} accent="dark" />
          <KpiCard label="En attribution" value={awaiting} hint="livreur recherché" accent="gray" />
          <KpiCard label="Livrées aujourd'hui" value={deliveredToday} accent="yellow" />
        </div>

        {/* Liste des courses récentes */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h3 className="font-semibold text-airmess-dark">Courses récentes</h3>
          </div>

          {isLoading && (
            <div className="p-10 text-center text-gray-500">Chargement...</div>
          )}

          {error && (
            <div className="p-10 text-center text-red-600">
              Erreur de chargement. Vérifie que l'API tourne.
            </div>
          )}

          {!isLoading && !error && courses.length === 0 && (
            <div className="p-10 text-center text-gray-500">
              Aucune course pour le moment. Crée ta première livraison !
            </div>
          )}

          {!isLoading && courses.length > 0 && (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                <tr>
                  <th className="px-6 py-3 text-left">Référence</th>
                  <th className="px-6 py-3 text-left">Destination</th>
                  <th className="px-6 py-3 text-left">Statut</th>
                  <th className="px-6 py-3 text-left">Livreur</th>
                  <th className="px-6 py-3 text-right">Frais</th>
                  <th className="px-6 py-3 text-left">Créée</th>
                  <th className="px-6 py-3 text-center w-12"></th>  
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {courses.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => navigate(`/courses/${c.id}`)}
                    className="hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="px-6 py-3 font-mono text-xs">{c.reference}</td>
                    <td className="px-6 py-3">
                      <div className="font-medium">{c.destination_name}</div>
                      <div className="text-xs text-gray-500">
                        {c.destination_quartier}, {c.destination_city}
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="px-6 py-3 text-gray-600">
                      {c.driver?.user?.name ?? <span className="text-gray-400 italic">—</span>}
                    </td>
                    <td className="px-6 py-3 text-right font-mono">
                      {c.delivery_fee?.toLocaleString('fr-FR')} FCFA
                    </td>
                    <td className="px-6 py-3 text-xs text-gray-500">
                      {new Date(c.created_at).toLocaleString('fr-FR', {
                        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
                      })}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <button
                        onClick={(e) => copyTrackingLink(c, e)}
                        title="Copier le lien de suivi"
                        className="text-gray-400 hover:text-airmess-dark p-1 rounded hover:bg-gray-100"
                      >
                        {copiedId === c.id ? '✓' : '🔗'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  )
}
