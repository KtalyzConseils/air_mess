import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/cn'

type Variant = 'live' | 'success' | 'warning' | 'info' | 'danger' | 'neutral' | 'brand'
type Size = 'sm' | 'md'

interface Props extends HTMLAttributes<HTMLSpanElement> {
  variant?: Variant
  size?: Size
  /** Affiche un point coloré devant le texte (pulse si variant=live) */
  dot?: boolean
  children: ReactNode
}

const VARIANT_CLASSES: Record<Variant, { text: string; bg: string; dot: string; dotPulse?: boolean }> = {
  live: {
    text: 'text-airmess-red',
    bg: 'bg-airmess-red/10',
    dot: 'bg-airmess-red',
    dotPulse: true,
  },
  success: {
    text: 'text-success',
    bg: 'bg-success-bg',
    dot: 'bg-success',
  },
  warning: {
    text: 'text-warning',
    bg: 'bg-warning-bg',
    dot: 'bg-warning',
  },
  info: {
    text: 'text-info',
    bg: 'bg-info-bg',
    dot: 'bg-info',
  },
  danger: {
    text: 'text-airmess-red',
    bg: 'bg-danger-bg',
    dot: 'bg-airmess-red',
  },
  neutral: {
    text: 'text-warm-600',
    bg: 'bg-warm-100',
    dot: 'bg-warm-500',
  },
  brand: {
    text: 'text-ink',
    bg: 'bg-airmess-yellow',
    dot: 'bg-ink',
  },
}

const SIZE_CLASSES: Record<Size, string> = {
  sm: 'px-1.5 py-0.5 text-[10px] gap-1',
  md: 'px-2 py-1 text-caption gap-1.5',
}

/**
 * Badge Air Mess — pastille d'état (course, statut wallet, etc.)
 *
 * `variant="live"` ajoute un point rouge qui pulse — réservé aux courses
 * actuellement en cours pour signaler l'état temps réel.
 */
export default function Badge({
  variant = 'neutral',
  size = 'md',
  dot = false,
  className,
  children,
  ...rest
}: Props) {
  const v = VARIANT_CLASSES[variant]

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-sm font-medium tracking-wide uppercase',
        v.text,
        v.bg,
        SIZE_CLASSES[size],
        className,
      )}
      {...rest}
    >
      {dot && (
        <span className="relative inline-flex items-center justify-center">
          <span className={cn('h-1.5 w-1.5 rounded-full', v.dot)} />
          {v.dotPulse && (
            <span
              className={cn(
                'absolute inset-0 h-1.5 w-1.5 rounded-full animate-ping',
                v.dot,
              )}
              aria-hidden="true"
            />
          )}
        </span>
      )}
      {children}
    </span>
  )
}
