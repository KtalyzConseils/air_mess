import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '../lib/cn'

interface Props {
  label: string
  /** Marque le champ comme obligatoire — affiche un astérisque rouge et gère la sémantique aria. */
  required?: boolean
  /** Marque le champ comme facultatif — affiche un badge "· facultatif" léger.
   *  Utile pour rendre l'exception (facultatif) visible plutôt que la règle (obligatoire). */
  optional?: boolean
  error?: string
  className?: string
  /** ID à passer à l'input enfant — permet au label d'être lié correctement. */
  htmlFor?: string
  children: ReactNode
}

/**
 * Wrapper de champ : label + statut required/optional + contenu + erreur.
 *
 * Signal visuel :
 * - required=true  → * rouge en gras, sémantique aria-required côté enfant
 * - optional=true  → "· facultatif" en gris pâle italique
 * - error !== null → texte rouge sous le champ
 */
export default function Field({
  label,
  required,
  optional,
  error,
  className,
  htmlFor,
  children,
}: Props) {
  const { t } = useTranslation()
  return (
    <div className={className}>
      {label && (
        <label
          htmlFor={htmlFor}
          className="flex items-baseline gap-1.5 mb-1.5 flex-wrap"
        >
          <span className="text-caption text-warm-600 font-medium">{label}</span>
          {required && (
            <span
              className="text-airmess-red font-bold text-body-s leading-none"
              aria-hidden
            >
              *
            </span>
          )}
          {optional && !required && (
            <span className="text-caption text-warm-400 font-normal italic">
              · {t('common.optional')}
            </span>
          )}
        </label>
      )}
      {children}
      {error && (
        <p className={cn('mt-1.5 text-caption text-airmess-red')} role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
