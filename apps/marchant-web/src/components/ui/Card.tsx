import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/cn'

type Variant = 'default' | 'elevated' | 'dark' | 'signature'

interface Props extends HTMLAttributes<HTMLDivElement> {
  variant?: Variant
  /** Padding interne. Par défaut `md` (24px). */
  padding?: 'none' | 'sm' | 'md' | 'lg'
  children: ReactNode
}

const VARIANT_CLASSES: Record<Variant, string> = {
  /** Card standard sur fond cream */
  default: 'bg-off-white border border-warm-200 shadow-xs rounded-lg',
  /** Card avec ombre plus marquée (KPIs, focus) */
  elevated: 'bg-off-white border border-warm-100 shadow-md rounded-xl',
  /** Card sombre (sections noires comme sur le site de réf) */
  dark: 'bg-airmess-dark text-cream shadow-md rounded-xl',
  /** Card "signature" — radius 2xl (28px), une seule par écran max */
  signature: 'bg-off-white border border-warm-200 shadow-md rounded-2xl',
}

const PADDING_CLASSES: Record<NonNullable<Props['padding']>, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
}

/**
 * Card Air Mess — conteneur unifié pour tableaux, formulaires, sections.
 *
 * Variants :
 * - `default` : la plus courante (listes, info secondaire)
 * - `elevated` : pour les blocs importants (KPI cards, wallet card)
 * - `dark` : sections sombres style site de réf (ex: "On livre. On encaisse.")
 * - `signature` : 1 par écran, radius 2xl pour créer un point de focus
 */
export default function Card({
  variant = 'default',
  padding = 'md',
  className,
  children,
  ...rest
}: Props) {
  return (
    <div
      className={cn(VARIANT_CLASSES[variant], PADDING_CLASSES[padding], className)}
      {...rest}
    >
      {children}
    </div>
  )
}
