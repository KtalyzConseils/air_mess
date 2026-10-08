import { useEffect, useMemo, useState, type MouseEvent as ReactMouseEvent, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import AppHeader from '../components/AppHeader'
import Highlight from '../components/Highlight'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import PageEyebrow from '../components/ui/PageEyebrow'
import KpiCard from '../components/KpiCard'
import StatusBadge from '../components/StatusBadge'
import {
  ArrowRightIcon,
  BarChartIcon,
  CheckIcon,
  ClockIcon,
  PackageIcon,
  PauseIcon,
  PlayIcon,
  RefreshIcon,
  RouteIcon,
  ShareIcon,
  SparklesIcon,
  WalletIcon,
} from '../components/ui/icons'
import { fetchCourses, type Course } from '../api/courses'
import { fetchWallet } from '../api/wallet'
import { useAuthStore } from '../stores/authStore'
import { useOnboardingStore } from '../stores/onboardingStore'
import OnboardingModal from '../components/onboarding/OnboardingModal'
import AcceptTermsModal from '../components/AcceptTermsModal'
import { fetchTermsStatus } from '../api/terms'

// Choix produit (inchangé) : les courses en attente d'attribution ne sont PAS dans les
// "livraisons actives" (elles ont leur KPI dédié "En attribution").
const IN_PROGRESS_STATUSES = ['assigned', 'driver_to_pickup', 'at_pickup', 'picked_up', 'at_dropoff']

// Une donnée n'est présentée comme « live » que si elle est réellement fraîche
// (design-system/airmess-commercants/MASTER.md §6).
const STALE_AFTER_MS = 90_000
const COURSES_REFETCH_MS = 15_000
const WALLET_REFETCH_MS = 30_000
const CLOCK_TICK_MS = 15_000

export default function DashboardPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const user = useAuthStore((s) => s.user)
  const isPendingMarchant = user?.type === 'marchant' && !user.marchant?.validated_at
  const [copiedId, setCopiedId] = useState<number | null>(null)
  const [showPendingOverlay, setShowPendingOverlay] = useState(true)
  const [showIndividualBonus, setShowIndividualBonus] = useState(
    () => Boolean((location.state as { showWelcomeBonus?: boolean } | null)?.showWelcomeBonus),
  )
  const showMerchantBonus = Boolean(
    (location.state as { showMerchantBonus?: boolean } | null)?.showMerchantBonus,
  )

  // Actualisation automatique : contrôlable par l'utilisateur (pause / reprise).
  const [autoRefresh, setAutoRefresh] = useState(true)

  // Horloge locale : sert uniquement à détecter une donnée périmée. Rien ne tourne
  // quand l'onglet est masqué.
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => {
      if (!document.hidden) setNow(Date.now())
    }, CLOCK_TICK_MS)
    return () => window.clearInterval(id)
  }, [])

  // Onboarding — 1er passage : la modale de bienvenue s'affiche. Le bouton "Aide"
  // du header remet le flag à false pour la rejouer à la demande.
  const welcomeSeen = useOnboardingStore((s) => s.welcomeSeen)
  const markWelcomeSeen = useOnboardingStore((s) => s.markWelcomeSeen)

  // CGU — modale bloquante si jamais accepté (comptes anciens) ou version bumpée.
  const termsQuery = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: fetchTermsStatus,
  })
  const needsTermsAcceptance = termsQuery.data?.needs_acceptance ?? false

  const greetingName =
    user?.marchant?.raison_sociale ??
    user?.individual?.first_name ??
    user?.name ??
    ''

  const coursesQuery = useQuery({
    queryKey: ['courses', { per_page: 50 }],
    queryFn: () => fetchCourses({ per_page: 50 }),
    refetchInterval: autoRefresh ? COURSES_REFETCH_MS : false,
  })

  const walletQuery = useQuery({
    queryKey: ['me', 'wallet'],
    queryFn: fetchWallet,
    refetchInterval: autoRefresh ? WALLET_REFETCH_MS : false,
  })

  const courses: Course[] = useMemo(() => coursesQuery.data?.data ?? [], [coursesQuery.data])
  const wallet = walletQuery.data
  const isLoading = coursesQuery.isLoading
  const error = coursesQuery.error

  const coursesUpdatedAt = coursesQuery.dataUpdatedAt
  const isStale =
    !isLoading && coursesUpdatedAt > 0 && now - coursesUpdatedAt > STALE_AFTER_MS
  const updatedAtLabel = coursesUpdatedAt
    ? new Date(coursesUpdatedAt).toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null

  const today = new Date().toISOString().slice(0, 10)
  const currentMonth = today.slice(0, 7)

  const inProgressCourses = courses.filter((c) => IN_PROGRESS_STATUSES.includes(c.status))
  const totalToday = courses.filter((c) => c.created_at.startsWith(today)).length
  const deliveredMonth = courses.filter(
    (c) => c.status === 'delivered' && c.delivered_at?.startsWith(currentMonth),
  ).length
  const awaitingCount = courses.filter((c) => c.status === 'awaiting_assignment').length
  const caMonth = courses
    .filter((c) => c.status === 'delivered' && c.delivered_at?.startsWith(currentMonth))
    .reduce((sum, c) => sum + (c.delivery_fee ?? 0), 0)

  const activeCount = inProgressCourses.length
  // Pendant le premier chargement, rien n'est encore « live » : on reste neutre.
  const freshnessVariant = isLoading
    ? 'neutral'
    : !autoRefresh
      ? 'neutral'
      : isStale
        ? 'warning'
        : 'live'
  const freshnessLabel = isLoading
    ? t('common.loading')
    : !autoRefresh
      ? t('dashboard.refreshPaused')
      : isStale
        ? t('dashboard.staleLabel')
        : t('dashboard.liveLabel')

  // Une seule région de statut pour tout l'écran : on annonce toujours une phrase
  // complète, jamais un nombre nu, et on ne déplace jamais le focus.
  const statusMessage =
    copiedId != null
      ? t('common.copied')
      : !autoRefresh
        ? t('dashboard.refreshPaused')
        : isStale
          ? t('dashboard.staleLabel')
          : activeCount === 0
            ? t('dashboard.noActive')
            : activeCount === 1
              ? t('dashboard.activeCountOne')
              : t('dashboard.activeCountMany', { count: activeCount })

  async function copyTrackingLink(course: Course, e: ReactMouseEvent) {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/t/${course.tracking_token}`)
      setCopiedId(course.id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      alert(t('common.copyImpossible'))
    }
  }

  function refreshNow() {
    void coursesQuery.refetch()
    void walletQuery.refetch()
  }

  return (
    <div className="min-h-screen bg-cream">
      {isPendingMarchant && showPendingOverlay && (
        <BonusOverlay
          titleId="pending-validation-title"
          eyebrow={t('auth.registerSuccess.eyebrow')}
          title={t('auth.registerSuccess.title')}
          message={t('auth.registerSuccess.message')}
          cta={t('auth.registerSuccess.understood')}
          onClose={() => setShowPendingOverlay(false)}
        >
          {showMerchantBonus && <BonusAmount />}
        </BonusOverlay>
      )}

      {user?.type === 'individual' && showIndividualBonus && (
        <BonusOverlay
          titleId="individual-bonus-title"
          eyebrow={t('auth.registerSuccess.individualEyebrow')}
          title={t('auth.registerSuccess.individualTitle')}
          message={t('auth.registerSuccess.individualMessage')}
          cta={t('auth.registerSuccess.understood')}
          onClose={() => setShowIndividualBonus(false)}
        >
          <BonusAmount />
        </BonusOverlay>
      )}

      <AppHeader />

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-12">
        {/* ============================================================
            BANDEAUX D'ÉTAT — un seul visible à la fois
            ============================================================ */}
        {isPendingMarchant && (
          <Card
            variant="default"
            padding="md"
            className="mb-8 bg-warning-bg! border-warning/30! flex items-start gap-3"
          >
            <span className="shrink-0 text-warning" aria-hidden="true">
              <ClockIcon size={20} />
            </span>
            <div>
              <p className="font-bold text-warning-strong text-body">
                {t('dashboard.pendingTitle')}
              </p>
              <p className="text-body-s text-warm-600 mt-0.5">{t('dashboard.pendingBody')}</p>
            </div>
          </Card>
        )}

        {!isLoading && user?.type === 'individual' && courses.length === 0 && (
          <Card
            variant="default"
            padding="md"
            className="mb-8 border-airmess-yellow/60! bg-airmess-yellow/10!"
          >
            <div className="flex items-start gap-3">
              <span className="shrink-0 text-ink" aria-hidden="true">
                <SparklesIcon size={20} />
              </span>
              <div>
                <p className="font-bold text-ink text-body">
                  {t('dashboard.firstCourseBonusTitle')}
                </p>
                <p className="mt-0.5 text-body-s text-warm-600">
                  {t('dashboard.firstCourseBonusBody')}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* ============================================================
            EN-TÊTE : eyebrow + salutation + état des données
            ============================================================ */}
        <div className="grid gap-8 md:grid-cols-3 mb-10">
          <div className="md:col-span-2">
            <PageEyebrow label={t('dashboard.eyebrow')} className="mb-4" />
            <h1 className="text-h1 md:text-display-2 text-ink leading-tight">
              {t('dashboard.greeting')} {greetingName}.
            </h1>
            <p className="text-body-l text-warm-500 mt-3">
              {t('dashboard.subtitleStart')}{' '}
              <Highlight>{t('dashboard.subtitleHighlight')}</Highlight>{' '}
              {t('dashboard.subtitleEnd')}
            </p>
          </div>

          {/* État des données + contrôle de l'actualisation automatique */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={freshnessVariant} dot>
                {freshnessLabel}
              </Badge>
              {updatedAtLabel && !isStale && !isLoading && (
                <span className="text-caption text-warm-500 tabular-nums">
                  {t('dashboard.updatedAt', { time: updatedAtLabel })}
                </span>
              )}
              <div className="ml-auto flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setAutoRefresh((v) => !v)}
                  aria-pressed={autoRefresh}
                  aria-label={autoRefresh ? t('dashboard.pauseRefresh') : t('dashboard.resumeRefresh')}
                  title={autoRefresh ? t('dashboard.pauseRefresh') : t('dashboard.resumeRefresh')}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-md text-warm-600 hover:bg-warm-100 hover:text-ink transition-colors cursor-pointer"
                >
                  {autoRefresh ? <PauseIcon size={18} /> : <PlayIcon size={18} />}
                </button>
                <button
                  type="button"
                  onClick={refreshNow}
                  aria-label={t('dashboard.refreshNow')}
                  title={t('dashboard.refreshNow')}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-md text-warm-600 hover:bg-warm-100 hover:text-ink transition-colors cursor-pointer"
                >
                  <RefreshIcon size={18} />
                </button>
              </div>
            </div>

            {/* Wallet */}
            <Card variant="elevated" padding="md">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-eyebrow text-warm-600 uppercase">
                  <WalletIcon size={14} />
                  {t('dashboard.walletLabel')}
                </span>
                {wallet?.is_low && (
                  <Badge variant="warning" size="sm">
                    {t('userMenu.walletLow')}
                  </Badge>
                )}
              </div>

              <p className="text-h2 text-ink mt-2 tabular-nums">
                {wallet ? wallet.available.toLocaleString('fr-FR') : '—'}
                <span className="text-body text-warm-500 ml-1.5 font-normal">FCFA</span>
              </p>
              <p className="text-caption text-warm-500 mt-1">{t('wallet.availableBalance')}</p>
              {wallet && wallet.pending_reserved > 0 && (
                <p className="text-caption text-warm-600 mt-1">
                  {t('wallet.reservedForOngoing', {
                    amount: `${wallet.pending_reserved.toLocaleString('fr-FR')} FCFA`,
                  })}
                </p>
              )}

              <Link to="/wallet" className="block mt-3">
                <Button variant="secondary" size="sm" fullWidth>
                  {t('dashboard.walletTopUp')}
                </Button>
              </Link>
              <Link
                to="/wallet"
                className="block mt-2 text-center text-caption font-medium text-warm-600 hover:text-ink"
              >
                {t('common.seeHistory')}
              </Link>
            </Card>

            {/* CTA principal — l'unique bouton `primary` de l'écran */}
            {isPendingMarchant ? (
              <Button variant="primary" size="lg" pill fullWidth disabled>
                {t('dashboard.newDelivery')}
              </Button>
            ) : (
              <Link to="/courses/new" className="block">
                <Button
                  variant="primary"
                  size="lg"
                  pill
                  fullWidth
                  rightIcon={<ArrowRightIcon size={18} />}
                >
                  {t('dashboard.createCourse')}
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* ============================================================
            BANDE DE KPI — 5 chiffres clés, tuile « En cours » en avant
            ============================================================ */}
        <section aria-labelledby="kpi-heading" className="mb-10">
          <h2 id="kpi-heading" className="sr-only">
            {t('dashboard.kpiLabel')}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
            <KpiCard
              label={t('dashboard.kpiToday')}
              value={isLoading ? '—' : totalToday}
              hint={t('dashboard.kpiTodayHint')}
              icon={<PackageIcon size={16} />}
            />
            <KpiCard
              label={t('dashboard.kpiInProgress')}
              value={isLoading ? '—' : activeCount}
              accent="brand"
              icon={<RouteIcon size={16} />}
            />
            <KpiCard
              label={t('dashboard.kpiAwaiting')}
              value={isLoading ? '—' : awaitingCount}
              hint={t('dashboard.kpiAwaitingHint')}
              icon={<ClockIcon size={16} />}
            />
            <KpiCard
              label={t('dashboard.kpiDeliveredMonth')}
              value={isLoading ? '—' : deliveredMonth}
              icon={<CheckIcon size={16} />}
            />
            <KpiCard
              label={t('dashboard.kpiRevenueMonth')}
              value={isLoading ? '—' : caMonth}
              hint={t('dashboard.kpiRevenueHint')}
              icon={<BarChartIcon size={16} />}
            />
          </div>
        </section>

        {/* ============================================================
            LIVRAISONS ACTIVES
            ============================================================ */}
        <section aria-labelledby="active-heading">
          <div className="flex items-end justify-between mb-5 gap-4 border-b border-warm-200 pb-3">
            <h2 id="active-heading" className="text-h2 text-ink font-bold">
              {t('dashboard.activeDeliveries')}
            </h2>
            <Link
              to="/courses"
              className="text-body-s font-medium text-ink hover:text-airmess-red shrink-0"
            >
              {t('common.seeAll')}
            </Link>
          </div>

          {isLoading && (
            <ul className="space-y-3" aria-busy="true" aria-label={t('dashboard.loadingRows')}>
              {[0, 1, 2].map((key) => (
                <li
                  key={key}
                  className="rounded-lg border border-warm-200 bg-off-white p-4 md:p-5 animate-pulse motion-reduce:animate-none"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-6 w-24 rounded-sm bg-warm-200" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-20 rounded-sm bg-warm-200" />
                      <div className="h-4 w-2/3 rounded-sm bg-warm-200" />
                    </div>
                    <div className="h-6 w-16 rounded-sm bg-warm-200" />
                  </div>
                </li>
              ))}
            </ul>
          )}

          {error && !isLoading && (
            <Card padding="lg" className="text-center bg-danger-bg! border-airmess-red/20!">
              <p className="text-body font-semibold text-airmess-red mb-1">
                {t('dashboard.loadError')}
              </p>
              <p className="text-body-s text-warm-600 mb-4">{t('common.loadingError')}</p>
              <Button variant="secondary" size="md" pill onClick={refreshNow}>
                {t('dashboard.retry')}
              </Button>
            </Card>
          )}

          {!isLoading && !error && activeCount === 0 && (
            <Card padding="lg" className="text-center">
              <p className="text-body text-warm-600 mb-3">{t('dashboard.noActive')}</p>
              {!isPendingMarchant && (
                <Link to="/courses/new">
                  <Button variant="primary" size="md" pill>
                    {t(courses.length === 0 ? 'dashboard.createFirst' : 'dashboard.createNew')}
                  </Button>
                </Link>
              )}
            </Card>
          )}

          {!isLoading && !error && activeCount > 0 && (
            <ul className="space-y-3">
              {inProgressCourses.slice(0, 5).map((course) => {
                const route = `${course.origin_quartier} → ${course.destination_quartier}, ${course.destination_city}`
                const fee = course.delivery_fee ?? 0

                return (
                  <li
                    key={course.id}
                    className="flex items-stretch gap-2 rounded-lg border border-warm-200 bg-off-white transition-all duration-200 hover:border-warm-300 hover:shadow-sm focus-within:border-warm-300"
                  >
                    <button
                      type="button"
                      onClick={() => navigate(`/courses/${course.id}`)}
                      className="flex flex-1 min-w-0 items-center gap-4 p-4 md:p-5 text-left cursor-pointer"
                    >
                      <span className="shrink-0">
                        <StatusBadge status={course.status} />
                      </span>

                      <span className="flex-1 min-w-0 block">
                        <span className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="font-mono text-caption text-warm-500 tabular-nums">
                            {course.reference}
                          </span>
                          {course.urgency === 'express' && (
                            <Badge variant="brand" size="sm">
                              {t('dashboard.expressTag')}
                            </Badge>
                          )}
                          {course.has_collection && course.collection_amount ? (
                            <span className="text-caption text-warm-600 tabular-nums">
                              {t('dashboard.collectInline', {
                                amount: `${course.collection_amount.toLocaleString('fr-FR')} FCFA`,
                              })}
                            </span>
                          ) : null}
                        </span>
                        <span
                          className="block text-body font-medium text-ink truncate"
                          title={route}
                        >
                          {route}
                        </span>
                        <span className="block text-body-s text-warm-500 mt-0.5 truncate">
                          {course.destination_name} ·{' '}
                          {course.driver?.user?.name ?? t('dashboard.searchingDriver')}
                        </span>
                      </span>

                      <span className="shrink-0 text-right hidden sm:block">
                        <span className="block text-body font-bold text-ink tabular-nums">
                          {fee.toLocaleString('fr-FR')}
                        </span>
                        <span className="block text-caption text-warm-500">FCFA</span>
                      </span>
                    </button>

                    <div className="flex items-center pr-3">
                      <button
                        type="button"
                        onClick={(e) => copyTrackingLink(course, e)}
                        aria-label={
                          copiedId === course.id ? t('common.copied') : t('dashboard.copyTracking')
                        }
                        title={
                          copiedId === course.id ? t('common.copied') : t('dashboard.copyTracking')
                        }
                        className="inline-flex h-11 w-11 items-center justify-center rounded-md text-warm-500 hover:bg-warm-100 hover:text-ink transition-colors cursor-pointer"
                      >
                        {copiedId === course.id ? (
                          <CheckIcon size={18} />
                        ) : (
                          <ShareIcon size={18} />
                        )}
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </main>

      {/* Région de statut unique de l'écran (jamais de nombre nu, jamais de focus déplacé) */}
      <p role="status" aria-atomic="true" className="sr-only">
        {statusMessage}
      </p>

      {/* Onboarding — modale de bienvenue (3 slides). S'affiche automatiquement la
          1ère fois, puis rejouable depuis le bouton "Aide" du header. Elle est
          masquée tant que la modale CGU (plus prioritaire) est ouverte. */}
      <OnboardingModal open={!welcomeSeen && !needsTermsAcceptance} onClose={markWelcomeSeen} />

      {/* CGU — modale BLOQUANTE si jamais accepté ou version obsolète. */}
      <AcceptTermsModal open={needsTermsAcceptance} onAccepted={() => termsQuery.refetch()} />
    </div>
  )
}

/* ============================================================
   Sous-composants locaux
   ============================================================ */

interface BonusOverlayProps {
  titleId: string
  eyebrow: string
  title: string
  message: string
  cta: string
  onClose: () => void
  children?: ReactNode
}

/**
 * Modale de félicitations (validation de compte, bon de bienvenue).
 * Une seule implémentation pour les deux cas : le contenu variable passe en enfants.
 * L'icône est un SVG (pas d'emoji) et le mouvement suit `prefers-reduced-motion`.
 */
function BonusOverlay({ titleId, eyebrow, title, message, cta, onClose, children }: BonusOverlayProps) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/65 px-4 py-8 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div className="w-full max-w-xl rounded-2xl border border-warm-200 bg-off-white p-7 text-center shadow-2xl md:p-12 ams-anim-scale-in">
        <div
          className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-airmess-yellow text-ink"
          aria-hidden="true"
        >
          <SparklesIcon size={28} />
        </div>
        <p className="mb-3 text-eyebrow uppercase text-airmess-red">{eyebrow}</p>
        <h1 id={titleId} className="mb-4 text-h1 text-ink">
          {title}
        </h1>
        <p className="mx-auto mb-7 max-w-md text-body-l text-warm-600">{message}</p>
        {children}
        <Button variant="primary" size="lg" pill fullWidth onClick={onClose}>
          {cta}
        </Button>
      </div>
    </div>
  )
}

/** Montant du bon de bienvenue (identique pour marchand et particulier). */
function BonusAmount() {
  const { t } = useTranslation()
  return (
    <div className="mb-7 rounded-xl border border-airmess-yellow/50 bg-airmess-yellow/10 px-5 py-5">
      <p className="text-caption font-semibold uppercase tracking-wide text-warm-600">
        {t('auth.registerSuccess.giftLabel')}
      </p>
      <p className="mt-1 text-h2 font-bold text-ink tabular-nums">500 FCFA</p>
      <p className="mt-1 text-body-s text-warm-600">{t('auth.registerSuccess.giftBody')}</p>
    </div>
  )
}
