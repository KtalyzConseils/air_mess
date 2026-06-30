import type { ReactNode } from 'react'
import { cn } from '../lib/cn'

interface Props {
  label: string
  required?: boolean
  error?: string
  className?: string
  children: ReactNode
}

/**
 * Wrapper de champ : label en eyebrow, contenu, message d'erreur.
 * Conserve son API d'origine pour ne pas casser les formulaires existants.
 */
export default function Field({ label, required, error, className, children }: Props) {
  return (
    <div className={className}>
      {label && (
        <label className="block mb-1.5 text-caption text-warm-600 font-medium">
          {label} {required && <span className="text-airmess-red">*</span>}
        </label>
      )}
      {children}
      {error && (
        <p className={cn('mt-1.5 text-caption text-airmess-red')}>{error}</p>
      )}
    </div>
  )
}
