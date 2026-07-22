import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import Button from '../ui/Button'
import {
  AlertTriangleIcon,
  CheckIcon,
  ArrowRightIcon,
  ChevronDownIcon,
} from '../ui/icons'
import TripMiniMap from './TripMiniMap'
import CourseSummary, { type CourseSummaryData } from './CourseSummary'
import CompletionStatus from './CompletionStatus'
import type { CourseFeeEstimate } from '../../api/courses'

interface Props {
  data: CourseSummaryData
  originLat?: number
  originLng?: number
  destinationLat?: number
  destinationLng?: number
  /** null = pas encore d'estimation (2 pins pas posés, ou requête en cours). */
  fee: number | null
  /** Breakdown live du back — quand présent on affiche "3.7 km × 400 + 800 …". */
  estimate?: CourseFeeEstimate
  walletAvailable: number | null
  isSubmitting: boolean
  submitLabel: string
  missingCount: number
}

/**
 * Panneau récap sticky (desktop uniquement).
 * Récap complet de la course (expéditeur, destinataire, colis, encaissement)
 * + carte repliable (clic sur le prix) + couverture wallet + CTA.
 * Le CTA soumet le form parent (type="submit").
 */
export default function CoursePriceRecap({
  data,
  originLat,
  originLng,
  destinationLat,
  destinationLng,
  fee,
  estimate,
  walletAvailable,
  isSubmitting,
  submitLabel,
  missingCount,
}: Props) {
  const { t } = useTranslation()
  const [mapVisible, setMapVisible] = useState(false)

  const hasFee = fee != null
  const hasWallet = typeof walletAvailable === 'number'
  const covered = hasWallet && hasFee && walletAvailable! >= fee!

  const hasAnyCoord =
    (originLat !== undefined && originLat !== 0) ||
    (destinationLat !== undefined && destinationLat !== 0)

  return (
    <aside className="hidden lg:block">
      <div className="sticky top-24 rounded-2xl border border-warm-200 bg-off-white shadow-md overflow-hidden max-h-[calc(100vh-7rem)] flex flex-col">
        <div className="px-5 py-4 border-b border-warm-100 shrink-0">
          <p className="text-caption text-warm-500 uppercase tracking-wide">
            {t('courses.new.recap.title')}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto">
          <CourseSummary data={data} />

          {mapVisible && (
            <div className="px-5 py-4 border-t border-warm-100">
              <TripMiniMap
                originLat={originLat}
                originLng={originLng}
                destLat={destinationLat}
                destLng={destinationLng}
                height="200px"
              />
            </div>
          )}
        </div>

        {/* Bloc frais — cliquable pour toggler la mini-carte + breakdown live */}
        <div className="border-t border-warm-100 bg-cream shrink-0">
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
            className="w-full px-5 pt-4 pb-2 text-left transition-colors enabled:hover:bg-warm-100 disabled:cursor-default flex items-baseline justify-between gap-3 group"
          >
            <span className="text-body-s text-warm-600 flex items-center gap-1.5">
              {data.urgency === 'express'
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
            {hasFee ? (
              <span className="text-h3 font-bold text-ink tabular-nums">
                {fee!.toLocaleString('fr-FR')} FCFA
              </span>
            ) : (
              <span className="text-h3 font-bold text-warm-400 tabular-nums">—</span>
            )}
          </button>

          {hasFee && estimate && (
            <p className="px-5 pb-4 text-caption text-warm-500 tabular-nums">
              {estimate.capped
                ? t('courses.new.recap.breakdownCapped', {
                    distance: estimate.distance_km.toFixed(1),
                    max: estimate.max.toLocaleString('fr-FR'),
                  })
                : t('courses.new.recap.breakdown', {
                    distance: estimate.distance_km.toFixed(1),
                    perKm: estimate.per_km.toLocaleString('fr-FR'),
                    min: estimate.min.toLocaleString('fr-FR'),
                  })}
              {estimate.urgency === 'express' && estimate.multiplier !== 1 && (
                <>
                  {' '}
                  {t('courses.new.recap.breakdownExpress', {
                    multiplier: estimate.multiplier,
                  })}
                </>
              )}
            </p>
          )}
          {!hasFee && (
            <p className="px-5 pb-4 text-caption text-warm-500">
              {t('courses.new.recap.feePending')}
            </p>
          )}
        </div>

        {hasWallet && hasFee && (
          <div
            className={`px-5 py-3 border-t border-warm-100 flex items-start gap-2 shrink-0 ${
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

        <CompletionStatus missingCount={missingCount} />

        <div className="px-5 py-4 border-t border-warm-100 shrink-0">
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
