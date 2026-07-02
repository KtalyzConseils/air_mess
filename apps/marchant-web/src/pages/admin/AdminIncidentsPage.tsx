import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import AdminPageShell from '../../components/admin/AdminPageShell'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import AdminTabs from '../../components/admin/AdminTabs'
import AdminPagination from '../../components/admin/AdminPagination'
import AdminModal from '../../components/admin/AdminModal'
import { AdminButton } from '../../components/admin/AdminToolbar'
import { fetchIncidents, resolveIncident, INCIDENT_TYPE_LABELS } from '../../api/admin'

type StatusFilter = 'open' | 'all' | 'resolved'

const STATUS_CLASSES: Record<string, string> = {
  open: 'bg-warning-bg text-warning border border-warning/20',
  resolved: 'bg-success-bg text-success border border-success/20',
  cancelled: 'bg-warm-100 text-warm-600 border border-warm-200',
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function AdminIncidentsPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [filterKey, setFilterKey] = useState<StatusFilter>('open')
  const [page, setPage] = useState(1)
  const [resolveTarget, setResolveTarget] = useState<{ id: number; type: string } | null>(null)
  const [resolveNote, setResolveNote] = useState('')

  const FILTERS: readonly { key: StatusFilter; label: string; status?: string }[] = [
    { key: 'open', label: t('admin.incidents.tabOpen'), status: 'open' },
    { key: 'all', label: t('admin.incidents.tabAll') },
    { key: 'resolved', label: t('admin.incidents.tabResolved'), status: 'resolved' },
  ]

  const activeFilter = FILTERS.find((f) => f.key === filterKey)!

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['admin', 'incidents', filterKey, page],
    queryFn: () => fetchIncidents({ status: activeFilter.status, page }),
    placeholderData: keepPreviousData,
  })

  const resolveMutation = useMutation({
    mutationFn: ({ id, note }: { id: number; note: string }) => resolveIncident(id, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'incidents'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] })
      closeResolveModal()
    },
  })

  function openResolveModal(id: number, type: string) {
    setResolveTarget({ id, type })
    setResolveNote('')
  }
  function closeResolveModal() {
    setResolveTarget(null)
    setResolveNote('')
  }

  function statusLabel(status: string): string {
    switch (status) {
      case 'open':
        return t('admin.incidents.statusOpen')
      case 'resolved':
        return t('admin.incidents.statusResolved')
      case 'cancelled':
        return t('admin.incidents.statusCancelled')
      default:
        return status
    }
  }

  const incidents = data?.data ?? []

  return (
    <AdminPageShell>
      <AdminPageHeader
        title={t('admin.incidents.title')}
        subtitle={t('admin.incidents.subtitleAdmin')}
        toolbar={
          <AdminTabs
            tabs={FILTERS}
            value={filterKey}
            onChange={(k) => {
              setFilterKey(k)
              setPage(1)
            }}
          />
        }
      />

      <div className="px-4 md:px-6 lg:px-8 py-5">
        <div className="bg-off-white border border-warm-200 rounded-lg overflow-hidden">
          {isLoading ? (
            <div className="p-10 text-center text-warm-500 text-body-s">{t('common.loading')}</div>
          ) : incidents.length === 0 ? (
            <div className="p-10 text-center text-warm-500 text-body-s italic">
              {t('admin.incidents.empty')}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-body-s min-w-[800px]">
                <thead className="bg-cream/60 text-[10px] uppercase tracking-wider font-bold text-warm-600 border-b border-warm-200">
                  <tr>
                    <th className="px-4 py-2.5 text-left">{t('admin.incidents.colType')}</th>
                    <th className="px-4 py-2.5 text-left">{t('admin.incidents.colCourse')}</th>
                    <th className="px-4 py-2.5 text-left">{t('admin.incidents.colReportedBy')}</th>
                    <th className="px-4 py-2.5 text-left">{t('admin.incidents.colDate')}</th>
                    <th className="px-4 py-2.5 text-left">{t('admin.incidents.colStatus')}</th>
                    <th className="px-4 py-2.5 text-right">{t('admin.incidents.colAction')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-warm-200">
                  {incidents.map((inc) => {
                    const badgeClasses = STATUS_CLASSES[inc.status] ?? STATUS_CLASSES.cancelled
                    return (
                      <tr key={inc.id} className="hover:bg-cream/40 align-top transition-colors">
                        <td className="px-4 py-2.5">
                          <p className="font-semibold text-ink">
                            {INCIDENT_TYPE_LABELS[inc.type] ?? inc.type}
                          </p>
                          {inc.description && (
                            <p className="text-caption text-warm-500 mt-0.5 max-w-xs">
                              {inc.description}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          {inc.course ? (
                            <Link
                              to={`/courses/${inc.course.id}`}
                              className="font-mono text-caption font-semibold text-ink hover:text-airmess-red"
                            >
                              {inc.course.reference}
                            </Link>
                          ) : (
                            <span className="text-warm-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          <p className="text-ink">{inc.reported_by?.name ?? '—'}</p>
                          <p className="text-caption text-warm-500">{inc.reporter_type}</p>
                        </td>
                        <td className="px-4 py-2.5 text-caption text-warm-500 tabular-nums whitespace-nowrap">
                          {formatDateTime(inc.created_at)}
                        </td>
                        <td className="px-4 py-2.5">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-caption font-semibold ${badgeClasses}`}
                          >
                            {statusLabel(inc.status)}
                          </span>
                          {inc.status === 'resolved' && inc.resolution_note && (
                            <p className="text-caption text-warm-500 mt-1 max-w-xs">
                              → {inc.resolution_note}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          {inc.status === 'open' && (
                            <AdminButton
                              variant="primary"
                              size="sm"
                              onClick={() => openResolveModal(inc.id, inc.type)}
                              disabled={resolveMutation.isPending}
                            >
                              {t('admin.incidents.resolveAction')}
                            </AdminButton>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {data && (
          <AdminPagination
            currentPage={data.current_page}
            lastPage={data.last_page}
            total={data.total}
            itemLabel={t('admin.incidents.itemLabel')}
            onChange={setPage}
            isFetching={isFetching}
          />
        )}
      </div>

      {/* Modal de résolution */}
      <AdminModal
        open={!!resolveTarget}
        onClose={closeResolveModal}
        title={t('admin.incidents.resolveModalTitle')}
        subtitle={
          resolveTarget
            ? t('admin.incidents.resolveModalSubtitle', {
                type: INCIDENT_TYPE_LABELS[resolveTarget.type] ?? resolveTarget.type,
              })
            : undefined
        }
        footer={
          <>
            <AdminButton variant="secondary" onClick={closeResolveModal}>
              {t('common.cancel')}
            </AdminButton>
            <AdminButton
              variant="primary"
              onClick={() =>
                resolveTarget &&
                resolveMutation.mutate({ id: resolveTarget.id, note: resolveNote.trim() })
              }
              disabled={resolveNote.trim().length < 3 || resolveMutation.isPending}
            >
              {resolveMutation.isPending
                ? t('admin.incidents.resolving')
                : t('common.confirm')}
            </AdminButton>
          </>
        }
      >
        <label className="block mb-1.5 text-caption font-medium text-warm-600">
          {t('admin.incidents.noteRequired')}
        </label>
        <textarea
          value={resolveNote}
          onChange={(e) => setResolveNote(e.target.value)}
          placeholder={t('admin.incidents.notePlaceholder')}
          rows={3}
          className="w-full px-3 py-2 bg-off-white border border-warm-300 rounded-md text-body-s text-ink placeholder:text-warm-400 focus:outline-none focus:border-airmess-yellow focus:shadow-glow-yellow transition-all"
          autoFocus
        />
      </AdminModal>
    </AdminPageShell>
  )
}
