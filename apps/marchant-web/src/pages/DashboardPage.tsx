import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import AppHeader from '../components/AppHeader'
import Highlight from '../components/Highlight'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import PageEyebrow from '../components/ui/PageEyebrow'
import StatusBadge from '../components/StatusBadge'
import { fetchCourses, type Course } from '../api/courses'
import { fetchWallet } from '../api/wallet'
import { useAuthStore } from '../stores/authStore'
import { useOnboardingStore } from '../stores/onboardingStore'
import OnboardingModal from '../components/onboarding/OnboardingModal'
import AcceptTermsModal from '../components/AcceptTermsModal'
import { fetchTermsStatus } from '../api/terms'

// Choix produit : les courses en attente d'attribution ne sont PAS dans les
// "livraisons actives" (elles ont leur KPI dédié "En attribution").
const IN_PROGRESS_STATUSES = ['assigned', 'driver_to_pickup', 'at_pickup', 'picked_up', 'at_dropoff']

export default function DashboardPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const [copiedId, setCopiedId] = useState<number | null>(null)

  // Onboarding — 1er passage : la modale de bienvenue s'affiche. Le bouton "Aide"
  // du header remet le flag à false pour la rejouer à la demande.
  const welcomeSeen = useOnboardingStore((s) => s.welcomeSeen)
  const markWelcomeSeen = useOnboardingStore((s) => s.markWelcomeSeen)

  // CGU — statut d'acceptation. Modale bloquante si l'utilisateur n'a jamais
  // accepté (comptes créés avant la mise en place) ou si la version courante
  // a été bumpée depuis sa dernière acceptation.
  const termsQuery = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: fetchTermsStatus,
  })
  const needsTermsAcceptance = termsQuery.data?.needs_acceptance ?? false

  const isPendingMarchant = user?.type === 'marchant' && !user.marchant?.validated_at
  const greetingName =
    user?.marchant?.raison_sociale ??
    user?.individual?.first_name ??
    user?.name ??
    ''

  const { data: coursesData, isLoading, error } = useQuery({
    queryKey: ['courses', { per_page: 50 }],
    queryFn: () => fetchCourses({ per_page: 50 }),
  })

  const { data: wallet } = useQuery({
    queryKey: ['me', 'wallet'],
    queryFn: fetchWallet,
    refetchInterval: 30_000,
  })

  const courses: Course[] = coursesData?.data ?? []
  const today = new Date().toISOString().slice(0, 10)

  const inProgressCourses = courses.filter((c) => IN_PROGRESS_STATUSES.includes(c.status))
  const totalToday = courses.filter((c) => c.created_at.startsWith(today)).length
  const deliveredMonth = courses.filter(
    (c) => c.status === 'delivered' && c.delivered_at?.startsWith(today.slice(0, 7)),
  ).length
  const awaitingCount = courses.filter((c) => c.status === 'awaiting_assignment').length
  const caMonth = courses
    .filter((c) => c.status === 'delivered' && c.delivered_at?.startsWith(today.slice(0, 7)))
    .reduce((sum, c) => sum + (c.delivery_fee ?? 0), 0)

  async function copyTrackingLink(course: Course, e: React.MouseEvent) {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/t/${course.tracking_token}`)
      setCopiedId(course.id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      alert(t('common.copyImpossible'))
    }
  }

  return (
    <div className="min-h-screen bg-cream">
      <AppHeader />

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-12">
        {/* Bandeau pending — gardé tel quel, juste restylé */}
        {isPendingMarchant && (
          <Card
            variant="default"
            padding="md"
            className="mb-8 bg-warning-bg! border-warning/30! flex items-start gap-3"
          >
            <span className="text-h3 leading-none">⏳</span>
            <div>
              <p className="font-bold text-warning text-body">{t('dashboard.pendingTitle')}</p>
              <p className="text-body-s text-warm-600 mt-0.5">
                {t('dashboard.pendingBody')}
              </p>
            </div>
          </Card>
        )}

        {/* ============================================================
            HERO : section marker + greeting + wallet + CTA
            Layout : 2/3 - 1/3 sur desktop
            ============================================================ */}
        <div className="grid gap-8 md:grid-cols-3 mb-12">
          <div className="md:col-span-2">
            <PageEyebrow label={t('dashboard.eyebrow')} className="mb-4" />
            <h1 className="text-h1 md:text-display-2 text-ink leading-tight">
              {t('dashboard.greeting')} {greetingName}.
            </h1>
            <p className="text-body-l text-warm-500 mt-3">
              {t('dashboard.subtitleStart')} <Highlight>{t('dashboard.subtitleHighlight')}</Highlight> {t('dashboard.subtitleEnd')}
            </p>
          </div>

          <div className="space-y-3">
            {/* Wallet card */}
            <Card variant="elevated" padding="md">
              <div className="flex items-center justify-between mb-1">
                <span className="text-eyebrow text-warm-500 uppercase">💰 {t('nav.wallet')}</span>
                {wallet?.is_low && <Badge variant="warning" size="sm">{t('userMenu.walletLow')}</Badge>}
              </div>
              <p className="text-h2 text-ink tabular-nums mt-2">
                {wallet ? wallet.balance.toLocaleString('fr-FR') : '—'}
                <span className="text-body text-warm-500 ml-1.5 font-normal">FCFA</span>
              </p>
              {wallet && wallet.pending_reserved > 0 && (
                <div className="mt-1.5 space-y-0.5">
                  <p className="text-caption text-warm-600">
                    {t('wallet.reservedForOngoing', {
                      amount: `${wallet.pending_reserved.toLocaleString('fr-FR')} FCFA`,
                    })}
                  </p>
                  <p className="text-caption font-semibold text-ink">
                    {t('wallet.availableBalance')} :{' '}
                    {wallet.available.toLocaleString('fr-FR')} FCFA
                  </p>
                </div>
              )}
              <Link to="/wallet">
                <Button variant="secondary" size="sm" fullWidth className="mt-3">
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

            {/* CTA Nouvelle course */}
            {isPendingMarchant ? (
              <Button variant="primary" size="lg" pill fullWidth disabled>
                {t('dashboard.newDelivery')}
              </Button>
            ) : (
              <Link to="/courses/new" className="block">
                <Button variant="primary" size="lg" pill fullWidth rightIcon={<span aria-hidden>→</span>}>
                  {t('dashboard.createCourse')}
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* ============================================================
            KPI GRID — 5 chiffres clés (incluant CA mensuel mis en avant)
            ============================================================ */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4 mb-12">
          <KpiTile label={t('dashboard.kpiToday')} value={totalToday} hint={t('dashboard.kpiTodayHint')} />
          <KpiTile label={t('dashboard.kpiInProgress')} value={inProgressCourses.length} accent="brand" />
          <KpiTile label={t('dashboard.kpiAwaiting')} value={awaitingCount} hint={t('dashboard.kpiAwaitingHint')} />
          <KpiTile label={t('dashboard.kpiDeliveredMonth')} value={deliveredMonth} />
          <KpiTile
            label={t('dashboard.kpiRevenueMonth')}
            value={`${caMonth.toLocaleString('fr-FR')}`}
            hint={t('dashboard.kpiRevenueHint')}
          />
        </div>

        {/* ============================================================
            SECTION 02 — Courses en cours
            ============================================================ */}
        <div className="flex items-end justify-between mb-5 gap-4 border-b border-warm-200 pb-3">
          <h2 className="text-h2 text-ink font-bold">
            {t('dashboard.activeDeliveries')}
          </h2>
          <Link to="/courses" className="text-body-s font-medium text-ink hover:text-airmess-red shrink-0">
            {t('common.seeAll')}
          </Link>
        </div>

        {isLoading && (
          <Card padding="lg" className="text-center text-warm-500">{t('common.loading')}</Card>
        )}

        {error && (
          <Card padding="lg" className="text-center bg-danger-bg! border-airmess-red/20! text-airmess-red">
            {t('common.loadingError')}
          </Card>
        )}

        {!isLoading && !error && inProgressCourses.length === 0 && (
          <Card padding="lg" className="text-center">
            <p className="text-body text-warm-600 mb-3">{t('dashboard.noActive')}</p>
            {!isPendingMarchant && (
              <Link to="/courses/new">
                <Button variant="primary" size="md" pill>
                  {/* "Ma première course" seulement si l'historique est vraiment vide */}
                  {t(courses.length === 0 ? 'dashboard.createFirst' : 'dashboard.createNew')}
                </Button>
              </Link>
            )}
          </Card>
        )}

        {!isLoading && inProgressCourses.length > 0 && (
          <div className="space-y-3">
            {inProgressCourses.slice(0, 5).map((c) => (
              <button
                key={c.id}
                onClick={() => navigate(`/courses/${c.id}`)}
                className="w-full text-left bg-off-white border border-warm-200 hover:border-warm-400 hover:shadow-md rounded-lg p-4 md:p-5 transition-all duration-200 flex items-center gap-4"
              >
                <div className="shrink-0">
                  <StatusBadge status={c.status} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="font-mono text-caption text-warm-500">{c.reference}</span>
                  </div>
                  <p className="text-body font-medium text-ink truncate">
                    {c.origin_quartier} → {c.destination_quartier}, {c.destination_city}
                  </p>
                  <p className="text-body-s text-warm-500 mt-0.5">
                    {c.destination_name}
                    {c.driver?.user?.name && ` · ${c.driver.user.name}`}
                  </p>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  <button
                    onClick={(e) => copyTrackingLink(c, e)}
                    title={t('dashboard.copyTracking')}
                    className="p-2 rounded-md text-warm-500 hover:text-ink hover:bg-warm-100"
                  >
                    {copiedId === c.id ? '✓' : '🔗'}
                  </button>
                  <span aria-hidden className="text-warm-400">→</span>
                </div>
              </button>
            ))}
          </div>
        )}

      </main>

      {/* Onboarding — modale de bienvenue (3 slides). S'affiche automatiquement
          la 1ère fois, puis rejouable depuis le bouton "Aide" du header.
          On la masque tant que la modale CGU (plus prioritaire) est ouverte. */}
      <OnboardingModal open={!welcomeSeen && !needsTermsAcceptance} onClose={markWelcomeSeen} />

      {/* CGU — modale BLOQUANTE si jamais accepté ou version obsolète. */}
      <AcceptTermsModal open={needsTermsAcceptance} onAccepted={() => termsQuery.refetch()} />
    </div>
  )
}

/* ============================================================
   Sous-composant : KpiTile
   ============================================================ */
interface KpiTileProps {
  label: string
  value: number | string
  hint?: string
  accent?: 'default' | 'brand'
}

function KpiTile({ label, value, hint, accent = 'default' }: KpiTileProps) {
  return (
    <div
      className={
        accent === 'brand'
          ? 'bg-airmess-yellow text-ink rounded-lg p-4 md:p-5'
          : 'bg-off-white border border-warm-200 rounded-lg p-4 md:p-5'
      }
    >
      <p className="text-eyebrow uppercase text-warm-600">{label}</p>
      {/* Taille responsive : sur mobile/md plus modeste pour absorber les
          longs nombres (ex: CA "1 500 000"). Sur lg+ on remonte en display-2. */}
      <p className="text-h1 lg:text-display-2 text-ink mt-1 tabular-nums leading-none truncate">
        {value}
      </p>
      {hint && <p className="text-caption text-warm-500 mt-1.5 truncate">{hint}</p>}
    </div>
  )
}
