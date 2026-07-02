import { useState } from 'react'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AxiosError } from 'axios'
import AdminPageShell from '../../components/admin/AdminPageShell'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import AdminModal from '../../components/admin/AdminModal'
import AdminPagination from '../../components/admin/AdminPagination'
import { AdminSearchInput, AdminSelect, AdminButton } from '../../components/admin/AdminToolbar'
import StatusBadge from '../../components/StatusBadge'
import { fetchAdminCourses, fetchAdminDrivers, reassignCourse } from '../../api/admin'
import type { Course } from '../../api/courses'

const REASSIGNABLE_BLOCKED = ['delivered', 'cancelled', 'failed', 'picked_up', 'at_dropoff']

export default function AdminCoursesPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [reassignFor, setReassignFor] = useState<Course | null>(null)
  const [newDriverId, setNewDriverId] = useState<number | ''>('')
  const [reassignReason, setReassignReason] = useState('')

  const coursesQuery = useQuery({
    queryKey: ['admin', 'courses', { search, statusFilter, page }],
    queryFn: () =>
      fetchAdminCourses({
        q: search || undefined,
        status: statusFilter || undefined,
        per_page: 30,
        page,
      }),
    refetchInterval: 20_000,
    placeholderData: keepPreviousData,
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
      closeReassign()
    },
    onError: (err) => {
      const message =
        err instanceof AxiosError
          ? err.response?.data?.message ?? t('admin.courses.reassignImpossible')
          : t('admin.courses.reassignImpossible')
      window.alert(message)
    },
  })

  function closeReassign() {
    setReassignFor(null)
    setNewDriverId('')
    setReassignReason('')
  }

  const courses = coursesQuery.data?.data ?? []
  const total = coursesQuery.data?.total ?? courses.length

  return (
    <AdminPageShell>
      <AdminPageHeader
        title={t('admin.courses.pageTitle')}
        subtitle={t('admin.courses.pageSubtitle', { count: total })}
        toolbar={
          <div className="flex flex-wrap gap-2 items-center">
            <AdminSearchInput
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              placeholder={t('admin.courses.searchPlaceholder')}
            />
            <AdminSelect
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setPage(1)
              }}
            >
              <option value="">{t('admin.courses.allStatuses')}</option>
              <option value="awaiting_assignment">{t('admin.courses.statusAwaiting')}</option>
              <option value="assigned">{t('admin.courses.statusAssigned')}</option>
              <option value="picked_up">{t('admin.courses.statusPickedUp')}</option>
              <option value="delivered">{t('admin.courses.statusDelivered')}</option>
              <option value="cancelled">{t('admin.courses.statusCancelled')}</option>
              <option value="failed">{t('admin.courses.statusFailed')}</option>
              <option value="disputed">{t('admin.courses.statusDisputed')}</option>
            </AdminSelect>
            {(search || statusFilter) && (
              <AdminButton
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch('')
                  setStatusFilter('')
                  setPage(1)
                }}
              >
                {t('admin.common.reset')}
              </AdminButton>
            )}
          </div>
        }
      />

      <div className="px-4 md:px-6 lg:px-8 py-5">
        <div className="bg-off-white border border-warm-200 rounded-lg overflow-hidden">
          {coursesQuery.isLoading ? (
            <div className="p-10 text-center text-warm-500 text-body-s">{t('admin.common.loading')}</div>
          ) : courses.length === 0 ? (
            <div className="p-10 text-center text-warm-500 text-body-s italic">
              {t('admin.courses.emptyResults')}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-body-s min-w-[800px]">
                <thead className="bg-cream/60 text-[10px] uppercase tracking-wider font-bold text-warm-600 border-b border-warm-200">
                  <tr>
                    <th className="px-4 py-2.5 text-left">{t('admin.courses.colReference')}</th>
                    <th className="px-4 py-2.5 text-left">{t('admin.courses.colMarchant')}</th>
                    <th className="px-4 py-2.5 text-left">{t('admin.courses.colDestination')}</th>
                    <th className="px-4 py-2.5 text-left">{t('admin.courses.colStatus')}</th>
                    <th className="px-4 py-2.5 text-left">{t('admin.courses.colDriver')}</th>
                    <th className="px-4 py-2.5 text-right">{t('admin.courses.colAction')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-warm-200">
                  {courses.map((c) => (
                    <tr key={c.id} className="hover:bg-cream/40 transition-colors">
                      <td className="px-4 py-2.5 font-mono text-caption font-semibold">
                        <Link
                          to={`/courses/${c.id}`}
                          className="text-ink hover:text-airmess-red"
                        >
                          {c.reference}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 text-ink truncate max-w-[180px]">
                        {c.origin_name}
                      </td>
                      <td className="px-4 py-2.5">
                        <p className="text-ink truncate max-w-[220px]">{c.destination_name}</p>
                        <p className="text-caption text-warm-500 truncate max-w-[220px]">
                          {c.destination_quartier}
                        </p>
                      </td>
                      <td className="px-4 py-2.5">
                        <StatusBadge status={c.status} />
                      </td>
                      <td className="px-4 py-2.5 text-warm-600 truncate max-w-[160px]">
                        {c.driver?.user?.name ?? (
                          <span className="italic text-warm-400">{t('admin.common.notAssigned')}</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {!REASSIGNABLE_BLOCKED.includes(c.status) && (
                          <AdminButton
                            variant="ghost"
                            size="sm"
                            onClick={() => setReassignFor(c)}
                            className="text-airmess-red! hover:text-airmess-red! hover:bg-danger-bg!"
                          >
                            {t('admin.courses.reassignAction')}
                          </AdminButton>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {coursesQuery.data && (
          <AdminPagination
            currentPage={coursesQuery.data.current_page}
            lastPage={coursesQuery.data.last_page}
            total={coursesQuery.data.total}
            itemLabel={t('admin.courses.itemLabel')}
            onChange={setPage}
            isFetching={coursesQuery.isFetching}
          />
        )}
      </div>

      {/* Modal de réaffectation */}
      <AdminModal
        open={!!reassignFor}
        onClose={closeReassign}
        title={reassignFor ? t('admin.courses.reassignTitle', { reference: reassignFor.reference }) : ''}
        subtitle={t('admin.courses.reassignSubtitle')}
        footer={
          <>
            <AdminButton variant="secondary" onClick={closeReassign}>
              {t('admin.common.cancel')}
            </AdminButton>
            <AdminButton
              variant="primary"
              onClick={() => reassignMutation.mutate()}
              disabled={!newDriverId || reassignMutation.isPending}
            >
              {reassignMutation.isPending ? t('admin.courses.reassignInProgress') : t('admin.common.confirm')}
            </AdminButton>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block mb-1.5 text-caption font-medium text-warm-600">
              {t('admin.courses.newDriverLabel')}
            </label>
            <AdminSelect
              value={newDriverId}
              onChange={(e) => setNewDriverId(Number(e.target.value))}
              className="w-full"
            >
              <option value="">{t('admin.common.chooseDash')}</option>
              {(driversQuery.data ?? [])
                .filter((d) => d.availability_status === 'available')
                .map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.user.name} ({d.vehicle_type})
                  </option>
                ))}
            </AdminSelect>
          </div>

          <div>
            <label className="block mb-1.5 text-caption font-medium text-warm-600">
              {t('admin.courses.reasonLabel')}
            </label>
            <textarea
              value={reassignReason}
              onChange={(e) => setReassignReason(e.target.value)}
              rows={3}
              placeholder={t('admin.courses.reasonPlaceholder')}
              className="w-full px-3 py-2 bg-off-white border border-warm-300 rounded-md text-body-s text-ink placeholder:text-warm-400 focus:outline-none focus:border-airmess-yellow focus:shadow-glow-yellow transition-all"
            />
          </div>
        </div>
      </AdminModal>
    </AdminPageShell>
  )
}
