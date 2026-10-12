import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/cn'

type Variant = 'default' | 'elevated' | 'dark' | 'signature'

interface Props extends HTMLAttributes<HTMLDivElement> {
  variant?: Variant
  padding?: 'none' | 'sm' | 'md' | 'lg'
  children: ReactNode
}

const VARIANT_CLASSES: Record<Variant, string> = {
  default: 'bg-off-white border border-warm-200 shadow-xs rounded-lg',
  elevated: 'bg-off-white border border-warm-100 shadow-md rounded-xl',
  dark: 'bg-airmess-dark text-cream shadow-md rounded-xl',
  signature: 'bg-off-white border border-warm-200 shadow-md rounded-2xl',
}

const PADDING_CLASSES: Record<NonNullable<Props['padding']>, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
}

export default function Card({ variant = 'default', padding = 'md', className, children, ...rest }: Props) {
  return (
    <div className={cn(VARIANT_CLASSES[variant], PADDING_CLASSES[padding], className)} {...rest}>
      {children}
    </div>
  )
}