import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cn } from '../../lib/cn'

type Variant = 'primary' | 'secondary' | 'dark' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  pill?: boolean
  loading?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  fullWidth?: boolean
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: 'bg-airmess-yellow text-ink shadow-sm hover:bg-airmess-yellow-light hover:shadow-md active:shadow-xs',
  secondary: 'bg-off-white text-ink border border-warm-300 hover:bg-warm-100 hover:border-warm-400',
  dark: 'bg-airmess-dark text-cream shadow-sm hover:bg-ink hover:shadow-md',
  ghost: 'bg-transparent text-ink hover:bg-warm-100',
  danger: 'bg-airmess-red text-white shadow-sm hover:bg-airmess-red-light hover:shadow-md',
}

const SIZE_CLASSES: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-body-s gap-1.5',
  md: 'px-5 py-2.5 text-body gap-2',
  lg: 'px-6 py-3.5 text-body-l gap-2.5',
}

const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = 'primary', size = 'md', pill = false, loading = false, leftIcon, rightIcon, fullWidth = false, className, disabled, children, ...rest },
  ref,
) {
  const isDisabled = disabled || loading

  return (
    <button
      ref={ref}
      disabled={isDisabled}
      className={cn(
        'inline-flex items-center justify-center font-medium transition-all duration-200',
        'select-none whitespace-nowrap',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        pill ? 'rounded-full' : 'rounded-md',
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading ? (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
          <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      ) : (
        leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>
      )}
      {children && <span>{children}</span>}
      {rightIcon && !loading && <span className="inline-flex shrink-0">{rightIcon}</span>}
    </button>
  )
})

export default Button