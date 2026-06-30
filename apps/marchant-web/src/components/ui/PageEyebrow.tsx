import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

interface Props {
  /** Label en eyebrow (rendu en uppercase). */
  label: ReactNode
  className?: string
  /** Couleur du diamant accent. Par défaut jaune brand. */
  accent?: 'yellow' | 'red'
}

/**
 * Eyebrow standard d'une page Air Mess.
 *
 * Un petit diamant jaune (rotation 45° d'un carré) à gauche du label en uppercase.
 * Le diamant est un écho de la forme géométrique de l'aile du logo — brand sans
 * décoration générique (pas de numéro 01/02/03).
 *
 * À utiliser au top d'une page pour la situer. Ne PAS l'utiliser plusieurs fois
 * dans la même page (perd son rôle d'introduction).
 */
export default function PageEyebrow({ label, className, accent = 'yellow' }: Props) {
  const dotColor = accent === 'red' ? 'bg-airmess-red' : 'bg-airmess-yellow'

  return (
    <div className={cn('inline-flex items-center gap-2.5', className)}>
      <span
        aria-hidden="true"
        className={cn('h-2.5 w-2.5 rotate-45', dotColor)}
      />
      <span className="text-eyebrow text-warm-600 uppercase">{label}</span>
    </div>
  )
}
