import { useState, type ReactNode } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import AdminPageShell from '../../components/admin/AdminPageShell'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import { AdminButton } from '../../components/admin/AdminToolbar'
import { ArrowLeftIcon, SettingsIcon, CheckIcon, AlertTriangleIcon } from '../../components/ui/icons'
import WalletAdjustmentModal from '../../components/WalletAdjustmentModal'
import SupportNotesPanel from '../../components/SupportNotesPanel'
import { fetchDriver, validateDriver, openDriverDocument } from '../../api/admin'
import { useAuthStore } from '../../stores/authStore'
import { hasAdminRole } from '../../lib/permissions'

function formatDate(value: string | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2 border-b border-warm-200 last:border-0">
      <span className="text-body-s text-warm-500">{label}</span>
      <span className="text-body-s font-medium text-ink text-right">{children}</span>
    </div>
  )
}

const AVAILABILITY: Record<string, { label: string; classes: string }> = {
  available: { label: 'Disponible', classes: 'bg-success-bg text-success border border-success/20' },
  busy: { label: 'Occupé', classes: 'bg-warning-bg text-warning border border-warning/20' },
  on_break: { label: 'En pause', classes: 'bg-warm-100 text-warm-600 border border-warm-200' },
  offline: { label: 'Hors-ligne', classes: 'bg-warm-100 text-warm-500 border border-warm-200' },
}
const ACTIVATION: Record<string, { label: string; classes: string }> = {
  pending: { label: 'En attente', classes: 'bg-warning-bg text-warning border border-warning/20' },
  validated: { label: 'Validé', classes: 'bg-cream text-ink border border-warm-300' },
  active: { label: 'Actif', classes: 'bg-success-bg text-success border border-success/20' },
  suspended: { label: 'Suspendu', classes: 'bg-danger-bg text-airmess-red border border-airmess-red/30' },
}

const DECLINE_REASON_LABEL: Record<string, string> = {
  too_far: 'Trop loin',
  wrong_quartier: 'Quartier mal connu',
  no_helmet: 'Pas de casque',
  vehicle_unfit: 'Véhicule pas adapté',
  personal: 'Raison personnelle',
  other: 'Autre',
}

function Badge({
  map,
  value,
}: {
  map: Record<string, { label: string; classes: string }>
  value: string
}) {
  const meta = map[value] ?? {
    label: value,
    classes: 'bg-warm-100 text-warm-600 border border-warm-200',
  }
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-caption font-semibold ${meta.classes}`}
    >
      {meta.label}
    </span>
  )
}

interface KpiBoxProps {
  label: string
  value: number | string
  tone?: 'default' | 'success' | 'danger' | 'brand'
}
function KpiBox({ label, value, tone = 'default' }: KpiBoxProps) {
  const styles =
    tone === 'brand'
      ? 'bg-airmess-yellow border-transparent'
      : tone === 'success'
        ? 'bg-off-white border-success/30'
        : tone === 'danger'
          ? 'bg-off-white border-airmess-red/30'
          : 'bg-off-white border-warm-200'
  const valueColor =
    tone === 'success' ? 'text-success' : tone === 'danger' ? 'text-airmess-red' : 'text-ink'
  return (
    <div className={`border rounded-md px-3 py-2.5 ${styles}`}>
      <p className="text-[10px] uppercase tracking-wider font-bold text-warm-600">{label}</p>
      <p className={`text-h2 font-bold tabular-nums leading-none mt-1 ${valueColor}`}>{value}</p>
    </div>
  )
}

export default function AdminDriverDetailPage() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const [docError, setDocError] = useState<string | null>(null)
  const [walletAdjustOpen, setWalletAdjustOpen] = useState(false)
  const currentUser = useAuthStore((s) => s.user)
  const isSuperAdmin = hasAdminRole(currentUser, 'super')
  const canManageDriver = hasAdminRole(currentUser, 'ops')

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'driver', id],
    queryFn: () => fetchDriver(id!),
    enabled: !!id,
  })

  const validateMutation = useMutation({
    mutationFn: () => validateDriver(Number(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'driver', id] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'drivers'] })
    },
  })

  async function handleOpenDocument(type: 'photo' | 'cni' | 'driving_license') {
    setDocError(null)
    try {
      await openDriverDocument(Number(id), type)
    } catch (err) {
      setDocError(
        err instanceof AxiosError
          ? (err.response?.data as { message?: string })?.message ??
            "Impossible d'ouvrir ce document."
          : 'Erreur inattendue.',
      )
    }
  }

  const validateError =
    validateMutation.error instanceof AxiosError
      ? (validateMutation.error.response?.data as { message?: string })?.message ??
        'Erreur lors de la validation.'
      : null

  return (
    <AdminPageShell>
      <AdminPageHeader
        title={data ? `${data.driver.first_name} ${data.driver.last_name}` : 'Livreur'}
        subtitle={
          data
            ? `${data.driver.vehicle_type}${data.driver.vehicle_plate ? ` · ${data.driver.vehicle_plate}` : ''}`
            : undefined
        }
        actions={
          data && (
            <div className="flex items-center gap-2">
              <Badge map={AVAILABILITY} value={data.driver.availability_status} />
              <Badge map={ACTIVATION} value={data.driver.activation_status} />
            </div>
          )
        }
      />

      <div className="px-4 md:px-6 lg:px-8 py-5 max-w-5xl mx-auto space-y-6">
        <Link
          to="/admin/drivers"
          className="inline-flex items-center gap-1 text-caption text-warm-500 hover:text-ink"
        >
          <ArrowLeftIcon size={14} />
          Retour aux livreurs
        </Link>

        {isLoading && <p className="text-body-s text-warm-500">Chargement…</p>}
        {isError && <p className="text-body-s text-airmess-red">Livreur introuvable.</p>}

        {data && (
          <>
            {/* Bandeau validation pending */}
            {canManageDriver && data.driver.activation_status === 'pending' && (
              <section className="bg-warning-bg border border-warning/30 rounded-lg px-5 py-4">
                <h2 className="text-body font-bold text-warning mb-1">Validation en attente</h2>
                <p className="text-body-s text-warning/90 mb-3">
                  Ce livreur attend la vérification de ses documents (CNI + permis). Vérifie-les
                  ci-dessous avant d'activer son compte.
                </p>
                <AdminButton
                  variant="primary"
                  onClick={() => validateMutation.mutate()}
                  disabled={validateMutation.isPending}
                  leftIcon={<CheckIcon size={14} />}
                >
                  {validateMutation.isPending ? 'Validation…' : 'Valider ce livreur'}
                </AdminButton>
                {validateError && (
                  <p className="text-body-s text-airmess-red mt-2 flex items-center gap-1.5">
                    <AlertTriangleIcon size={14} /> {validateError}
                  </p>
                )}
              </section>
            )}

            {/* Grille identité / véhicule / urgence / performance */}
            <div className="grid gap-4 md:grid-cols-2">
              <Section title="Identité & contact">
                <Row label="Genre">{data.driver.gender ?? '—'}</Row>
                <Row label="Naissance">{formatDate(data.driver.birth_date)}</Row>
                <Row label="Téléphone">{data.driver.user.phone ?? '—'}</Row>
                <Row label="Email">{data.driver.user.email}</Row>
              </Section>

              <Section title="Véhicule">
                <Row label="Type">{data.driver.vehicle_type}</Row>
                <Row label="Plaque">{data.driver.vehicle_plate ?? '—'}</Row>
                <Row label="Couleur">{data.driver.vehicle_color ?? '—'}</Row>
              </Section>

              <Section title="Contact d'urgence">
                <Row label="Nom">{data.driver.emergency_contact_name ?? '—'}</Row>
                <Row label="Téléphone">{data.driver.emergency_contact_phone ?? '—'}</Row>
                <Row label="Dernière position">{formatDate(data.driver.last_position_at)}</Row>
              </Section>

              <Section title="Performance">
                <Row label="Taux d'acceptation">{data.driver.acceptance_rate}%</Row>
                <Row label="Incidents">{data.driver.incidents_count}</Row>
              </Section>
            </div>

            {/* Wallet caution */}
            <Section
              title="Wallet caution"
              action={
                isSuperAdmin && data.driver.wallet ? (
                  <AdminButton
                    variant="ghost"
                    size="sm"
                    onClick={() => setWalletAdjustOpen(true)}
                    leftIcon={<SettingsIcon size={14} />}
                  >
                    Ajuster
                  </AdminButton>
                ) : null
              }
            >
              {data.driver.wallet ? (
                <div className="grid grid-cols-3 gap-2">
                  <KpiBox
                    label="Balance"
                    value={data.driver.wallet.balance.toLocaleString('fr-FR')}
                    tone="brand"
                  />
                  <KpiBox
                    label="Total déposé"
                    value={data.driver.wallet.total_deposited.toLocaleString('fr-FR')}
                  />
                  <KpiBox
                    label="Total retiré"
                    value={data.driver.wallet.total_withdrawn.toLocaleString('fr-FR')}
                  />
                </div>
              ) : (
                <p className="text-body-s text-warm-500 italic">Aucun wallet associé.</p>
              )}
            </Section>

            {/* Modal d'ajustement wallet */}
            {isSuperAdmin && data.driver.wallet && (
              <WalletAdjustmentModal
                open={walletAdjustOpen}
                onClose={() => setWalletAdjustOpen(false)}
                target="driver"
                targetId={data.driver.id}
                targetName={`${data.driver.first_name} ${data.driver.last_name}`}
                currentBalance={data.driver.wallet.balance}
                onSuccessInvalidate={[['admin', 'driver', id]]}
              />
            )}

            {/* Refus de courses (rolling 30j) */}
            <Section
              title="Refus de courses (30 derniers jours)"
              action={
                <span className="text-caption font-bold text-warm-600 bg-warm-100 px-2 py-0.5 rounded">
                  Total : {data.declines.total_30d}
                </span>
              }
            >
              {data.declines.total_30d === 0 ? (
                <p className="text-body-s text-warm-500 italic">Aucun refus sur la période.</p>
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5 mb-4">
                    {Object.entries(data.declines.by_reason).map(([reason, n]) => (
                      <div
                        key={reason}
                        className="bg-cream border border-warm-200 rounded-md px-3 py-1.5 flex justify-between items-center"
                      >
                        <span className="text-body-s text-warm-600">
                          {DECLINE_REASON_LABEL[reason] ?? reason}
                        </span>
                        <span className="text-body-s font-bold text-ink tabular-nums">{n}</span>
                      </div>
                    ))}
                  </div>
                  <ul className="divide-y divide-warm-200">
                    {data.declines.recent.map((d) => (
                      <li
                        key={d.id}
                        className="py-2.5 flex justify-between items-start gap-3"
                      >
                        <div className="min-w-0">
                          <p className="text-body-s font-medium text-ink">
                            {DECLINE_REASON_LABEL[d.reason] ?? d.reason}
                            {d.custom_reason && (
                              <span className="text-warm-500 font-normal">
                                {' '}— « {d.custom_reason} »
                              </span>
                            )}
                          </p>
                          {d.course && (
                            <p className="text-caption text-warm-500 mt-0.5">
                              Course <span className="font-mono">{d.course.reference}</span> ·{' '}
                              {d.course.origin_quartier} → {d.course.destination_quartier}
                            </p>
                          )}
                        </div>
                        <span className="text-caption text-warm-400 shrink-0 whitespace-nowrap">
                          {formatDate(d.created_at)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </Section>

            {/* Documents */}
            <Section title="Documents">
              <div className="flex flex-wrap gap-2">
                <AdminButton
                  variant="primary"
                  onClick={() => handleOpenDocument('cni')}
                  disabled={!data.driver.cni_url}
                >
                  Voir CNI
                </AdminButton>
                <AdminButton
                  variant="primary"
                  onClick={() => handleOpenDocument('driving_license')}
                  disabled={!data.driver.driving_license_url}
                >
                  Voir Permis
                </AdminButton>
                <AdminButton
                  variant="secondary"
                  onClick={() => handleOpenDocument('photo')}
                  disabled={!data.driver.photo_url}
                >
                  {data.driver.photo_url ? 'Voir photo' : 'Pas de photo'}
                </AdminButton>
              </div>
              {docError && (
                <p className="text-body-s text-airmess-red mt-3 flex items-center gap-1.5">
                  <AlertTriangleIcon size={14} /> {docError}
                </p>
              )}
              <p className="text-caption text-warm-500 mt-3">
                Les documents s'ouvrent dans un nouvel onglet (autorise les popups pour ce site).
              </p>
            </Section>

            {/* Stats courses */}
            <Section title="Activité — courses">
              <div className="grid gap-2 grid-cols-2 md:grid-cols-4">
                <KpiBox label="Total" value={data.stats.courses_total} />
                <KpiBox label="Livrées" value={data.stats.courses_delivered} tone="success" />
                <KpiBox label="En cours" value={data.stats.courses_in_progress} />
                <KpiBox label="Échecs" value={data.stats.courses_failed} tone="danger" />
              </div>
              <p className="text-body-s text-warm-600 mt-3">
                Gains cumulés :{' '}
                <strong className="text-ink tabular-nums">
                  {data.stats.total_earnings.toLocaleString('fr-FR')} FCFA
                </strong>
                {' · '}
                Dernière livraison : {formatDate(data.stats.last_delivery_at)}
              </p>
            </Section>

            {/* Notes internes */}
            <SupportNotesPanel
              notableType="user"
              notableId={data.driver.user.id}
              title="Notes internes (livreur)"
            />
          </>
        )}
      </div>
    </AdminPageShell>
  )
}

function Section({
  title,
  action,
  children,
}: {
  title: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="bg-off-white border border-warm-200 rounded-lg">
      <div className="flex items-center justify-between gap-3 px-5 py-2.5 border-b border-warm-200">
        <h2 className="text-body-s font-bold text-ink">{title}</h2>
        {action}
      </div>
      <div className="px-5 py-3">{children}</div>
    </section>
  )
}
