import { useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import AdminPageShell from '../../components/admin/AdminPageShell'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import { AdminButton, AdminSelect } from '../../components/admin/AdminToolbar'
import {
  fetchAccountingLedger,
  fetchDriverCashDue,
  type AccountingJournal,
  type DriverCashDueRow,
} from '../../api/admin'

const EVENT_TYPES = [
  '',
  'driver_wallet_deposit',
  'driver_wallet_withdraw',
  'driver_earning',
  'driver_pickup_debit',
  'driver_refund',
  'driver_platform_commission',
  'user_wallet_deposit',
  'user_course_charge',
  'user_collection_credit',
  'recipient_paid_delivery',
  'package_picked_up',
  'package_delivered',
  'recipient_cash_collected',
]

function formatFcfa(value: number, locale: string): string {
  return value.toLocaleString(locale) + ' FCFA'
}

function formatDateTime(value: string, locale: string): string {
  return new Date(value).toLocaleString(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function daysAgoIso(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

export default function AdminAccountingLedgerPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language === 'en' ? 'en-US' : 'fr-FR'
  const [from, setFrom] = useState(daysAgoIso(29))
  const [to, setTo] = useState(todayIso())
  const [eventType, setEventType] = useState('')
  const [courseId, setCourseId] = useState('')
  const [driverId, setDriverId] = useState('')
  const [userId, setUserId] = useState('')
  const [page, setPage] = useState(1)

  const params = {
    from,
    to,
    event_type: eventType || undefined,
    course_id: courseId ? Number(courseId) : undefined,
    driver_id: driverId ? Number(driverId) : undefined,
    user_id: userId ? Number(userId) : undefined,
    page,
    per_page: 20,
  }

  const ledger = useQuery({
    queryKey: ['admin', 'accounting-ledger', params],
    queryFn: () => fetchAccountingLedger(params),
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  })

  const cashDue = useQuery({
    queryKey: ['admin', 'accounting-cash-due', from, to],
    queryFn: () => fetchDriverCashDue({ from, to }),
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  })

  function resetFilters() {
    setFrom(daysAgoIso(29))
    setTo(todayIso())
    setEventType('')
    setCourseId('')
    setDriverId('')
    setUserId('')
    setPage(1)
  }

  const journals = ledger.data?.journals.data ?? []
  const total = ledger.data?.journals.total ?? 0
  const lastPage = ledger.data?.journals.last_page ?? 1
  const cashRows = cashDue.data?.drivers ?? []
  const cashTotal = cashRows.reduce((sum, row) => sum + row.due_fcfa, 0)

  return (
    <AdminPageShell>
      <AdminPageHeader
        title={t('admin.accountingLedgerPage.title')}
        subtitle={t('admin.accountingLedgerPage.subtitle')}
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
            <DateInput value={from} onChange={(v) => { setFrom(v); setPage(1) }} />
            <DateInput value={to} onChange={(v) => { setTo(v); setPage(1) }} />
            <AdminSelect value={eventType} onChange={(e) => { setEventType(e.target.value); setPage(1) }}>
              {EVENT_TYPES.map((type) => (
                <option key={type || 'all'} value={type}>
                  {type || t('admin.accountingLedgerPage.allEvents')}
                </option>
              ))}
            </AdminSelect>
            <NumberFilter label={t('admin.accountingLedgerPage.courseId')} value={courseId} onChange={setCourseId} onCommit={() => setPage(1)} />
            <NumberFilter label={t('admin.accountingLedgerPage.driverId')} value={driverId} onChange={setDriverId} onCommit={() => setPage(1)} />
            <NumberFilter label={t('admin.accountingLedgerPage.userId')} value={userId} onChange={setUserId} onCommit={() => setPage(1)} />
            <AdminButton size="sm" variant="ghost" onClick={resetFilters}>
              {t('admin.accountingLedgerPage.reset')}
            </AdminButton>
          </div>
        }
      />

      <div className="p-4 md:p-6 lg:p-8 space-y-5">
        <div className="grid gap-3 lg:grid-cols-3">
          <SummaryCard label={t('admin.accountingLedgerPage.entries')} value={total.toLocaleString(locale)} hint={`${from} ${t('admin.accountingLedgerPage.to')} ${to}`} />
          <SummaryCard
            label={t('admin.accountingLedgerPage.cashDueByDrivers')}
            value={formatFcfa(cashTotal, locale)}
            hint={`${cashRows.length} ${t('admin.accountingLedgerPage.driversConcerned')}`}
          />
          <SummaryCard
            label={t('admin.accountingLedgerPage.status')}
            value={ledger.isFetching || cashDue.isFetching ? t('admin.accountingLedgerPage.refreshing') : t('admin.accountingLedgerPage.upToDate')}
            hint={t('admin.accountingLedgerPage.autoRefresh')}
          />
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="rounded-lg border border-warm-200 bg-off-white overflow-hidden">
            <div className="px-4 py-3 border-b border-warm-200 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-body font-bold text-ink">{t('admin.accountingLedgerPage.recentEntries')}</h2>
                <p className="text-caption text-warm-500">{t('admin.accountingLedgerPage.debitCreditByAccount')}</p>
              </div>
              <span className="text-caption text-warm-500">
                {t('admin.accountingLedgerPage.page')} {page} / {lastPage}
              </span>
            </div>

            {ledger.isLoading ? (
              <div className="p-6 text-body-s text-warm-500">{t('admin.accountingLedgerPage.loading')}</div>
            ) : ledger.isError ? (
              <div className="p-6 text-body-s text-airmess-red">{t('admin.accountingLedgerPage.loadError')}</div>
            ) : journals.length === 0 ? (
              <div className="p-6 text-body-s text-warm-500">{t('admin.accountingLedgerPage.noEntry')}</div>
            ) : (
              <div className="divide-y divide-warm-200">
                {journals.map((journal) => (
                  <JournalRow key={journal.id} journal={journal} locale={locale} t={t} />
                ))}
              </div>
            )}

            <div className="px-4 py-3 border-t border-warm-200 flex items-center justify-end gap-2">
              <AdminButton size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                {t('admin.accountingLedgerPage.previous')}
              </AdminButton>
              <AdminButton size="sm" variant="secondary" disabled={page >= lastPage} onClick={() => setPage((p) => Math.min(lastPage, p + 1))}>
                {t('admin.accountingLedgerPage.next')}
              </AdminButton>
            </div>
          </section>

          <section className="rounded-lg border border-warm-200 bg-off-white overflow-hidden">
            <div className="px-4 py-3 border-b border-warm-200">
              <h2 className="text-body font-bold text-ink">{t('admin.accountingLedgerPage.cashToReturn')}</h2>
              <p className="text-caption text-warm-500">{t('admin.accountingLedgerPage.amountsHeldByDrivers')}</p>
            </div>
            {cashDue.isLoading ? (
              <div className="p-4 text-body-s text-warm-500">{t('admin.accountingLedgerPage.loading')}</div>
            ) : cashRows.length === 0 ? (
              <div className="p-4 text-body-s text-warm-500">{t('admin.accountingLedgerPage.noCashDue')}</div>
            ) : (
              <div className="divide-y divide-warm-200">
                {cashRows.map((row) => (
                  <CashDueRow key={row.driver_id} row={row} locale={locale} t={t} />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </AdminPageShell>
  )
}

function DateInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <input
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 px-3 bg-off-white border border-warm-300 rounded-md text-body-s text-ink focus:outline-none focus:border-airmess-yellow focus:shadow-glow-yellow"
    />
  )
}

function NumberFilter({
  label,
  value,
  onChange,
  onCommit,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  onCommit: () => void
}) {
  return (
    <input
      type="number"
      min="1"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onCommit}
      placeholder={label}
      className="h-9 w-28 px-3 bg-off-white border border-warm-300 rounded-md text-body-s text-ink placeholder:text-warm-400 focus:outline-none focus:border-airmess-yellow focus:shadow-glow-yellow"
    />
  )
}

function SummaryCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-lg border border-warm-200 bg-cream px-4 py-3">
      <p className="text-caption font-semibold uppercase text-warm-500">{label}</p>
      <p className="mt-1 text-h3 font-extrabold text-ink">{value}</p>
      <p className="mt-1 text-caption text-warm-500">{hint}</p>
    </div>
  )
}

function JournalRow({
  journal,
  locale,
  t,
}: {
  journal: AccountingJournal
  locale: string
  t: (key: string) => string
}) {
  return (
    <article className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-body-s font-bold text-ink">{journal.event_type}</p>
          <p className="text-caption text-warm-500">
            {formatDateTime(journal.occurred_at, locale)}
            {journal.course ? ` · ${t('admin.accountingLedgerPage.course')} ${journal.course.reference}` : ''}
            {journal.driver_id ? ` · ${t('admin.accountingLedgerPage.driver')} #${journal.driver_id}` : ''}
            {journal.user_id ? ` · ${t('admin.accountingLedgerPage.user')} #${journal.user_id}` : ''}
          </p>
          {journal.description && (
            <p className="mt-1 text-body-s text-warm-600">{journal.description}</p>
          )}
        </div>
        <span className="rounded-full bg-warm-100 px-2.5 py-1 text-caption font-semibold text-warm-600">
          #{journal.id}
        </span>
      </div>

      <div className="mt-3 overflow-x-auto">
        <table className="min-w-full text-caption">
          <thead className="text-warm-500">
            <tr className="border-b border-warm-200">
              <th className="py-2 text-left font-semibold">{t('admin.accountingLedgerPage.account')}</th>
              <th className="py-2 text-left font-semibold">{t('admin.accountingLedgerPage.direction')}</th>
              <th className="py-2 text-right font-semibold">{t('admin.accountingLedgerPage.amount')}</th>
              <th className="py-2 text-left font-semibold">{t('admin.accountingLedgerPage.holder')}</th>
            </tr>
          </thead>
          <tbody>
            {journal.lines.map((line) => (
              <tr key={line.id} className="border-b border-warm-100 last:border-0">
                <td className="py-2 pr-3">
                  <span className="font-semibold text-ink">{line.account_code}</span>
                  <span className="block text-warm-500">{line.account_name}</span>
                </td>
                <td className="py-2 pr-3">
                  <span className={line.direction === 'debit' ? 'text-warning font-semibold' : 'text-success font-semibold'}>
                    {line.direction === 'debit' ? t('admin.accountingLedgerPage.debit') : t('admin.accountingLedgerPage.credit')}
                  </span>
                </td>
                <td className="py-2 pr-3 text-right font-bold text-ink">{formatFcfa(line.amount_fcfa, locale)}</td>
                <td className="py-2 text-warm-600">
                  {line.holder_type ? `${line.holder_type} #${line.holder_id ?? '-'}` : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  )
}

function CashDueRow({
  row,
  locale,
  t,
}: {
  row: DriverCashDueRow
  locale: string
  t: (key: string) => string
}) {
  return (
    <div className="px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-body-s font-bold text-ink truncate">{row.driver_name}</p>
          <p className="text-caption text-warm-500">{row.phone ?? `${t('admin.accountingLedgerPage.driver')} #${row.driver_id}`}</p>
        </div>
        <p className="text-body-s font-extrabold text-warning whitespace-nowrap">{formatFcfa(row.due_fcfa, locale)}</p>
      </div>
      <p className="mt-1 text-caption text-warm-500">{row.movement_count} {t('admin.accountingLedgerPage.movements')}</p>
    </div>
  )
}
