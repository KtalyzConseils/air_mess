import { useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import AdminPageShell from '../../components/admin/AdminPageShell'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import AdminPagination from '../../components/admin/AdminPagination'
import { AdminSearchInput } from '../../components/admin/AdminToolbar'
import { fetchArchivedCourses } from '../../api/admin'

function formatDate(value: string) {
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

export default function AdminArchivedCoursesPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const query = useQuery({
    queryKey: ['admin', 'courses-archived', { search, page }],
    queryFn: () => fetchArchivedCourses({ q: search || undefined, page, per_page: 30 }),
    placeholderData: keepPreviousData,
  })
  const courses = query.data?.data ?? []

  return <AdminPageShell>
    <AdminPageHeader
      title="Courses archivées"
      subtitle={`${query.data?.total ?? 0} course(s) annulée(s) et conservée(s)`}
      toolbar={<AdminSearchInput value={search} placeholder="Référence, retrait ou destination…" onChange={(event) => { setSearch(event.target.value); setPage(1) }} />}
    />
    <div className="px-4 py-5 md:px-6 lg:px-8">
      <div className="overflow-hidden rounded-lg border border-warm-200 bg-off-white">
        {query.isLoading ? <div className="p-10 text-center text-warm-500">Chargement…</div> : courses.length === 0 ? <div className="p-10 text-center text-warm-500">Aucune course archivée.</div> : <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-body-s">
            <thead className="border-b border-warm-200 bg-cream/60 text-[10px] font-bold uppercase tracking-wider text-warm-600">
              <tr><th className="px-4 py-2.5 text-left">Référence</th><th className="px-4 py-2.5 text-left">Client</th><th className="px-4 py-2.5 text-left">Trajet</th><th className="px-4 py-2.5 text-left">Archivage</th><th className="px-4 py-2.5 text-left">Motif</th><th className="px-4 py-2.5 text-right">Libéré</th></tr>
            </thead>
            <tbody className="divide-y divide-warm-200">
              {courses.map((course) => <tr key={course.id} className="hover:bg-cream/40">
                <td className="px-4 py-3"><Link className="font-mono font-bold text-ink hover:text-airmess-red" to={`/courses/${course.id}`}>{course.reference}</Link></td>
                <td className="px-4 py-3"><p className="font-semibold text-ink">{course.sender?.name ?? '—'}</p><p className="text-caption text-warm-500">{course.sender?.phone ?? course.sender?.email}</p></td>
                <td className="px-4 py-3 text-warm-600">{course.origin_quartier} → {course.destination_quartier}</td>
                <td className="px-4 py-3"><p>{formatDate(course.archived_at)}</p><p className="text-caption text-warm-500">par {course.archived_by?.name ?? 'Administrateur supprimé'}</p></td>
                <td className="max-w-[280px] px-4 py-3 text-warm-600">{course.cancellation_reason?.replace(/^\[Support\]\s*/, '') ?? '—'}</td>
                <td className="px-4 py-3 text-right font-semibold tabular-nums">{course.archived_released_amount.toLocaleString('fr-FR')} FCFA</td>
              </tr>)}
            </tbody>
          </table>
        </div>}
      </div>
      {query.data && <AdminPagination currentPage={query.data.current_page} lastPage={query.data.last_page} total={query.data.total} itemLabel="course archivée" onChange={setPage} isFetching={query.isFetching} />}
    </div>
  </AdminPageShell>
}
