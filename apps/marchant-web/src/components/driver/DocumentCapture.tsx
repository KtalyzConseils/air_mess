import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '../../lib/cn'
import { compressImage, getImageDimensions } from '../../lib/image'
import { CameraIcon, PaperclipIcon, CloseIcon, AlertTriangleIcon } from '../ui/icons'

interface Props {
  label: string
  helper?: string
  required?: boolean
  /** Autorise le PDF via "Choisir un fichier" (CNI/permis scannés). */
  allowPdf?: boolean
  /** Caméra ouverte par "Prendre une photo" : 'user' = frontale (selfie), 'environment' = arrière (documents). */
  captureMode: 'user' | 'environment'
  /** Côté le plus petit minimum accepté (px) — rejet local "image trop petite". */
  minDimension: number
  file: File | null
  onChange: (f: File | null) => void
  /** Erreur serveur (422) à afficher sous la zone. */
  error?: string
}

/**
 * Zone de capture d'un document : "Prendre une photo" (caméra directe via
 * input capture, sur mobile) ou "Choisir un fichier". Aperçu réel de l'image,
 * consignes de clarté, rejet local si la résolution est trop faible, et
 * compression canvas avant de remonter le fichier (photos mobiles 3-8 Mo).
 */
export default function DocumentCapture({
  label,
  helper,
  required,
  allowPdf = false,
  captureMode,
  minDimension,
  file,
  onChange,
  error,
}: Props) {
  const { t } = useTranslation()
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [processing, setProcessing] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const isImage = file !== null && file.type.startsWith('image/')

  // Aperçu : object URL créé/révoqué au rythme du fichier sélectionné.
  useEffect(() => {
    if (!file || !file.type.startsWith('image/')) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  async function handleSelected(selected: File | null) {
    setLocalError(null)
    if (!selected) return

    // PDF : pas de contrôle de dimensions ni de compression possible côté client.
    if (selected.type === 'application/pdf') {
      onChange(selected)
      return
    }

    setProcessing(true)
    try {
      const { width, height } = await getImageDimensions(selected)
      if (Math.min(width, height) < minDimension) {
        setLocalError(t('driverRegister.doc.tooSmallError', { min: minDimension }))
        return
      }
      onChange(await compressImage(selected))
    } catch {
      setLocalError(t('driverRegister.doc.unreadableError'))
    } finally {
      setProcessing(false)
    }
  }

  const displayError = localError ?? error

  return (
    <div>
      <p className="block mb-1.5 text-caption text-warm-600 font-medium">
        {label} {required && <span className="text-airmess-red">*</span>}
      </p>

      <div
        className={cn(
          'rounded-md border px-4 py-3 transition-all duration-200',
          file
            ? 'bg-success-bg border-success/30'
            : 'bg-off-white border-dashed border-warm-300',
          displayError && 'border-airmess-red bg-danger-bg!',
        )}
      >
        {file ? (
          <div className="flex items-center gap-3">
            {isImage && previewUrl ? (
              <img
                src={previewUrl}
                alt={t('driverRegister.doc.previewAlt', { label })}
                className="h-20 w-20 shrink-0 rounded-md object-cover border border-warm-200"
              />
            ) : (
              <span className="shrink-0 inline-flex h-20 w-20 items-center justify-center rounded-md bg-off-white border border-warm-200 text-warm-500">
                <PaperclipIcon size={24} />
              </span>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-body-s font-medium text-success truncate">{file.name}</p>
              <p className="text-caption text-warm-500">{(file.size / 1024).toFixed(0)} Ko</p>
              <div className="flex flex-wrap gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-md border border-warm-300 bg-off-white px-2.5 py-1.5 text-caption font-medium text-ink hover:border-warm-400"
                >
                  <CameraIcon size={14} /> {t('driverRegister.doc.retake')}
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-md border border-warm-300 bg-off-white px-2.5 py-1.5 text-caption font-medium text-ink hover:border-warm-400"
                >
                  <PaperclipIcon size={14} /> {t('driverRegister.doc.change')}
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setLocalError(null)
                onChange(null)
              }}
              className="shrink-0 self-start text-warm-500 hover:text-airmess-red"
              aria-label={t('driverRegister.fileRemoveAria')}
            >
              <CloseIcon size={16} />
            </button>
          </div>
        ) : (
          <div>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                disabled={processing}
                onClick={() => cameraInputRef.current?.click()}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-md bg-airmess-dark px-3 py-2.5 text-body-s font-medium text-cream transition-colors hover:bg-ink disabled:opacity-50"
              >
                <CameraIcon size={16} />
                {processing ? t('driverRegister.doc.processing') : t('driverRegister.doc.takePhoto')}
              </button>
              <button
                type="button"
                disabled={processing}
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-md border border-warm-300 bg-off-white px-3 py-2.5 text-body-s font-medium text-ink transition-colors hover:border-warm-400 disabled:opacity-50"
              >
                <PaperclipIcon size={16} />
                {t('driverRegister.doc.chooseFile')}
              </button>
            </div>
            {helper && <p className="text-caption text-warm-500 mt-2">{helper}</p>}
            {/* Consignes de clarté — visibles tant qu'aucun fichier n'est fourni */}
            <ul className="mt-2 space-y-0.5 text-caption text-warm-500 list-disc list-inside">
              <li>{t('driverRegister.doc.tip1')}</li>
              <li>{t('driverRegister.doc.tip2')}</li>
              <li>{t('driverRegister.doc.tip3')}</li>
            </ul>
          </div>
        )}
      </div>

      {displayError && (
        <p className="mt-1.5 text-caption text-airmess-red inline-flex items-start gap-1.5">
          <AlertTriangleIcon size={14} className="mt-0.5 shrink-0" />
          <span>{displayError}</span>
        </p>
      )}

      {/* Input caméra : capture directe sur mobile (ignoré sur desktop → picker). */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture={captureMode}
        className="hidden"
        onChange={(e) => {
          void handleSelected(e.target.files?.[0] ?? null)
          e.target.value = ''
        }}
      />
      {/* Input fichier classique (galerie / scanner / PDF). */}
      <input
        ref={fileInputRef}
        type="file"
        accept={allowPdf ? 'image/jpeg,image/png,application/pdf' : 'image/jpeg,image/png'}
        className="hidden"
        onChange={(e) => {
          void handleSelected(e.target.files?.[0] ?? null)
          e.target.value = ''
        }}
      />
    </div>
  )
}
