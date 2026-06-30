import { useEffect, useMemo, useRef, useState, type ComponentType } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { CloseIcon, MenuIcon, type IconProps } from './icons'

/* ============================================================
   QuickNav — FAB radial déplaçable, réutilisable
   ------------------------------------------------------------
   Consommé par AdminQuickNav (admin) et ClientQuickNav (marchant/particulier).
   - Drag avec seuil (5px / 250ms) pour distinguer du clic
   - Position persistée dans localStorage (clé personnalisée par contexte)
   - Le demi-cercle s'ouvre vers le côté avec le plus d'espace
   - Items + active state pilotés par les props
   ============================================================ */

const FAB_SIZE = 56
const ITEM_SIZE = 44
const DRAG_THRESHOLD_PX = 5
const DRAG_THRESHOLD_MS = 250
const EDGE_MARGIN = 12

export interface QuickNavItem {
  to: string
  label: string
  Icon: ComponentType<IconProps>
  badge?: number
}

interface QuickNavProps {
  items: QuickNavItem[]
  /** Clé localStorage pour persister la position. Doit être unique par contexte. */
  positionKey: string
}

interface Position {
  x: number
  y: number
}

/** Rayon adapté au nombre d'items — espace ~16px entre 2 items. */
function radiusForItems(n: number): number {
  return Math.max(110, Math.min(190, Math.round(60 + n * 13)))
}

function loadPosition(key: string): Position | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function savePosition(key: string, p: Position) {
  try {
    window.localStorage.setItem(key, JSON.stringify(p))
  } catch {
    /* quota / mode privé */
  }
}

function clampToViewport(p: Position): Position {
  const w = typeof window !== 'undefined' ? window.innerWidth : 1024
  const h = typeof window !== 'undefined' ? window.innerHeight : 768
  return {
    x: Math.max(EDGE_MARGIN, Math.min(w - FAB_SIZE - EDGE_MARGIN, p.x)),
    y: Math.max(EDGE_MARGIN, Math.min(h - FAB_SIZE - EDGE_MARGIN, p.y)),
  }
}

function defaultPosition(): Position {
  if (typeof window === 'undefined') return { x: 24, y: 24 }
  return {
    x: window.innerWidth - FAB_SIZE - 24,
    y: window.innerHeight - FAB_SIZE - 24,
  }
}

export default function QuickNav({ items, positionKey }: QuickNavProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const RADIUS = useMemo(() => radiusForItems(items.length), [items.length])

  const [position, setPosition] = useState<Position>(
    () => loadPosition(positionKey) ?? defaultPosition(),
  )
  const [isOpen, setIsOpen] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  const dragStateRef = useRef<{
    startX: number
    startY: number
    startTime: number
    fabStartX: number
    fabStartY: number
    moved: boolean
  } | null>(null)

  // Re-clamp au resize (la fenêtre rétrécit → on peut sortir du viewport)
  useEffect(() => {
    function onResize() {
      setPosition((p) => clampToViewport(p))
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Escape ferme le menu
  useEffect(() => {
    if (!isOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen])

  // Côté d'ouverture de l'arc — côté avec le plus d'espace
  const arcSide: 'left' | 'right' = useMemo(() => {
    const viewportW = typeof window !== 'undefined' ? window.innerWidth : 1024
    return position.x + FAB_SIZE / 2 > viewportW / 2 ? 'left' : 'right'
  }, [position.x])

  function handlePointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    if (isOpen) return
    e.currentTarget.setPointerCapture(e.pointerId)
    dragStateRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startTime: performance.now(),
      fabStartX: position.x,
      fabStartY: position.y,
      moved: false,
    }
  }

  function handlePointerMove(e: React.PointerEvent<HTMLButtonElement>) {
    const s = dragStateRef.current
    if (!s) return
    const dx = e.clientX - s.startX
    const dy = e.clientY - s.startY

    if (!s.moved && Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) {
      s.moved = true
      setIsDragging(true)
    }
    if (s.moved) {
      setPosition(clampToViewport({ x: s.fabStartX + dx, y: s.fabStartY + dy }))
    }
  }

  function handlePointerUp(e: React.PointerEvent<HTMLButtonElement>) {
    const s = dragStateRef.current
    dragStateRef.current = null
    e.currentTarget.releasePointerCapture(e.pointerId)

    if (!s) return
    const elapsed = performance.now() - s.startTime

    if (s.moved) {
      savePosition(positionKey, position)
      setTimeout(() => setIsDragging(false), 0)
    } else if (elapsed < DRAG_THRESHOLD_MS) {
      setIsOpen((v) => !v)
    }
  }

  function getItemOffset(index: number, total: number): { x: number; y: number } {
    const step = 180 / total
    const baseAngle = -90 + (index + 0.5) * step
    const angle = arcSide === 'left' ? 180 - baseAngle : baseAngle
    const rad = (angle * Math.PI) / 180
    return {
      x: RADIUS * Math.cos(rad),
      y: RADIUS * Math.sin(rad),
    }
  }

  if (items.length === 0) return null

  return (
    <>
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-40 bg-airmess-dark/30 backdrop-blur-[2px] transition-opacity duration-200"
          aria-hidden
        />
      )}

      {/* Items radiaux */}
      <div
        className="fixed z-50 pointer-events-none"
        style={{
          left: position.x + FAB_SIZE / 2 - ITEM_SIZE / 2,
          top: position.y + FAB_SIZE / 2 - ITEM_SIZE / 2,
        }}
        aria-hidden={!isOpen}
      >
        {items.map((item, i) => {
          const offset = getItemOffset(i, items.length)
          const isActive = location.pathname.startsWith(item.to)
          return (
            <button
              key={item.to}
              onClick={() => {
                navigate(item.to)
                setIsOpen(false)
              }}
              aria-label={item.label}
              tabIndex={isOpen ? 0 : -1}
              className={[
                'group absolute top-0 left-0 flex items-center justify-center rounded-full shadow-lg',
                'transition-all ease-out',
                isOpen ? 'pointer-events-auto' : 'pointer-events-none',
                isActive
                  ? 'bg-airmess-yellow text-ink ring-2 ring-airmess-yellow/40 ring-offset-2 ring-offset-airmess-dark/30'
                  : 'bg-airmess-dark text-white hover:bg-airmess-red',
              ].join(' ')}
              style={{
                width: ITEM_SIZE,
                height: ITEM_SIZE,
                transform: isOpen
                  ? `translate(${offset.x}px, ${offset.y}px) scale(1)`
                  : 'translate(0, 0) scale(0.4)',
                opacity: isOpen ? 1 : 0,
                transitionDuration: '260ms',
                transitionDelay: isOpen ? `${20 + i * 30}ms` : `${i * 20}ms`,
              }}
            >
              <item.Icon size={20} />
              {item.badge !== undefined && item.badge > 0 && (
                <span className="absolute -top-1 -right-1 bg-airmess-red text-white text-[9px] leading-none rounded-full px-1 py-0.5 font-bold min-w-[14px] text-center border border-white">
                  {item.badge > 9 ? '9+' : item.badge}
                </span>
              )}
              <span
                className={[
                  'absolute whitespace-nowrap text-caption font-semibold px-2 py-1 rounded-md',
                  'bg-airmess-dark text-white shadow-lg pointer-events-none z-10',
                  'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100',
                  'transition-opacity duration-150',
                  arcSide === 'right' ? 'left-full ml-2' : 'right-full mr-2',
                ].join(' ')}
                style={{ top: '50%', transform: 'translateY(-50%)' }}
              >
                {item.label}
              </span>
            </button>
          )
        })}
      </div>

      {/* FAB */}
      <button
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        aria-label={isOpen ? 'Fermer la navigation rapide' : 'Ouvrir la navigation rapide'}
        aria-expanded={isOpen}
        className={[
          'fixed z-50 flex items-center justify-center rounded-full shadow-xl select-none',
          'transition-colors duration-200',
          isDragging ? 'cursor-grabbing scale-110' : 'cursor-grab hover:shadow-2xl',
          isOpen ? 'bg-airmess-red text-white' : 'bg-airmess-yellow text-ink hover:bg-airmess-yellow/90',
        ].join(' ')}
        style={{
          width: FAB_SIZE,
          height: FAB_SIZE,
          left: position.x,
          top: position.y,
          touchAction: 'none',
          transition: isDragging
            ? 'box-shadow 150ms'
            : 'transform 200ms, background-color 200ms, box-shadow 200ms',
        }}
      >
        {isOpen ? <CloseIcon size={22} /> : <MenuIcon size={22} />}
      </button>
    </>
  )
}
