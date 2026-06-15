import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import AdminHeader from '../../components/AdminHeader'
import StatusBadge from '../../components/StatusBadge'
import { fetchAdminCourses, fetchAdminDrivers, reassignCourse } from '../../api/admin'
import type { Course } from '../../api/courses'
import { AxiosError } from 'axios'


export default function AdminCoursesPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [reassignFor, setReassignFor] = useState<Course | null>(null)
  const [newDriverId, setNewDriverId] = useState<number | ''>('')
  const [reassignReason, setReassignReason] = useState('')

  const coursesQuery = useQuery({
    queryKey: ['admin', 'courses', { search, statusFilter }],
    queryFn: () => fetchAdminCourses({
      q: search || undefined,
      status: statusFilter || undefined,
      per_page: 30,
    }),
    refetchInterval: 20_000,
  })

  const driversQuery = useQuery({
    queryKey: ['admin', 'drivers'],
    queryFn: fetchAdminDrivers,
  })

  const reassignMutation = useMutation({
    mutationFn: () =>
      reassignCourse(reassignFor!.id, Number(newDriverId), reassignReason || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'courses'] })
      setReassignFor(null)
      setNewDriverId('')
      setReassignReason('')
    },
    onError: (err) => {
      const message =
        err instanceof AxiosError
          ? err.response?.data?.message ?? 'Réaffectation impossible.'
          : 'Réaffectation impossible.'
      window.alert(message)
    },

  })

  const courses = coursesQuery.data?.data ?? []

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />

      <main className="max-w-7xl mx-auto p-6">
        <h2 className="text-2xl font-bold text-airmess-dark mb-4">Toutes les courses</h2>

        {/* Filtres */}
        <div className="flex flex-wrap gap-3 mb-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher (référence, marchand, destinataire)"
            className="flex-1 min-w-[250px] px-3 py-2 border border-gray-300 rounded-lg"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="">Tous statuts</option>
            <option value="awaiting_assignment">En attribution</option>
            <option value="assigned">Acceptée</option>
            <option value="picked_up">En cours</option>
            <option value="delivered">Livrée</option>
            <option value="cancelled">Annulée</option>
            <option value="failed">Échec</option>
            <option value="disputed">Litige</option>
          </select>
        </div>

        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {coursesQuery.isLoading && <div className="p-10 text-center text-gray-500">Chargement...</div>}

          {courses.length === 0 && !coursesQuery.isLoading && (
            <div className="p-10 text-center text-gray-500">Aucune course.</div>
          )}

          {courses.length > 0 && (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3 text-left">Référence</th>
                  <th className="px-4 py-3 text-left">Marchand</th>
                  <th className="px-4 py-3 text-left">Destination</th>
                  <th className="px-4 py-3 text-left">Statut</th>
                  <th className="px-4 py-3 text-left">Livreur</th>
                  <th className="px-4 py-3 text-left">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {courses.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs">
                      <Link to={`/courses/${c.id}`} className="hover:underline">{c.reference}</Link>
                    </td>
                    <td className="px-4 py-3">{c.origin_name}</td>
                    <td className="px-4 py-3">
                      {c.destination_name}<br />
                      <span className="text-xs text-gray-500">{c.destination_quartier}</span>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                    <td className="px-4 py-3 text-gray-600">
                      {c.driver?.user?.name ?? <span className="italic text-gray-400">non assigné</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {!['delivered', 'cancelled', 'failed', 'picked_up', 'at_dropoff'].includes(c.status) && (
                        <button
                          onClick={() => setReassignFor(c)}
                          className="text-airmess-red hover:underline text-xs"
                        >
                          Réaffecter
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Modal réaffectation */}
        {reassignFor && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6">
              <h3 className="text-lg font-bold text-airmess-dark mb-2">
                Réaffecter {reassignFor.reference}
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Sélectionne le nouveau livreur et donne un motif.
              </p>

              <label className="block text-sm font-medium mb-1">Nouveau livreur</label>
              <select
                value={newDriverId}
                onChange={(e) => setNewDriverId(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-3"
              >
                <option value="">— Choisir —</option>
                {(driversQuery.data ?? [])
                  .filter((d) => d.availability_status === 'available')
                  .map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.user.name} ({d.vehicle_type})
                    </option>
                  ))}
              </select>

              <label className="block text-sm font-medium mb-1">Motif</label>
              <textarea
                value={reassignReason}
                onChange={(e) => setReassignReason(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-3"
                placeholder="ex: Livreur en panne, ne répond plus"
              />

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setReassignFor(null)}
                  className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  onClick={() => reassignMutation.mutate()}
                  disabled={!newDriverId || reassignMutation.isPending}
                  className="px-4 py-2 rounded-lg bg-airmess-yellow text-airmess-dark font-bold disabled:opacity-50"
                >
                  {reassignMutation.isPending ? 'Réaffectation...' : 'Confirmer'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
