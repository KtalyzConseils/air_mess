import type { ReactNode } from 'react'

interface Props {
  label: string
  required?: boolean
  error?: string
  className?: string
  children: ReactNode
}

export default function Field({ label, required, error, className = '', children }: Props) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-airmess-red">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-airmess-red">{error}</p>}
    </div>
  )
}
