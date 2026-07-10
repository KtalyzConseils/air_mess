import { useEffect, useLayoutEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import Button from '../ui/Button'
import { CloseIcon, ArrowRightIcon } from '../ui/icons'

export interface CoachStep {
  /** Sélecteur CSS de l'élément à mettre en avant (ex. `[data-onboarding-id="urgency"]`). */
  targetSelector: string
  /** Titre court affiché en gras dans la bulle. */
  title: string
  /** Corps du texte — 1 à 2 phrases. */
  body: string
}

interface Props {
  open: boolean
  steps: CoachStep[]
  onClose: () => void
  /** Appelé quand l'utilisateur atteint la fin (dernier "OK") — persiste le fait qu'ils ont vu le guide. */
  onFinish: () => void
}

interface Rect {
  top: number
  left: number
  width: number
  height: number
}

const PADDING = 8 // px de respiration autour de la cible dans le spotlight
const BUBBLE_WIDTH = 320
const BUBBLE_GAP = 12

/**
 * Coach-mark séquentiel — parcourt des cibles CSS, spotlight + bulle explicative.
 *
 * Le spotlight est fait via un box-shadow massif (`0 0 0 9999px`) sur un rect
 * positionné sur la cible : tout ce qui est en dehors de ce rect est assombri,
 * la cible reste en clair avec un liseré jaune. Zéro dépendance externe.
 */
export default function Coachmark({ open, steps, onClose, onFinish }: Props) {
  const { t } = useTranslation()
  const [step, setStep] = useState(0)
  const [rect, setRect] = useState<Rect | null>(null)

  useEffect(() => {
    if (open) setStep(0)
  }, [open])

  const current = steps[step]
  const isLast = step === steps.length - 1

  // Positionne le spotlight + la bulle sur la cible à chaque changement d'étape,
  // et re-positionne à chaque scroll/resize pour rester collé.
  useLayoutEffect(() => {
    if (!open || !current) return

    let raf = 0

    function measure() {
      const el = document.querySelector(current.targetSelector) as HTMLElement | null
      if (!el) {
        setRect(null)
        return
      }
      const r = el.getBoundingClientRect()
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height })
    }

    // Scroll la cible dans le viewport avant de mesurer, puis mesure à chaque frame
    // pendant le scroll (bref, quelques frames) pour capter la position finale.
    const el = document.querySelector(current.targetSelector) as HTMLElement | null
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })

    let start = performance.now()
    function loop(now: number) {
      measure()
      if (now - start < 600) {
        raf = requestAnimationFrame(loop)
      }
    }
    raf = requestAnimationFrame(loop)

    const onResize = () => measure()
    window.addEventListener('resize', onResize)
    window.addEventListener('scroll', onResize, true)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('scroll', onResize, true)
    }
  }, [open, current])

  // Touches clavier — Escape ferme, flèches naviguent
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight' && !isLast) setStep((s) => s + 1)
      if (e.key === 'ArrowLeft' && step > 0) setStep((s) => s - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, isLast, step, onClose])

  if (!open || !current) return null

  function handleNext() {
    if (isLast) {
      onFinish()
      onClose()
    } else {
      setStep((s) => s + 1)
    }
  }

  // Position de la bulle : sous la cible si assez de place, sinon au-dessus.
  const viewportH = typeof window !== 'undefined' ? window.innerHeight : 0
  const viewportW = typeof window !== 'undefined' ? window.innerWidth : 0

  let bubbleTop = 0
  let bubbleLeft = 0
  let bubblePlacement: 'top' | 'bottom' = 'bottom'

  if (rect) {
    const spaceBelow = viewportH - (rect.top + rect.height)
    const spaceAbove = rect.top
    bubblePlacement = spaceBelow > 220 || spaceBelow > spaceAbove ? 'bottom' : 'top'

    bubbleTop = bubblePlacement === 'bottom' ? rect.top + rect.height + BUBBLE_GAP : rect.top - BUBBLE_GAP
    bubbleLeft = Math.max(
      12,
      Math.min(viewportW - BUBBLE_WIDTH - 12, rect.left + rect.width / 2 - BUBBLE_WIDTH / 2),
    )
  }

  return createPortal(
    <>
      {/* Overlay assombri partout SAUF la cible — cliquable pour fermer */}
      {rect ? (
        <div
          onClick={onClose}
          style={{
            position: 'fixed',
            top: rect.top - PADDING,
            left: rect.left - PADDING,
            width: rect.width + PADDING * 2,
            height: rect.height + PADDING * 2,
            boxShadow: '0 0 0 9999px rgba(20, 18, 15, 0.65)',
            borderRadius: 12,
            outline: '2px solid var(--color-airmess-yellow, #f9c22b)',
            outlineOffset: 0,
            zIndex: 60,
            pointerEvents: 'auto',
            transition: 'top 200ms ease, left 200ms ease, width 200ms ease, height 200ms ease',
          }}
          aria-hidden="true"
        />
      ) : (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-ink/70 z-[60]"
          aria-hidden="true"
        />
      )}

      {/* Bulle explicative */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="coach-title"
        style={{
          position: 'fixed',
          top: bubbleTop,
          left: bubbleLeft,
          width: BUBBLE_WIDTH,
          transform: bubblePlacement === 'top' ? 'translateY(-100%)' : undefined,
          zIndex: 61,
        }}
        className="bg-off-white border border-warm-200 rounded-xl shadow-lg p-4"
      >
        <div className="flex items-start justify-between gap-3 mb-2">
          <p className="text-caption uppercase tracking-widest font-bold text-airmess-red">
            {t('onboarding.tipsBadge', { current: step + 1, total: steps.length })}
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="text-warm-500 hover:text-ink"
          >
            <CloseIcon size={16} />
          </button>
        </div>

        <h3 id="coach-title" className="text-h3 text-ink font-bold leading-tight mb-1">
          {current.title}
        </h3>
        <p className="text-body-s text-warm-600 leading-relaxed mb-4">{current.body}</p>

        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onClose}
            className="text-caption text-warm-500 hover:text-ink transition-colors"
          >
            {t('onboarding.skip')}
          </button>
          <Button
            variant="primary"
            size="sm"
            pill
            onClick={handleNext}
            rightIcon={!isLast ? <ArrowRightIcon size={12} /> : undefined}
          >
            {isLast ? t('onboarding.tipsDone') : t('common.next')}
          </Button>
        </div>
      </div>
    </>,
    document.body,
  )
}
