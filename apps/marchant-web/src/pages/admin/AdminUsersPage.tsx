import { useEffect, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import { useTranslation } from 'react-i18next'
import AdminPageShell from '../../components/admin/AdminPageShell'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import AdminPagination from '../../components/admin/AdminPagination'
import AdminModal from '../../components/admin/AdminModal'
import { AdminButton, AdminSearchInput, AdminSelect } from '../../components/admin/AdminToolbar'
import { ClockIcon, SettingsIcon, UsersIcon } from '../../components/ui/icons'
import {
  createAdminUser,
  fetchAdminUserActivity,
  fetchAdminUsers,
  updateAdminUser,
  type AdminRole,
  type ManagedAdmin,
} from '../../api/adminUsers'

const ROLE_VALUES: AdminRole[] = ['super', 'ops', 'commercial', 'support']

export default function AdminUsersPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language === 'en' ? 'en-US' : 'fr-FR'
  const queryClient = useQueryClient()
  const [q, setQ] = useState('')
  const [role, setRole] = useState<AdminRole | ''>('')
  const [active, setActive] = useState<boolean | ''>('')
  const [page, setPage] = useState(1)
  const [createOpen, setCreateOpen] = useState(false)
  const [selected, setSelected] = useState<ManagedAdmin | null>(null)

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['admin', 'admins', q.trim(), role, active, page],
    queryFn: () => fetchAdminUsers({ q: q.trim(), role, active, page }),
    placeholderData: keepPreviousData,
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Parameters<typeof updateAdminUser>[1] }) =>
      updateAdminUser(id, payload),
    onSuccess: (admin) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'admins'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'admin-activity', admin.id] })
      setSelected(admin)
    },
  })

  const admins = data?.data ?? []

  function resetPage() {
    setPage(1)
  }

  function formatDate(value: string | null) {
    if (!value) return t('admin.usersPage.never')
    return new Date(value).toLocaleString(locale, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <AdminPageShell>
      <AdminPageHeader
        title={t('admin.usersPage.title')}
        subtitle={t('admin.usersPage.subtitle')}
        toolbar={
          <div className="flex flex-wrap items-center justify-between gap-3 w-full">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <AdminSearchInput
                value={q}
                onChange={(e) => {
                  setQ(e.target.value)
                  resetPage()
                }}
                placeholder={t('admin.usersPage.searchPlaceholder')}
                minWidthClass="min-w-[260px]"
              />
              <AdminSelect
                value={role}
                onChange={(e) => {
                  setRole(e.target.value as AdminRole | '')
                  resetPage()
                }}
              >
                <option value="">{t('admin.usersPage.roles.all')}</option>
                {ROLE_VALUES.map((r) => (
                  <option key={r} value={r}>
                    {t(`admin.usersPage.roles.${r}`)}
                  </option>
                ))}
              </AdminSelect>
              <AdminSelect
                value={active === '' ? '' : active ? '1' : '0'}
                onChange={(e) => {
                  setActive(e.target.value === '' ? '' : e.target.value === '1')
                  resetPage()
                }}
              >
                <option value="">{t('admin.usersPage.statusAll')}</option>
                <option value="1">{t('admin.usersPage.statusActive')}</option>
                <option value="0">{t('admin.usersPage.statusInactive')}</option>
              </AdminSelect>
            </div>
            <AdminButton variant="primary" onClick={() => setCreateOpen(true)} leftIcon={<UsersIcon size={15} />}>
              {t('admin.usersPage.createAdmin')}
            </AdminButton>
          </div>
        }
      />

      <div className="px-4 md:px-6 lg:px-8 py-5 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-5">
        <div>
          <div className="bg-off-white border border-warm-200 rounded-lg overflow-hidden">
            {isLoading ? (
              <div className="p-10 text-center text-warm-500 text-body-s">{t('admin.usersPage.loading')}</div>
            ) : admins.length === 0 ? (
              <div className="p-10 text-center text-warm-500 text-body-s italic">
                {t('admin.usersPage.empty')}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-body-s min-w-[820px]">
                  <thead className="bg-cream/60 text-[10px] uppercase tracking-wider font-bold text-warm-600 border-b border-warm-200">
                    <tr>
                      <th className="px-5 py-2.5 text-left">{t('admin.usersPage.colAdmin')}</th>
                      <th className="px-5 py-2.5 text-left">{t('admin.usersPage.colRole')}</th>
                      <th className="px-5 py-2.5 text-left">{t('admin.usersPage.colLastLogin')}</th>
                      <th className="px-5 py-2.5 text-left">{t('admin.usersPage.colActivity')}</th>
                      <th className="px-5 py-2.5 text-center">{t('admin.usersPage.colAccess')}</th>
                      <th className="px-5 py-2.5 text-right">{t('admin.usersPage.colActions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-warm-200">
                    {admins.map((admin) => (
                      <tr key={admin.id} className="hover:bg-cream/40 transition-colors">
                        <td className="px-5 py-3">
                          <p className="font-semibold text-ink">{admin.user.name}</p>
                          <p className="text-caption text-warm-500">{admin.user.email}</p>
                          {admin.user.phone && <p className="text-caption text-warm-500">{admin.user.phone}</p>}
                        </td>
                        <td className="px-5 py-3">
                          <span className="inline-flex items-center rounded-md bg-warm-100 px-2 py-1 text-caption font-bold text-ink">
                            {t(`admin.usersPage.roles.${admin.sub_role}`)}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-warm-600">
                          {formatDate(admin.user.last_login_at)}
                        </td>
                        <td className="px-5 py-3 text-warm-600">
                          <p>{t('admin.usersPage.actionsCount', { count: admin.performed_activity_logs_count ?? 0 })}</p>
                          <p className="text-caption text-warm-500">
                            {formatDate(admin.performed_activity_logs_max_created_at ?? null)}
                          </p>
                        </td>
                        <td className="px-5 py-3 text-center">
                          <button
                            type="button"
                            onClick={() =>
                              updateMutation.mutate({
                                id: admin.id,
                                payload: { is_active: !admin.user.is_active },
                              })
                            }
                            className={[
                              'inline-flex h-6 w-11 items-center rounded-full p-0.5 transition-colors',
                              admin.user.is_active ? 'bg-success' : 'bg-warm-300',
                            ].join(' ')}
                            aria-label={admin.user.is_active ? t('admin.usersPage.deactivate') : t('admin.usersPage.activate')}
                          >
                            <span
                              className={[
                                'h-5 w-5 rounded-full bg-white shadow transition-transform',
                                admin.user.is_active ? 'translate-x-5' : 'translate-x-0',
                              ].join(' ')}
                            />
                          </button>
                        </td>
                        <td className="px-5 py-3 text-right whitespace-nowrap">
                          <AdminButton variant="ghost" size="sm" onClick={() => setSelected(admin)}>
                            {t('admin.usersPage.viewEdit')}
                          </AdminButton>
                        </td>
                      </tr>
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
              itemLabel={t('admin.usersPage.itemLabel')}
              onChange={setPage}
              isFetching={isFetching}
            />
          )}
        </div>

        <AdminActivityPanel admin={selected} onUpdated={setSelected} />
      </div>

      <CreateAdminModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </AdminPageShell>
  )
}

function CreateAdminModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    password: '',
    sub_role: 'support' as AdminRole,
  })

  const mutation = useMutation({
    mutationFn: createAdminUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'admins'] })
      onClose()
      setForm({ first_name: '', last_name: '', email: '', phone: '', password: '', sub_role: 'support' })
    },
  })

  function submit(e: FormEvent) {
    e.preventDefault()
    mutation.mutate({ ...form, phone: form.phone.trim() || undefined })
  }

  return (
    <AdminModal
      open={open}
      onClose={onClose}
      title={t('admin.usersPage.createModalTitle')}
      subtitle={t('admin.usersPage.createModalSubtitle')}
      footer={
        <>
          <AdminButton variant="ghost" onClick={onClose}>{t('admin.usersPage.cancel')}</AdminButton>
          <AdminButton variant="primary" type="submit" form="create-admin-form" disabled={mutation.isPending}>
            {t('admin.usersPage.create')}
          </AdminButton>
        </>
      }
    >
      <AdminForm id="create-admin-form" form={form} setForm={setForm} onSubmit={submit} error={errorMessage(mutation.error, t)} />
    </AdminModal>
  )
}

function AdminActivityPanel({
  admin,
  onUpdated,
}: {
  admin: ManagedAdmin | null
  onUpdated: (admin: ManagedAdmin) => void
}) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language === 'en' ? 'en-US' : 'fr-FR'
  const queryClient = useQueryClient()
  const [password, setPassword] = useState('')
  const [form, setForm] = useState({
    first_name: admin?.first_name ?? '',
    last_name: admin?.last_name ?? '',
    phone: admin?.user.phone ?? '',
    sub_role: (admin?.sub_role ?? 'support') as AdminRole,
  })

  useEffect(() => {
    if (!admin) return
    setForm({
      first_name: admin.first_name,
      last_name: admin.last_name,
      phone: admin.user.phone ?? '',
      sub_role: admin.sub_role,
    })
    setPassword('')
  }, [admin?.id])

  const { data: activity } = useQuery({
    queryKey: ['admin', 'admin-activity', admin?.id],
    queryFn: () => fetchAdminUserActivity(admin!.id),
    enabled: !!admin,
  })

  const mutation = useMutation({
    mutationFn: () =>
      updateAdminUser(admin!.id, {
        first_name: form.first_name,
        last_name: form.last_name,
        phone: form.phone.trim() || null,
        sub_role: form.sub_role as AdminRole,
        ...(password.trim() ? { password: password.trim() } : {}),
      }),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'admins'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'admin-activity', updated.id] })
      setPassword('')
      onUpdated(updated)
    },
  })

  if (!admin) {
    return (
      <aside className="bg-off-white border border-warm-200 rounded-lg p-5 h-fit">
        <div className="w-10 h-10 rounded-full bg-warm-100 flex items-center justify-center mb-3">
          <SettingsIcon size={18} />
        </div>
        <h2 className="text-body font-bold text-ink">{t('admin.usersPage.selectAdminTitle')}</h2>
        <p className="text-body-s text-warm-500 mt-1">
          {t('admin.usersPage.selectAdminBody')}
        </p>
      </aside>
    )
  }

  return (
    <aside className="bg-off-white border border-warm-200 rounded-lg overflow-hidden h-fit">
      <header className="px-5 py-4 border-b border-warm-200">
        <p className="text-caption uppercase tracking-wider font-bold text-warm-500">{t('admin.usersPage.cardTitle')}</p>
        <h2 className="text-body font-bold text-ink mt-1">{admin.user.name}</h2>
        <p className="text-body-s text-warm-500">{admin.user.email}</p>
      </header>

      <form
        className="px-5 py-4 space-y-3 border-b border-warm-200"
        onSubmit={(e) => {
          e.preventDefault()
          mutation.mutate()
        }}
      >
        <div className="grid grid-cols-2 gap-2">
          <Field label={t('admin.usersPage.firstName')} value={form.first_name} onChange={(v) => setForm((f) => ({ ...f, first_name: v }))} />
          <Field label={t('admin.usersPage.lastName')} value={form.last_name} onChange={(v) => setForm((f) => ({ ...f, last_name: v }))} />
        </div>
        <Field label={t('admin.usersPage.phone')} value={form.phone} onChange={(v) => setForm((f) => ({ ...f, phone: v }))} />
        <label className="block">
          <span className="block text-[10px] uppercase tracking-wider font-bold text-warm-600 mb-1">{t('admin.usersPage.role')}</span>
          <select
            value={form.sub_role}
            onChange={(e) => setForm((f) => ({ ...f, sub_role: e.target.value as AdminRole }))}
            className="w-full h-10 px-3 bg-off-white border border-warm-300 rounded-md text-body-s text-ink focus:outline-none focus:border-airmess-yellow"
          >
            {ROLE_VALUES.map((r) => (
              <option key={r} value={r}>{t(`admin.usersPage.roles.${r}`)}</option>
            ))}
          </select>
        </label>
        <Field label={t('admin.usersPage.newPassword')} type="password" value={password} onChange={setPassword} placeholder={t('admin.usersPage.newPasswordPlaceholder')} />
        {mutation.error && <p className="text-caption text-airmess-red">{errorMessage(mutation.error, t)}</p>}
        <AdminButton variant="primary" type="submit" disabled={mutation.isPending} leftIcon={<SettingsIcon size={15} />}>
          {t('admin.usersPage.save')}
        </AdminButton>
      </form>

      <div className="px-5 py-4">
        <div className="flex items-center gap-2 mb-3">
          <ClockIcon size={16} className="text-warm-600" />
          <h3 className="text-body-s font-bold text-ink">{t('admin.usersPage.performedActions')}</h3>
        </div>
        <div className="space-y-3">
          {(activity?.data ?? []).length === 0 ? (
            <p className="text-body-s text-warm-500 italic">{t('admin.usersPage.noActivity')}</p>
          ) : (
            activity!.data.map((log) => (
              <div key={log.id} className="border-l-2 border-airmess-yellow pl-3">
                <p className="text-body-s font-semibold text-ink">{log.summary}</p>
                <p className="text-caption text-warm-500">
                  {formatDate(log.created_at, locale)} · {log.target_admin?.user.name ? `${t('admin.usersPage.target')}: ${log.target_admin.user.name}` : log.action}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </aside>
  )
}

function AdminForm({
  id,
  form,
  setForm,
  onSubmit,
  error,
}: {
  id: string
  form: { first_name: string; last_name: string; email: string; phone: string; password: string; sub_role: AdminRole }
  setForm: React.Dispatch<React.SetStateAction<{ first_name: string; last_name: string; email: string; phone: string; password: string; sub_role: AdminRole }>>
  onSubmit: (e: FormEvent) => void
  error?: string
}) {
  const { t } = useTranslation()
  return (
    <form id={id} onSubmit={onSubmit} className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label={t('admin.usersPage.firstName')} required value={form.first_name} onChange={(v) => setForm((f) => ({ ...f, first_name: v }))} />
        <Field label={t('admin.usersPage.lastName')} required value={form.last_name} onChange={(v) => setForm((f) => ({ ...f, last_name: v }))} />
      </div>
      <Field label={t('admin.usersPage.email')} type="email" required value={form.email} onChange={(v) => setForm((f) => ({ ...f, email: v }))} />
      <Field label={t('admin.usersPage.phone')} value={form.phone} onChange={(v) => setForm((f) => ({ ...f, phone: v }))} />
      <Field label={t('admin.usersPage.password')} type="password" required value={form.password} onChange={(v) => setForm((f) => ({ ...f, password: v }))} />
      <label className="block">
        <span className="block text-[10px] uppercase tracking-wider font-bold text-warm-600 mb-1">{t('admin.usersPage.role')}</span>
        <select
          value={form.sub_role}
          onChange={(e) => setForm((f) => ({ ...f, sub_role: e.target.value as AdminRole }))}
          className="w-full h-10 px-3 bg-off-white border border-warm-300 rounded-md text-body-s text-ink focus:outline-none focus:border-airmess-yellow"
        >
          {ROLE_VALUES.map((r) => (
            <option key={r} value={r}>{t(`admin.usersPage.roles.${r}`)}</option>
          ))}
        </select>
      </label>
      {error && <p className="text-caption text-airmess-red">{error}</p>}
    </form>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  required,
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  required?: boolean
  placeholder?: string
}) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase tracking-wider font-bold text-warm-600 mb-1">
        {label}{required ? ' *' : ''}
      </span>
      <input
        type={type}
        required={required}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-10 px-3 bg-off-white border border-warm-300 rounded-md text-body-s text-ink placeholder:text-warm-400 focus:outline-none focus:border-airmess-yellow"
      />
    </label>
  )
}

function formatDate(value: string | null, locale: string) {
  if (!value) return null
  return new Date(value).toLocaleString(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function errorMessage(error: unknown, t: (key: string) => string) {
  if (!error) return undefined
  if (error instanceof AxiosError) {
    const data = error.response?.data as { message?: string; errors?: Record<string, string[]> } | undefined
    const first = data?.errors ? Object.values(data.errors)[0]?.[0] : undefined
    return first ?? data?.message ?? t('admin.usersPage.genericError')
  }
  return t('admin.usersPage.genericError')
}
