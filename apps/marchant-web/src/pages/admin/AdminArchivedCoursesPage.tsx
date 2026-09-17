import { useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import AdminPageShell from '../../components/admin/AdminPageShell'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import AdminPagination from '../../components/admin/AdminPagination'
import { AdminSearchInput } from '../../components/admin/AdminToolbar'
import { fetchArchivedCourses } from '../../api/admin'

export default function AdminArchivedCoursesPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language === 'en' ? 'en-US' : 'fr-FR'
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const query = useQuery({
    queryKey: ['admin', 'courses-archived', { search, page }],
    queryFn: () => fetchArchivedCourses({ q: search || undefined, page, per_page: 30 }),
    placeholderData: keepPreviousData,
  })
  const courses = query.data?.data ?? []

  function formatDate(value: string) {
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
  }

  return <AdminPageShell>
    <AdminPageHeader
      title={t('admin.archivedCourses.title')}
      subtitle={t('admin.archivedCourses.subtitle', { count: query.data?.total ?? 0 })}
      toolbar={<AdminSearchInput value={search} placeholder={t('admin.archivedCourses.searchPlaceholder')} onChange={(event) => { setSearch(event.target.value); setPage(1) }} />}
    />
    <div className="px-4 py-5 md:px-6 lg:px-8">
      <div className="overflow-hidden rounded-lg border border-warm-200 bg-off-white">
        {query.isLoading ? <div className="p-10 text-center text-warm-500">{t('admin.archivedCourses.loading')}</div> : courses.length === 0 ? <div className="p-10 text-center text-warm-500">{t('admin.archivedCourses.empty')}</div> : <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-body-s">
            <thead className="border-b border-warm-200 bg-cream/60 text-[10px] font-bold uppercase tracking-wider text-warm-600">
              <tr><th className="px-4 py-2.5 text-left">{t('admin.archivedCourses.colReference')}</th><th className="px-4 py-2.5 text-left">{t('admin.archivedCourses.colClient')}</th><th className="px-4 py-2.5 text-left">{t('admin.archivedCourses.colTrip')}</th><th className="px-4 py-2.5 text-left">{t('admin.archivedCourses.colArchiving')}</th><th className="px-4 py-2.5 text-left">{t('admin.archivedCourses.colReason')}</th><th className="px-4 py-2.5 text-right">{t('admin.archivedCourses.colReleased')}</th></tr>
            </thead>
            <tbody className="divide-y divide-warm-200">
              {courses.map((course) => <tr key={course.id} className="hover:bg-cream/40">
                <td className="px-4 py-3"><Link className="font-mono font-bold text-ink hover:text-airmess-red" to={`/courses/${course.id}`}>{course.reference}</Link></td>
                <td className="px-4 py-3"><p className="font-semibold text-ink">{course.sender?.name ?? '—'}</p><p className="text-caption text-warm-500">{course.sender?.phone ?? course.sender?.email}</p></td>
                <td className="px-4 py-3 text-warm-600">{course.origin_quartier} → {course.destination_quartier}</td>
                <td className="px-4 py-3"><p>{formatDate(course.archived_at)}</p><p className="text-caption text-warm-500">{t('admin.archivedCourses.by')} {course.archived_by?.name ?? t('admin.archivedCourses.deletedAdmin')}</p></td>
                <td className="max-w-[280px] px-4 py-3 text-warm-600">{course.cancellation_reason?.replace(/^\[Support\]\s*/, '') ?? '—'}</td>
                <td className="px-4 py-3 text-right font-semibold tabular-nums">{course.archived_released_amount.toLocaleString(locale)} FCFA</td>
              </tr>)}
            </tbody>
          </table>
        </div>}
      </div>
      {query.data && <AdminPagination currentPage={query.data.current_page} lastPage={query.data.last_page} total={query.data.total} itemLabel={t('admin.archivedCourses.itemLabel')} onChange={setPage} isFetching={query.isFetching} />}
    </div>
  </AdminPageShell>
}
