import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import AdminPageShell from '../../components/admin/AdminPageShell'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import { AdminButton } from '../../components/admin/AdminToolbar'
import { fetchAdminDrivers, fetchUnassignedCourses, markOfferViewed, rebroadcastCourse, reassignCourse, type UnassignedCourse } from '../../api/admin'
import { useAuthStore } from '../../stores/authStore'
import { hasAdminRole } from '../../lib/permissions'
import { cancelCourseAsSupport } from '../../api/support'

type Severity = 'new' | 'watch' | 'urgent' | 'critical'
type QueueFilter = 'all' | 'express' | 'standard' | 'none_available_nearby' | 'all_nearby_busy' | 'broadcast_no_response' | 'all_contacted_declined'

const severityMeta: Record<Severity, { label: string; accent: string; badge: string }> = {
  new: { label: 'Nouvelle', accent: 'border-l-warm-300', badge: 'bg-warm-100 text-warm-600' },
  watch: { label: 'À surveiller', accent: 'border-l-airmess-yellow', badge: 'bg-airmess-yellow/20 text-ink' },
  urgent: { label: 'Urgent', accent: 'border-l-orange-500', badge: 'bg-orange-100 text-orange-800' },
  critical: { label: 'Critique', accent: 'border-l-airmess-red', badge: 'bg-danger-bg text-airmess-red' },
}

function severity(course: UnassignedCourse): Severity {
  const minutes = course.offer_age_seconds / 60
  const levels = course.urgency === 'express' ? [5, 10, 15] : [720, 1200, 1440]
  if (minutes >= levels[2]) return 'critical'
  if (minutes >= levels[1]) return 'urgent'
  if (minutes >= levels[0]) return 'watch'
  return 'new'
}

function age(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} min`
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')}`
}

const filters: { value: QueueFilter; label: string }[] = [
  { value: 'all', label: 'Toutes' },
  { value: 'express', label: 'Express' },
  { value: 'standard', label: 'Standard' },
  { value: 'none_available_nearby', label: 'Aucun à proximité' },
  { value: 'all_nearby_busy', label: 'Tous occupés' },
  { value: 'broadcast_no_response', label: 'Sans réponse' },
  { value: 'all_contacted_declined', label: 'Tous refusés' },
]

export default function AdminUnassignedCoursesPage() {
  const queryClient = useQueryClient()
  const user = useAuthStore((state) => state.user)
  const canOps = hasAdminRole(user, 'ops')
  const canArchive = hasAdminRole(user, 'ops', 'support')
  const [assigning, setAssigning] = useState<number | null>(null)
  const [driverId, setDriverId] = useState<number | ''>('')
  const [filter, setFilter] = useState<QueueFilter>('all')
  const queue = useQuery({ queryKey: ['admin', 'courses-unassigned'], queryFn: fetchUnassignedCourses, refetchInterval: 20_000 })
  const drivers = useQuery({ queryKey: ['admin', 'drivers'], queryFn: fetchAdminDrivers })
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['admin', 'courses-unassigned'] })
  const relaunch = useMutation({ mutationFn: rebroadcastCourse, onSuccess: refresh, onError: () => window.alert('Relance impossible.') })
  const archive = useMutation({
    mutationFn: ({ courseId, reason }: { courseId: number; reason: string }) => cancelCourseAsSupport(courseId, reason),
    onSuccess: () => void refresh(),
    onError: () => window.alert('Annulation impossible. La course a peut-être déjà été prise par un livreur.'),
  })
  const assign = useMutation({
    mutationFn: ({ courseId, selected }: { courseId: number; selected: number }) => reassignCourse(courseId, selected, 'Assignation depuis la file sans livreur'),
    onSuccess: () => { setAssigning(null); setDriverId(''); void refresh() },
    onError: () => window.alert('Assignation impossible.'),
  })
  const available = (drivers.data ?? []).filter((d) => d.availability_status === 'available' && ['active', 'validated'].includes(d.activation_status))
  const allCourses = queue.data?.courses ?? []
  const counts = useMemo(() => allCourses.reduce<Record<Severity, number>>((result, course) => {
    result[severity(course)] += 1
    return result
  }, { new: 0, watch: 0, urgent: 0, critical: 0 }), [allCourses])
  const visibleCourses = useMemo(() => allCourses.filter((course) => {
    if (filter === 'all') return true
    if (filter === 'express' || filter === 'standard') return course.urgency === filter
    return course.assignment_diagnostic.code === filter
  }), [allCourses, filter])

  return <AdminPageShell>
    <AdminPageHeader title="Courses sans livreur" subtitle={`${queue.data?.count ?? 0} course(s) à prendre en charge`} />
    <div className="px-4 py-5 md:px-6 lg:px-8">
      <section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {(['watch', 'urgent', 'critical', 'new'] as Severity[]).map((key) => <div key={key} className={`rounded-lg border border-l-4 border-warm-200 ${severityMeta[key].accent} bg-off-white p-3`}>
          <p className="text-caption font-semibold text-warm-500">{severityMeta[key].label}</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-ink">{counts[key]}</p>
        </div>)}
      </section>

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {filters.map((item) => <button key={item.value} onClick={() => setFilter(item.value)} className={`shrink-0 rounded-full border px-3 py-1.5 text-caption font-semibold transition-colors ${filter === item.value ? 'border-ink bg-ink text-white' : 'border-warm-300 bg-off-white text-warm-600 hover:border-warm-500'}`}>{item.label}</button>)}
      </div>

      <div className="space-y-3">
        {queue.isLoading && <div className="p-10 text-center text-warm-500">Chargement…</div>}
        {visibleCourses.map((course) => {
          const level = severity(course)
          const meta = severityMeta[level]
          const diagnostic = course.assignment_diagnostic
          return <article key={course.id} className={`rounded-lg border border-l-4 border-warm-200 ${meta.accent} bg-off-white p-4 shadow-sm`}>
            <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-caption font-bold ${meta.badge}`}>{meta.label}</span>
                  <span className="rounded-full border border-warm-300 px-2 py-0.5 text-caption font-bold">{course.urgency === 'express' ? 'Express' : 'Standard'}</span>
                  <span className="font-mono text-caption font-bold text-warm-600">{course.reference}</span>
                </div>
                <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-body-s font-semibold text-ink">{course.origin_quartier}</p>
                    <p className="my-0.5 text-caption text-warm-400">↓ vers</p>
                    <p className="text-body-s font-semibold text-ink">{course.destination_quartier}</p>
                  </div>
                  <div className="text-left lg:text-right">
                    <p className="text-caption text-warm-500">Sans livreur depuis</p>
                    <p className="text-2xl font-extrabold tabular-nums text-ink">{age(course.offer_age_seconds)}</p>
                  </div>
                </div>
                <div className="mt-3 rounded-md border border-warning/25 bg-warning-bg/60 px-3 py-2">
                  <p className="text-body-s font-bold text-ink">⚠ {diagnostic.warning}</p>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-caption text-warm-600">
                    <span>{diagnostic.contacted_count} contacté(s)</span><span>{diagnostic.declined_count} refus</span>
                    <span>{diagnostic.available_within_radius} disponible(s) à moins de 8 km</span><span>{diagnostic.busy_within_radius} occupé(s) dans la zone</span>
                    {diagnostic.nearest_available_outside_km !== null && <span>Plus proche hors zone : <strong>{diagnostic.nearest_available_outside_km.toLocaleString('fr-FR')} km</strong></span>}
                  </div>
                </div>
                {course.offer_admin_actions?.length ? <p className="mt-2 text-caption text-warm-500">Dernière action : {course.offer_admin_actions[0].action} par {course.offer_admin_actions[0].admin_user?.name ?? 'admin'}</p> : null}
              </div>
              <div className="flex flex-wrap content-start gap-2 lg:w-48 lg:flex-col">
                {canOps && <AdminButton size="sm" variant="primary" className="lg:w-full" onClick={() => { setAssigning(course.id); setDriverId('') }}>Assigner</AdminButton>}
                {canOps && <AdminButton size="sm" className="lg:w-full" onClick={() => relaunch.mutate(course.id)} disabled={relaunch.isPending}>Relancer</AdminButton>}
                <Link to={`/courses/${course.id}`} onClick={() => void markOfferViewed(course.id)} className="inline-flex h-8 items-center justify-center rounded-md border border-warm-300 px-3 text-caption font-medium lg:w-full">Voir les détails</Link>
                {canArchive && <AdminButton size="sm" variant="danger" className="lg:w-full" disabled={archive.isPending} onClick={() => {
                  const reason = window.prompt(`Motif obligatoire pour annuler et archiver ${course.reference} :`)?.trim()
                  if (!reason) return
                  if (!window.confirm(`Confirmer l'annulation et l'archivage de ${course.reference} ? Cette action libérera le montant réservé.`)) return
                  archive.mutate({ courseId: course.id, reason })
                }}>Annuler et archiver</AdminButton>}
              </div>
            </div>
            {canOps && assigning === course.id && <div className="mt-4 flex flex-wrap gap-2 border-t border-warm-200 pt-3">
              <select className="h-9 min-w-[260px] rounded-md border border-warm-300 bg-white px-3" value={driverId} onChange={(e) => setDriverId(e.target.value ? Number(e.target.value) : '')}>
                <option value="">Choisir un livreur disponible</option>
                {available.map((d) => <option key={d.id} value={d.id}>{d.first_name} {d.last_name} · {d.vehicle_type}</option>)}
              </select>
              <AdminButton variant="primary" disabled={!driverId || assign.isPending} onClick={() => driverId && assign.mutate({ courseId: course.id, selected: Number(driverId) })}>Confirmer</AdminButton>
              <AdminButton variant="ghost" onClick={() => setAssigning(null)}>Annuler</AdminButton>
            </div>}
          </article>
        })}
        {!queue.isLoading && visibleCourses.length === 0 && <div className="rounded-lg border border-warm-200 bg-off-white p-10 text-center text-warm-500">Aucune course ne correspond à ce filtre.</div>}
      </div>
    </div>
  </AdminPageShell>
}
