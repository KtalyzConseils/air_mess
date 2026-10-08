import type { ReactNode } from 'react'
import { cn } from '../lib/cn'

export type KpiAccent = 'default' | 'brand' | 'warning' | 'success'

interface Props {
  label: string
  value: string | number
  hint?: string
  /** Icône SVG décorative (le `label` porte déjà l'information). */
  icon?: ReactNode
  accent?: KpiAccent
  className?: string
}

const SHELL: Record<KpiAccent, string> = {
  default: 'bg-off-white border-warm-200',
  brand: 'bg-airmess-yellow border-airmess-yellow',
  warning: 'bg-warning-bg border-warning/30',
  success: 'bg-success-bg border-success/25',
}

const ICON_CHIP: Record<KpiAccent, string> = {
  default: 'bg-warm-100 text-warm-600',
  brand: 'bg-ink/10 text-ink',
  warning: 'bg-off-white/70 text-warning',
  success: 'bg-off-white/70 text-success',
}

const HINT_TEXT: Record<KpiAccent, string> = {
  default: 'text-warm-500',
  brand: 'text-warm-600',
  warning: 'text-warm-600',
  success: 'text-warm-600',
}

/**
 * Tuile de chiffre clé de l'espace marchand.
 *
 * Source unique de vérité pour un KPI : pas de tuile KPI ré-implémentée dans une
 * page. Le nombre est formaté ici (fr-FR) et toujours en `tabular-nums` pour que
 * les chiffres ne « bougent » pas d'un rafraîchissement à l'autre.
 *
 * `accent="brand"` (jaune) met la tuile en avant — une seule par bande de KPI
 * pour que la hiérarchie reste lisible.
 */
export default function KpiCard({ label, value, hint, icon, accent = 'default', className }: Props) {
  const isNumeric = typeof value === 'number'
  const display = isNumeric ? value.toLocaleString('fr-FR') : value
  const fullValue = isNumeric ? String(Math.trunc(value)) : value

  return (
    <div className={cn('rounded-lg border p-4 md:p-5', SHELL[accent], className)}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-eyebrow text-warm-600 uppercase">{label}</p>
        {icon && (
          <span
            aria-hidden="true"
            className={cn('shrink-0 rounded-md p-1.5', ICON_CHIP[accent])}
          >
            {icon}
          </span>
        )}
      </div>

      <p
        className="text-h2 text-ink mt-2 tabular-nums leading-none truncate"
        title={fullValue}
      >
        {display}
      </p>

      {hint && (
        <p className={cn('text-caption mt-1.5 truncate', HINT_TEXT[accent])} title={hint}>
          {hint}
        </p>
      )}
    </div>
  )
}
