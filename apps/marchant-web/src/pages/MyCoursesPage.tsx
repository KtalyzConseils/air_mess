import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import Highlight from '../components/Highlight'
import PageEyebrow from '../components/ui/PageEyebrow'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import StatusBadge from '../components/StatusBadge'
import { fetchCourses, type Course } from '../api/courses'
import { cn } from '../lib/cn'

type StatusGroup = 'all' | 'pending' | 'in_progress' | 'delivered' | 'cancelled'

const GROUP_LABELS: Record<StatusGroup, string> = {
  all: 'Toutes',
  pending: 'En attente',
  in_progress: 'En cours',
  delivered: 'Livrées',
  cancelled: 'Annulées/Échec',
}

const GROUP_STATUSES: Record<StatusGroup, string[]> = {
  all: [],
  pending: ['pending_preparation', 'awaiting_assignment'],
  in_progress: ['assigned', 'driver_to_pickup', 'at_pickup', 'picked_up', 'at_dropoff'],
  delivered: ['delivered'],
  cancelled: ['cancelled', 'failed', 'disputed'],
}

const PER_PAGE = 20

export default function MyCoursesPage() {
  const navigate = useNavigate()
  const [group, setGroup] = useState<StatusGroup>('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [copiedId, setCopiedId] = useState<number | null>(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ['courses', { per_page: 100 }],
    queryFn: () => fetchCourses({ per_page: 100 }),
  })

  // Filtrage côté client — l'API ne supporte qu'un seul status à la fois,
  // mais nos groupes en contiennent plusieurs. On filtre tout en JS.
  const filtered = useMemo(() => {
    const all: Course[] = data?.data ?? []
    let result = all

    if (group !== 'all') {
      const statuses = GROUP_STATUSES[group]
      result = result.filter((c) => statuses.includes(c.status))
    }

    if (search.trim().length > 0) {
      const q = search.trim().toLowerCase()
      result = result.filter(
        (c) =>
          c.reference.toLowerCase().includes(q) ||
          c.destination_name.toLowerCase().includes(q) ||
          c.destination_quartier.toLowerCase().includes(q) ||
          c.destination_phone.includes(q),
      )
    }
    return result
  }, [data, group, search])

  // Stats par groupe pour les badges sur les pills
  const counts = useMemo(() => {
    const all: Course[] = data?.data ?? []
    return {
      all: all.length,
      pending: all.filter((c) => GROUP_STATUSES.pending.includes(c.status)).length,
      in_progress: all.filter((c) => GROUP_STATUSES.in_progress.includes(c.status)).length,
      delivered: all.filter((c) => GROUP_STATUSES.delivered.includes(c.status)).length,
      cancelled: all.filter((c) => GROUP_STATUSES.cancelled.includes(c.status)).length,
    } as Record<StatusGroup, number>
  }, [data])

  // Pagination locale
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const pageItems = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  // Reset page si on change de filtre et qu'on tombe hors limite
  function switchGroup(next: StatusGroup) {
    setGroup(next)
    setPage(1)
  }

  async function copyTrackingLink(course: Course, e: React.MouseEvent) {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/t/${course.tracking_token}`)
      setCopiedId(course.id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      alert('Impossible de copier.')
    }
  }

  return (
    <div className="min-h-screen bg-cream">
      <AppHeader />

      <main className="max-w-6xl mx-auto px-4 md:px-6 py-8 md:py-12">
        {/* ============================================================
            HERO
            ============================================================ */}
        <PageEyebrow label="Mes courses" className="mb-4" />
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10">
          <div>
            <h1 className="text-h1 md:text-display-2 text-ink leading-tight">
              Toutes vos <Highlight>courses</Highlight>.
            </h1>
            <p className="text-body-l text-warm-500 mt-3">
              Historique complet et filtrable. Cliquez sur une course pour voir le détail.
            </p>
          </div>
          <Link to="/courses/new" className="shrink-0">
            <Button variant="primary" size="lg" pill rightIcon={<span aria-hidden>→</span>}>
              + Nouvelle course
            </Button>
          </Link>
        </div>

        {/* ============================================================
            FILTRES — pills statut + search
            ============================================================ */}
        <div className="flex flex-col gap-3 mb-6">
          {/* Pills statut */}
          <div className="flex flex-wrap gap-2">
            {(Object.keys(GROUP_LABELS) as StatusGroup[]).map((g) => {
              const isActive = group === g
              return (
                <button
                  key={g}
                  onClick={() => switchGroup(g)}
                  className={cn(
                    'inline-flex items-center gap-2 px-4 py-2 rounded-full text-body-s font-medium transition-all duration-200',
                    isActive
                      ? 'bg-airmess-dark text-cream shadow-sm'
                      : 'bg-off-white text-warm-600 border border-warm-200 hover:border-warm-400',
                  )}
                >
                  {GROUP_LABELS[g]}
                  <span
                    className={cn(
                      'inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold tabular-nums',
                      isActive ? 'bg-airmess-yellow text-ink' : 'bg-warm-100 text-warm-600',
                    )}
                  >
                    {counts[g]}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Search */}
          <div className="relative max-w-md">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-400" aria-hidden>
              🔍
            </span>
            <input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              placeholder="Référence, destinataire, quartier, téléphone…"
              className="w-full pl-10 pr-3 py-2.5 bg-off-white border border-warm-300 rounded-md text-body text-ink placeholder:text-warm-400 transition-all duration-200 focus:outline-none focus:border-airmess-yellow focus:shadow-glow-yellow"
            />
          </div>
        </div>

        {/* ============================================================
            LISTE
            ============================================================ */}
        {isLoading && (
          <Card padding="lg" className="text-center text-warm-500">
            Chargement…
          </Card>
        )}

        {error && (
          <Card padding="lg" className="text-center bg-danger-bg! border-airmess-red/20! text-airmess-red">
            Erreur de chargement. Vérifie que l'API tourne.
          </Card>
        )}

        {!isLoading && !error && filtered.length === 0 && (
          <Card padding="lg" className="text-center">
            <p className="text-h3 text-ink mb-2">Aucune course trouvée.</p>
            <p className="text-body-s text-warm-500 mb-4">
              {search ? 'Modifiez votre recherche ou changez de filtre.' : 'Votre historique est vide pour ce filtre.'}
            </p>
            {!search && group === 'all' && (
              <Link to="/courses/new">
                <Button variant="primary" size="md" pill>Créer ma première course</Button>
              </Link>
            )}
          </Card>
        )}

        {!isLoading && pageItems.length > 0 && (
          <div className="space-y-3">
            {pageItems.map((c) => (
              <button
                key={c.id}
                onClick={() => navigate(`/courses/${c.id}`)}
                className="w-full text-left bg-off-white border border-warm-200 hover:border-warm-400 hover:shadow-md rounded-lg p-4 md:p-5 transition-all duration-200 flex items-center gap-4"
              >
                <div className="shrink-0">
                  <StatusBadge status={c.status} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-1 flex-wrap">
                    <span className="font-mono text-caption text-warm-500">{c.reference}</span>
                    <span className="text-caption text-warm-400">·</span>
                    <span className="text-caption text-warm-500">
                      {new Date(c.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                    </span>
                    {c.urgency === 'express' && (
                      <span className="text-[10px] uppercase font-bold tracking-wider text-airmess-red">
                        ⚡ Express
                      </span>
                    )}
                  </div>
                  <p className="text-body font-medium text-ink truncate">
                    {c.origin_quartier} → {c.destination_quartier}, {c.destination_city}
                  </p>
                  <p className="text-body-s text-warm-500 truncate mt-0.5">
                    {c.destination_name}
                    {c.driver?.user?.name && ` · ${c.driver.user.name}`}
                  </p>
                </div>
                <div className="shrink-0 hidden md:flex flex-col items-end gap-1">
                  <span className="text-body font-bold text-ink tabular-nums">
                    {c.delivery_fee?.toLocaleString('fr-FR')}
                    <span className="text-caption font-normal text-warm-500 ml-1">FCFA</span>
                  </span>
                  {c.has_collection && c.collection_amount && (
                    <span className="text-caption text-warm-500 tabular-nums">
                      Encaisse {c.collection_amount.toLocaleString('fr-FR')}
                    </span>
                  )}
                </div>
                <div className="shrink-0 flex items-center gap-1">
                  <button
                    onClick={(e) => copyTrackingLink(c, e)}
                    title="Copier le lien de suivi"
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

        {/* ============================================================
            PAGINATION
            ============================================================ */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between gap-3 mt-8 pt-6 border-t border-warm-200">
            <p className="text-body-s text-warm-500">
              {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} sur {filtered.length}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                ← Précédent
              </Button>
              <span className="text-body-s text-warm-600 tabular-nums px-2">
                {page} / {totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Suivant →
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
