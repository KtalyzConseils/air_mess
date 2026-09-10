import { useState } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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
        title="Liste d’attente"
        subtitle="Activez les comptes et prévenez les utilisateurs lorsque Airmess est disponible."
        actions={
          <AdminButton
            variant="primary"
            disabled={selected.length === 0 || busy}
            onClick={() => bulkMutation.mutate(selected)}
          >
            Valider la sélection ({selected.length})
          </AdminButton>
        }
        toolbar={
          <div className="flex flex-wrap gap-3">
            <AdminSearchInput
              value={q}
              placeholder="Nom, entreprise, e-mail ou téléphone"
              onChange={(event) => { setQ(event.target.value); setPage(1) }}
            />
            <AdminSelect value={status} onChange={(event) => { setStatus(event.target.value as typeof status); setPage(1) }}>
              <option value="waiting">En attente</option>
              <option value="notified">Informés</option>
              <option value="all">Tous</option>
            </AdminSelect>
            <AdminSelect value={type} onChange={(event) => { setType(event.target.value as typeof type); setPage(1) }}>
              <option value="">Tous les comptes</option>
              <option value="marchant">Marchands</option>
              <option value="driver">Livreurs</option>
            </AdminSelect>
          </div>
        }
      />

      <div className="px-4 py-5 md:px-6 lg:px-8">
        {(singleMutation.isError || bulkMutation.isError) && (
          <div className="mb-4 rounded-md border border-airmess-red/30 bg-danger-bg px-4 py-3 text-body-s text-airmess-red">
            L’e-mail n’a pas pu être envoyé. Le compte reste en attente.
          </div>
        )}
        <div className="overflow-hidden rounded-lg border border-warm-200 bg-off-white">
          {query.isLoading ? (
            <div className="p-10 text-center text-warm-500">Chargement…</div>
          ) : users.length === 0 ? (
            <div className="p-10 text-center text-warm-500">Aucun compte dans cette liste.</div>
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
                        aria-label="Sélectionner les comptes en attente de la page"
                      />
                    </th>
                    <th className="px-4 py-3 text-left">Compte</th>
                    <th className="px-4 py-3 text-left">Contact</th>
                    <th className="px-4 py-3 text-left">Inscription</th>
                    <th className="px-4 py-3 text-left">Statut</th>
                    <th className="px-4 py-3 text-right">Action</th>
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
                            aria-label={`Sélectionner ${user.name}`}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-ink">{user.marchant?.raison_sociale ?? user.name}</p>
                          <p className="text-caption text-warm-500">{user.type === 'marchant' ? 'Marchand' : 'Livreur'} · {user.name}</p>
                        </td>
                        <td className="px-4 py-3"><p>{user.email}</p><p className="text-caption text-warm-500">{user.phone ?? '—'}</p></td>
                        <td className="px-4 py-3 text-warm-600">{user.waitlisted_at ? new Date(user.waitlisted_at).toLocaleString('fr-FR') : 'Inscription antérieure'}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2.5 py-1 text-caption font-semibold ${notified ? 'bg-success-bg text-success' : 'bg-warning-bg text-warning'}`}>
                            {notified ? 'Validé et informé' : 'En attente'}
                          </span>
                          {notified && <p className="mt-1 text-caption text-warm-500">par {user.waitlist_notifier?.user?.name ?? 'un admin'}</p>}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <AdminButton variant="primary" size="sm" disabled={notified || busy} onClick={() => singleMutation.mutate(user.id)}>
                            {notified ? 'Déjà validé' : 'Valider et informer'}
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
        {query.data && <AdminPagination currentPage={query.data.current_page} lastPage={query.data.last_page} total={query.data.total} itemLabel="compte" onChange={setPage} isFetching={query.isFetching} />}
      </div>
    </AdminPageShell>
  )
}
