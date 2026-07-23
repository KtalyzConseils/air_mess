import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  searchPlaces,
  fetchPlaceDetails,
  type PlaceDetails,
  type PlaceSuggestion,
} from '../../api/places'
import { SearchIcon, MapPinIcon } from '../ui/icons'

interface Props {
  /** Appelée avec les infos du lieu choisi (lat/lng/adresse/quartier/ville). */
  onSelect: (place: PlaceDetails) => void
  /** Placeholder au repos. */
  placeholder?: string
  /** Libellé du pin actif — affiché en badge pour rappeler A ou B. */
  activePinLabel?: string
  /** Force à remonter à zéro (ex : le parent a switché de pin A ↔ B). */
  resetKey?: string | number
}

/**
 * Barre de recherche façon Google Maps : autocomplete débouncée qui interroge
 * notre proxy Laravel, dropdown de suggestions clickables + navigation clavier,
 * puis à la sélection récupère les détails (lat/lng) et transmet au parent.
 *
 * Session token : un même token stable pendant toute la saisie fait bénéficier
 * la paire (autocomplete + details) du tarif "Details Session" de Google, bien
 * moins cher que 2 appels facturés séparément. On régénère après chaque select.
 */
export default function PlaceSearchInput({
  onSelect,
  placeholder,
  activePinLabel,
  resetKey,
}: Props) {
  const { t, i18n } = useTranslation()
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const sessionIdRef = useRef<string>(generateSessionId())

  // Reset local quand le parent le demande (ex : switch pin A ↔ B).
  useEffect(() => {
    setQuery('')
    setDebounced('')
    setOpen(false)
    setError(null)
  }, [resetKey])

  // Debounce 300ms — évite d'appeler notre proxy à chaque frappe.
  useEffect(() => {
    const trimmed = query.trim()
    if (trimmed.length < 2) {
      setDebounced('')
      return
    }
    const timer = setTimeout(() => setDebounced(trimmed), 300)
    return () => clearTimeout(timer)
  }, [query])

  const language = useMemo(() => i18n.language?.slice(0, 2) || 'fr', [i18n.language])

  const { data: suggestions = [], isFetching } = useQuery<PlaceSuggestion[]>({
    queryKey: ['places-search', debounced, language],
    queryFn: () => searchPlaces(debounced, sessionIdRef.current, language),
    enabled: debounced.length >= 2,
    staleTime: 5 * 60 * 1000,
  })

  // Clic hors du composant → ferme la dropdown.
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  async function handleSelect(place: PlaceSuggestion) {
    setError(null)
    setLoadingDetail(true)
    try {
      const details = await fetchPlaceDetails(place.place_id, sessionIdRef.current, language)
      onSelect(details)
      setQuery(place.main_text || place.description)
      setOpen(false)
      // Nouvelle session token pour la prochaine recherche : Google exige un token
      // unique par (autocomplete session + 1 details). Le réutiliser rendrait
      // les factures suivantes facturées comme sessions indépendantes.
      sessionIdRef.current = generateSessionId()
    } catch (e: unknown) {
      const message =
        e instanceof Error && 'response' in e
          ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined
      setError(message ?? t('courses.new.placeSearch.detailsError'))
    } finally {
      setLoadingDetail(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight((h) => Math.min(h + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((h) => Math.max(h - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const item = suggestions[highlight]
      if (item) void handleSelect(item)
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const showDropdown =
    open && (isFetching || suggestions.length > 0 || (debounced.length >= 2 && !isFetching))

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center gap-2 border border-warm-300 rounded-md px-3 py-2 bg-off-white transition-all duration-200 focus-within:border-airmess-yellow focus-within:shadow-glow-yellow">
        <span className="text-warm-500 shrink-0">
          <SearchIcon size={16} />
        </span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
            setHighlight(0)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder ?? t('courses.new.placeSearch.placeholder')}
          className="flex-1 text-body-s bg-transparent focus:outline-none placeholder:text-warm-400"
          autoComplete="off"
        />
        {activePinLabel && (
          <span className="text-caption bg-warm-100 text-warm-600 rounded-md px-1.5 py-0.5 font-semibold shrink-0">
            {activePinLabel}
          </span>
        )}
        {(isFetching || loadingDetail) && (
          <span className="w-3.5 h-3.5 border-2 border-warm-300 border-t-airmess-yellow rounded-full animate-spin shrink-0" />
        )}
      </div>

      {error && (
        <div className="mt-1.5 bg-danger-bg border border-airmess-red/30 text-airmess-red px-3 py-2 rounded-md text-caption">
          {error}
        </div>
      )}

      {showDropdown && (
        <ul
          role="listbox"
          // z-[1000] indispensable : Leaflet monte ses .leaflet-pane à z-index 400-700.
          // Sans ça, la dropdown passe DERRIÈRE la carte quand elle dépasse en dessous.
          className="absolute z-[1000] mt-1 w-full bg-off-white border border-warm-200 rounded-lg shadow-lg max-h-72 overflow-y-auto"
        >
          {isFetching && suggestions.length === 0 && (
            <li className="px-3 py-2.5 text-caption text-warm-500">
              {t('courses.new.placeSearch.searching')}
            </li>
          )}
          {!isFetching && suggestions.length === 0 && debounced.length >= 2 && (
            <li className="px-3 py-2.5 text-caption text-warm-500">
              {t('courses.new.placeSearch.noResults')}
            </li>
          )}
          {suggestions.map((s, idx) => (
            <li
              key={s.place_id}
              role="option"
              aria-selected={idx === highlight}
            >
              <button
                type="button"
                onMouseEnter={() => setHighlight(idx)}
                onClick={() => void handleSelect(s)}
                className={[
                  'w-full text-left px-3 py-2.5 flex items-start gap-2 transition-colors',
                  idx === highlight ? 'bg-warm-100' : 'hover:bg-warm-100/60',
                ].join(' ')}
              >
                <span className="text-warm-500 mt-0.5 shrink-0">
                  <MapPinIcon size={14} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-body-s font-semibold text-ink truncate">
                    {s.main_text}
                  </span>
                  {s.secondary && (
                    <span className="block text-caption text-warm-500 truncate">
                      {s.secondary}
                    </span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/**
 * UUID v4 pour le sessiontoken Places (32 hex + tirets, format valide côté Google).
 * On évite crypto.randomUUID en fallback : Safari <15 le refuse et l'app tourne encore
 * sur des vieux Android web view chez certains marchands.
 */
function generateSessionId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  const rand = () => Math.floor(Math.random() * 0xffff).toString(16).padStart(4, '0')
  return `${rand()}${rand()}-${rand()}-${rand()}-${rand()}-${rand()}${rand()}${rand()}`
}
