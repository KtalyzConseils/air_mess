import { useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import { useTranslation } from 'react-i18next'
import AdminPageShell from '../../components/admin/AdminPageShell'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import { AdminButton } from '../../components/admin/AdminToolbar'
import { AlertTriangleIcon, CheckIcon } from '../../components/ui/icons'
import {
  fetchReconciliation,
  downloadReconciliationCsv,
  prepareSandboxRepair,
  applySandboxRepair,
  type ReconciliationFlow,
} from '../../api/admin'

function isoDateNDaysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}
function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}
function formatFcfa(n: number): string {
  return n.toLocaleString('fr-FR') + ' FCFA'
}
function formatDateTime(value: string | null, neverLabel: string): string {
  if (!value) return neverLabel
  return new Date(value).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const TYPE_I18N_KEY: Record<string, string> = {
  deposit: 'admin.reconciliation.flowTypeDeposit',
  withdraw: 'admin.reconciliation.flowTypeWithdraw',
  pickup_debit: 'admin.reconciliation.flowTypePickupDebit',
  refund: 'admin.reconciliation.flowTypeRefund',
  earning: 'admin.reconciliation.flowTypeEarning',
  adjustment_credit: 'admin.reconciliation.flowTypeAdjustmentCredit',
  adjustment_debit: 'admin.reconciliation.flowTypeAdjustmentDebit',
  course_charge: 'admin.reconciliation.flowTypeCourseCharge',
}

function FlowRow({ flow }: { flow: ReconciliationFlow }) {
  const { t } = useTranslation()
  const label = TYPE_I18N_KEY[flow.type] ? t(TYPE_I18N_KEY[flow.type]) : flow.type
  const positive = flow.total >= 0
  return (
    <li className="flex justify-between items-center py-1.5 text-body-s">
      <span className="text-warm-700">
        {label}{' '}
        <span className="text-caption text-warm-400 tabular-nums">({flow.n})</span>
      </span>
      <span
        className={`font-bold tabular-nums ${positive ? 'text-success' : 'text-airmess-red'}`}
      >
        {positive ? '+' : ''}
        {flow.total.toLocaleString('fr-FR')}
      </span>
    </li>
  )
}

function Section({
  title,
  action,
  children,
  className = '',
}: {
  title: string
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`bg-off-white border border-warm-200 rounded-lg ${className}`}>
      <div className="flex items-center justify-between gap-3 px-5 py-2.5 border-b border-warm-200">
        <h2 className="text-body-s font-bold text-ink">{title}</h2>
        {action}
      </div>
      <div className="px-5 py-4">{children}</div>
    </section>
  )
}

export default function AdminReconciliationPage() {
  const { t } = useTranslation()
  const [from, setFrom] = useState<string>(isoDateNDaysAgo(30))
  const [to, setTo] = useState<string>(todayIso())
  const [isDownloading, setIsDownloading] = useState(false)
  const [isRepairing, setIsRepairing] = useState(false)
  const [repairMessage, setRepairMessage] = useState<string | null>(null)
  const [isGuideOpen, setIsGuideOpen] = useState(false)

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['admin', 'reconciliation', from, to],
    queryFn: () => fetchReconciliation(from, to),
  })

  async function handleExport() {
    setIsDownloading(true)
    try {
      await downloadReconciliationCsv(from, to)
    } catch {
      window.alert(t('admin.reconciliation.exportError'))
    } finally {
      setIsDownloading(false)
    }
  }

  async function handleApplySandboxRepair() {
    if (!data?.sandbox_audit?.snapshot_token) return

    setIsRepairing(true)
    setRepairMessage(null)

    try {
      const preparation = await prepareSandboxRepair(data.sandbox_audit.snapshot_token)
      if (!preparation.plan.correction_ready) {
        window.alert(t('admin.reconciliation.sandboxNothingToApply'))
        return
      }
      const userTotal = preparation.plan.user_adjustments.reduce((sum, row) => sum + Math.abs(row.amount_fcfa), 0)
      const driverTotal = preparation.plan.driver_adjustments.reduce((sum, row) => sum + Math.abs(row.amount_fcfa), 0)
      const userIds = preparation.plan.user_adjustments.map((row) => `#${row.user_id}`).join(', ') || '—'
      const driverIds = preparation.plan.driver_adjustments.map((row) => `#${row.driver_id}`).join(', ') || '—'
      const enteredCode = window.prompt(t('admin.reconciliation.sandboxCodePrompt', {
        code: preparation.confirmation_code,
        userTotal: formatFcfa(userTotal),
        driverTotal: formatFcfa(driverTotal),
        userIds,
        driverIds,
      }))
      if (enteredCode === null) return
      if (enteredCode.trim() !== preparation.confirmation_code) {
        window.alert(t('admin.reconciliation.sandboxCodeMismatch'))
        return
      }
      const response = await applySandboxRepair(data.sandbox_audit.snapshot_token, enteredCode.trim())
      setRepairMessage(response.message)
      window.alert(response.message)
      await refetch()
    } catch (error: unknown) {
      const msg = error instanceof AxiosError
        ? (error.response?.data as { message?: string } | undefined)?.message
          ?? t('admin.reconciliation.sandboxApplyError')
        : t('admin.reconciliation.sandboxApplyError')
      setRepairMessage(msg)
      window.alert(msg)
    } finally {
      setIsRepairing(false)
    }
  }

  function setPreset(days: number) {
    setFrom(isoDateNDaysAgo(days))
    setTo(todayIso())
  }

  const dateInputCls =
    'h-9 px-3 bg-off-white border border-warm-300 rounded-md text-body-s text-ink focus:outline-none focus:border-airmess-yellow focus:shadow-glow-yellow transition-all'

  return (
    <AdminPageShell>
      <AdminPageHeader
        title={t('admin.reconciliation.title')}
        subtitle={t('admin.reconciliation.subtitleFull')}
        toolbar={
          <div className="flex flex-wrap items-end gap-2 w-full">
            <div>
              <label className="block text-[10px] uppercase tracking-wider font-bold text-warm-600 mb-1">
                {t('admin.reconciliation.dateFrom')}
              </label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className={dateInputCls}
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider font-bold text-warm-600 mb-1">
                {t('admin.reconciliation.dateTo')}
              </label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className={dateInputCls}
              />
            </div>
            <div className="flex gap-1">
              {[7, 30, 90].map((n) => (
                <AdminButton
                  key={n}
                  variant="secondary"
                  size="sm"
                  onClick={() => setPreset(n)}
                >
                  {t('admin.reconciliation.presetDays', { n })}
                </AdminButton>
              ))}
            </div>
            <AdminButton
              variant="secondary"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              {isFetching
                ? t('admin.reconciliation.loadingLabel')
                : t('admin.reconciliation.refresh')}
            </AdminButton>
            <AdminButton
              variant="primary"
              onClick={handleExport}
              disabled={isDownloading || isLoading}
              className="ml-auto"
            >
              {isDownloading
                ? t('admin.reconciliation.exportingLabel')
                : t('admin.reconciliation.exportCsv')}
            </AdminButton>
          </div>
        }
      />

      <div className="px-4 md:px-6 lg:px-8 py-5 space-y-4">
        {isLoading && (
          <p className="text-body-s text-warm-500 text-center py-10">
            {t('admin.reconciliation.loadingLabel')}
          </p>
        )}

        {data && (
          <>
            {/* Snapshot temps réel */}
            <section className="grid md:grid-cols-3 gap-3">
              <div className="bg-airmess-dark text-white rounded-lg px-5 py-4">
                <p className="text-[10px] uppercase tracking-wider font-bold text-white/60 mb-1">
                  {t('admin.reconciliation.snapshotTotalMoney')}
                </p>
                <p className="text-h1 font-bold tabular-nums leading-none">
                  {formatFcfa(data.snapshot.grand_total)}
                </p>
                <p className="text-caption text-white/60 mt-2">
                  {t('admin.reconciliation.snapshotRealtime')}
                </p>
              </div>
              <div className="bg-off-white border border-warm-200 rounded-lg px-5 py-4">
                <p className="text-[10px] uppercase tracking-wider font-bold text-warm-600 mb-1">
                  {t('admin.reconciliation.driversWallets')}
                </p>
                <p className="text-h2 font-bold text-ink tabular-nums leading-none">
                  {formatFcfa(data.snapshot.drivers.total_balance)}
                </p>
                <p className="text-caption text-warm-500 mt-2">
                  {t('admin.reconciliation.walletsCount', {
                    count: data.snapshot.drivers.wallets_count,
                  })}
                </p>
              </div>
              <div className="bg-off-white border border-warm-200 rounded-lg px-5 py-4">
                <p className="text-[10px] uppercase tracking-wider font-bold text-warm-600 mb-1">
                  {t('admin.reconciliation.merchantIndividualWallets')}
                </p>
                <p className="text-h2 font-bold text-ink tabular-nums leading-none">
                  {formatFcfa(data.snapshot.users.total_balance)}
                </p>
                <p className="text-caption text-warm-500 mt-2">
                  {t('admin.reconciliation.walletsCount', {
                    count: data.snapshot.users.wallets_count,
                  })}{' '}
                  · {formatFcfa(data.snapshot.users.total_reserved)}{' '}
                  {t('admin.reconciliation.walletsReservedSuffix')}
                </p>
              </div>
            </section>

            <Section title={t('admin.reconciliation.sandboxAuditTitle')}>
              <div className="bg-warning-bg border border-warning/30 rounded-md p-4 space-y-4">
                <p className="text-body-s text-ink">{t('admin.reconciliation.sandboxAuditWarning')}</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <MarginTile label={t('admin.reconciliation.sandboxPayments')} value={data.sandbox_audit.payments.count} />
                  <MarginTile label={t('admin.reconciliation.sandboxPaid')} value={formatFcfa(data.sandbox_audit.payments.paid_total)} compact />
                  <MarginTile label={t('admin.reconciliation.sandboxUserResidual')} value={formatFcfa(data.sandbox_audit.user_wallets.residual_upper_bound)} tone="warning" compact />
                  <MarginTile label={t('admin.reconciliation.sandboxDriverExposure')} value={formatFcfa(data.sandbox_audit.driver_wallets.exposed_residual_upper_bound)} tone="warning" compact />
                </div>
                <p className="text-caption text-warm-600">
                  {t('admin.reconciliation.sandboxSnapshot')} <code className="font-mono break-all">{data.sandbox_audit.snapshot_token}</code>
                </p>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <p className="text-caption font-bold text-airmess-red">{t('admin.reconciliation.sandboxNoCorrection')}</p>
                  <div className="flex flex-wrap gap-2">
                    <AdminButton variant="secondary" size="sm" onClick={() => setIsGuideOpen(true)}>
                      {t('admin.reconciliation.sandboxGuideButton')}
                    </AdminButton>
                    <AdminButton
                      variant="primary"
                      size="sm"
                      onClick={handleApplySandboxRepair}
                      disabled={isRepairing || !data.sandbox_audit.snapshot_token}
                    >
                      {isRepairing
                        ? t('admin.reconciliation.sandboxApplying')
                        : t('admin.reconciliation.sandboxApplyButton')}
                    </AdminButton>
                  </div>
                </div>
                {repairMessage && (
                  <p className="text-caption text-airmess-red font-bold break-all">{repairMessage}</p>
                )}
              </div>
            </Section>


          {isGuideOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4" role="presentation" onMouseDown={() => setIsGuideOpen(false)}>
              <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-md bg-white shadow-xl p-5 md:p-6" role="dialog" aria-modal="true" aria-labelledby="sandbox-guide-title" onMouseDown={(event) => event.stopPropagation()}>
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <h2 id="sandbox-guide-title" className="text-h3 text-ink">{t('admin.reconciliation.sandboxGuideTitle')}</h2>
                    <p className="text-body-s text-warm-700 mt-1">{t('admin.reconciliation.sandboxGuideIntro')}</p>
                  </div>
                  <button type="button" className="text-warm-600 hover:text-ink text-xl" aria-label={t('common.close')} onClick={() => setIsGuideOpen(false)}>×</button>
                </div>
                <div className="space-y-4 text-body-s text-warm-700">
                  <section>
                    <h3 className="font-bold text-ink mb-2">{t('admin.reconciliation.sandboxGuideEffectsTitle')}</h3>
                    <ul className="list-disc pl-5 space-y-1.5">
                      <li><strong>{t('admin.reconciliation.sandboxGuideCourseLabel')}</strong> {t('admin.reconciliation.sandboxGuideCourse')}</li>
                      <li><strong>{t('admin.reconciliation.sandboxGuideClientLabel')}</strong> {t('admin.reconciliation.sandboxGuideClient')}</li>
                      <li><strong>{t('admin.reconciliation.sandboxGuideDriverLabel')}</strong> {t('admin.reconciliation.sandboxGuideDriver')}</li>
                      <li><strong>{t('admin.reconciliation.sandboxGuidePlatformLabel')}</strong> {t('admin.reconciliation.sandboxGuidePlatform')}</li>
                    </ul>
                  </section>
                  <section className="rounded-md border border-warm-300 bg-cream p-4">
                    <h3 className="font-bold text-ink mb-2">{t('admin.reconciliation.sandboxGuideExcludedTitle')}</h3>
                    <p>{t('admin.reconciliation.sandboxGuideExcludedIntro')}</p>
                    <ul className="list-disc pl-5 mt-2 space-y-1">
                      <li>{t('admin.reconciliation.sandboxGuideExcludedCourses')}</li>
                      <li>{t('admin.reconciliation.sandboxGuideExcludedPayments')}</li>
                      <li>{t('admin.reconciliation.sandboxGuideExcludedReservations')}</li>
                      <li>{t('admin.reconciliation.sandboxGuideExcludedWithdrawals')}</li>
                      <li>{t('admin.reconciliation.sandboxGuideExcludedSpent')}</li>
                    </ul>
                    <p className="mt-2 font-semibold text-airmess-red">{t('admin.reconciliation.sandboxGuideManualReview')}</p>
                  </section>
                  <section>
                    <h3 className="font-bold text-ink mb-2">{t('admin.reconciliation.sandboxGuideSecurityTitle')}</h3>
                    <ol className="list-decimal pl-5 space-y-1.5">
                      <li>{t('admin.reconciliation.sandboxGuide1')}</li>
                      <li>{t('admin.reconciliation.sandboxGuide2')}</li>
                      <li>{t('admin.reconciliation.sandboxGuide3')}</li>
                    </ol>
                  </section>
                </div>
                <div className="mt-5 rounded-md border border-warm-300 bg-warning-bg p-4">
                  <p className="text-body-s font-bold text-ink mb-2">{t('admin.reconciliation.sandboxExampleTitle')}</p>
                  <p className="text-body-s text-warm-700">{t('admin.reconciliation.sandboxExample')}</p>
                </div>
                <div className="mt-5 flex justify-end">
                  <AdminButton variant="secondary" size="sm" onClick={() => setIsGuideOpen(false)}>{t('common.close')}</AdminButton>
                </div>
              </div>
            </div>
          )}
            {/* Marge brute */}
            <Section title={t('admin.reconciliation.marginTitle')}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <MarginTile
                  label={t('admin.reconciliation.deliveredCourses')}
                  value={data.margin.delivered_courses}
                />
                <MarginTile
                  label={t('admin.reconciliation.grossRevenue')}
                  value={formatFcfa(data.margin.gross_revenue)}
                  compact
                />
                <MarginTile
                  label={t('admin.reconciliation.driverShare')}
                  value={`−${formatFcfa(data.margin.driver_commission)}`}
                  tone="warning"
                  compact
                />
                <MarginTile
                  label={t('admin.reconciliation.platformMargin')}
                  value={formatFcfa(data.margin.platform_margin)}
                  tone="brand"
                  compact
                />
              </div>
            </Section>

            {/* Flux */}
            <section className="grid md:grid-cols-2 gap-4">
              <Section title={t('admin.reconciliation.flowsDriversTitle')}>
                {Object.values(data.flows.driver).length === 0 ? (
                  <p className="text-body-s text-warm-500 italic">
                    {t('admin.reconciliation.noMovementInPeriod')}
                  </p>
                ) : (
                  <ul className="divide-y divide-warm-200">
                    {Object.values(data.flows.driver).map((f) => (
                      <FlowRow key={f.type} flow={f} />
                    ))}
                  </ul>
                )}
                {data.flows.withdraws_paid.count > 0 && (
                  <div className="mt-3 pt-3 border-t border-warm-200 flex justify-between text-body-s">
                    <span className="text-warm-700">
                      {t('admin.reconciliation.withdrawsPaid')}
                    </span>
                    <span className="font-bold text-airmess-red tabular-nums">
                      −{data.flows.withdraws_paid.total.toLocaleString('fr-FR')} (
                      {data.flows.withdraws_paid.count})
                    </span>
                  </div>
                )}
              </Section>
              <Section title={t('admin.reconciliation.flowsUsersTitle')}>
                {Object.values(data.flows.user).length === 0 ? (
                  <p className="text-body-s text-warm-500 italic">
                    {t('admin.reconciliation.noMovementInPeriod')}
                  </p>
                ) : (
                  <ul className="divide-y divide-warm-200">
                    {Object.values(data.flows.user).map((f) => (
                      <FlowRow key={f.type} flow={f} />
                    ))}
                  </ul>
                )}
              </Section>
            </section>

            {/* Anomalies */}
            <Section
              title={t('admin.reconciliation.anomaliesTitle')}
              action={
                !data.anomalies.has_any && (
                  <span className="text-caption font-bold text-success uppercase flex items-center gap-1">
                    <CheckIcon size={12} /> {t('admin.reconciliation.noAnomalies')}
                  </span>
                )
              }
            >
              {data.anomalies.dormant_drivers.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-body-s font-bold text-ink mb-2">
                    {t('admin.reconciliation.dormantDriversTitle')}
                  </h3>
                  <ul className="text-body-s divide-y divide-warm-200">
                    {data.anomalies.dormant_drivers.map((d) => (
                      <li key={d.id} className="py-1.5 flex justify-between gap-3">
                        <span className="text-ink">
                          {d.first_name} {d.last_name}
                        </span>
                        <span className="text-warm-500 tabular-nums">
                          {formatFcfa(d.balance)} ·{' '}
                          {t('admin.reconciliation.lastTxLabel')}{' '}
                          {formatDateTime(d.last_tx, t('admin.reconciliation.neverLabel'))}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {data.anomalies.high_balance_drivers.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-body-s font-bold text-ink mb-2">
                    {t('admin.reconciliation.highBalanceDriversTitle')}
                  </h3>
                  <ul className="text-body-s divide-y divide-warm-200">
                    {data.anomalies.high_balance_drivers.map((d) => (
                      <li key={d.id} className="py-1.5 flex justify-between gap-3">
                        <span className="text-ink">
                          {d.first_name} {d.last_name}
                        </span>
                        <span className="font-bold text-warning tabular-nums">
                          {formatFcfa(d.balance)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {data.anomalies.drift_drivers.length > 0 && (
                <div className="mb-4 bg-danger-bg border border-airmess-red/30 rounded-md p-3">
                  <h3 className="text-body-s font-bold text-airmess-red mb-1 flex items-center gap-1.5">
                    <AlertTriangleIcon size={14} />
                    {t('admin.reconciliation.driftDriversTitle')}
                  </h3>
                  <p className="text-caption text-airmess-red/80 mb-2">
                    {t('admin.reconciliation.driftDriversDesc')}
                  </p>
                  <ul className="text-body-s divide-y divide-airmess-red/20">
                    {data.anomalies.drift_drivers.map((d) => (
                      <li key={d.driver_id} className="py-1.5 flex justify-between gap-3">
                        <span className="text-ink">
                          {d.first_name} {d.last_name} (id {d.driver_id})
                        </span>
                        <span className="font-mono text-caption text-airmess-red">
                          balance={d.balance} · sum_tx={d.sum_tx} · drift={d.drift}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {data.anomalies.drift_users.length > 0 && (
                <div className="bg-danger-bg border border-airmess-red/30 rounded-md p-3">
                  <h3 className="text-body-s font-bold text-airmess-red mb-1 flex items-center gap-1.5">
                    <AlertTriangleIcon size={14} />
                    {t('admin.reconciliation.driftUsersTitle')}
                  </h3>
                  <ul className="text-body-s divide-y divide-airmess-red/20">
                    {data.anomalies.drift_users.map((d) => (
                      <li key={d.user_id} className="py-1.5 flex justify-between gap-3">
                        <span className="text-ink">
                          {d.name} (id {d.user_id})
                        </span>
                        <span className="font-mono text-caption text-airmess-red">
                          balance={d.balance} · sum_tx={d.sum_tx} · drift={d.drift}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Section>
          </>
        )}
      </div>
    </AdminPageShell>
  )
}

interface MarginTileProps {
  label: string
  value: number | string
  tone?: 'default' | 'warning' | 'brand'
  compact?: boolean
}
function MarginTile({ label, value, tone = 'default', compact = false }: MarginTileProps) {
  const styles =
    tone === 'brand'
      ? 'bg-airmess-yellow border-transparent'
      : tone === 'warning'
        ? 'bg-warning-bg border-warning/30'
        : 'bg-off-white border-warm-200'
  const valueColor =
    tone === 'warning' ? 'text-warning' : 'text-ink'
  return (
    <div className={`border rounded-md px-3 py-2.5 ${styles}`}>
      <p className="text-[10px] uppercase tracking-wider font-bold text-warm-600">{label}</p>
      <p
        className={`${compact ? 'text-body font-bold' : 'text-h2 font-bold'} tabular-nums leading-none mt-1 ${valueColor}`}
      >
        {value}
      </p>
    </div>
  )
}
