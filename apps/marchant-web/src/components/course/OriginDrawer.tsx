import { useEffect, useState } from 'react'
import type { UseFormRegister, UseFormWatch, FieldErrors } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import type { CreateCoursePayload } from '../../api/courses'
import Field from '../Field'
import Button from '../ui/Button'
import { CloseIcon, MapPinIcon, CheckIcon } from '../ui/icons'

interface Props {
  open: boolean
  onClose: () => void
  register: UseFormRegister<CreateCoursePayload>
  watch: UseFormWatch<CreateCoursePayload>
  errors: FieldErrors<CreateCoursePayload>
  geoStatus: 'idle' | 'loading' | 'success' | 'denied'
  inputClass: string
}

/**
 * Drawer d'édition de l'origine (retrait). Fermé par défaut — le marchand
 * n'y touche que s'il change de point de retrait. Contient les champs
 * expéditeur + un rappel visuel du statut du pin A (positionné sur la
 * carte principale via la DualPinMap). Pas de LocationPicker ici :
 * la carte du bloc Trajet reste la source de vérité pour les positions.
 */
export default function OriginDrawer({
  open,
  onClose,
  register,
  watch,
  errors,
  geoStatus,
  inputClass,
}: Props) {
  const { t } = useTranslation()
  const [showStreet, setShowStreet] = useState(false)

  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  if (!open) return null

  const originLat = Number(watch('origin_lat')) || 0
  const originLng = Number(watch('origin_lng')) || 0
  const hasOrigin = originLat !== 0 && originLng !== 0

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-ink/60 backdrop-blur-sm ams-anim-fade-in">
      <div className="w-full md:max-w-2xl md:mx-4 bg-off-white rounded-t-2xl md:rounded-2xl shadow-2xl max-h-[92vh] flex flex-col ams-anim-scale-in">
        <div className="flex items-center justify-between border-b border-warm-100 px-5 py-4">
          <div>
            <h2 className="text-h3 text-ink font-bold">
              {t('courses.new.originDrawer.title')}
            </h2>
            <p className="text-caption text-warm-500">
              {t('courses.new.originDrawer.subtitle')}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="grid h-9 w-9 place-items-center rounded-full text-warm-600 hover:bg-warm-100 hover:text-ink"
          >
            <CloseIcon size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field
              label={t('courses.new.senderName')}
              required
              error={errors.origin_name?.message}
            >
              <input
                {...register('origin_name', { required: t('courses.new.required') })}
                className={inputClass}
              />
            </Field>
            <Field
              label={t('courses.new.phoneLabel')}
              required
              error={errors.origin_phone?.message}
            >
              <input
                {...register('origin_phone', { required: t('courses.new.required') })}
                className={inputClass}
              />
            </Field>
            <Field label={t('courses.new.originQuartier')} required>
              <input
                {...register('origin_quartier', { required: t('courses.new.required') })}
                className={inputClass}
                placeholder={t('courses.new.quartierPlaceholder')}
              />
            </Field>
            <Field label={t('courses.new.originCity')} required>
              <input
                {...register('origin_city', { required: t('courses.new.required') })}
                className={inputClass}
              />
            </Field>
          </div>

          {/* Statut du pin A — le positionnement se fait sur la carte principale */}
          <div
            className={`rounded-lg border px-4 py-3 flex items-start gap-3 ${
              hasOrigin
                ? 'border-success/30 bg-success-bg text-success'
                : 'border-warning/30 bg-warning-bg text-warning'
            }`}
          >
            <span className="mt-0.5 shrink-0">
              {hasOrigin ? <CheckIcon size={16} /> : <MapPinIcon size={16} />}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-body-s font-semibold">
                {hasOrigin
                  ? t('courses.new.originDrawer.pinSet')
                  : t('courses.new.originDrawer.pinMissing')}
              </p>
              <p className="text-caption mt-0.5">
                {hasOrigin
                  ? t('courses.new.originDrawer.pinSetHint')
                  : t('courses.new.originDrawer.pinMissingHint')}
              </p>
              {geoStatus === 'success' && !hasOrigin && (
                <p className="text-caption mt-1">{t('courses.new.geoSuccess')}</p>
              )}
              {geoStatus === 'denied' && (
                <p className="text-caption mt-1">{t('courses.new.geoDenied')}</p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowStreet((v) => !v)}
            className="text-caption font-medium text-warm-600 hover:text-ink underline"
          >
            {showStreet
              ? t('courses.new.hideDetails')
              : t('courses.new.moreOrigin')}
          </button>

          {showStreet && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label={t('courses.new.streetLabel')}>
                <input {...register('origin_street')} className={inputClass} />
              </Field>
            </div>
          )}
        </div>

        <div className="border-t border-warm-100 px-5 py-3 flex justify-end">
          <Button type="button" variant="primary" size="md" pill onClick={onClose}>
            {t('courses.new.originDrawer.done')}
          </Button>
        </div>
      </div>
    </div>
  )
}
