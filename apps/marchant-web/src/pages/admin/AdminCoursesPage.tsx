import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AxiosError } from 'axios'
import AdminPageShell from '../../components/admin/AdminPageShell'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import AdminModal from '../../components/admin/AdminModal'
import AdminPagination from '../../components/admin/AdminPagination'
import { AdminSearchInput, AdminSelect, AdminButton } from '../../components/admin/AdminToolbar'
import StatusBadge from '../../components/StatusBadge'
import { fetchAdminCourses, fetchAdminDrivers, reassignCourse, type DriverFull, type DriverKind } from '../../api/admin'
import type { Course } from '../../api/courses'
import { computeEligibility, type EligibilityReason } from '../../lib/reassignEligibility'
import { CheckIcon, AlertTriangleIcon } from '../../components/ui/icons'

// picked_up et at_dropoff sont désormais réassignables via transfert physique
// (Cas 5 — panne/accident driver). Le back exige la case cochée dans le modal.
const REASSIGNABLE_BLOCKED = ['delivered', 'cancelled', 'failed', 'returning_to_sender']

export default function AdminCoursesPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [reassignFor, setReassignFor] = useState<Course | null>(null)
  const [newDriverId, setNewDriverId] = useState<number | ''>('')
  const [reassignReason, setReassignReason] = useState('')
  // Cas 5 — Transfert physique quand le colis est déjà chez le driver précédent
  const [pickupFromPrevious, setPickupFromPrevious] = useState(false)
  // Filtres liste drivers dans la modale (kind + vehicle)
  const [kindFilter, setKindFilter] = useState<'' | DriverKind>('')
  const [vehicleFilter, setVehicleFilter] = useState<string>('')
  // Override manuel des règles d'éligibilité — cas exceptionnels (l'ops force)
  const [forceOverride, setForceOverride] = useState(false)

  const coursesQuery = useQuery({
    queryKey: ['admin', 'courses', { search, statusFilter, page }],
    queryFn: () =>
      fetchAdminCourses({
        q: search || undefined,
        status: statusFilter || undefined,
        per_page: 30,
        page,
      }),
    refetchInterval: 20_000,
    placeholderData: keepPreviousData,
  })

  const driversQuery = useQuery({
    queryKey: ['admin', 'drivers'],
    queryFn: fetchAdminDrivers,
  })

  const reassignMutation = useMutation({
    mutationFn: () =>
      reassignCourse(reassignFor!.id, Number(newDriverId), reassignReason || undefined, {
        pickupFromPreviousDriver: pickupFromPrevious || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'courses'] })
      closeReassign()
    },
    onError: (err) => {
      const message =
        err instanceof AxiosError
          ? err.response?.data?.message ?? t('admin.courses.reassignImpossible')
          : t('admin.courses.reassignImpossible')
      window.alert(message)
    },
  })

  function closeReassign() {
    setReassignFor(null)
    setNewDriverId('')
    setReassignReason('')
    setPickupFromPrevious(false)
    setKindFilter('')
    setVehicleFilter('')
    setForceOverride(false)
  }

  // Vrai uniquement si la course est en post-pickup — sinon la case n'apparaît pas
  const isPostPickup = reassignFor
    ? ['picked_up', 'at_dropoff'].includes(reassignFor.status)
    : false

  // Liste des drivers filtrée + triée par éligibilité pour la course en cours.
  // Les éligibles remontent en tête, puis les non-éligibles grisés en dessous.
  const rankedDrivers = useMemo(() => {
    if (!reassignFor) return []
    const all = (driversQuery.data ?? []).filter((d) => {
      if (kindFilter && d.kind !== kindFilter) return false
      if (vehicleFilter && d.vehicle_type !== vehicleFilter) return false
      return true
    })
    return all
      .map((d) => ({ driver: d, eligibility: computeEligibility(reassignFor, d) }))
      .sort((a, b) => {
        if (a.eligibility.eligible === b.eligibility.eligible) return 0
        return a.eligibility.eligible ? -1 : 1
      })
  }, [reassignFor, driversQuery.data, kindFilter, vehicleFilter])

  // Éligibilité du driver actuellement sélectionné (pour la logique du CTA)
  const selectedEligibility = useMemo(() => {
    if (!reassignFor || !newDriverId) return null
    const found = (driversQuery.data ?? []).find((d) => d.id === Number(newDriverId))
    return found ? computeEligibility(reassignFor, found) : null
  }, [reassignFor, newDriverId, driversQuery.data])

  const selectedNotEligible =
    selectedEligibility !== null && !selectedEligibility.eligible
  const cannotConfirm =
    !newDriverId ||
    reassignMutation.isPending ||
    (isPostPickup && !pickupFromPrevious) ||
    (selectedNotEligible && !forceOverride)

  const courses = coursesQuery.data?.data ?? []
  const total = coursesQuery.data?.total ?? courses.length

  return (
    <AdminPageShell>
      <AdminPageHeader
        title={t('admin.courses.pageTitle')}
        subtitle={t('admin.courses.pageSubtitle', { count: total })}
        toolbar={
          <div className="flex flex-wrap gap-2 items-center">
            <AdminSearchInput
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              placeholder={t('admin.courses.searchPlaceholder')}
            />
            <AdminSelect
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setPage(1)
              }}
            >
              <option value="">{t('admin.courses.allStatuses')}</option>
              <option value="awaiting_assignment">{t('admin.courses.statusAwaiting')}</option>
              <option value="assigned">{t('admin.courses.statusAssigned')}</option>
              <option value="picked_up">{t('admin.courses.statusPickedUp')}</option>
              <option value="delivered">{t('admin.courses.statusDelivered')}</option>
              <option value="cancelled">{t('admin.courses.statusCancelled')}</option>
              <option value="failed">{t('admin.courses.statusFailed')}</option>
              <option value="disputed">{t('admin.courses.statusDisputed')}</option>
            </AdminSelect>
            {(search || statusFilter) && (
              <AdminButton
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch('')
                  setStatusFilter('')
                  setPage(1)
                }}
              >
                {t('admin.common.reset')}
              </AdminButton>
            )}
          </div>
        }
      />

      <div className="px-4 md:px-6 lg:px-8 py-5">
        <div className="bg-off-white border border-warm-200 rounded-lg overflow-hidden">
          {coursesQuery.isLoading ? (
            <div className="p-10 text-center text-warm-500 text-body-s">{t('admin.common.loading')}</div>
          ) : courses.length === 0 ? (
            <div className="p-10 text-center text-warm-500 text-body-s italic">
              {t('admin.courses.emptyResults')}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-body-s min-w-[800px]">
                <thead className="bg-cream/60 text-[10px] uppercase tracking-wider font-bold text-warm-600 border-b border-warm-200">
                  <tr>
                    <th className="px-4 py-2.5 text-left">{t('admin.courses.colReference')}</th>
                    <th className="px-4 py-2.5 text-left">{t('admin.courses.colMarchant')}</th>
                    <th className="px-4 py-2.5 text-left">{t('admin.courses.colDestination')}</th>
                    <th className="px-4 py-2.5 text-left">{t('admin.courses.colStatus')}</th>
                    <th className="px-4 py-2.5 text-left">{t('admin.courses.colDriver')}</th>
                    <th className="px-4 py-2.5 text-right">{t('admin.courses.colAction')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-warm-200">
                  {courses.map((c) => (
                    <tr key={c.id} className="hover:bg-cream/40 transition-colors">
                      <td className="px-4 py-2.5 font-mono text-caption font-semibold">
                        <Link
                          to={`/courses/${c.id}`}
                          className="text-ink hover:text-airmess-red"
                        >
                          {c.reference}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 text-ink truncate max-w-[180px]">
                        {c.origin_name}
                      </td>
                      <td className="px-4 py-2.5">
                        <p className="text-ink truncate max-w-[220px]">{c.destination_name}</p>
                        <p className="text-caption text-warm-500 truncate max-w-[220px]">
                          {c.destination_quartier}
                        </p>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <StatusBadge status={c.status} />
                          {c.is_high_value && (
                            <span
                              className="text-[10px] font-extrabold uppercase tracking-widest px-1.5 py-0.5 rounded bg-airmess-yellow/20 text-ink border border-airmess-yellow/50"
                              title="Course premium — hors pool driver, prise en charge manuelle"
                            >
                              Premium
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-warm-600 truncate max-w-[160px]">
                        {c.driver?.user?.name ?? (
                          <span className="italic text-warm-400">{t('admin.common.notAssigned')}</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {!REASSIGNABLE_BLOCKED.includes(c.status) && (
                          <AdminButton
                            variant="ghost"
                            size="sm"
                            onClick={() => setReassignFor(c)}
                            className="text-airmess-red! hover:text-airmess-red! hover:bg-danger-bg!"
                          >
                            {t('admin.courses.reassignAction')}
                          </AdminButton>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {coursesQuery.data && (
          <AdminPagination
            currentPage={coursesQuery.data.current_page}
            lastPage={coursesQuery.data.last_page}
            total={coursesQuery.data.total}
            itemLabel={t('admin.courses.itemLabel')}
            onChange={setPage}
            isFetching={coursesQuery.isFetching}
          />
        )}
      </div>

      {/* Modal de réaffectation */}
      <AdminModal
        open={!!reassignFor}
        onClose={closeReassign}
        title={reassignFor ? t('admin.courses.reassignTitle', { reference: reassignFor.reference }) : ''}
        subtitle={t('admin.courses.reassignSubtitle')}
        footer={
          <>
            <AdminButton variant="secondary" onClick={closeReassign}>
              {t('admin.common.cancel')}
            </AdminButton>
            <AdminButton
              variant="primary"
              onClick={() => reassignMutation.mutate()}
              disabled={cannotConfirm}
            >
              {reassignMutation.isPending ? t('admin.courses.reassignInProgress') : t('admin.common.confirm')}
            </AdminButton>
          </>
        }
      >
        <div className="space-y-4">
          {/* Bandeau critères de la course — visuel immédiat de ce qu'exige la course */}
          {reassignFor && <CourseCriteriaBanner course={reassignFor} />}

          {/* Filtres kind + vehicle_type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block mb-1.5 text-caption font-medium text-warm-600">
                {t('admin.courses.reassignFilterKind')}
              </label>
              <AdminSelect
                value={kindFilter}
                onChange={(e) => setKindFilter(e.target.value as '' | DriverKind)}
                className="w-full"
              >
                <option value="">{t('admin.courses.reassignFilterKindAll')}</option>
                <option value="airmess">{t('admin.courses.reassignKindAirmess')}</option>
                <option value="independent">{t('admin.courses.reassignKindIndependent')}</option>
              </AdminSelect>
            </div>
            <div>
              <label className="block mb-1.5 text-caption font-medium text-warm-600">
                {t('admin.courses.reassignFilterVehicle')}
              </label>
              <AdminSelect
                value={vehicleFilter}
                onChange={(e) => setVehicleFilter(e.target.value)}
                className="w-full"
              >
                <option value="">{t('admin.courses.reassignFilterVehicleAll')}</option>
                <option value="velo">{t('admin.courses.vehicleVelo')}</option>
                <option value="scooter">{t('admin.courses.vehicleScooter')}</option>
                <option value="moto">{t('admin.courses.vehicleMoto')}</option>
                <option value="voiture">{t('admin.courses.vehicleVoiture')}</option>
              </AdminSelect>
            </div>
          </div>

          {/* Liste des drivers avec éligibilité — cards radio */}
          <div>
            <label className="block mb-1.5 text-caption font-medium text-warm-600">
              {t('admin.courses.newDriverLabel')}
            </label>
            <div className="max-h-72 overflow-y-auto rounded-md border border-warm-200 divide-y divide-warm-100">
              {rankedDrivers.length === 0 ? (
                <p className="p-4 text-center text-caption text-warm-500 italic">
                  {t('admin.courses.reassignNoDriver')}
                </p>
              ) : (
                rankedDrivers.map(({ driver, eligibility }) => (
                  <DriverEligibilityRow
                    key={driver.id}
                    driver={driver}
                    reasons={eligibility.reasons}
                    eligible={eligibility.eligible}
                    selected={Number(newDriverId) === driver.id}
                    onSelect={() => setNewDriverId(driver.id)}
                  />
                ))
              )}
            </div>
          </div>

          {/* Override manuel des règles d'éligibilité (cas exceptionnels) */}
          {selectedNotEligible && (
            <div className="rounded-md border border-warning/40 bg-warning-bg p-3">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={forceOverride}
                  onChange={(e) => setForceOverride(e.target.checked)}
                  className="mt-1 accent-airmess-yellow"
                />
                <div>
                  <span className="text-body-s font-semibold text-warning block">
                    {t('admin.courses.reassignForceLabel')}
                  </span>
                  <span className="text-caption text-warm-600 block mt-0.5">
                    {t('admin.courses.reassignForceHelp')}
                  </span>
                </div>
              </label>
            </div>
          )}

          <div>
            <label className="block mb-1.5 text-caption font-medium text-warm-600">
              {t('admin.courses.reasonLabel')}
            </label>
            <textarea
              value={reassignReason}
              onChange={(e) => setReassignReason(e.target.value)}
              rows={2}
              placeholder={t('admin.courses.reasonPlaceholder')}
              className="w-full px-3 py-2 bg-off-white border border-warm-300 rounded-md text-body-s text-ink placeholder:text-warm-400 focus:outline-none focus:border-airmess-yellow focus:shadow-glow-yellow transition-all"
            />
          </div>

          {/* Cas 5 — Transfert physique post-pickup (panne/accident driver) */}
          {isPostPickup && (
            <div className="bg-warning-bg border border-warning/30 rounded-md p-3">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={pickupFromPrevious}
                  onChange={(e) => setPickupFromPrevious(e.target.checked)}
                  className="mt-1 accent-airmess-yellow"
                />
                <div>
                  <span className="text-body-s font-semibold text-ink block">
                    {t('admin.courses.pickupFromPreviousLabel')}
                  </span>
                  <span className="text-caption text-warm-600 block mt-0.5">
                    {t('admin.courses.pickupFromPreviousHelp')}
                  </span>
                </div>
              </label>
            </div>
          )}
        </div>
      </AdminModal>
    </AdminPageShell>
  )
}

/* ============================================================
   Sous-composants — modale de réassignement
   ============================================================ */

function CourseCriteriaBanner({ course }: { course: Course }) {
  const { t } = useTranslation()
  const chips: { key: string; label: string; tone: 'premium' | 'recipient' | 'collection' }[] = []

  if (course.is_high_value) {
    chips.push({
      key: 'premium',
      label: t('admin.courses.reassignChipPremium'),
      tone: 'premium',
    })
  }
  if (course.delivery_fee_paid_by === 'recipient') {
    chips.push({
      key: 'recipient',
      label: t('admin.courses.reassignChipPaidByRecipient'),
      tone: 'recipient',
    })
  }
  if (course.has_collection && course.collection_amount) {
    chips.push({
      key: 'collection',
      label: t('admin.courses.reassignChipCollection', {
        amount: course.collection_amount.toLocaleString('fr-FR'),
      }),
      tone: 'collection',
    })
  }

  if (chips.length === 0) {
    return (
      <div className="rounded-md border border-warm-200 bg-cream p-3">
        <p className="text-caption text-warm-600">
          {t('admin.courses.reassignNoCriteria')}
        </p>
      </div>
    )
  }

  const toneClass: Record<string, string> = {
    premium: 'bg-airmess-yellow/20 text-ink border-airmess-yellow/60',
    recipient: 'bg-warning-bg text-warning border-warning/40',
    collection: 'bg-info-bg text-info border-info/30',
  }

  return (
    <div className="rounded-md border border-warm-200 bg-cream p-3">
      <p className="text-caption font-semibold text-warm-600 mb-2 uppercase tracking-wide">
        {t('admin.courses.reassignCriteriaTitle')}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {chips.map((c) => (
          <span
            key={c.key}
            className={`inline-flex items-center px-2 py-1 rounded-md border text-caption font-semibold ${toneClass[c.tone]}`}
          >
            {c.label}
          </span>
        ))}
      </div>
    </div>
  )
}

function DriverEligibilityRow({
  driver,
  reasons,
  eligible,
  selected,
  onSelect,
}: {
  driver: DriverFull
  reasons: EligibilityReason[]
  eligible: boolean
  selected: boolean
  onSelect: () => void
}) {
  const { t } = useTranslation()
  const balance = driver.wallet?.balance ?? 0
  const kindLabel =
    driver.kind === 'airmess'
      ? t('admin.courses.reassignKindAirmess')
      : t('admin.courses.reassignKindIndependent')

  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        'w-full text-left px-3 py-2.5 transition-colors flex items-start gap-3',
        selected
          ? 'bg-airmess-yellow/10'
          : eligible
            ? 'hover:bg-cream/60'
            : 'hover:bg-warm-100/60',
      ].join(' ')}
    >
      <span
        className={[
          'mt-1 shrink-0 w-4 h-4 rounded-full border-2',
          selected
            ? 'bg-airmess-yellow border-airmess-yellow'
            : 'border-warm-300 bg-off-white',
        ].join(' ')}
        aria-hidden
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className={`text-body-s font-semibold ${eligible ? 'text-ink' : 'text-warm-500'}`}>
            {driver.user.name}
          </p>
          <span
            className={[
              'text-caption font-semibold px-1.5 py-0.5 rounded border',
              driver.kind === 'airmess'
                ? 'bg-airmess-yellow/20 text-ink border-airmess-yellow/60'
                : 'bg-warm-100 text-warm-600 border-warm-300',
            ].join(' ')}
          >
            {kindLabel}
          </span>
          <span className="text-caption text-warm-500">· {driver.vehicle_type}</span>
          <span className="text-caption text-warm-500 tabular-nums">
            · {t('admin.courses.reassignCautionLabel')} {balance.toLocaleString('fr-FR')} FCFA
          </span>
        </div>
        {eligible ? (
          <p className="mt-1 flex items-center gap-1 text-caption text-success font-semibold">
            <CheckIcon size={12} />
            {t('admin.courses.reassignEligible')}
          </p>
        ) : (
          <ul className="mt-1 space-y-0.5">
            {reasons.map((r, i) => (
              <li
                key={i}
                className="flex items-start gap-1 text-caption text-airmess-red font-medium"
              >
                <span className="mt-0.5 shrink-0">
                  <AlertTriangleIcon size={12} />
                </span>
                <span>{formatReason(r, t)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </button>
  )
}

function formatReason(
  reason: EligibilityReason,
  t: (key: string, opts?: Record<string, unknown>) => string,
): string {
  switch (reason.code) {
    case 'not_available':
      return t('admin.courses.reassignReasonNotAvailable')
    case 'not_active':
      return t('admin.courses.reassignReasonNotActive')
    case 'premium_needs_airmess':
      return t('admin.courses.reassignReasonPremiumAirmess')
    case 'paid_by_recipient_needs_airmess':
      return t('admin.courses.reassignReasonRecipientAirmess')
    case 'collection_exceeds_wallet':
      return t('admin.courses.reassignReasonCollectionCaution', {
        amount: Number(reason.context?.amount ?? 0).toLocaleString('fr-FR'),
        balance: Number(reason.context?.balance ?? 0).toLocaleString('fr-FR'),
      })
    default:
      return ''
  }
}
