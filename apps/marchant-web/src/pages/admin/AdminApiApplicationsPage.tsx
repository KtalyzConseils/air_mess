import { useState } from 'react'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import AdminPageShell from '../../components/admin/AdminPageShell'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import AdminTabs from '../../components/admin/AdminTabs'
import AdminPagination from '../../components/admin/AdminPagination'
import { AdminSearchInput, AdminButton } from '../../components/admin/AdminToolbar'
import Badge from '../../components/ui/Badge'
import ConfirmModal from '../../components/ConfirmModal'
import { useAuthStore } from '../../stores/authStore'
import { hasAdminRole } from '../../lib/permissions'
import { cn } from '../../lib/cn'
import {
  fetchAdminApiApps,
  suspendAdminApiApp,
  reactivateAdminApiApp,
  type AdminApiApp,
  type AdminApiAppListParams,
} from '../../api/adminApiApps'

/**
 * Panel admin des ApiApplications.
 *
 *  - Lecture : commercial + ops + support (utile au support pour aider).
 *  - Suspend/reactivate : commercial uniquement (aligné sur marchand).
 */

type FilterKey = 'all' | 'active' | 'suspended'

const FILTERS: readonly { key: FilterKey; label: string; params: AdminApiAppListParams }[] = [
  { key: 'all',       label: 'Toutes',    params: {} },
  { key: 'active',    label: 'Actives',   params: { status: 'active' } },
  { key: 'suspended', label: 'Suspendues', params: { status: 'suspended' } },
] as const

export default function AdminApiApplicationsPage() {
  const queryClient = useQueryClient()
  const currentUser = useAuthStore((s) => s.user)
  const canManage = hasAdminRole(currentUser, 'commercial')

  const [filterKey, setFilterKey] = useState<FilterKey>('all')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [confirmSuspend, setConfirmSuspend] = useState<AdminApiApp | null>(null)

  const activeFilter = FILTERS.find((f) => f.key === filterKey)!
  const search = q.trim()

  const params: AdminApiAppListParams = search
    ? { search, page }
    : { ...activeFilter.params, page }

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['admin', 'api-apps', search ? `search:${search}` : filterKey, page],
    queryFn: () => fetchAdminApiApps(params),
    placeholderData: keepPreviousData,
  })

  const suspendMut = useMutation({
    mutationFn: (id: number) => suspendAdminApiApp(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'api-apps'] })
      setConfirmSuspend(null)
    },
    onError: (err) => {
      const msg = err instanceof AxiosError
        ? err.response?.data?.message ?? 'Suspension impossible.'
        : 'Suspension impossible.'
      window.alert(msg)
    },
  })

  const reactivateMut = useMutation({
    mutationFn: (id: number) => reactivateAdminApiApp(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'api-apps'] }),
    onError: (err) => {
      const msg = err instanceof AxiosError
        ? err.response?.data?.message ?? 'Réactivation impossible.'
        : 'Réactivation impossible.'
      window.alert(msg)
    },
  })

  const apps = data?.data ?? []

  function changeFilter(key: FilterKey) {
    setFilterKey(key)
    setPage(1)
  }

  return (
    <AdminPageShell>
      <AdminPageHeader
        title="Apps dev"
        subtitle="Applications tierces autorisées à créer des courses via l'API"
        toolbar={
          <div className="flex flex-wrap items-center justify-between gap-3 w-full">
            <AdminTabs tabs={FILTERS} value={filterKey} onChange={changeFilter} />
            <AdminSearchInput
              value={q}
              onChange={(e) => {
                setQ(e.target.value)
                setPage(1)
              }}
              placeholder="Nom de l'app, email ou téléphone du propriétaire…"
              minWidthClass="min-w-[280px]"
            />
          </div>
        }
      />

      <div className="px-4 md:px-6 lg:px-8 py-5">
        {search && (
          <p className="text-caption text-warm-500 mb-3">
            Recherche globale — le filtre <strong className="text-ink">{activeFilter.label}</strong> est ignoré.{' '}
            <button
              onClick={() => setQ('')}
              className="text-airmess-red font-semibold hover:underline"
            >
              Effacer
            </button>
          </p>
        )}

        <div className="bg-off-white border border-warm-200 rounded-lg overflow-hidden">
          {isLoading ? (
            <div className="p-10 text-center text-warm-500 text-body-s">Chargement…</div>
          ) : apps.length === 0 ? (
            <div className="p-10 text-center text-warm-500 text-body-s italic">
              Aucune app trouvée.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-body-s min-w-[800px]">
                <thead className="bg-cream/60 text-[10px] uppercase tracking-wider font-bold text-warm-600 border-b border-warm-200">
                  <tr>
                    <th className="px-5 py-2.5 text-left">App</th>
                    <th className="px-5 py-2.5 text-left">Propriétaire</th>
                    <th className="px-5 py-2.5 text-left">Plan</th>
                    <th className="px-5 py-2.5 text-left">Quota</th>
                    <th className="px-5 py-2.5 text-left">Courses</th>
                    <th className="px-5 py-2.5 text-left">Statut</th>
                    <th className="px-5 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-warm-200">
                  {apps.map((app) => (
                    <AppRow
                      key={app.id}
                      app={app}
                      canManage={canManage}
                      onSuspend={() => setConfirmSuspend(app)}
                      onReactivate={() => reactivateMut.mutate(app.id)}
                      isPending={suspendMut.isPending || reactivateMut.isPending}
                    />
                  ))}
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
            itemLabel="app"
            onChange={setPage}
            isFetching={isFetching}
          />
        )}
      </div>

      <ConfirmModal
        visible={confirmSuspend !== null}
        title={`Suspendre « ${confirmSuspend?.name ?? ''} » ?`}
        description="Les prochaines requêtes API de cette app seront rejetées (403). Les clés restent, tu pourras réactiver plus tard sans les régénérer."
        confirmLabel="Suspendre"
        confirmVariant="danger"
        isPending={suspendMut.isPending}
        onConfirm={() => confirmSuspend && suspendMut.mutate(confirmSuspend.id)}
        onClose={() => setConfirmSuspend(null)}
      />
    </AdminPageShell>
  )
}

function AppRow({
  app,
  canManage,
  onSuspend,
  onReactivate,
  isPending,
}: {
  app: AdminApiApp
  canManage: boolean
  onSuspend: () => void
  onReactivate: () => void
  isPending: boolean
}) {
  const unlimited = app.quota_limit === 0
  const usedPct = unlimited ? 0 : Math.min(100, Math.round((app.quota_used / app.quota_limit) * 100))
  const atLimit = !unlimited && app.quota_used >= app.quota_limit

  return (
    <tr className="hover:bg-cream/40 transition-colors">
      <td className="px-5 py-2.5">
        <p className="font-semibold text-ink">{app.name}</p>
        {app.description && (
          <p className="text-caption text-warm-500 truncate max-w-[200px]">{app.description}</p>
        )}
      </td>
      <td className="px-5 py-2.5">
        {app.owner ? (
          <>
            <p className="text-ink truncate max-w-[200px]">
              {app.owner.full_name || app.owner.email}
            </p>
            <p className="text-caption text-warm-500">
              {app.owner.type} · {app.owner.phone ?? app.owner.email}
            </p>
          </>
        ) : (
          <span className="text-warm-400">—</span>
        )}
      </td>
      <td className="px-5 py-2.5">
        <p className="font-semibold text-ink">{app.plan?.name ?? '—'}</p>
        <p className="text-caption text-warm-500">
          {unlimited ? 'illimité' : `${app.quota_limit} req/mois`}
        </p>
      </td>
      <td className="px-5 py-2.5 min-w-[160px]">
        <p className={cn(
          'font-semibold',
          atLimit ? 'text-airmess-red' : 'text-ink',
        )}>
          {unlimited ? '∞' : `${app.quota_used} / ${app.quota_limit}`}
        </p>
        {!unlimited && (
          <div className="h-1 bg-warm-100 rounded-full overflow-hidden mt-1 w-24">
            <div
              className={cn(
                'h-full rounded-full',
                atLimit ? 'bg-airmess-red' : usedPct >= 80 ? 'bg-warning' : 'bg-airmess-yellow',
              )}
              style={{ width: `${usedPct}%` }}
            />
          </div>
        )}
      </td>
      <td className="px-5 py-2.5 text-ink font-semibold">{app.courses_count}</td>
      <td className="px-5 py-2.5">
        {app.status === 'active' ? (
          <Badge variant="success" size="sm" dot>Active</Badge>
        ) : (
          <Badge variant="danger" size="sm">Suspendue</Badge>
        )}
      </td>
      <td className="px-5 py-2.5 text-right whitespace-nowrap">
        {canManage && (
          <>
            {app.status === 'active' ? (
              <AdminButton
                variant="ghost"
                size="sm"
                onClick={onSuspend}
                disabled={isPending}
              >
                Suspendre
              </AdminButton>
            ) : (
              <AdminButton
                variant="primary"
                size="sm"
                onClick={onReactivate}
                disabled={isPending}
              >
                Réactiver
              </AdminButton>
            )}
          </>
        )}
      </td>
    </tr>
  )
}
