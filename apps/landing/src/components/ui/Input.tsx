import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react'
import { cn } from '../../lib/cn'

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  helper?: string
  error?: string
  leftIcon?: ReactNode
  rightSlot?: ReactNode
}

const Input = forwardRef<HTMLInputElement, Props>(function Input(
  { label, helper, error, leftIcon, rightSlot, className, id, ...rest },
  ref,
) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const hasError = error !== undefined && error !== null
  const hasErrorMessage = hasError && error.trim().length > 0

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block mb-1.5 text-caption text-warm-600 font-medium">
          {label}
        </label>
      )}

      <div className={cn(
        'relative flex items-center bg-off-white border rounded-md transition-all duration-200',
        hasError
          ? 'border-airmess-red focus-within:shadow-glow-red'
          : 'border-warm-300 focus-within:border-airmess-yellow focus-within:shadow-glow-yellow',
      )}>
        {leftIcon && <span className="pl-3 text-warm-500 inline-flex items-center pointer-events-none">{leftIcon}</span>}
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
        {rightSlot && <span className="pr-2 inline-flex items-center shrink-0">{rightSlot}</span>}
      </div>

      {(hasErrorMessage || helper) && (
        <p id={`${inputId}-desc`} className={cn('mt-1.5 text-caption', hasErrorMessage ? 'text-airmess-red' : 'text-warm-500')}>
          {hasErrorMessage ? error : helper}
        </p>
      )}
    </div>
  )
})

export default Input