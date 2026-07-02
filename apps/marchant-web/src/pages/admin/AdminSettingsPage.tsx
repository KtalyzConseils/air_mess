import { useState, type ComponentType } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import { useTranslation } from 'react-i18next'
import AdminPageShell from '../../components/admin/AdminPageShell'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import { AdminButton } from '../../components/admin/AdminToolbar'
import {
  AlertTriangleIcon,
  SettingsIcon,
  BarChartIcon,
  PackageIcon,
  CheckIcon,
  DashboardIcon,
  MenuIcon,
  type IconProps,
} from '../../components/ui/icons'
import { fetchSettings, updateSetting, type AppSetting } from '../../api/admin/settings'
import { fetchAdminPlans, updateAdminPlan, type AdminPlan } from '../../api/admin/plans'
import { useUiPrefsStore, type NavMode } from '../../stores/uiPrefsStore'

interface GroupMeta {
  label: string
  description: string
  Icon: ComponentType<IconProps>
}

interface GroupMetaConfig {
  labelKey: string
  descKey: string
  Icon: ComponentType<IconProps>
}

const GROUP_META_CONFIG: Record<string, GroupMetaConfig> = {
  pricing: {
    labelKey: 'admin.settings.groupPricingLabel',
    descKey: 'admin.settings.groupPricingDesc',
    Icon: BarChartIcon,
  },
  quotas: {
    labelKey: 'admin.settings.groupQuotasLabel',
    descKey: 'admin.settings.groupQuotasDesc',
    Icon: PackageIcon,
  },
  general: {
    labelKey: 'admin.settings.groupGeneralLabel',
    descKey: 'admin.settings.groupGeneralDesc',
    Icon: SettingsIcon,
  },
}

export default function AdminSettingsPage() {
  const { t } = useTranslation()
  const { data: settings, isLoading, isError } = useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: fetchSettings,
  })

  return (
    <AdminPageShell>
      <AdminPageHeader
        title={t('admin.settings.title')}
        subtitle={t('admin.settings.subtitleShort')}
      />

      <div className="px-4 md:px-8 lg:px-12 py-6 max-w-4xl mx-auto space-y-8">
        {/* Préférences UI — locale (par-device), pas un setting serveur */}
        <NavPreferenceSection />

        {isLoading && (
          <p className="text-body-s text-warm-500">{t('admin.settings.loadingLabel')}</p>
        )}
        {isError && (
          <p className="text-body-s text-airmess-red">{t('admin.settings.loadingError')}</p>
        )}

        {settings &&
          Object.entries(settings).map(([group, items]) => {
            const cfg = GROUP_META_CONFIG[group]
            const meta: GroupMeta = cfg
              ? { label: t(cfg.labelKey), description: t(cfg.descKey), Icon: cfg.Icon }
              : { label: group, description: '', Icon: SettingsIcon }
            return (
              <SettingsGroup key={group} meta={meta}>
                <ul className="divide-y divide-warm-200">
                  {items.map((s) => (
                    <SettingRow key={s.key} setting={s} />
                  ))}
                </ul>
              </SettingsGroup>
            )
          })}

        <PlansSection />
      </div>
    </AdminPageShell>
  )
}

/* ============================================================
   Groupe de paramètres : en-tête avec icône + description,
   puis liste de rows. Le visuel principal vient du contraste
   entre l'en-tête (jaune subtil) et le corps (off-white).
   ============================================================ */
function SettingsGroup({
  meta,
  children,
}: {
  meta: GroupMeta
  children: React.ReactNode
}) {
  return (
    <section className="bg-off-white border border-warm-200 rounded-lg overflow-hidden">
      <header className="flex items-start gap-3 px-6 py-4 bg-airmess-yellow/8 border-b border-warm-200">
        <span className="shrink-0 w-9 h-9 rounded-md bg-airmess-yellow text-ink flex items-center justify-center">
          <meta.Icon size={18} />
        </span>
        <div className="min-w-0">
          <h2 className="text-body font-bold text-ink leading-tight">{meta.label}</h2>
          <p className="text-caption text-warm-600 mt-0.5">{meta.description}</p>
        </div>
      </header>
      {children}
    </section>
  )
}

/* ============================================================
   Section plans abonnements — pareil mais sans data dynamique
   ============================================================ */
function PlansSection() {
  const { t } = useTranslation()
  const { data: plans, isLoading, isError } = useQuery({
    queryKey: ['admin', 'plans'],
    queryFn: fetchAdminPlans,
  })

  return (
    <SettingsGroup
      meta={{
        label: t('admin.settings.plansSectionLabel'),
        description: t('admin.settings.plansSectionDesc'),
        Icon: PackageIcon,
      }}
    >
      {isLoading && (
        <p className="text-body-s text-warm-500 px-6 py-4">
          {t('admin.settings.loadingPlans')}
        </p>
      )}
      {isError && (
        <p className="text-body-s text-airmess-red px-6 py-4">
          {t('admin.settings.loadingError')}
        </p>
      )}

      {plans && (
        <ul className="divide-y divide-warm-200">
          {plans.map((p) => (
            <PlanRow key={p.id} plan={p} />
          ))}
        </ul>
      )}
    </SettingsGroup>
  )
}

function PlanRow({ plan }: { plan: AdminPlan }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [price, setPrice] = useState(String(plan.monthly_price_fcfa))
  const [quota, setQuota] = useState(String(plan.included_courses))
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () =>
      updateAdminPlan(plan.id, {
        monthly_price_fcfa: Number(price),
        included_courses: Number(quota),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'plans'] })
      setEditing(false)
      setError(null)
    },
    onError: (err) => {
      setError(
        err instanceof AxiosError
          ? err.response?.data?.message ?? t('admin.settings.updateError')
          : t('admin.settings.updateError'),
      )
    },
  })

  function cancel() {
    setPrice(String(plan.monthly_price_fcfa))
    setQuota(String(plan.included_courses))
    setEditing(false)
    setError(null)
  }

  return (
    <li className="px-6 py-4 hover:bg-cream/30 transition-colors">
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-start">
        {/* Colonne gauche : description */}
        <div className="min-w-0">
          <div className="flex items-baseline gap-2">
            <p className="text-body font-bold text-ink">{plan.name}</p>
            <span className="text-caption font-mono text-warm-400">/{plan.code}</span>
          </div>
          {plan.description && (
            <p className="text-body-s text-warm-500 mt-1">{plan.description}</p>
          )}
        </div>

        {/* Colonne droite : valeur + actions */}
        {!editing ? (
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
              <p className="text-body font-bold text-ink tabular-nums whitespace-nowrap">
                {plan.monthly_price_fcfa.toLocaleString('fr-FR')}{' '}
                <span className="text-caption text-warm-500 font-normal">
                  {t('admin.settings.perMonthUnit')}
                </span>
              </p>
              <p className="text-caption text-warm-500 tabular-nums">
                {plan.included_courses} {t('admin.settings.coursesIncludedSuffix')}
              </p>
            </div>
            <AdminButton variant="secondary" size="sm" onClick={() => setEditing(true)}>
              {t('admin.settings.modify')}
            </AdminButton>
          </div>
        ) : (
          <div className="flex flex-col items-end gap-2">
            <NumberFieldWithUnit
              value={price}
              onChange={setPrice}
              disabled={mutation.isPending}
              unit={t('admin.settings.perMonthUnit')}
              placeholder={t('admin.settings.pricePlaceholder')}
            />
            <NumberFieldWithUnit
              value={quota}
              onChange={setQuota}
              disabled={mutation.isPending}
              unit={t('admin.settings.coursesUnit')}
              placeholder={t('admin.settings.quotaPlaceholder')}
            />
            <EditActions
              onSave={() => mutation.mutate()}
              onCancel={cancel}
              isPending={mutation.isPending}
            />
          </div>
        )}
      </div>

      {error && <InlineError text={error} />}
    </li>
  )
}

/* ============================================================
   Ligne de paramètre individuel
   ============================================================ */
function SettingRow({ setting }: { setting: AppSetting }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState<string>(String(setting.value))
  const [error, setError] = useState<string | null>(null)
  const [justSaved, setJustSaved] = useState(false)

  const mutation = useMutation({
    mutationFn: () => updateSetting(setting.key, parseValue(value, setting.type)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'settings'] })
      setEditing(false)
      setError(null)
      setJustSaved(true)
      setTimeout(() => setJustSaved(false), 1500)
    },
    onError: (err) => {
      const msg =
        err instanceof AxiosError
          ? err.response?.data?.message ?? t('admin.settings.updateError')
          : t('admin.settings.updateError')
      setError(msg)
    },
  })

  function cancel() {
    setValue(String(setting.value))
    setEditing(false)
    setError(null)
  }

  // Suffixe contextuel sur la valeur (déduit de la clé)
  const suffix = setting.key.includes('_percent')
    ? '%'
    : setting.key.includes('_fcfa')
      ? 'FCFA'
      : null

  return (
    <li className="px-6 py-4 hover:bg-cream/30 transition-colors">
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-start">
        {/* Colonne gauche : description (responsive : titre + clé technique) */}
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-body-s font-bold text-ink">
              {setting.label ?? setting.key}
            </p>
            {setting.label && (
              <span className="text-caption font-mono text-warm-400">{setting.key}</span>
            )}
            {justSaved && (
              <span className="inline-flex items-center gap-1 text-caption font-semibold text-success">
                <CheckIcon size={12} /> {t('admin.settings.savedBadge')}
              </span>
            )}
          </div>
          {setting.description && (
            <p className="text-body-s text-warm-500 mt-1 max-w-prose">{setting.description}</p>
          )}
          {setting.updated_by && !editing && (
            <p className="text-caption text-warm-400 mt-1.5">
              {t('admin.settings.lastEditedByPrefix')} {setting.updated_by.name}
            </p>
          )}
        </div>

        {/* Colonne droite : valeur + actions */}
        {!editing ? (
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
              <span className="text-body font-bold text-ink whitespace-nowrap tabular-nums">
                {String(setting.value)}
                {suffix && (
                  <span className="text-caption text-warm-500 font-normal ml-1">
                    {suffix}
                  </span>
                )}
              </span>
            </div>
            <AdminButton variant="secondary" size="sm" onClick={() => setEditing(true)}>
              {t('admin.settings.modify')}
            </AdminButton>
          </div>
        ) : (
          <div className="flex flex-col items-end gap-2">
            <NumberFieldWithUnit
              value={value}
              onChange={setValue}
              disabled={mutation.isPending}
              unit={suffix ?? undefined}
              type={setting.type === 'number' ? 'number' : 'text'}
              autoFocus
            />
            <EditActions
              onSave={() => mutation.mutate()}
              onCancel={cancel}
              isPending={mutation.isPending}
            />
          </div>
        )}
      </div>

      {error && <InlineError text={error} />}
    </li>
  )
}

/* ============================================================
   Sous-composants utilitaires de la page
   ============================================================ */

function NumberFieldWithUnit({
  value,
  onChange,
  disabled,
  unit,
  placeholder,
  type = 'number',
  autoFocus,
}: {
  value: string
  onChange: (v: string) => void
  disabled?: boolean
  unit?: string
  placeholder?: string
  type?: 'number' | 'text'
  autoFocus?: boolean
}) {
  return (
    <div className="inline-flex items-stretch border border-warm-300 rounded-md overflow-hidden bg-off-white focus-within:border-airmess-yellow focus-within:shadow-glow-yellow transition-all">
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="w-28 h-8 px-3 bg-transparent text-body-s text-ink focus:outline-none tabular-nums"
      />
      {unit && (
        <span className="px-2.5 inline-flex items-center text-caption text-warm-500 bg-cream border-l border-warm-200 whitespace-nowrap">
          {unit}
        </span>
      )}
    </div>
  )
}

function EditActions({
  onSave,
  onCancel,
  isPending,
}: {
  onSave: () => void
  onCancel: () => void
  isPending: boolean
}) {
  const { t } = useTranslation()
  return (
    <div className="inline-flex items-center gap-1.5">
      <AdminButton variant="secondary" size="sm" onClick={onCancel} disabled={isPending}>
        {t('common.cancel')}
      </AdminButton>
      <AdminButton variant="primary" size="sm" onClick={onSave} disabled={isPending}>
        {isPending ? t('admin.settings.savingLabel') : t('admin.settings.saveCta')}
      </AdminButton>
    </div>
  )
}

function InlineError({ text }: { text: string }) {
  return (
    <p className="text-body-s text-airmess-red mt-3 bg-danger-bg border border-airmess-red/20 px-3 py-2 rounded-md flex items-center gap-1.5">
      <AlertTriangleIcon size={14} />
      {text}
    </p>
  )
}

function parseValue(raw: string, type: AppSetting['type']) {
  if (type === 'number') return Number(raw)
  if (type === 'boolean') return raw === 'true' || raw === '1'
  if (type === 'json') return JSON.parse(raw)
  return raw
}

/* ============================================================
   Préférence de navigation — store local (par-device).
   ============================================================ */

interface NavOption {
  value: NavMode
  labelKey: string
  descKey: string
  Icon: ComponentType<IconProps>
}

const NAV_OPTIONS: NavOption[] = [
  {
    value: 'both',
    labelKey: 'admin.settings.navBothLabel',
    descKey: 'admin.settings.navBothDesc',
    Icon: DashboardIcon,
  },
  {
    value: 'sidebar',
    labelKey: 'admin.settings.navSidebarLabel',
    descKey: 'admin.settings.navSidebarDesc',
    Icon: MenuIcon,
  },
  {
    value: 'fab',
    labelKey: 'admin.settings.navFabLabel',
    descKey: 'admin.settings.navFabDesc',
    Icon: SettingsIcon,
  },
]

function NavPreferenceSection() {
  const { t } = useTranslation()
  const navMode = useUiPrefsStore((s) => s.navMode)
  const setNavMode = useUiPrefsStore((s) => s.setNavMode)

  return (
    <SettingsGroup
      meta={{
        label: t('admin.settings.navPrefsLabel'),
        description: t('admin.settings.navPrefsDesc'),
        Icon: DashboardIcon,
      }}
    >
      <ul className="divide-y divide-warm-200">
        {NAV_OPTIONS.map((opt) => {
          const active = navMode === opt.value
          return (
            <li key={opt.value}>
              <button
                type="button"
                onClick={() => setNavMode(opt.value)}
                className={[
                  'w-full text-left px-6 py-4 flex items-start gap-4 transition-colors',
                  active ? 'bg-airmess-yellow/8' : 'hover:bg-cream/40',
                ].join(' ')}
              >
                {/* Radio visuel */}
                <span
                  className={[
                    'shrink-0 mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors',
                    active ? 'border-airmess-yellow bg-airmess-yellow' : 'border-warm-300 bg-off-white',
                  ].join(' ')}
                >
                  {active && <span className="w-2 h-2 rounded-full bg-ink" />}
                </span>

                {/* Icône + texte */}
                <span className="shrink-0 w-8 h-8 rounded-md bg-warm-100 text-warm-600 flex items-center justify-center">
                  <opt.Icon size={16} />
                </span>

                <span className="min-w-0 flex-1">
                  <p className="text-body-s font-bold text-ink flex items-center gap-2">
                    {t(opt.labelKey)}
                    {active && (
                      <span className="inline-flex items-center gap-1 text-caption font-semibold text-success">
                        <CheckIcon size={12} /> {t('admin.settings.activeBadge')}
                      </span>
                    )}
                  </p>
                  <p className="text-body-s text-warm-500 mt-0.5">{t(opt.descKey)}</p>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </SettingsGroup>
  )
}
