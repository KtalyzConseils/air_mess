import { useEffect, useState } from 'react'

type Variant = 'danger' | 'primary' | 'success'

interface Props {
  visible: boolean
  title: string
  description?: string
  reasonRequired?: boolean
  reasonPlaceholder?: string
  confirmLabel?: string
  confirmVariant?: Variant
  isPending?: boolean
  onConfirm: (reason: string) => void
  onClose: () => void
}

const VARIANT_CLASSES: Record<Variant, string> = {
  danger:  'bg-airmess-red text-white hover:opacity-90',
  primary: 'bg-airmess-yellow text-airmess-dark hover:opacity-90',
  success: 'bg-green-600 text-white hover:opacity-90',
}

export default function ConfirmModal({
  visible,
  title,
  description,
  reasonRequired = false,
  reasonPlaceholder,
  confirmLabel = 'Confirmer',
  confirmVariant = 'danger',
  isPending = false,
  onConfirm,
  onClose,
}: Props) {
  const [reason, setReason] = useState('')

  useEffect(() => {
    if (!visible) setReason('')
  }, [visible])

  useEffect(() => {
    if (!visible) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !isPending) onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [visible, isPending, onClose])

  if (!visible) return null

  const canConfirm = !isPending && (!reasonRequired || reason.trim().length >= 3)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
        <h3 className="text-lg font-bold text-airmess-dark">{title}</h3>

        {description && (
          <p className="text-sm text-gray-600 mt-2 whitespace-pre-line leading-relaxed">
            {description}
          </p>
        )}

        {reasonRequired && (
          <>
            <label className="block text-xs uppercase text-gray-500 font-semibold mt-4 mb-1">
              Motif (obligatoire)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder={reasonPlaceholder ?? 'Précise les détails…'}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-airmess-yellow text-sm"
              disabled={isPending}
            />
          </>
        )}

        <div className="flex justify-end gap-2 mt-5">
          <button
            onClick={onClose}
            disabled={isPending}
            className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 text-sm font-medium"
          >
            Annuler
          </button>
          <button
            onClick={() => onConfirm(reason.trim())}
            disabled={!canConfirm}
            className={`px-4 py-2 rounded-lg font-semibold text-sm disabled:opacity-50 ${VARIANT_CLASSES[confirmVariant]}`}
          >
            {isPending ? 'Envoi…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
