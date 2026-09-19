import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

interface Props {
  number: number | string
  label?: ReactNode
  className?: string
}

export default function SectionMarker({ number, label, className }: Props) {
  const display = typeof number === 'number' ? String(number).padStart(2, '0') : number

  return (
    <div className={cn('inline-flex items-center gap-3', className)}>
      <span className={cn('inline-flex items-center justify-center', 'h-7 w-7 rounded-full', 'bg-airmess-red text-cream', 'text-caption font-bold tabular-nums')} aria-hidden="true">
        {display}
      </span>
      {label && <span className="text-eyebrow text-warm-600 uppercase">{label}</span>}
    </div>
  )
}