import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import AdminHeader from '../../components/AdminHeader'
import {
  fetchReconciliation,
  downloadReconciliationCsv,
  type ReconciliationFlow,
} from '../../api/admin'

// Période par défaut : 30 derniers jours (calculée côté front pour préremplir le sélecteur)
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
function formatDateTime(value: string | null): string {
  if (!value) return 'Jamais'
  return new Date(value).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

const TYPE_LABEL: Record<string, string> = {
  deposit:           'Recharges',
  withdraw:          'Retraits',
  pickup_debit:      'Débit caution (pickup)',
  refund:            'Remboursements',
  earning:           'Gains course',
  adjustment_credit: 'Crédits admin',
  adjustment_debit:  'Débits admin',
  course_charge:     'Charges course (livraison)',
}

function FlowRow({ flow }: { flow: ReconciliationFlow }) {
  const label = TYPE_LABEL[flow.type] ?? flow.type
  const positive = flow.total >= 0
  return (
    <li className="flex justify-between items-center py-1.5 text-sm">
      <span className="text-gray-700">{label} <span className="text-xs text-gray-400">({flow.n})</span></span>
      <span className={`font-semibold ${positive ? 'text-green-700' : 'text-red-700'}`}>
        {positive ? '+' : ''}{flow.total.toLocaleString('fr-FR')}
      </span>
    </li>
  )
}

export default function AdminReconciliationPage() {
  const [from, setFrom] = useState<string>(isoDateNDaysAgo(30))
  const [to, setTo] = useState<string>(todayIso())
  const [isDownloading, setIsDownloading] = useState(false)

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['admin', 'reconciliation', from, to],
    queryFn: () => fetchReconciliation(from, to),
  })

  async function handleExport() {
    setIsDownloading(true)
    try {
      await downloadReconciliationCsv(from, to)
    } catch {
      window.alert("Erreur lors de l'export CSV.")
    } finally {
      setIsDownloading(false)
    }
  }

  function setPreset(days: number) {
    setFrom(isoDateNDaysAgo(days))
    setTo(todayIso())
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />
      <main className="max-w-6xl mx-auto p-4 md:p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-airmess-dark mb-1">📊 Réconciliation comptable</h2>
          <p className="text-sm text-gray-500">
            Dashboard financier pour la compta : argent en circulation, flux, marge plateforme, anomalies.
          </p>
        </div>

        {/* Sélecteur période + export */}
        <section className="bg-white rounded-2xl shadow-sm p-4 mb-4">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs uppercase text-gray-500 font-semibold mb-1">Du</label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-airmess-yellow outline-none"
              />
            </div>
            <div>
              <label className="block text-xs uppercase text-gray-500 font-semibold mb-1">Au</label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-airmess-yellow outline-none"
              />
            </div>
            <div className="flex gap-1">
              {[7, 30, 90].map((n) => (
                <button
                  key={n}
                  onClick={() => setPreset(n)}
                  className="px-3 py-2 text-xs font-semibold rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                >
                  {n}j
                </button>
              ))}
            </div>
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-airmess-dark text-white hover:opacity-90 disabled:opacity-50"
            >
              {isFetching ? 'Chargement…' : '↻ Actualiser'}
            </button>
            <button
              onClick={handleExport}
              disabled={isDownloading || isLoading}
              className="ml-auto px-4 py-2 text-sm font-semibold rounded-lg bg-airmess-yellow text-airmess-dark hover:opacity-90 disabled:opacity-50"
            >
              {isDownloading ? 'Export…' : '📥 Export CSV'}
            </button>
          </div>
        </section>

        {isLoading && <p className="text-gray-500 text-center py-10">Chargement…</p>}

        {data && (
          <>
            {/* Section A — Snapshot temps réel */}
            <section className="grid md:grid-cols-3 gap-4 mb-4">
              <div className="bg-airmess-dark text-white rounded-2xl shadow-sm p-5">
                <p className="text-xs uppercase tracking-wide text-gray-300 mb-1">💰 Argent total en circulation</p>
                <p className="text-3xl font-bold">{formatFcfa(data.snapshot.grand_total)}</p>
                <p className="text-xs text-gray-300 mt-2">Snapshot temps réel</p>
              </div>
              <div className="bg-white rounded-2xl shadow-sm p-5">
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">🚴 Wallets drivers</p>
                <p className="text-2xl font-bold text-airmess-dark">{formatFcfa(data.snapshot.drivers.total_balance)}</p>
                <p className="text-xs text-gray-500 mt-2">{data.snapshot.drivers.wallets_count} wallets</p>
              </div>
              <div className="bg-white rounded-2xl shadow-sm p-5">
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">🛒 Wallets marchands/particuliers</p>
                <p className="text-2xl font-bold text-airmess-dark">{formatFcfa(data.snapshot.users.total_balance)}</p>
                <p className="text-xs text-gray-500 mt-2">
                  {data.snapshot.users.wallets_count} wallets · {formatFcfa(data.snapshot.users.total_reserved)} réservés
                </p>
              </div>
            </section>

            {/* Section E — Marge brute */}
            <section className="bg-white rounded-2xl shadow-sm p-5 mb-4">
              <h3 className="font-semibold text-airmess-dark mb-3">📈 Marge brute plateforme (période)</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-lg font-bold text-gray-800">{data.margin.delivered_courses}</p>
                  <p className="text-xs text-gray-500 mt-1">Courses livrées</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-lg font-bold text-blue-800">{formatFcfa(data.margin.gross_revenue)}</p>
                  <p className="text-xs text-blue-700 mt-1">Revenu brut</p>
                </div>
                <div className="bg-amber-50 rounded-lg p-3">
                  <p className="text-lg font-bold text-amber-800">−{formatFcfa(data.margin.driver_commission)}</p>
                  <p className="text-xs text-amber-700 mt-1">Part driver</p>
                </div>
                <div className="bg-green-50 rounded-lg p-3 border-2 border-green-500">
                  <p className="text-lg font-bold text-green-800">{formatFcfa(data.margin.platform_margin)}</p>
                  <p className="text-xs text-green-700 mt-1">Marge plateforme</p>
                </div>
              </div>
            </section>

            {/* Section B/C — Flux */}
            <section className="grid md:grid-cols-2 gap-4 mb-4">
              <div className="bg-white rounded-2xl shadow-sm p-5">
                <h3 className="font-semibold text-airmess-dark mb-3">🚴 Flux wallets drivers</h3>
                {Object.values(data.flows.driver).length === 0 ? (
                  <p className="text-sm text-gray-500">Aucun mouvement sur la période.</p>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {Object.values(data.flows.driver).map((f) => (
                      <FlowRow key={f.type} flow={f} />
                    ))}
                  </ul>
                )}
                {data.flows.withdraws_paid.count > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between text-sm">
                    <span className="text-gray-700">Virements MoMo/banque versés</span>
                    <span className="font-semibold text-red-700">
                      −{data.flows.withdraws_paid.total.toLocaleString('fr-FR')} ({data.flows.withdraws_paid.count})
                    </span>
                  </div>
                )}
              </div>
              <div className="bg-white rounded-2xl shadow-sm p-5">
                <h3 className="font-semibold text-airmess-dark mb-3">🛒 Flux wallets marchands/particuliers</h3>
                {Object.values(data.flows.user).length === 0 ? (
                  <p className="text-sm text-gray-500">Aucun mouvement sur la période.</p>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {Object.values(data.flows.user).map((f) => (
                      <FlowRow key={f.type} flow={f} />
                    ))}
                  </ul>
                )}
              </div>
            </section>

            {/* Section D — Anomalies */}
            <section className="bg-white rounded-2xl shadow-sm p-5 mb-4">
              <h3 className="font-semibold text-airmess-dark mb-3">
                ⚠️ Anomalies à vérifier
                {!data.anomalies.has_any && <span className="ml-2 text-xs text-green-600 font-normal">✓ Aucune anomalie détectée</span>}
              </h3>

              {data.anomalies.dormant_drivers.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">😴 Drivers dormants (balance &gt; 5k, sans transaction depuis 60j)</h4>
                  <ul className="text-sm divide-y divide-gray-100">
                    {data.anomalies.dormant_drivers.map((d) => (
                      <li key={d.id} className="py-1.5 flex justify-between">
                        <span>{d.first_name} {d.last_name}</span>
                        <span className="text-gray-500">
                          {formatFcfa(d.balance)} · dernière TX : {formatDateTime(d.last_tx)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {data.anomalies.high_balance_drivers.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">💎 Drivers à balance élevée (&gt; 100k FCFA)</h4>
                  <ul className="text-sm divide-y divide-gray-100">
                    {data.anomalies.high_balance_drivers.map((d) => (
                      <li key={d.id} className="py-1.5 flex justify-between">
                        <span>{d.first_name} {d.last_name}</span>
                        <span className="font-semibold text-amber-700">{formatFcfa(d.balance)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {data.anomalies.drift_drivers.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-red-700 mb-2">
                    🚨 Drift driver — incohérence SUM(transactions) ≠ balance
                  </h4>
                  <p className="text-xs text-red-600 mb-2">
                    Signal d'un bug grave (mutation directe en BDD bypassing service). À enquêter d'urgence.
                  </p>
                  <ul className="text-sm divide-y divide-gray-100">
                    {data.anomalies.drift_drivers.map((d) => (
                      <li key={d.driver_id} className="py-1.5 flex justify-between">
                        <span>{d.first_name} {d.last_name} (id {d.driver_id})</span>
                        <span className="font-mono text-red-700">
                          balance={d.balance} · sum_tx={d.sum_tx} · drift={d.drift}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {data.anomalies.drift_users.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-red-700 mb-2">
                    🚨 Drift user — incohérence SUM(transactions) ≠ balance
                  </h4>
                  <ul className="text-sm divide-y divide-gray-100">
                    {data.anomalies.drift_users.map((d) => (
                      <li key={d.user_id} className="py-1.5 flex justify-between">
                        <span>{d.name} (id {d.user_id})</span>
                        <span className="font-mono text-red-700">
                          balance={d.balance} · sum_tx={d.sum_tx} · drift={d.drift}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  )
}
