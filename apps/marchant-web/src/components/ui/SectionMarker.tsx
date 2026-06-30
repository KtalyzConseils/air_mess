import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

interface Props {
  /** Le numéro affiché — accepte 1 ou "01" indistinctement (auto-padding) */
  number: number | string
  /** Label en eyebrow (UPPERCASE auto) à droite du numéro */
  label?: ReactNode
  className?: string
}

/**
 * Marker de section numéroté — l'équivalent des "01 — LIVRAISON BUSINESS"
 * du site de référence.
 *
 * Usage : uniquement quand le contenu de la page EST une séquence d'étapes
 * réelles, pas comme décoration. Si tu hésites, n'utilise pas.
 *
 * Le numéro est en rouge brand sur fond cream cerclé.
 */
export default function SectionMarker({ number, label, className }: Props) {
  const display = typeof number === 'number' ? String(number).padStart(2, '0') : number

  return (
    <div className={cn('inline-flex items-center gap-3', className)}>
      <span
        className={cn(
          'inline-flex items-center justify-center',
          'h-7 w-7 rounded-full',
          'bg-airmess-red text-cream',
          'text-caption font-bold tabular-nums',
        )}
        aria-hidden="true"
      >
        {display}
      </span>
      {label && (
        <span className="text-eyebrow text-warm-600 uppercase">
          {label}
        </span>
      )}
    </div>
  )
}
