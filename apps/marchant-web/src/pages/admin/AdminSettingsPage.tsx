import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import AdminHeader from '../../components/AdminHeader'
import { fetchSettings, updateSetting, type AppSetting } from '../../api/admin/settings'
import { fetchAdminPlans, updateAdminPlan, type AdminPlan } from '../../api/admin/plans'

// Libellés humains pour les groupes
const GROUP_LABEL: Record<string, string> = {
  pricing: '💰 Tarification',
  quotas:  '📊 Quotas & limites',
  general: '⚙️ Général',
}

export default function AdminSettingsPage() {
  const { data: settings, isLoading, isError } = useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: fetchSettings,
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />
      <main className="max-w-3xl mx-auto p-4 md:p-6">
        <h2 className="text-2xl font-bold text-airmess-dark mb-1">Paramètres globaux</h2>
        <p className="text-sm text-gray-500 mb-6">
          Réglages appliqués à l'ensemble de la plateforme. Réservé au super-admin.
        </p>

        {isLoading && <p className="text-gray-500">Chargement…</p>}
        {isError && <p className="text-red-600">Erreur de chargement.</p>}

        {settings && Object.entries(settings).map(([group, items]) => (
          <section key={group} className="mb-6">
            <h3 className="font-semibold text-airmess-dark mb-3">
              {GROUP_LABEL[group] ?? group}
            </h3>
            <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-100">
              {items.map((s) => <SettingRow key={s.key} setting={s} />)}
            </div>
          </section>
        ))}

        <PlansSection />
      </main>
    </div>
  )
}

// ===== Section : plans d'abonnement marchands =====

function PlansSection() {
  const { data: plans, isLoading, isError } = useQuery({
    queryKey: ['admin', 'plans'],
    queryFn: fetchAdminPlans,
  })

  return (
    <section className="mb-6">
      <h3 className="font-semibold text-airmess-dark mb-3">📦 Plans d'abonnement marchands</h3>

      {isLoading && <p className="text-gray-500 text-sm">Chargement des plans…</p>}
      {isError && <p className="text-red-600 text-sm">Erreur de chargement.</p>}

      {plans && (
        <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-100">
          {plans.map((p) => <PlanRow key={p.id} plan={p} />)}
        </div>
      )}
    </section>
  )
}

function PlanRow({ plan }: { plan: AdminPlan }) {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [price, setPrice] = useState(String(plan.monthly_price_fcfa))
  const [quota, setQuota] = useState(String(plan.included_courses))
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () => updateAdminPlan(plan.id, {
      monthly_price_fcfa: Number(price),
      included_courses:   Number(quota),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'plans'] })
      setEditing(false)
      setError(null)
    },
    onError: (err) => {
      setError(err instanceof AxiosError
        ? err.response?.data?.message ?? 'Mise à jour impossible.'
        : 'Mise à jour impossible.')
    },
  })

  function cancel() {
    setPrice(String(plan.monthly_price_fcfa))
    setQuota(String(plan.included_courses))
    setEditing(false)
    setError(null)
  }

  return (
    <div className="p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <p className="font-semibold text-airmess-dark">
            {plan.name}
            <span className="ml-2 text-xs text-gray-400 font-normal">/{plan.code}</span>
          </p>
          {plan.description && (
            <p className="text-xs text-gray-500 mt-1">{plan.description}</p>
          )}
        </div>

        {!editing ? (
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-lg font-bold text-airmess-dark whitespace-nowrap">
                {plan.monthly_price_fcfa.toLocaleString('fr-FR')} <span className="text-xs font-normal text-gray-500">FCFA/mois</span>
              </p>
              <p className="text-xs text-gray-500">
                {plan.included_courses} courses incluses
              </p>
            </div>
            <button
              onClick={() => setEditing(true)}
              className="px-3 py-1 rounded-lg border border-gray-300 text-sm hover:bg-gray-50"
            >
              Modifier
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                disabled={mutation.isPending}
                className="w-28 px-3 py-1 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-airmess-yellow text-sm"
                placeholder="Prix"
              />
              <span className="text-xs text-gray-500">FCFA/mois</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={quota}
                onChange={(e) => setQuota(e.target.value)}
                disabled={mutation.isPending}
                className="w-28 px-3 py-1 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-airmess-yellow text-sm"
                placeholder="Courses"
              />
              <span className="text-xs text-gray-500">courses incluses</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => mutation.mutate()}
                disabled={mutation.isPending}
                className="px-3 py-1 rounded-lg bg-airmess-yellow text-airmess-dark text-sm font-semibold disabled:opacity-50"
              >
                {mutation.isPending ? '…' : 'OK'}
              </button>
              <button
                onClick={cancel}
                disabled={mutation.isPending}
                className="px-3 py-1 rounded-lg border border-gray-300 text-sm hover:bg-gray-50 disabled:opacity-50"
              >
                Annuler
              </button>
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-airmess-red mt-2 bg-red-50 p-2 rounded">{error}</p>
      )}
    </div>
  )
}

// ===== Sous-composant : une ligne =====

function SettingRow({ setting }: { setting: AppSetting }) {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState<string>(String(setting.value))
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () => updateSetting(setting.key, parseValue(value, setting.type)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'settings'] })
      setEditing(false)
      setError(null)
    },
    onError: (err) => {
      const msg =
        err instanceof AxiosError
          ? err.response?.data?.message ?? 'Mise à jour impossible.'
          : 'Mise à jour impossible.'
      setError(msg)
    },
  })

  function cancel() {
    setValue(String(setting.value))
    setEditing(false)
    setError(null)
  }

  return (
    <div className="p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <p className="font-semibold text-airmess-dark">{setting.label ?? setting.key}</p>
          {setting.description && (
            <p className="text-xs text-gray-500 mt-1">{setting.description}</p>
          )}
        </div>

        {!editing ? (
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold text-airmess-dark whitespace-nowrap">
              {String(setting.value)}
              {setting.key.includes('_percent') && ' %'}
              {setting.key.includes('_fcfa') && ' FCFA'}
            </span>
            <button
              onClick={() => setEditing(true)}
              className="px-3 py-1 rounded-lg border border-gray-300 text-sm hover:bg-gray-50"
            >
              Modifier
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <input
              type={setting.type === 'number' ? 'number' : 'text'}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              disabled={mutation.isPending}
              className="w-32 px-3 py-1 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-airmess-yellow text-sm"
              autoFocus
            />
            <button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending}
              className="px-3 py-1 rounded-lg bg-airmess-yellow text-airmess-dark text-sm font-semibold disabled:opacity-50"
            >
              {mutation.isPending ? '…' : 'OK'}
            </button>
            <button
              onClick={cancel}
              disabled={mutation.isPending}
              className="px-3 py-1 rounded-lg border border-gray-300 text-sm hover:bg-gray-50 disabled:opacity-50"
            >
              Annuler
            </button>
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-airmess-red mt-2 bg-red-50 p-2 rounded">{error}</p>
      )}

      {setting.updated_by && (
        <p className="text-[10px] text-gray-400 mt-2">
          Modifié par {setting.updated_by.name}
        </p>
      )}
    </div>
  )
}

// Helper : convertir la string d'input vers le type attendu
function parseValue(raw: string, type: AppSetting['type']) {
  if (type === 'number') return Number(raw)
  if (type === 'boolean') return raw === 'true' || raw === '1'
  if (type === 'json') return JSON.parse(raw)
  return raw
}
