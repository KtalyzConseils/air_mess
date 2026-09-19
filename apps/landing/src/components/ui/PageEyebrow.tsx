import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

interface Props {
  label: ReactNode
  className?: string
  accent?: 'yellow' | 'red'
}

export default function PageEyebrow({ label, className, accent = 'yellow' }: Props) {
  const dotColor = accent === 'red' ? 'bg-airmess-red' : 'bg-airmess-yellow'

  return (
    <div className={cn('inline-flex items-center gap-2.5', className)}>
      <span aria-hidden="true" className={cn('h-2.5 w-2.5 rotate-45', dotColor)} />
      <span className="text-eyebrow text-warm-600 uppercase">{label}</span>
    </div>
  )
}