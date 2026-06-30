import { forwardRef, type InputHTMLAttributes, type SelectHTMLAttributes, type ReactNode } from 'react'
import { SearchIcon } from '../ui/icons'

/* ============================================================
   Primitifs de toolbar admin — denses, sans label, faits pour
   vivre dans une barre de filtres en haut d'une page liste.
   Différents de ui/Input.tsx (qui est plus large, avec label,
   pensé pour les formulaires marchant).
   ============================================================ */

interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /** Largeur min. Par défaut 280 (assez pour scanner). */
  minWidthClass?: string
}

export const AdminSearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  function AdminSearchInput({ className = '', minWidthClass = 'min-w-[260px]', ...rest }, ref) {
    return (
      <div className={`relative flex-1 ${minWidthClass}`}>
        <SearchIcon
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-500 pointer-events-none"
        />
        <input
          ref={ref}
          type="text"
          className={[
            'w-full h-9 pl-9 pr-3 bg-off-white border border-warm-300 rounded-md',
            'text-body-s text-ink placeholder:text-warm-400',
            'focus:outline-none focus:border-airmess-yellow focus:shadow-glow-yellow',
            'transition-all',
            className,
          ].join(' ')}
          {...rest}
        />
      </div>
    )
  },
)

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  children: ReactNode
}

export const AdminSelect = forwardRef<HTMLSelectElement, SelectProps>(function AdminSelect(
  { className = '', children, ...rest },
  ref,
) {
  return (
    <select
      ref={ref}
      className={[
        'h-9 px-3 pr-8 bg-off-white border border-warm-300 rounded-md',
        'text-body-s text-ink',
        'focus:outline-none focus:border-airmess-yellow focus:shadow-glow-yellow',
        'transition-all cursor-pointer',
        className,
      ].join(' ')}
      {...rest}
    >
      {children}
    </select>
  )
})

interface ButtonProps {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md'
  disabled?: boolean
  type?: 'button' | 'submit'
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  className?: string
}

/**
 * Bouton admin compact — différent du ui/Button (qui est pill/large/CTA marchant).
 * Ici : rectangulaire, dense, pour les actions de toolbar et modal.
 */
export function AdminButton({
  children,
  onClick,
  variant = 'secondary',
  size = 'md',
  disabled,
  type = 'button',
  leftIcon,
  rightIcon,
  className = '',
}: ButtonProps) {
  const sizeClass = size === 'sm' ? 'h-8 px-3 text-caption' : 'h-9 px-4 text-body-s'

  const variantClass = {
    primary: 'bg-airmess-yellow text-ink hover:bg-airmess-yellow/85 border-transparent font-bold',
    secondary: 'bg-off-white border-warm-300 text-ink hover:border-warm-500 hover:bg-cream font-medium',
    danger: 'bg-off-white border-airmess-red/30 text-airmess-red hover:bg-danger-bg hover:border-airmess-red/60 font-medium',
    ghost: 'bg-transparent border-transparent text-warm-600 hover:text-ink hover:bg-warm-100 font-medium',
  }[variant]

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={[
        'inline-flex items-center justify-center gap-1.5 rounded-md border transition-all',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        sizeClass,
        variantClass,
        className,
      ].join(' ')}
    >
      {leftIcon}
      {children}
      {rightIcon}
    </button>
  )
}
