import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import AppHeader from '../components/AppHeader'
import AddressFormModal from '../components/AddressFormModal'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Highlight from '../components/Highlight'
import PageEyebrow from '../components/ui/PageEyebrow'
import { cn } from '../lib/cn'
import { fetchAddresses, deleteAddress, type Address } from '../api/addresses'

type View = 'cards' | 'list'
const VIEW_STORAGE_KEY = 'airmess.addresses.view'

export default function AddressesPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Address | null>(null)
  const [search, setSearch] = useState('')

  // Vue cartes/liste persistée — comme l'explorateur Windows
  const [view, setView] = useState<View>(() => {
    const saved = localStorage.getItem(VIEW_STORAGE_KEY)
    return saved === 'list' ? 'list' : 'cards'
  })
  useEffect(() => {
    localStorage.setItem(VIEW_STORAGE_KEY, view)
  }, [view])

  const { data: addresses = [], isLoading } = useQuery({
    queryKey: ['addresses'],
    queryFn: fetchAddresses,
  })

  const deleteMutation = useMutation({
    mutationFn: deleteAddress,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['addresses'] }),
  })

  // Filtrage par search — sur tous les champs textuels utiles
  const filtered = useMemo(() => {
    if (!search.trim()) return addresses
    const q = search.trim().toLowerCase()
    return addresses.filter(
      (a) =>
        (a.label ?? '').toLowerCase().includes(q) ||
        a.recipient_name.toLowerCase().includes(q) ||
        a.recipient_phone.includes(q) ||
        a.quartier.toLowerCase().includes(q) ||
        a.city.toLowerCase().includes(q),
    )
  }, [addresses, search])

  function openCreate() {
    setEditing(null)
    setModalOpen(true)
  }

  function openEdit(addr: Address) {
    setEditing(addr)
    setModalOpen(true)
  }

  function confirmDelete(addr: Address) {
    if (confirm(t('addresses.deletePrompt', { name: addr.recipient_name }))) {
      deleteMutation.mutate(addr.id)
    }
  }

  return (
    <div className="min-h-screen bg-cream">
      <AppHeader />

      <main className="max-w-5xl mx-auto px-4 md:px-6 py-8 md:py-12">
        <PageEyebrow label={t('addresses.eyebrow')} className="mb-4" />
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-h1 md:text-display-2 text-ink leading-tight">
              {t('addresses.titleStart')} <Highlight>{t('addresses.titleHighlight')}</Highlight> {t('addresses.titleEndRecurring')}
            </h1>
            <p className="text-body-l text-warm-500 mt-3">
              {t('addresses.subtitleReuse')}
            </p>
          </div>
          <Button variant="primary" size="lg" pill onClick={openCreate}>
            {t('addresses.addNew')}
          </Button>
        </div>

        {/* ============================================================
            BARRE D'OUTILS — search + toggle vue (style Windows Explorer)
            ============================================================ */}
        {addresses.length > 0 && (
          <div className="flex flex-col md:flex-row md:items-center gap-3 mb-5">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-400" aria-hidden>
                🔍
              </span>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('addresses.searchPlaceholder')}
                className="w-full pl-10 pr-3 py-2.5 bg-off-white border border-warm-300 rounded-md text-body text-ink placeholder:text-warm-400 transition-all duration-200 focus:outline-none focus:border-airmess-yellow focus:shadow-glow-yellow"
              />
            </div>

            {/* Toggle vue cartes / liste — caché sur mobile (liste illisible) */}
            <div
              className="hidden md:inline-flex items-center bg-off-white border border-warm-300 rounded-md p-0.5"
              role="group"
              aria-label={t('addresses.viewMode')}
            >
              <ViewToggleButton
                active={view === 'cards'}
                onClick={() => setView('cards')}
                label={t('addresses.viewCards')}
              >
                {/* Icône grille 2×2 */}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                  <rect x="14" y="14" width="7" height="7" rx="1" />
                </svg>
              </ViewToggleButton>
              <ViewToggleButton
                active={view === 'list'}
                onClick={() => setView('list')}
                label={t('addresses.viewList')}
              >
                {/* Icône lignes */}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="8" y1="6" x2="21" y2="6" />
                  <line x1="8" y1="12" x2="21" y2="12" />
                  <line x1="8" y1="18" x2="21" y2="18" />
                  <line x1="3" y1="6" x2="3.01" y2="6" />
                  <line x1="3" y1="12" x2="3.01" y2="12" />
                  <line x1="3" y1="18" x2="3.01" y2="18" />
                </svg>
              </ViewToggleButton>
            </div>

            {/* Compteur */}
            <p className="text-caption text-warm-500 shrink-0 tabular-nums md:ml-auto">
              {filtered.length}
              {filtered.length !== addresses.length && (
                <span className="text-warm-400"> / {addresses.length}</span>
              )}{' '}
              {filtered.length > 1 ? t('addresses.countOther') : t('addresses.countOne')}
            </p>
          </div>
        )}

        {/* ============================================================
            CONTENU
            ============================================================ */}
        {isLoading && (
          <Card padding="lg" className="text-center text-warm-500">{t('common.loading')}</Card>
        )}

        {!isLoading && addresses.length === 0 && (
          <Card padding="lg" className="text-center">
            <p className="text-h3 text-ink mb-2">{t('addresses.emptyTitle')}</p>
            <p className="text-body-s text-warm-500 mb-4">
              {t('addresses.emptyBody')}
            </p>
            <Button variant="primary" size="md" pill onClick={openCreate}>
              {t('addresses.firstAddress')}
            </Button>
          </Card>
        )}

        {!isLoading && addresses.length > 0 && filtered.length === 0 && (
          <Card padding="lg" className="text-center text-warm-500">
            {t('addresses.noResultsFor')} <strong className="text-ink">« {search} »</strong>.
            <button onClick={() => setSearch('')} className="ml-2 underline">
              {t('addresses.clear')}
            </button>
          </Card>
        )}

        {/* Vue CARTES — sur mobile (forcé) ou si view = cards sur desktop */}
        {filtered.length > 0 && (
          <div
            className={cn(
              view === 'cards' ? 'grid gap-3 md:grid-cols-2' : 'md:hidden grid gap-3 grid-cols-1',
            )}
          >
            {filtered.map((addr) => (
              <AddressCard
                key={addr.id}
                addr={addr}
                onEdit={() => openEdit(addr)}
                onDelete={() => confirmDelete(addr)}
              />
            ))}
          </div>
        )}

        {/* Vue LISTE — desktop uniquement, grid CSS avec actions en overlay au hover */}
        {filtered.length > 0 && view === 'list' && (
          <Card variant="default" padding="none" className="hidden md:block overflow-hidden">
            {/* Header de "table" en grid */}
            <div
              className="grid items-center px-4 py-3 bg-warm-100 border-b border-warm-200 text-eyebrow uppercase text-warm-600"
              style={{ gridTemplateColumns: '180px 1fr 140px minmax(200px,1.2fr) 80px' }}
            >
              <span>{t('addresses.headerLabel')}</span>
              <span>{t('addresses.headerRecipient')}</span>
              <span>{t('addresses.headerPhone')}</span>
              <span>{t('addresses.headerQuartier')}</span>
              <span className="text-center">{t('addresses.headerUsage')}</span>
            </div>

            {/* Lignes */}
            <ul className="divide-y divide-warm-100">
              {filtered.map((addr) => (
                <li
                  key={addr.id}
                  className="group relative hover:bg-warm-100/50 transition-colors duration-150"
                >
                  <div
                    className="grid items-center px-4 py-3 text-body-s"
                    style={{ gridTemplateColumns: '180px 1fr 140px minmax(200px,1.2fr) 80px' }}
                  >
                    <span className="font-medium text-ink truncate pr-3">
                      {addr.label || <span className="text-warm-400 italic">—</span>}
                    </span>
                    <span className="text-ink truncate pr-3">{addr.recipient_name}</span>
                    <span className="font-mono text-caption text-warm-600 truncate pr-3">
                      {addr.recipient_phone}
                    </span>
                    <span className="text-warm-600 truncate pr-3">
                      {addr.quartier}, {addr.city}
                    </span>
                    <span className="text-center">
                      {addr.usage_count > 0 ? (
                        <span className="inline-flex items-center justify-center min-w-[28px] h-6 px-2 rounded-full bg-airmess-yellow/20 text-ink text-caption font-bold tabular-nums">
                          ×{addr.usage_count}
                        </span>
                      ) : (
                        <span className="text-warm-400">—</span>
                      )}
                    </span>
                  </div>

                  {/* Overlay actions — flottant à droite au hover, fade depuis la droite
                      avec un gradient qui mange le contenu derrière */}
                  <div
                    className="
                      absolute inset-y-0 right-0 pl-12 pr-4 flex items-center gap-2
                      bg-linear-to-l from-warm-100 from-30% via-warm-100/95 to-transparent
                      opacity-0 translate-x-2 pointer-events-none
                      group-hover:opacity-100 group-hover:translate-x-0 group-hover:pointer-events-auto
                      focus-within:opacity-100 focus-within:translate-x-0 focus-within:pointer-events-auto
                      transition-all duration-200 ease-out
                    "
                  >
                    <button
                      onClick={() => openEdit(addr)}
                      className="px-3 py-1.5 text-caption font-semibold text-ink bg-off-white border border-warm-300 rounded-md hover:bg-warm-100 hover:border-warm-400 shadow-xs"
                    >
                      {t('addresses.editBtn')}
                    </button>
                    <button
                      onClick={() => confirmDelete(addr)}
                      className="px-3 py-1.5 text-caption font-semibold text-airmess-red bg-off-white border border-airmess-red/30 rounded-md hover:bg-danger-bg hover:border-airmess-red/50 shadow-xs"
                    >
                      {t('addresses.deleteBtn')}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </main>

      <AddressFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editing={editing}
      />
    </div>
  )
}

/* ============================================================
   Sous-composant : ViewToggleButton
   ============================================================ */
interface ViewToggleButtonProps {
  active: boolean
  onClick: () => void
  label: string
  children: React.ReactNode
}

function ViewToggleButton({ active, onClick, label, children }: ViewToggleButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        'inline-flex items-center justify-center h-8 w-8 rounded transition-all duration-150',
        active
          ? 'bg-airmess-yellow text-ink shadow-xs'
          : 'text-warm-500 hover:text-ink hover:bg-warm-100',
      )}
    >
      {children}
    </button>
  )
}

/* ============================================================
   Sous-composant : AddressCard (vue cartes)
   ============================================================ */
interface AddressCardProps {
  addr: Address
  onEdit: () => void
  onDelete: () => void
}

function AddressCard({ addr, onEdit, onDelete }: AddressCardProps) {
  const { t } = useTranslation()
  return (
    // Padding réduit sur mobile (p-3) puis md+ revient au standard
    <div className="flex flex-col bg-off-white border border-warm-200 shadow-xs rounded-lg p-3 md:p-5">
      <div className="flex items-start justify-between gap-2 md:gap-3 mb-1.5">
        <div className="min-w-0 flex-1">
          {addr.label && (
            <p className="text-[10px] md:text-eyebrow text-warm-500 uppercase tracking-wider mb-0.5 md:mb-1 truncate">
              {addr.label}
            </p>
          )}
          {/* H3 plus petit sur mobile (text-body-l) puis text-h3 en md+ */}
          <h3 className="text-body-l md:text-h3 text-ink font-bold truncate leading-tight">
            {addr.recipient_name}
          </h3>
          <p className="text-caption md:text-body-s text-warm-500 font-mono mt-0.5">
            {addr.recipient_phone}
          </p>
        </div>
        {addr.usage_count > 0 && (
          <span className="shrink-0 inline-flex items-center justify-center min-w-[24px] md:min-w-[28px] h-5 md:h-7 px-1.5 md:px-2 rounded-full bg-airmess-yellow/20 text-ink text-[10px] md:text-caption font-bold tabular-nums">
            ×{addr.usage_count}
          </span>
        )}
      </div>

      <div className="text-caption md:text-body-s text-warm-600 mb-2 md:mb-4 flex-1">
        {addr.street && <p className="truncate">{addr.street}</p>}
        <p className="text-warm-500 truncate">
          {addr.quartier}, {addr.city}
        </p>
        {addr.landmark && (
          <p className="text-[10px] md:text-caption text-warm-500 mt-0.5 md:mt-1 italic truncate">
            📍 {addr.landmark}
          </p>
        )}
      </div>

      <div className="flex items-center justify-end gap-1 md:gap-2 pt-2 md:pt-3 border-t border-warm-100">
        <button
          type="button"
          onClick={onEdit}
          className="px-2.5 md:px-3 py-1 text-caption font-medium text-warm-600 hover:text-ink hover:bg-warm-100 rounded"
        >
          {t('addresses.edit')}
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="px-2.5 md:px-3 py-1 text-caption font-medium text-airmess-red hover:bg-danger-bg rounded"
        >
          {t('addresses.delete')}
        </button>
      </div>
    </div>
  )
}
