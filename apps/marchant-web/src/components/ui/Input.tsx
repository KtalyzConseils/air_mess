import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react'
import { cn } from '../../lib/cn'

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  /** Texte d'aide sous le champ (gris). Remplacé par `error` si présent. */
  helper?: string
  /** Message d'erreur (rouge). Prend la priorité sur `helper`. */
  error?: string
  /** Icône à gauche (cherche/épingle/etc.) */
  leftIcon?: ReactNode
  /** Élément à droite (toggle visibilité mot de passe, button, etc.) */
  rightSlot?: ReactNode
}

/**
 * Input Air Mess — champ texte unifié avec label + helper + error.
 *
 * - Label toujours au-dessus (jamais flottant — moins lisible pour les seniors)
 * - Focus ring jaune brand cohérent avec le reste
 * - États error : bordure rouge brand + message sous le champ
 */
const Input = forwardRef<HTMLInputElement, Props>(function Input(
  { label, helper, error, leftIcon, rightSlot, className, id, ...rest },
  ref,
) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const hasError = !!error

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="block mb-1.5 text-caption text-warm-600 font-medium"
        >
          {label}
        </label>
      )}

      <div
        className={cn(
          'relative flex items-center bg-off-white border rounded-md transition-all duration-200',
          hasError
            ? 'border-airmess-red focus-within:shadow-glow-red'
            : 'border-warm-300 focus-within:border-airmess-yellow focus-within:shadow-glow-yellow',
        )}
      >
        {leftIcon && (
          <span className="pl-3 text-warm-500 inline-flex items-center pointer-events-none">
            {leftIcon}
          </span>
        )}

        <input
          ref={ref}
          id={inputId}
          aria-invalid={hasError || undefined}
          aria-describedby={(helper || error) ? `${inputId}-desc` : undefined}
          className={cn(
            'flex-1 bg-transparent px-3 py-2.5 text-body text-ink placeholder:text-warm-400',
            'focus:outline-none disabled:cursor-not-allowed disabled:opacity-60',
            leftIcon && 'pl-2',
            rightSlot && 'pr-2',
            className,
          )}
          {...rest}
        />

        {rightSlot && (
          <span className="pr-2 inline-flex items-center shrink-0">{rightSlot}</span>
        )}
      </div>

      {(error || helper) && (
        <p
          id={`${inputId}-desc`}
          className={cn(
            'mt-1.5 text-caption',
            hasError ? 'text-airmess-red' : 'text-warm-500',
          )}
        >
          {error || helper}
        </p>
      )}
    </div>
  )
})

export default Input
