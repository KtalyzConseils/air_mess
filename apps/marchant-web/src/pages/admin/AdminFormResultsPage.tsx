import { Fragment, useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import AdminPageShell from '../../components/admin/AdminPageShell'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import AdminPagination from '../../components/admin/AdminPagination'
import { AdminSearchInput, AdminButton } from '../../components/admin/AdminToolbar'
import { ChevronDownIcon } from '../../components/ui/icons'
import {
  fetchMerchantWaitlists,
  fetchDriverWaitlists,
  type MerchantWaitlistListItem,
  type DriverWaitlistListItem,
  type MerchantWaitlistListParams,
  type DriverWaitlistListParams,
  type WaitlistExportFormat,
  downloadMerchantWaitlistsExport,
  downloadDriverWaitlistsExport,
  notifyPublicWaitlist,
} from '../../api/admin'

type Tab = 'merchants' | 'drivers'

interface PageData<T> {
  data: T[]
  current_page: number
  last_page: number
  total: number
}

function formatDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatList(values?: string[] | null): string {
  if (!Array.isArray(values) || values.length === 0) return '—'
  return values.filter(Boolean).join(', ')
}

function formatSurveyValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (Array.isArray(value)) return value.filter(Boolean).join(', ') || '—'
  if (typeof value === 'object') {
    return Object.entries(value)
      .filter(([, item]) => item !== null && item !== undefined && item !== '')
      .map(([key, item]) => `${key}: ${formatSurveyValue(item)}`)
      .join(', ') || '—'
  }
  return String(value)
}

function Field({
  label,
  value,
}: {
  label: string
  value: string | number | null | undefined
}) {
  const text = value && String(value).trim() ? String(value) : '—'

  return (
    <div className="min-w-0">
      <dt className="text-caption font-bold uppercase tracking-wide text-warm-500">{label}</dt>
      <dd className="mt-1 text-body-s text-ink break-words whitespace-pre-wrap">{text}</dd>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-6 last:mb-0">
      <h3 className="mb-3 text-body-s font-bold text-ink">{title}</h3>
      <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">{children}</dl>
    </section>
  )
}

function ResultCard({
  header,
  children,
  expanded,
  onToggle,
}: {
  header: ReactNode
  children: ReactNode
  expanded: boolean
  onToggle: () => void
}) {
  return (
    <div className="border border-warm-200 rounded-lg bg-off-white overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-cream/40"
      >
        <div className="min-w-0 flex-1">{header}</div>
        <ChevronDownIcon
          size={18}
          className={`shrink-0 text-warm-500 transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </button>
      {expanded && <div className="border-t border-warm-200 bg-cream/20 px-4 py-4">{children}</div>}
    </div>
  )
}

function MerchantResultCard({ item, onNotify, notifying }: { item: MerchantWaitlistListItem; onNotify: () => void; notifying: boolean }) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)

  const name = item.shop_name || item.contact_name || t('admin.common.unknown')
  const contact = [item.contact_name, item.whatsapp, item.email].filter(Boolean).join(' · ')

  return (
    <ResultCard
      expanded={expanded}
      onToggle={() => setExpanded((value) => !value)}
      header={
        <>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-ink truncate">{name}</span>
            {item.commerce_type && (
              <span className="rounded-full bg-cream px-2 py-0.5 text-caption font-bold text-warm-600">
                {item.commerce_type}
              </span>
            )}
            {item.zone && (
              <span className="rounded-full bg-airmess-yellow/15 px-2 py-0.5 text-caption font-bold text-ink">
                {item.zone}
              </span>
            )}
          </div>
          <p className="mt-1 text-caption text-warm-500 truncate">{contact || '—'}</p>
          <p className="mt-1 text-caption text-warm-500">
            <span className="font-semibold text-ink">
              {t('admin.formResults.bonus')} : {item.bonus_amount} F CFA
            </span>
            <span> · {t('admin.formResults.submittedAt')} {formatDate(item.created_at)}</span>
          </p>
          <p className={`mt-1 text-caption font-semibold ${item.notified_at ? 'text-success' : 'text-airmess-red'}`}>
            {item.notified_at ? `${t('admin.formResults.informedAt')} ${formatDate(item.notified_at)}` : t('admin.formResults.notInformed')}
          </p>
        </>
      }
    >
      <div className="mb-5 flex justify-end">
        <AdminButton size="sm" variant="primary" disabled={notifying || !item.email} onClick={onNotify}>
          {notifying ? t('admin.formResults.informing') : item.notified_at ? t('admin.formResults.informAgain') : t('admin.formResults.informByEmail')}
        </AdminButton>
      </div>
      <Section title={t('admin.formResults.sections.contact')}>
        <Field label={t('admin.formResults.merchant.commerceType')} value={item.commerce_type} />
        <Field label={t('admin.formResults.merchant.commerceTypeOther')} value={item.commerce_type_other} />
        <Field label={t('admin.formResults.merchant.shopName')} value={item.shop_name} />
        <Field label={t('admin.formResults.merchant.contactName')} value={item.contact_name} />
        <Field label={t('admin.formResults.merchant.email')} value={item.email} />
        <Field label={t('admin.formResults.merchant.whatsapp')} value={item.whatsapp} />
        <Field label={t('admin.formResults.merchant.zone')} value={item.zone} />
        <Field label={t('admin.formResults.merchant.zoneOther')} value={item.zone_other} />
      </Section>

      <Section title={t('admin.formResults.sections.activity')}>
        <Field label={t('admin.formResults.merchant.weeklyOrders')} value={item.weekly_orders} />
        <Field label={t('admin.formResults.merchant.source')} value={item.source} />
        <Field label={t('admin.formResults.merchant.sourceOther')} value={item.source_other} />
        <Field
          label={t('admin.formResults.merchant.deliveryMethods')}
          value={formatList(item.delivery_methods)}
        />
        <Field
          label={t('admin.formResults.merchant.deliveryMethodsOther')}
          value={item.delivery_methods_other}
        />
      </Section>

      <Section title={t('admin.formResults.sections.problems')}>
        <Field label={t('admin.formResults.merchant.problems')} value={formatList(item.problems)} />
        <Field label={t('admin.formResults.merchant.problemsOther')} value={item.problems_other} />
        <Field label={t('admin.formResults.merchant.worstExperience')} value={item.worst_experience} />
        <Field
          label={t('admin.formResults.merchant.cashCollectionIssue')}
          value={item.cash_collection_issue}
        />
        <Field label={t('admin.formResults.merchant.timeLostWeekly')} value={item.time_lost_weekly} />
        <Field
          label={t('admin.formResults.merchant.ordersLostWeekly')}
          value={item.orders_lost_weekly}
        />
      </Section>

      <Section title={t('admin.formResults.sections.expectations')}>
        <Field label={t('admin.formResults.merchant.expectedBenefit')} value={item.expected_benefit} />
        <Field
          label={t('admin.formResults.merchant.commissionAcceptance')}
          value={item.commission_acceptance}
        />
        <Field label={t('admin.formResults.merchant.reasonableFee')} value={item.reasonable_fee} />
        <Field label={t('admin.formResults.merchant.mobileMoneyTrust')} value={item.mobile_money_trust} />
        <Field
          label={t('admin.formResults.merchant.interestLevel')}
          value={String(item.interest_level)}
        />
        <Field label={t('admin.formResults.merchant.trialInterest')} value={item.trial_interest} />
      </Section>
    </ResultCard>
  )
}

function DriverResultCard({ item, onNotify, notifying }: { item: DriverWaitlistListItem; onNotify: () => void; notifying: boolean }) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)

  const name = item.full_name || t('admin.common.unknown')
  const contact = [item.email, item.whatsapp].filter(Boolean).join(' · ')
  const answers = item.survey_payload?.answers ?? {}
  const profile = item.account_payload?.profil_operationnel ?? {}

  return (
    <ResultCard
      expanded={expanded}
      onToggle={() => setExpanded((value) => !value)}
      header={
        <>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-ink truncate">{name}</span>
            {item.vehicle_type && (
              <span className="rounded-full bg-cream px-2 py-0.5 text-caption font-bold text-warm-600">
                {item.vehicle_type}
              </span>
            )}
            {item.zone && (
              <span className="rounded-full bg-airmess-yellow/15 px-2 py-0.5 text-caption font-bold text-ink">
                {item.zone}
              </span>
            )}
          </div>
          <p className="mt-1 text-caption text-warm-500 truncate">{contact || '—'}</p>
          <p className="mt-1 text-caption text-warm-500">
            {t('admin.formResults.submittedAt')} {formatDate(item.created_at)}
          </p>
          <p className={`mt-1 text-caption font-semibold ${item.notified_at ? 'text-success' : 'text-airmess-red'}`}>
            {item.notified_at ? `${t('admin.formResults.informedAt')} ${formatDate(item.notified_at)}` : t('admin.formResults.notInformed')}
          </p>
        </>
      }
    >
      <div className="mb-5 flex justify-end">
        <AdminButton size="sm" variant="primary" disabled={notifying || !item.email} onClick={onNotify}>
          {notifying ? t('admin.formResults.informing') : item.notified_at ? t('admin.formResults.informAgain') : t('admin.formResults.informByEmail')}
        </AdminButton>
      </div>
      {item.survey_response_id && (
        <Section title={t('admin.formResults.sections.survey')}>
          <Field label={t('admin.formResults.driver.operator')} value={item.account_payload?.operateur} />
          <Field label={t('admin.formResults.driver.motoUsage')} value={answers.A2 as string | undefined} />
          <Field label={t('admin.formResults.driver.license')} value={answers.A4 as string | undefined} />
          <Field label={t('admin.formResults.driver.phoneType')} value={answers.A5 as string | undefined} />
          <Field label={t('admin.formResults.driver.mobileMoneyAccounts')} value={formatSurveyValue(answers.A7)} />
          <Field label={t('admin.formResults.driver.language')} value={answers.A10 as string | undefined} />
          <Field label={t('admin.formResults.driver.daysPerWeek')} value={answers.B1 as string | undefined} />
          <Field label={t('admin.formResults.driver.dayPeriods')} value={formatSurveyValue(answers.B2)} />
          <Field label={t('admin.formResults.driver.deliveryExperience')} value={answers.S4 as string | undefined} />
          <Field label={t('admin.formResults.driver.seniority')} value={answers.S5 as string | undefined} />
          <Field label={t('admin.formResults.driver.meeting')} value={formatSurveyValue(profile.reunion)} />
          <Field label={t('admin.formResults.driver.training')} value={answers.H5 as string | undefined} />
          <Field label={t('admin.formResults.driver.intent')} value={answers.Z1 as string | undefined} />
          <Field label={t('admin.formResults.driver.responseId')} value={item.survey_response_id} />
        </Section>
      )}

      <Section title={t('admin.formResults.sections.contact')}>
        <Field label={t('admin.formResults.driver.fullName')} value={item.full_name} />
        <Field label={t('admin.formResults.driver.email')} value={item.email} />
        <Field label={t('admin.formResults.driver.whatsapp')} value={item.whatsapp} />
        <Field label={t('admin.formResults.driver.vehicleType')} value={item.vehicle_type} />
        <Field label={t('admin.formResults.driver.zone')} value={item.zone} />
        <Field label={t('admin.formResults.driver.zoneOther')} value={item.zone_other} />
      </Section>

      <Section title={t('admin.formResults.sections.activity')}>
        <Field label={t('admin.formResults.driver.experience')} value={item.experience} />
        <Field label={t('admin.formResults.driver.availability')} value={item.availability} />
        <Field label={t('admin.formResults.driver.source')} value={item.source} />
        <Field label={t('admin.formResults.driver.sourceOther')} value={item.source_other} />
        <Field
          label={t('admin.formResults.driver.platformsUsed')}
          value={formatList(item.platforms_used)}
        />
        <Field
          label={t('admin.formResults.driver.platformsUsedOther')}
          value={item.platforms_used_other}
        />
        <Field label={t('admin.formResults.driver.weeklyDeliveries')} value={item.weekly_deliveries} />
        <Field label={t('admin.formResults.driver.weeklyIncome')} value={item.weekly_income} />
      </Section>

      <Section title={t('admin.formResults.sections.problems')}>
        <Field label={t('admin.formResults.driver.problems')} value={formatList(item.problems)} />
        <Field label={t('admin.formResults.driver.problemsOther')} value={item.problems_other} />
        <Field label={t('admin.formResults.driver.worstExperience')} value={item.worst_experience} />
      </Section>

      <Section title={t('admin.formResults.sections.expectations')}>
        <Field
          label={t('admin.formResults.driver.expectedPaymentModel')}
          value={item.expected_payment_model}
        />
        <Field
          label={t('admin.formResults.driver.expectedWeeklyIncome')}
          value={item.expected_weekly_income}
        />
        <Field label={t('admin.formResults.driver.mobileMoneyTrust')} value={item.mobile_money_trust} />
        <Field
          label={t('admin.formResults.driver.interestLevel')}
          value={String(item.interest_level)}
        />
        <Field
          label={t('admin.formResults.driver.launchAvailability')}
          value={item.launch_availability}
        />
      </Section>
    </ResultCard>
  )
}

function ResultList<T extends { id: number }>({
  isLoading,
  isFetching,
  isError,
  items,
  pageData,
  itemLabel,
  emptyText,
  onChange,
  onRetry,
  renderItem,
}: {
  isLoading: boolean
  isFetching: boolean
  isError: boolean
  items: T[]
  pageData?: PageData<T>
  itemLabel: string
  emptyText: string
  onChange: (page: number) => void
  onRetry: () => void
  renderItem: (item: T) => ReactNode
}) {
  const { t } = useTranslation()

  if (isLoading) {
    return (
      <div className="p-10 text-center text-warm-500 text-body-s">
        {t('admin.common.loading')}
      </div>
    )
  }

  if (isError) {
    return (
      <div className="p-10 text-center text-body-s">
        <p className="text-airmess-red">{t('admin.formResults.loadError')}</p>
        <AdminButton className="mt-4" size="sm" variant="secondary" onClick={onRetry}>
          {t('admin.formResults.retry')}
        </AdminButton>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="p-10 text-center text-warm-500 text-body-s italic">{emptyText}</div>
    )
  }

  return (
    <>
      <div className="space-y-3">
        {items.map((item) => (
          <Fragment key={item.id}>{renderItem(item)}</Fragment>
        ))}
      </div>

      {pageData && (
        <AdminPagination
          currentPage={pageData.current_page}
          lastPage={pageData.last_page}
          total={pageData.total}
          itemLabel={itemLabel}
          onChange={onChange}
          isFetching={isFetching}
        />
      )}
    </>
  )
}

export default function AdminFormResultsPage() {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedTab = searchParams.get('tab')
  const tab: Tab = requestedTab === 'drivers' ? 'drivers' : 'merchants'
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [exporting, setExporting] = useState(false)
  const queryClient = useQueryClient()
  const notifyMutation = useMutation({
    mutationFn: ({ kind, id }: { kind: 'merchants' | 'drivers'; id: number }) => notifyPublicWaitlist(kind, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'form-results'] }),
    onError: () => window.alert(t('admin.formResults.informError')),
  })

  const search = q.trim()
  const merchantParams: MerchantWaitlistListParams = search ? { q: search, page } : { page }
  const driverParams: DriverWaitlistListParams = search ? { q: search, page } : { page }

  const merchantsQuery = useQuery({
    queryKey: ['admin', 'form-results', 'merchants', search, page],
    queryFn: () => fetchMerchantWaitlists(merchantParams),
    placeholderData: keepPreviousData,
    enabled: tab === 'merchants',
  })

  const driversQuery = useQuery({
    queryKey: ['admin', 'form-results', 'drivers', search, page],
    queryFn: () => fetchDriverWaitlists(driverParams),
    placeholderData: keepPreviousData,
    enabled: tab === 'drivers',
  })

  const changeTab = (nextTab: Tab) => {
    if (nextTab === tab) return
    setSearchParams({ tab: nextTab }, { replace: true })
    setPage(1)
    setQ('')
  }

  const handleExport = async (format: WaitlistExportFormat) => {
    setExporting(true)
    try {
      const filter = search ? { q: search } : {}
      if (tab === 'merchants') {
        await downloadMerchantWaitlistsExport(format, filter)
      } else {
        await downloadDriverWaitlistsExport(format, filter)
      }
    } catch (error) {
      console.error('Form results export failed', error)
      window.alert(t('admin.formResults.exportError'))
    } finally {
      setExporting(false)
    }
  }

  return (
    <AdminPageShell>
      <AdminPageHeader
        title={t('admin.formResults.title')}
        subtitle={t('admin.formResults.subtitle')}
        toolbar={
          <div className="flex flex-wrap items-center justify-between gap-3 w-full">
            <div className="inline-flex rounded-md border border-warm-300 bg-off-white p-1">
              <TabButton
                active={tab === 'merchants'}
                onClick={() => changeTab('merchants')}
                label={t('admin.formResults.tabsMerchants')}
              />
              <TabButton
                active={tab === 'drivers'}
                onClick={() => changeTab('drivers')}
                label={t('admin.formResults.tabsDrivers')}
              />
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <AdminSearchInput
                value={q}
                onChange={(e) => {
                  setQ(e.target.value)
                  setPage(1)
                }}
                placeholder={
                  tab === 'merchants'
                    ? t('admin.formResults.searchPlaceholderMerchants')
                    : t('admin.formResults.searchPlaceholderDrivers')
                }
                minWidthClass="min-w-[280px]"
              />
              <AdminButton
                size="sm"
                variant="secondary"
                disabled={exporting}
                onClick={() => handleExport('csv')}
              >
                {t('admin.formResults.exportExcel')}
              </AdminButton>
              <AdminButton
                size="sm"
                variant="secondary"
                disabled={exporting}
                onClick={() => handleExport('txt')}
              >
                {t('admin.formResults.exportTxt')}
              </AdminButton>
            </div>
          </div>
        }
      />

      <div className="px-4 md:px-6 lg:px-8 py-5">
        {tab === 'merchants' ? (
          <ResultList
            isLoading={merchantsQuery.isLoading}
            isFetching={merchantsQuery.isFetching}
            isError={merchantsQuery.isError}
            items={merchantsQuery.data?.data ?? []}
            pageData={merchantsQuery.data}
            itemLabel={t('admin.formResults.itemLabelMerchant')}
            emptyText={t('admin.formResults.emptyResults')}
            onChange={setPage}
            onRetry={() => void merchantsQuery.refetch()}
            renderItem={(item) => <MerchantResultCard item={item} notifying={notifyMutation.isPending && notifyMutation.variables?.id === item.id} onNotify={() => notifyMutation.mutate({ kind: 'merchants', id: item.id })} />}
          />
        ) : (
          <ResultList
            isLoading={driversQuery.isLoading}
            isFetching={driversQuery.isFetching}
            isError={driversQuery.isError}
            items={driversQuery.data?.data ?? []}
            pageData={driversQuery.data}
            itemLabel={t('admin.formResults.itemLabelDriver')}
            emptyText={t('admin.formResults.emptyResults')}
            onChange={setPage}
            onRetry={() => void driversQuery.refetch()}
            renderItem={(item) => <DriverResultCard item={item} notifying={notifyMutation.isPending && notifyMutation.variables?.id === item.id} onNotify={() => notifyMutation.mutate({ kind: 'drivers', id: item.id })} />}
          />
        )}
      </div>
    </AdminPageShell>
  )
}

function TabButton({
  active,
  onClick,
  label,
}: {
  active: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded px-3 py-1.5 text-body-s font-bold transition-colors ${
        active
          ? 'bg-airmess-yellow text-ink shadow-sm'
          : 'text-warm-600 hover:text-ink hover:bg-cream'
      }`}
    >
      {label}
    </button>
  )
}
