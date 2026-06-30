import { useEffect, type ReactNode } from 'react'
import { CloseIcon } from '../ui/icons'

interface AdminModalProps {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  /** Footer fixe en bas (boutons Annuler / Confirmer). */
  footer?: ReactNode
  /** Largeur max. Par défaut "md" (32rem). */
  width?: 'sm' | 'md' | 'lg'
  children: ReactNode
}

/**
 * Modal admin — fond off-white, header avec close, footer optionnel.
 *
 * - Fermable au clic backdrop et touche Escape
 * - Bloque le scroll body quand ouverte
 */
export default function AdminModal({
  open,
  onClose,
  title,
  subtitle,
  footer,
  width = 'md',
  children,
}: AdminModalProps) {
  useEffect(() => {
    if (!open) return
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)

    return () => {
      document.body.style.overflow = original
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null

  const widthClass = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
  }[width]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-airmess-dark/60 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-modal-title"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full ${widthClass} bg-off-white border border-warm-200 rounded-lg shadow-xl flex flex-col max-h-[90vh]`}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-warm-200 shrink-0">
          <div className="min-w-0">
            <h2 id="admin-modal-title" className="text-body font-bold text-ink">
              {title}
            </h2>
            {subtitle && <p className="text-body-s text-warm-500 mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 -m-1 rounded-md text-warm-500 hover:text-ink hover:bg-warm-100 shrink-0"
            aria-label="Fermer"
          >
            <CloseIcon size={18} />
          </button>
        </div>

        {/* Body scrollable */}
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>

        {/* Footer optionnel */}
        {footer && (
          <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-warm-200 bg-cream/50 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
