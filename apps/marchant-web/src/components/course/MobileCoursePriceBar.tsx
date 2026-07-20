import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import Button from '../ui/Button'
import {
  ArrowRightIcon,
  AlertTriangleIcon,
  CheckIcon,
  ChevronDownIcon,
  CloseIcon,
  MapPinIcon,
} from '../ui/icons'
import TripMiniMap from './TripMiniMap'

interface Props {
  fee: number
  walletAvailable: number | null
  isSubmitting: boolean
  submitLabel: string
  originLabel: string
  destinationLabel: string
  originLat?: number
  originLng?: number
  destinationLat?: number
  destinationLng?: number
}

/**
 * Barre sticky bas d'écran (mobile uniquement).
 * Bloc prix cliquable → ouvre une bottom-sheet avec la mini-carte A→B
 * et le récap trajet + wallet. Bouton "Confirmer" séparé.
 * Contient un submit — le composant est monté à l'intérieur du <form> parent.
 */
export default function MobileCoursePriceBar({
  fee,
  walletAvailable,
  isSubmitting,
  submitLabel,
  originLabel,
  destinationLabel,
  originLat,
  originLng,
  destinationLat,
  destinationLng,
}: Props) {
  const { t } = useTranslation()
  const [sheetOpen, setSheetOpen] = useState(false)

  const hasWallet = typeof walletAvailable === 'number'
  const short = hasWallet && walletAvailable! < fee
  const covered = hasWallet && walletAvailable! >= fee

  const hasAnyCoord =
    (typeof originLat === 'number' && originLat !== 0) ||
    (typeof destinationLat === 'number' && destinationLat !== 0)

  useEffect(() => {
    if (!sheetOpen) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [sheetOpen])

  return (
    <>
      {sheetOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex items-end bg-ink/60 backdrop-blur-sm ams-anim-fade-in">
          <div className="w-full bg-off-white rounded-t-2xl shadow-2xl max-h-[85vh] flex flex-col ams-anim-scale-in">
            <div className="flex items-center justify-between border-b border-warm-100 px-5 py-4">
              <div>
                <p className="text-caption text-warm-500 uppercase tracking-wide">
                  {t('courses.new.recap.title')}
                </p>
                <p className="text-body font-bold text-ink">
                  {fee.toLocaleString('fr-FR')} FCFA
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                aria-label={t('common.close')}
                className="grid h-9 w-9 place-items-center rounded-full text-warm-600 hover:bg-warm-100 hover:text-ink"
              >
                <CloseIcon size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              <TripMiniMap
                originLat={originLat}
                originLng={originLng}
                destLat={destinationLat}
                destLng={destinationLng}
                height="220px"
              />

              <div className="space-y-3">
                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 grid h-6 w-6 place-items-center rounded-full bg-warm-100 text-warm-600 shrink-0">
                    <MapPinIcon size={14} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-caption text-warm-500">{t('courses.new.recap.from')}</p>
                    <p className="text-body-s font-medium text-ink truncate">
                      {originLabel || t('courses.new.recap.originPending')}
                    </p>
                  </div>
                </div>

                <div className="ml-3 pl-3 border-l-2 border-dashed border-warm-200 h-3" />

                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 grid h-6 w-6 place-items-center rounded-full bg-airmess-yellow/30 text-ink shrink-0">
                    <ArrowRightIcon size={14} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-caption text-warm-500">{t('courses.new.recap.to')}</p>
                    <p className="text-body-s font-medium text-ink truncate">
                      {destinationLabel || t('courses.new.recap.destinationPending')}
                    </p>
                  </div>
                </div>
              </div>

              {hasWallet && (
                <div
                  className={`rounded-lg border px-4 py-3 flex items-start gap-2 ${
                    covered
                      ? 'border-success/30 bg-success-bg text-success'
                      : 'border-warning/30 bg-warning-bg text-warning'
                  }`}
                >
                  <span className="mt-0.5 shrink-0">
                    {covered ? <CheckIcon size={16} /> : <AlertTriangleIcon size={16} />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-caption font-semibold">
                      {covered
                        ? t('courses.new.recap.walletCovered')
                        : t('courses.new.recap.walletShort')}
                    </p>
                    <p className="text-caption tabular-nums">
                      {walletAvailable!.toLocaleString('fr-FR')} FCFA
                      {!covered && (
                        <>
                          {' · '}
                          <Link
                            to="/wallet"
                            className="underline"
                            onClick={() => setSheetOpen(false)}
                          >
                            {t('courses.new.topUpCta')}
                          </Link>
                        </>
                      )}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-warm-100 px-5 py-3">
              <Button
                type="button"
                variant="secondary"
                size="md"
                fullWidth
                onClick={() => setSheetOpen(false)}
              >
                {t('common.close')}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-warm-200 bg-off-white/95 backdrop-blur-sm shadow-[0_-4px_16px_-8px_rgba(0,0,0,0.08)]">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            disabled={!hasAnyCoord}
            aria-label={t('courses.new.recap.showMap')}
            className="min-w-0 flex-1 text-left group enabled:cursor-pointer disabled:cursor-default"
          >
            <p className="text-caption text-warm-500 flex items-center gap-1">
              {t('courses.new.recap.mobileFeeLabel')}
              {hasAnyCoord && (
                <span
                  className="text-warm-400 group-hover:text-ink transition-colors"
                  aria-hidden
                >
                  <ChevronDownIcon size={12} />
                </span>
              )}
            </p>
            <p className="text-body font-bold text-ink tabular-nums leading-tight">
              {fee.toLocaleString('fr-FR')} FCFA
            </p>
            {short && (
              <p className="text-caption text-warning flex items-center gap-1 mt-0.5">
                <AlertTriangleIcon size={12} />
                {t('courses.new.recap.walletShortMobile')}
              </p>
            )}
          </button>
          <Button
            type="submit"
            variant="primary"
            size="md"
            pill
            loading={isSubmitting}
            rightIcon={!isSubmitting && <ArrowRightIcon size={16} />}
          >
            {submitLabel}
          </Button>
        </div>
      </div>
    </>
  )
}
