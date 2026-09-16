import { useState } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import AdminPageShell from '../../components/admin/AdminPageShell'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import AdminPagination from '../../components/admin/AdminPagination'
import { AdminButton, AdminSearchInput, AdminSelect } from '../../components/admin/AdminToolbar'
import {
  fetchWaitlist,
  notifyWaitlistedUser,
  notifyWaitlistedUsers,
  type WaitlistParams,
} from '../../api/admin'

export default function AdminWaitlistPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language === 'en' ? 'en-US' : 'fr-FR'
  const queryClient = useQueryClient()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<'waiting' | 'notified' | 'all'>('waiting')
  const [type, setType] = useState<'' | 'marchant' | 'driver'>('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<number[]>([])

  const params: WaitlistParams = {
    q: q.trim() || undefined,
    status,
    type: type || undefined,
    page,
  }
  const query = useQuery({
    queryKey: ['admin', 'waitlist', params],
    queryFn: () => fetchWaitlist(params),
    placeholderData: keepPreviousData,
  })
  const users = query.data?.data ?? []
  const waitingIds = users.filter((user) => !user.waitlist_notified_at).map((user) => user.id)

  const refresh = async () => {
    setSelected([])
    await queryClient.invalidateQueries({ queryKey: ['admin', 'waitlist'] })
  }
  const singleMutation = useMutation({
    mutationFn: notifyWaitlistedUser,
    onSuccess: refresh,
  })
  const bulkMutation = useMutation({
    mutationFn: notifyWaitlistedUsers,
    onSuccess: refresh,
  })
  const busy = singleMutation.isPending || bulkMutation.isPending

  return (
    <AdminPageShell>
      <AdminPageHeader
        title={t('admin.waitlist.title')}
        subtitle={t('admin.waitlist.subtitle')}
        actions={
          <AdminButton
            variant="primary"
            disabled={selected.length === 0 || busy}
            onClick={() => bulkMutation.mutate(selected)}
          >
            {t('admin.waitlist.validateSelection', { count: selected.length })}
          </AdminButton>
        }
        toolbar={
          <div className="flex flex-wrap gap-3">
            <AdminSearchInput
              value={q}
              placeholder={t('admin.waitlist.searchPlaceholder')}
              onChange={(event) => { setQ(event.target.value); setPage(1) }}
            />
            <AdminSelect value={status} onChange={(event) => { setStatus(event.target.value as typeof status); setPage(1) }}>
              <option value="waiting">{t('admin.waitlist.waiting')}</option>
              <option value="notified">{t('admin.waitlist.notified')}</option>
              <option value="all">{t('admin.waitlist.all')}</option>
            </AdminSelect>
            <AdminSelect value={type} onChange={(event) => { setType(event.target.value as typeof type); setPage(1) }}>
              <option value="">{t('admin.waitlist.allAccounts')}</option>
              <option value="marchant">{t('admin.waitlist.merchants')}</option>
              <option value="driver">{t('admin.waitlist.drivers')}</option>
            </AdminSelect>
          </div>
        }
      />

      <div className="px-4 py-5 md:px-6 lg:px-8">
        {(singleMutation.isError || bulkMutation.isError) && (
          <div className="mb-4 rounded-md border border-airmess-red/30 bg-danger-bg px-4 py-3 text-body-s text-airmess-red">
            {t('admin.waitlist.emailFailed')}
          </div>
        )}
        <div className="overflow-hidden rounded-lg border border-warm-200 bg-off-white">
          {query.isLoading ? (
            <div className="p-10 text-center text-warm-500">{t('admin.waitlist.loading')}</div>
          ) : users.length === 0 ? (
            <div className="p-10 text-center text-warm-500">{t('admin.waitlist.empty')}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-body-s">
                <thead className="border-b border-warm-200 bg-cream/60 text-[10px] font-bold uppercase tracking-wider text-warm-600">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={waitingIds.length > 0 && waitingIds.every((id) => selected.includes(id))}
                        onChange={(event) => setSelected(event.target.checked ? waitingIds : [])}
                        aria-label={t('admin.waitlist.selectPageWaiting')}
                      />
                    </th>
                    <th className="px-4 py-3 text-left">{t('admin.waitlist.account')}</th>
                    <th className="px-4 py-3 text-left">{t('admin.waitlist.contact')}</th>
                    <th className="px-4 py-3 text-left">{t('admin.waitlist.signup')}</th>
                    <th className="px-4 py-3 text-left">{t('admin.waitlist.status')}</th>
                    <th className="px-4 py-3 text-right">{t('admin.waitlist.action')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-warm-200">
                  {users.map((user) => {
                    const notified = Boolean(user.waitlist_notified_at)
                    return (
                      <tr key={user.id} className="hover:bg-cream/40">
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            disabled={notified}
                            checked={selected.includes(user.id)}
                            onChange={(event) => setSelected((current) => event.target.checked ? [...current, user.id] : current.filter((id) => id !== user.id))}
                            aria-label={t('admin.waitlist.selectUser', { name: user.name })}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-ink">{user.marchant?.raison_sociale ?? user.name}</p>
                          <p className="text-caption text-warm-500">{user.type === 'marchant' ? t('admin.waitlist.merchant') : t('admin.waitlist.driver')} · {user.name}</p>
                        </td>
                        <td className="px-4 py-3"><p>{user.email}</p><p className="text-caption text-warm-500">{user.phone ?? '—'}</p></td>
                        <td className="px-4 py-3 text-warm-600">{user.waitlisted_at ? new Date(user.waitlisted_at).toLocaleString(locale) : t('admin.waitlist.earlierSignup')}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2.5 py-1 text-caption font-semibold ${notified ? 'bg-success-bg text-success' : 'bg-warning-bg text-warning'}`}>
                            {notified ? t('admin.waitlist.validatedAndNotified') : t('admin.waitlist.waiting')}
                          </span>
                          {notified && <p className="mt-1 text-caption text-warm-500">{t('admin.waitlist.by')} {user.waitlist_notifier?.user?.name ?? t('admin.waitlist.anAdmin')}</p>}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <AdminButton variant="primary" size="sm" disabled={notified || busy} onClick={() => singleMutation.mutate(user.id)}>
                            {notified ? t('admin.waitlist.alreadyValidated') : t('admin.waitlist.validateAndNotify')}
                          </AdminButton>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {query.data && <AdminPagination currentPage={query.data.current_page} lastPage={query.data.last_page} total={query.data.total} itemLabel={t('admin.waitlist.itemLabel')} onChange={setPage} isFetching={query.isFetching} />}
      </div>
    </AdminPageShell>
  )
}
