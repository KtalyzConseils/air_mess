import { useState, useMemo, type ReactNode } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import AdminPageShell from '../../components/admin/AdminPageShell'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import { AdminButton } from '../../components/admin/AdminToolbar'
import {
  fetchWalletReporting,
  type WalletReportingResponse,
  type WalletReportingDay,
  type WalletReportingTypeRow,
} from '../../api/admin'

/**
 * Reporting compta wallet — vue d'ensemble des mouvements financiers.
 *
 * Structure de la page :
 *  1. Sélecteur période (7j / 30j / 90j / range custom)
 *  2. 4 KPI cards (solde total, cash-in, cash-out, revenus plateforme)
 *  3. Time-series area chart : évolution cash_in / cash_out / revenue par jour
 *  4. Bar chart horizontal : ventilation par type de transaction (top volumes)
 *  5. Table top movers (drivers + users mixés par volume)
 *  6. Bloc "Retraits en attente" (à décaisser)
 *  7. Bouton export CSV
 *
 * Charts en SVG inline — pas de dépendance externe, cohérence design.
 */

type PeriodPreset = 7 | 30 | 90

function formatFcfa(n: number): string {
  return n.toLocaleString('fr-FR') + ' FCFA'
}

function formatCompact(n: number): string {
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M'
  if (Math.abs(n) >= 1_000)     return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'k'
  return n.toString()
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
}

export default function AdminWalletReportingPage() {
  const { t } = useTranslation()
  const [days, setDays] = useState<PeriodPreset>(30)

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['admin', 'reporting', 'wallets', days],
    queryFn:  () => fetchWalletReporting({ days }),
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  })

  function handleExportCsv() {
    if (!data) return
    downloadCsv(data)
  }

  return (
    <AdminPageShell>
      <AdminPageHeader
        title={t('admin.reporting.title')}
        subtitle={t('admin.reporting.subtitle')}
        toolbar={
          <div className="flex items-center gap-2">
            <PeriodPicker value={days} onChange={setDays} />
            <AdminButton variant="ghost" size="sm" onClick={handleExportCsv} disabled={!data}>
              {t('admin.reporting.exportCsv')}
            </AdminButton>
          </div>
        }
      />

      {isLoading && !data ? (
        <div className="p-6 text-warm-500 text-body-s">{t('common.loading')}</div>
      ) : !data ? (
        <div className="p-6 text-airmess-red text-body-s">{t('admin.reporting.errorLoad')}</div>
      ) : (
        <div className={`p-4 space-y-6 ${isFetching ? 'opacity-70 transition-opacity' : ''}`}>
          {/* KPIs */}
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label={t('admin.reporting.kpiTotalBalance')}
              value={formatFcfa(data.kpis.total_balance_fcfa)}
              hint={t('admin.reporting.kpiTotalBalanceHint', {
                driver: formatFcfa(data.kpis.driver_balance_fcfa),
                user:   formatFcfa(data.kpis.user_balance_fcfa),
              })}
              tone="brand"
            />
            <KpiCard
              label={t('admin.reporting.kpiCashIn')}
              value={formatFcfa(data.kpis.cash_in_period_fcfa)}
              hint={t('admin.reporting.kpiPeriodHint', { days: data.period.days })}
              tone="success"
            />
            <KpiCard
              label={t('admin.reporting.kpiCashOut')}
              value={formatFcfa(data.kpis.cash_out_period_fcfa)}
              hint={t('admin.reporting.kpiPeriodHint', { days: data.period.days })}
              tone="warning"
            />
            <KpiCard
              label={t('admin.reporting.kpiPlatformRevenue')}
              value={formatFcfa(data.kpis.platform_revenue_period_fcfa)}
              hint={t('admin.reporting.kpiPlatformRevenueHint')}
              tone="brand"
            />
          </div>

          {/* Time-series chart */}
          <SectionCard title={t('admin.reporting.chartFlowsTitle')} subtitle={t('admin.reporting.chartFlowsSubtitle')}>
            <TimeSeriesChart data={data.daily_series} />
          </SectionCard>

          {/* Bar chart types */}
          <SectionCard title={t('admin.reporting.chartTypesTitle')} subtitle={t('admin.reporting.chartTypesSubtitle')}>
            <TypeBreakdownChart rows={data.type_breakdown} />
          </SectionCard>

          {/* Top movers + Pending */}
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <SectionCard title={t('admin.reporting.topMoversTitle')} subtitle={t('admin.reporting.topMoversSubtitle')}>
                <TopMoversTable movers={data.top_movers} />
              </SectionCard>
            </div>
            <SectionCard title={t('admin.reporting.pendingTitle')} subtitle={t('admin.reporting.pendingSubtitle')}>
              <div className="text-center py-4">
                <p className="text-4xl font-extrabold text-ink">{data.pending_withdrawals.count}</p>
                <p className="text-caption text-warm-500 mt-1">{t('admin.reporting.pendingCountLabel')}</p>
                <p className="text-body-s font-bold text-warning mt-3">
                  {formatFcfa(data.pending_withdrawals.total)}
                </p>
                <p className="text-caption text-warm-500">{t('admin.reporting.pendingTotalLabel')}</p>
              </div>
            </SectionCard>
          </div>
        </div>
      )}
    </AdminPageShell>
  )
}

// ─── Sous-composants ────────────────────────────────────────────────────

function PeriodPicker({ value, onChange }: { value: PeriodPreset; onChange: (v: PeriodPreset) => void }) {
  const { t } = useTranslation()
  const OPTIONS: { value: PeriodPreset; labelKey: string }[] = [
    { value: 7,  labelKey: 'admin.reporting.period7d'  },
    { value: 30, labelKey: 'admin.reporting.period30d' },
    { value: 90, labelKey: 'admin.reporting.period90d' },
  ]
  return (
    <div className="inline-flex rounded-md overflow-hidden border border-warm-300 bg-cream">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`px-3 h-8 text-caption font-semibold transition-colors ${
            value === opt.value
              ? 'bg-airmess-yellow text-ink'
              : 'text-warm-600 hover:bg-off-white'
          }`}
        >
          {t(opt.labelKey)}
        </button>
      ))}
    </div>
  )
}

function KpiCard({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: 'brand' | 'success' | 'warning' }) {
  const toneClasses: Record<string, string> = {
    brand:   'bg-airmess-yellow/10 border-airmess-yellow/30',
    success: 'bg-success-bg border-success/20',
    warning: 'bg-warning-bg border-warning/20',
  }
  const classes = tone && toneClasses[tone] ? toneClasses[tone] : 'bg-off-white border-warm-200'
  return (
    <div className={`rounded-lg border px-4 py-3 ${classes}`}>
      <p className="text-caption uppercase tracking-widest font-bold text-warm-600">{label}</p>
      <p className="text-2xl font-extrabold text-ink mt-1 tabular-nums">{value}</p>
      {hint && <p className="text-caption text-warm-500 mt-1">{hint}</p>}
    </div>
  )
}

function SectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section className="bg-off-white border border-warm-200 rounded-lg">
      <div className="px-5 py-3 border-b border-warm-200">
        <h2 className="text-body-s font-bold text-ink">{title}</h2>
        {subtitle && <p className="text-caption text-warm-500 mt-0.5">{subtitle}</p>}
      </div>
      <div className="p-4">{children}</div>
    </section>
  )
}

// ─── Time-series chart (area/line SVG) ──────────────────────────────────

function TimeSeriesChart({ data }: { data: WalletReportingDay[] }) {
  const { t } = useTranslation()
  // Design responsive-safe : on utilise un viewBox large et laisse le CSS scale.
  const width  = 800
  const height = 220
  const padL   = 48
  const padR   = 12
  const padT   = 12
  const padB   = 28

  const chartW = width - padL - padR
  const chartH = height - padT - padB

  const maxValue = useMemo(() => {
    const all = data.flatMap((d) => [d.cash_in, d.cash_out, d.revenue])
    return Math.max(1, ...all)
  }, [data])

  function x(i: number): number {
    if (data.length <= 1) return padL + chartW / 2
    return padL + (i * chartW) / (data.length - 1)
  }
  function y(v: number): number {
    return padT + chartH - (v / maxValue) * chartH
  }

  function pathFor(key: keyof Pick<WalletReportingDay, 'cash_in' | 'cash_out' | 'revenue'>): string {
    return data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(d[key]).toFixed(1)}`).join(' ')
  }

  // Ticks Y : 0, 25%, 50%, 75%, 100% du max
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((r) => ({
    y:     padT + chartH - r * chartH,
    label: formatCompact(Math.round(maxValue * r)),
  }))

  // Ticks X : max ~7 labels pour lisibilité
  const step = Math.max(1, Math.ceil(data.length / 7))
  const xTicks = data
    .map((d, i) => ({ i, date: d.date }))
    .filter((_, i) => i % step === 0)

  const SERIES = [
    { key: 'cash_in',  color: '#16A34A', labelKey: 'admin.reporting.legendCashIn'  },
    { key: 'cash_out', color: '#D97706', labelKey: 'admin.reporting.legendCashOut' },
    { key: 'revenue',  color: '#FFCC00', labelKey: 'admin.reporting.legendRevenue' },
  ] as const

  if (data.every((d) => d.cash_in === 0 && d.cash_out === 0 && d.revenue === 0)) {
    return (
      <div className="text-center py-6 text-warm-500 text-body-s">
        {t('admin.reporting.chartEmpty')}
      </div>
    )
  }

  return (
    <>
      <div className="flex flex-wrap gap-4 mb-3 text-caption font-semibold">
        {SERIES.map((s) => (
          <div key={s.key} className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
            <span className="text-warm-700">{t(s.labelKey)}</span>
          </div>
        ))}
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" role="img" aria-label={t('admin.reporting.chartFlowsTitle')}>
        {/* Grille horizontale + labels Y */}
        {yTicks.map((tk, i) => (
          <g key={i}>
            <line x1={padL} y1={tk.y} x2={width - padR} y2={tk.y} stroke="#E7E1D3" strokeDasharray="2 3" />
            <text x={padL - 6} y={tk.y + 4} textAnchor="end" fontSize="10" fill="#8A7E68">
              {tk.label}
            </text>
          </g>
        ))}

        {/* Séries */}
        {SERIES.map((s) => (
          <path
            key={s.key}
            d={pathFor(s.key)}
            fill="none"
            stroke={s.color}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}

        {/* Labels X */}
        {xTicks.map((tk, i) => (
          <text
            key={i}
            x={x(tk.i)}
            y={height - 8}
            textAnchor="middle"
            fontSize="10"
            fill="#8A7E68"
          >
            {formatDate(tk.date)}
          </text>
        ))}
      </svg>
    </>
  )
}

// ─── Bar chart types de transactions ────────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
  deposit:            '#16A34A',
  earning:            '#2563EB',
  pickup_debit:       '#8B5CF6',
  withdraw:           '#D97706',
  refund:             '#0EA5E9',
  adjustment_credit:  '#65A30D',
  adjustment_debit:   '#DC2626',
  course_charge:      '#7C3AED',
  collection_credit:  '#0891B2',
}

function TypeBreakdownChart({ rows }: { rows: WalletReportingTypeRow[] }) {
  const { t } = useTranslation()
  const top = rows.slice(0, 10) // top 10 par volume
  const max = Math.max(1, ...top.map((r) => r.total))

  if (top.length === 0 || top.every((r) => r.total === 0)) {
    return (
      <div className="text-center py-6 text-warm-500 text-body-s">
        {t('admin.reporting.chartEmpty')}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {top.map((row, i) => {
        const pct   = (row.total / max) * 100
        const color = TYPE_COLORS[row.type] ?? '#8A7E68'
        return (
          <div key={i} className="flex items-center gap-2">
            <div className="w-40 flex-shrink-0 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
              <div className="min-w-0">
                <p className="text-body-s font-semibold text-ink truncate">{t(`admin.reporting.txType.${row.type}`, { defaultValue: row.type })}</p>
                <p className="text-caption text-warm-500">
                  {row.wallet === 'driver' ? t('admin.reporting.walletDriver') : t('admin.reporting.walletUser')} · {row.count}
                </p>
              </div>
            </div>
            <div className="flex-1 bg-warm-100 rounded h-6 overflow-hidden">
              <div className="h-full rounded" style={{ width: `${pct}%`, backgroundColor: color }} />
            </div>
            <span className="w-28 text-right text-body-s font-bold text-ink tabular-nums">
              {formatFcfa(row.total)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Table top movers ───────────────────────────────────────────────────

function TopMoversTable({ movers }: { movers: WalletReportingResponse['top_movers'] }) {
  const { t } = useTranslation()
  if (movers.length === 0) {
    return (
      <div className="text-center py-6 text-warm-500 text-body-s">
        {t('admin.reporting.chartEmpty')}
      </div>
    )
  }
  return (
    <table className="w-full text-body-s">
      <thead>
        <tr className="text-caption uppercase tracking-widest text-warm-500 border-b border-warm-200">
          <th className="text-left py-2">{t('admin.reporting.tableName')}</th>
          <th className="text-right py-2">{t('admin.reporting.tableTxCount')}</th>
          <th className="text-right py-2">{t('admin.reporting.tableVolume')}</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-warm-200">
        {movers.map((m) => (
          <tr key={`${m.kind}-${m.id}`} className="hover:bg-cream/50">
            <td className="py-2">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                    m.kind === 'driver' ? 'bg-airmess-yellow/20 text-warm-700' : 'bg-info-bg text-info'
                  }`}
                >
                  {m.kind === 'driver' ? t('admin.reporting.walletDriver') : t('admin.reporting.walletUser')}
                </span>
                <span className="font-medium text-ink">{m.name}</span>
              </div>
            </td>
            <td className="py-2 text-right text-warm-600 tabular-nums">{m.tx_count}</td>
            <td className="py-2 text-right font-bold text-ink tabular-nums">{formatFcfa(m.total)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ─── CSV export ─────────────────────────────────────────────────────────

/**
 * Génère un CSV concaténé (KPIs + daily_series + type_breakdown + top_movers)
 * pour un archivage local ou une compta manuelle. Utilise le sépar ; (norme FR
 * Excel) et échappe les valeurs contenant ; ou " ou saut de ligne.
 */
function downloadCsv(data: WalletReportingResponse): void {
  const sep = ';'
  const rows: string[] = []

  const esc = (v: string | number): string => {
    const s = String(v)
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }

  rows.push(`# Reporting wallet — ${data.period.from} → ${data.period.to}`)
  rows.push('')
  rows.push('# KPIs')
  rows.push(['Métrique', 'FCFA'].map(esc).join(sep))
  rows.push(['Solde total',           data.kpis.total_balance_fcfa].map(esc).join(sep))
  rows.push(['Solde drivers',         data.kpis.driver_balance_fcfa].map(esc).join(sep))
  rows.push(['Solde users',           data.kpis.user_balance_fcfa].map(esc).join(sep))
  rows.push(['Cash-in période',       data.kpis.cash_in_period_fcfa].map(esc).join(sep))
  rows.push(['Cash-out période',      data.kpis.cash_out_period_fcfa].map(esc).join(sep))
  rows.push(['Revenus plateforme',    data.kpis.platform_revenue_period_fcfa].map(esc).join(sep))
  rows.push('')

  rows.push('# Série journalière')
  rows.push(['Date', 'Cash-in', 'Cash-out', 'Revenus'].map(esc).join(sep))
  for (const d of data.daily_series) {
    rows.push([d.date, d.cash_in, d.cash_out, d.revenue].map(esc).join(sep))
  }
  rows.push('')

  rows.push('# Ventilation par type')
  rows.push(['Type', 'Wallet', 'Nombre', 'Volume'].map(esc).join(sep))
  for (const r of data.type_breakdown) {
    rows.push([r.type, r.wallet, r.count, r.total].map(esc).join(sep))
  }
  rows.push('')

  rows.push('# Top movers')
  rows.push(['Type', 'Nom', 'Transactions', 'Volume'].map(esc).join(sep))
  for (const m of data.top_movers) {
    rows.push([m.kind, m.name, m.tx_count, m.total].map(esc).join(sep))
  }

  // BOM UTF-8 pour qu'Excel FR lise les accents correctement.
  const blob = new Blob(['﻿' + rows.join('\n')], { type: 'text/csv;charset=utf-8' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `wallet-reporting_${data.period.from}_${data.period.to}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
