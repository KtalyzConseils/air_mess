import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import AdminPageShell from '../../components/admin/AdminPageShell'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import { AdminButton } from '../../components/admin/AdminToolbar'
import { fetchAdminDrivers, fetchUnassignedCourses, markOfferViewed, rebroadcastCourse, reassignCourse, type UnassignedCourse } from '../../api/admin'
import { useAuthStore } from '../../stores/authStore'
import { hasAdminRole } from '../../lib/permissions'
import { cancelCourseAsSupport } from '../../api/support'

type Severity = 'new' | 'watch' | 'urgent' | 'critical'
type QueueFilter = 'all' | 'none_available_nearby' | 'all_nearby_busy' | 'broadcast_no_response' | 'all_contacted_declined'

const severityMeta: Record<Severity, { accent: string; badge: string }> = {
  new: { accent: 'border-l-warm-300', badge: 'bg-warm-100 text-warm-600' },
  watch: { accent: 'border-l-airmess-yellow', badge: 'bg-airmess-yellow/20 text-ink' },
  urgent: { accent: 'border-l-orange-500', badge: 'bg-orange-100 text-orange-800' },
  critical: { accent: 'border-l-airmess-red', badge: 'bg-danger-bg text-airmess-red' },
}

function severity(course: UnassignedCourse): Severity {
  const minutes = course.offer_age_seconds / 60
  const levels = course.urgency === 'express' ? [5, 10, 15] : [720, 1200, 1440]
  if (minutes >= levels[2]) return 'critical'
  if (minutes >= levels[1]) return 'urgent'
  if (minutes >= levels[0]) return 'watch'
  return 'new'
}

function age(seconds: number, t: TFunction) {
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return t('admin.unassignedCourses.ageMinutes', { count: minutes })
  return t('admin.unassignedCourses.ageHoursMinutes', { hours: Math.floor(minutes / 60), minutes: String(minutes % 60).padStart(2, '0') })
}

const filterValues: QueueFilter[] = ['all', 'none_available_nearby', 'all_nearby_busy', 'broadcast_no_response', 'all_contacted_declined']

export default function AdminUnassignedCoursesPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language === 'en' ? 'en-US' : 'fr-FR'
  const queryClient = useQueryClient()
  const user = useAuthStore((state) => state.user)
  const canOps = hasAdminRole(user, 'ops')
  const canArchive = hasAdminRole(user, 'ops', 'support')
  const [assigning, setAssigning] = useState<number | null>(null)
  const [driverId, setDriverId] = useState<number | ''>('')
  const [filter, setFilter] = useState<QueueFilter>('all')
  const [levelFilter, setLevelFilter] = useState<Severity | 'all'>('all')
  const [urgencyFilter, setUrgencyFilter] = useState<'all' | 'express' | 'standard'>('all')
  const [selected, setSelected] = useState<number[]>([])
  const [bulkResult, setBulkResult] = useState<string | null>(null)
  const queue = useQuery({ queryKey: ['admin', 'courses-unassigned'], queryFn: fetchUnassignedCourses, refetchInterval: 20_000 })
  const drivers = useQuery({ queryKey: ['admin', 'drivers'], queryFn: fetchAdminDrivers })
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['admin', 'courses-unassigned'] })
  const relaunch = useMutation({ mutationFn: rebroadcastCourse, onSuccess: refresh, onError: () => window.alert(t('admin.unassignedCourses.relaunchError')) })
  const archive = useMutation({
    mutationFn: ({ courseId, reason }: { courseId: number; reason: string }) => cancelCourseAsSupport(courseId, reason),
    onSuccess: () => void refresh(),
    onError: () => window.alert(t('admin.unassignedCourses.archiveError')),
  })
  const assign = useMutation({
    mutationFn: ({ courseId, selected }: { courseId: number; selected: number }) => reassignCourse(courseId, selected, t('admin.unassignedCourses.assignReason')),
    onSuccess: () => { setAssigning(null); setDriverId(''); void refresh() },
    onError: () => window.alert(t('admin.unassignedCourses.assignError')),
  })
  const available = (drivers.data ?? []).filter((d) => d.availability_status === 'available' && ['active', 'validated'].includes(d.activation_status))
  const allCourses = useMemo(() => queue.data?.courses ?? [], [queue.data])
  const counts = useMemo(() => allCourses.reduce<Record<Severity, number>>((result, course) => {
    result[severity(course)] += 1
    return result
  }, { new: 0, watch: 0, urgent: 0, critical: 0 }), [allCourses])
  const visibleCourses = useMemo(() => allCourses.filter((course) => {
    if (levelFilter !== 'all' && severity(course) !== levelFilter) return false
    if (urgencyFilter !== 'all' && course.urgency !== urgencyFilter) return false
    if (filter === 'all') return true
    return course.assignment_diagnostic.code === filter
  }).sort((a, b) => {
    const urgency = Number(b.urgency === 'express') - Number(a.urgency === 'express')
    if (urgency) return urgency
    const oldestFirst = levelFilter === 'urgent' || levelFilter === 'critical'
    return (oldestFirst ? b.offer_age_seconds - a.offer_age_seconds : a.offer_age_seconds - b.offer_age_seconds) || a.id - b.id
  }), [allCourses, filter, levelFilter, urgencyFilter])
  const selectedCourses = visibleCourses.filter((course) => selected.includes(course.id))
  const bulkArchive = useMutation({
    mutationFn: async ({ courses, reason }: { courses: UnassignedCourse[]; reason: string }) => {
      const succeeded: number[] = []
      const failures: string[] = []
      for (const course of courses) {
        try {
          await cancelCourseAsSupport(course.id, reason)
          succeeded.push(course.id)
        } catch (error: unknown) {
          const message = (error as { response?: { data?: { message?: string } } }).response?.data?.message
          failures.push(`${course.reference} : ${message ?? 'Action impossible ; vérifie la connexion ou le statut de la course.'}`)
        }
      }
      return { succeeded, failures }
    },
    onSuccess: ({ succeeded, failures }) => {
      setSelected((ids) => ids.filter((id) => !succeeded.includes(id)))
      setBulkResult(`${succeeded.length} course(s) annulée(s) et archivée(s). ${failures.length} échec(s).${failures.length ? '\n' + failures.join('\n') : ''}`)
      void refresh()
      void queryClient.invalidateQueries({ queryKey: ['admin', 'courses-archived'] })
    },
  })

  return <AdminPageShell>
    <AdminPageHeader title={t('admin.unassignedCourses.title')} subtitle={t('admin.unassignedCourses.subtitle', { count: queue.data?.count ?? 0 })} />
    <div className="px-4 py-5 md:px-6 lg:px-8">
      <section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {(['watch', 'urgent', 'critical', 'new'] as Severity[]).map((key) => <button type="button" disabled={bulkArchive.isPending} aria-pressed={levelFilter === key} onClick={() => { setLevelFilter(levelFilter === key ? 'all' : key); setSelected([]) }} key={key} className={`text-left rounded-lg border border-l-4 border-warm-200 ${severityMeta[key].accent} ${levelFilter === key ? 'ring-2 ring-ink' : ''} bg-off-white p-3`}>
          <p className="text-caption font-semibold text-warm-500">{t(`admin.unassignedCourses.severity.${key}`)}</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-ink">{counts[key]}</p>
        </button>)}
      </section>

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {filterValues.map((value) => <button disabled={bulkArchive.isPending} key={value} onClick={() => { setFilter(value); setSelected([]) }} className={`shrink-0 rounded-full border px-3 py-1.5 text-caption font-semibold transition-colors ${filter === value ? 'border-ink bg-ink text-white' : 'border-warm-300 bg-off-white text-warm-600 hover:border-warm-500'}`}>{t(`admin.unassignedCourses.filters.${value}`)}</button>)}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3 text-caption">
        <div className="flex items-center gap-2" role="group" aria-label="Type de course">
          <span>Type :</span>
          {(['express', 'standard'] as const).map((type) => <button type="button" key={type} disabled={bulkArchive.isPending} aria-pressed={urgencyFilter === type} onClick={() => { setUrgencyFilter(urgencyFilter === type ? 'all' : type); setSelected([]) }} className={`rounded-full border px-3 py-1.5 font-semibold ${urgencyFilter === type ? 'border-ink bg-ink text-white' : 'border-warm-300 bg-off-white text-warm-600'}`}>{type === 'express' ? 'Express' : 'Standard'}</button>)}
        </div>
        <label>Niveau : <select disabled={bulkArchive.isPending} value={levelFilter} onChange={(e) => { setLevelFilter(e.target.value as typeof levelFilter); setSelected([]) }} className="rounded border border-warm-300 bg-white p-2"><option value="all">Tous les niveaux</option>{Object.keys(severityMeta).map((key) => <option key={key} value={key}>{t(`admin.unassignedCourses.severity.${key}`)}</option>)}</select></label>
        <span>{visibleCourses.length} résultat(s) · Express puis Standard · {levelFilter === 'urgent' || levelFilter === 'critical' ? 'Diffusions les plus anciennes en premier' : 'Diffusions les plus récentes en premier'}</span>
      </div>
      {canArchive && <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-warm-300 bg-off-white p-3">
        <label className="flex items-center gap-2 text-caption"><input type="checkbox" disabled={bulkArchive.isPending || !visibleCourses.length} checked={visibleCourses.length > 0 && selectedCourses.length === visibleCourses.length} onChange={(e) => setSelected(e.target.checked ? visibleCourses.map((course) => course.id) : [])} />Tout sélectionner ({visibleCourses.length})</label>
        <span className="text-caption">{selectedCourses.length} sélectionnée(s)</span>
        <AdminButton variant="danger" disabled={!selectedCourses.length || bulkArchive.isPending || archive.isPending} onClick={() => {
          const courses = [...selectedCourses]
          const reason = window.prompt(`Motif obligatoire pour annuler et archiver les ${courses.length} courses sélectionnées :`)?.trim()
          if (!reason) return
          if (reason.length > 500) { window.alert('Le motif doit contenir au maximum 500 caractères.'); return }
          if (!window.confirm(`Annuler et archiver ${courses.length} course(s) ? Les réservations ou paiements seront traités selon les règles habituelles. Les courses déjà prises seront exclues.`)) return
          setBulkResult(null)
          bulkArchive.mutate({ courses, reason })
        }}>{bulkArchive.isPending ? 'Annulation et archivage en cours…' : 'Annuler et archiver la sélection'}</AdminButton>
      </div>}
      {bulkResult && <div role="status" className="mb-4 whitespace-pre-wrap rounded-lg border border-warm-300 bg-off-white p-3 text-body-s">{bulkResult}</div>}

      <div className="space-y-3">
        {queue.isLoading && <div className="p-10 text-center text-warm-500">{t('admin.unassignedCourses.loading')}</div>}
        {visibleCourses.map((course) => {
          const level = severity(course)
          const meta = severityMeta[level]
          const diagnostic = course.assignment_diagnostic
          return <article key={course.id} className={`rounded-lg border border-l-4 border-warm-200 ${meta.accent} bg-off-white p-4 shadow-sm`}>
            <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  {canArchive && <input type="checkbox" aria-label={`Sélectionner ${course.reference}`} disabled={bulkArchive.isPending} checked={selected.includes(course.id)} onChange={(e) => setSelected((ids) => e.target.checked ? [...ids, course.id] : ids.filter((id) => id !== course.id))} />}
                  <span className={`rounded-full px-2.5 py-1 text-caption font-bold ${meta.badge}`}>{t(`admin.unassignedCourses.severity.${level}`)}</span>
                  <span className="rounded-full border border-warm-300 px-2 py-0.5 text-caption font-bold">{t(`admin.unassignedCourses.filters.${course.urgency === 'express' ? 'express' : 'standard'}`)}</span>
                  <span className="font-mono text-caption font-bold text-warm-600">{course.reference}</span>
                </div>
                <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-body-s font-semibold text-ink">{course.origin_quartier}</p>
                    <p className="my-0.5 text-caption text-warm-400">↓ vers</p>
                    <p className="text-body-s font-semibold text-ink">{course.destination_quartier}</p>
                  </div>
                  <div className="text-left lg:text-right">
                    <p className="text-caption text-warm-500">{t('admin.unassignedCourses.sinceNoDriver')}</p>
                    <p className="text-2xl font-extrabold tabular-nums text-ink">{age(course.offer_age_seconds, t)}</p>
                  </div>
                </div>
                <div className="mt-3 rounded-md border border-warning/25 bg-warning-bg/60 px-3 py-2">
                  <p className="text-body-s font-bold text-ink">⚠ {diagnostic.warning}</p>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-caption text-warm-600">
                    <span>{t('admin.unassignedCourses.contactedCount', { count: diagnostic.contacted_count })}</span><span>{t('admin.unassignedCourses.declinedCount', { count: diagnostic.declined_count })}</span>
                    <span>{t('admin.unassignedCourses.availableWithinRadius', { count: diagnostic.available_within_radius })}</span><span>{t('admin.unassignedCourses.busyWithinRadius', { count: diagnostic.busy_within_radius })}</span>
                    {diagnostic.nearest_available_outside_km !== null && <span>{t('admin.unassignedCourses.nearestOutside', { km: diagnostic.nearest_available_outside_km.toLocaleString(locale) })}</span>}
                  </div>
                </div>
                {course.offer_admin_actions?.length ? <p className="mt-2 text-caption text-warm-500">{t('admin.unassignedCourses.lastAction', { action: course.offer_admin_actions[0].action, admin: course.offer_admin_actions[0].admin_user?.name ?? t('admin.unassignedCourses.anAdmin') })}</p> : null}
              </div>
              <div className="flex flex-wrap content-start gap-2 lg:w-48 lg:flex-col">
                {canOps && <AdminButton size="sm" variant="primary" className="lg:w-full" onClick={() => { setAssigning(course.id); setDriverId('') }}>{t('admin.unassignedCourses.assign')}</AdminButton>}
                {canOps && <AdminButton size="sm" className="lg:w-full" onClick={() => relaunch.mutate(course.id)} disabled={relaunch.isPending}>{t('admin.unassignedCourses.relaunch')}</AdminButton>}
                <Link to={`/courses/${course.id}`} onClick={() => void markOfferViewed(course.id)} className="inline-flex h-8 items-center justify-center rounded-md border border-warm-300 px-3 text-caption font-medium lg:w-full">{t('admin.unassignedCourses.viewDetails')}</Link>
                {canArchive && <AdminButton size="sm" variant="danger" className="lg:w-full" disabled={archive.isPending || bulkArchive.isPending} onClick={() => {
                  const reason = window.prompt(t('admin.unassignedCourses.archiveReasonPrompt', { reference: course.reference }))?.trim()
                  if (!reason) return
                  if (!window.confirm(t('admin.unassignedCourses.archiveConfirm', { reference: course.reference }))) return
                  archive.mutate({ courseId: course.id, reason })
                }}>{t('admin.unassignedCourses.archiveAndCancel')}</AdminButton>}
              </div>
            </div>
            {canOps && assigning === course.id && <div className="mt-4 flex flex-wrap gap-2 border-t border-warm-200 pt-3">
              <select className="h-9 min-w-[260px] rounded-md border border-warm-300 bg-white px-3" value={driverId} onChange={(e) => setDriverId(e.target.value ? Number(e.target.value) : '')}>
                <option value="">{t('admin.unassignedCourses.chooseDriver')}</option>
                {available.map((d) => <option key={d.id} value={d.id}>{d.first_name} {d.last_name} · {d.vehicle_type}</option>)}
              </select>
              <AdminButton variant="primary" disabled={!driverId || assign.isPending} onClick={() => driverId && assign.mutate({ courseId: course.id, selected: Number(driverId) })}>{t('admin.unassignedCourses.confirm')}</AdminButton>
              <AdminButton variant="ghost" onClick={() => setAssigning(null)}>{t('admin.unassignedCourses.cancel')}</AdminButton>
            </div>}
          </article>
        })}
        {!queue.isLoading && visibleCourses.length === 0 && <div className="rounded-lg border border-warm-200 bg-off-white p-10 text-center text-warm-500">{t('admin.unassignedCourses.noneMatch')}</div>}
      </div>
    </div>
  </AdminPageShell>
}
