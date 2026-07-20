import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import Button from '../ui/Button'
import {
  AlertTriangleIcon,
  CheckIcon,
  MapPinIcon,
  ArrowRightIcon,
  ChevronDownIcon,
} from '../ui/icons'
import TripMiniMap from './TripMiniMap'

interface Props {
  originLabel: string
  destinationLabel: string
  originLat?: number
  originLng?: number
  destinationLat?: number
  destinationLng?: number
  fee: number
  urgency: 'standard' | 'express'
  walletAvailable: number | null
  isSubmitting: boolean
  submitLabel: string
}

/**
 * Panneau récap sticky (desktop uniquement).
 * Trajet + carte repliable (clic sur le prix) + couverture wallet + CTA.
 * Le CTA soumet le form parent grâce au type="submit" (le panneau est dans le form).
 */
export default function CoursePriceRecap({
  originLabel,
  destinationLabel,
  originLat,
  originLng,
  destinationLat,
  destinationLng,
  fee,
  urgency,
  walletAvailable,
  isSubmitting,
  submitLabel,
}: Props) {
  const { t } = useTranslation()
  const [mapVisible, setMapVisible] = useState(false)

  const hasWallet = typeof walletAvailable === 'number'
  const covered = hasWallet && walletAvailable! >= fee

  const hasAnyCoord =
    (originLat !== undefined && originLat !== 0) ||
    (destinationLat !== undefined && destinationLat !== 0)

  return (
    <aside className="hidden lg:block">
      <div className="sticky top-24 rounded-2xl border border-warm-200 bg-off-white shadow-md overflow-hidden">
        <div className="px-5 py-4 border-b border-warm-100">
          <p className="text-caption text-warm-500 uppercase tracking-wide">
            {t('courses.new.recap.title')}
          </p>
        </div>

        <div className="px-5 py-4 space-y-3">
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

        {/* Mini-carte du trajet — déployable via le prix ci-dessous */}
        {mapVisible && (
          <div className="px-5 pb-4 border-t border-warm-100 pt-4">
            <TripMiniMap
              originLat={originLat}
              originLng={originLng}
              destLat={destinationLat}
              destLng={destinationLng}
              height="200px"
            />
          </div>
        )}

        {/* Bloc frais — cliquable pour toggler la mini-carte */}
        <button
          type="button"
          onClick={() => setMapVisible((v) => !v)}
          disabled={!hasAnyCoord}
          aria-expanded={mapVisible}
          aria-label={
            mapVisible
              ? t('courses.new.recap.hideMap')
              : t('courses.new.recap.showMap')
          }
          className="w-full px-5 py-4 border-t border-warm-100 bg-cream text-left transition-colors enabled:hover:bg-warm-100 disabled:cursor-default flex items-baseline justify-between gap-3 group"
        >
          <span className="text-body-s text-warm-600 flex items-center gap-1.5">
            {urgency === 'express'
              ? t('courses.new.recap.feeExpress')
              : t('courses.new.recap.feeStandard')}
            {hasAnyCoord && (
              <span
                className={`text-warm-400 transition-transform duration-200 group-hover:text-ink ${
                  mapVisible ? 'rotate-180' : ''
                }`}
                aria-hidden
              >
                <ChevronDownIcon size={14} />
              </span>
            )}
          </span>
          <span className="text-h3 font-bold text-ink tabular-nums">
            {fee.toLocaleString('fr-FR')} FCFA
          </span>
        </button>

        {hasAnyCoord && !mapVisible && (
          <p className="px-5 pb-2 text-caption text-warm-400 -mt-1">
            {t('courses.new.recap.showMapHint')}
          </p>
        )}

        {hasWallet && (
          <div
            className={`px-5 py-3 border-t border-warm-100 flex items-start gap-2 ${
              covered ? 'bg-success-bg text-success' : 'bg-warning-bg text-warning'
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
                    <Link to="/wallet" className="underline">
                      {t('courses.new.topUpCta')}
                    </Link>
                  </>
                )}
              </p>
            </div>
          </div>
        )}

        <div className="px-5 py-4 border-t border-warm-100">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            pill
            fullWidth
            loading={isSubmitting}
            rightIcon={!isSubmitting && <ArrowRightIcon size={16} />}
          >
            {submitLabel}
          </Button>
        </div>
      </div>
    </aside>
  )
}
