import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Button from '../ui/Button'
import Card from '../ui/Card'
import { CloseIcon, ArrowRightIcon, ArrowLeftIcon, MapPinIcon, RouteIcon, RadarIcon, SparklesIcon } from '../ui/icons'

interface Props {
  open: boolean
  onClose: () => void
}

const SLIDES = [
  {
    key: 'describe',
    Icon: MapPinIcon,
    titleKey: 'onboarding.slides.describe.title',
    bodyKey: 'onboarding.slides.describe.body',
  },
  {
    key: 'assign',
    Icon: RouteIcon,
    titleKey: 'onboarding.slides.assign.title',
    bodyKey: 'onboarding.slides.assign.body',
  },
  {
    key: 'track',
    Icon: RadarIcon,
    titleKey: 'onboarding.slides.track.title',
    bodyKey: 'onboarding.slides.track.body',
  },
] as const

/**
 * Modale d'onboarding — 3 slides expliquant en pratique comment lancer une course.
 * Contenu unifié marchand + particulier (le flux backend est le même).
 * S'affiche au 1er load du dashboard, et se rejoue depuis le bouton "Aide".
 */
export default function OnboardingModal({ open, onClose }: Props) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)

  // Reset l'index à chaque ouverture — on revient toujours à la 1ère slide.
  useEffect(() => {
    if (open) setStep(0)
  }, [open])

  // Escape pour fermer
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight' && step < SLIDES.length - 1) setStep((s) => s + 1)
      if (e.key === 'ArrowLeft' && step > 0) setStep((s) => s - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, step, onClose])

  if (!open) return null

  const isLast = step === SLIDES.length - 1
  const isFirst = step === 0
  const slide = SLIDES[step]
  const { Icon } = slide

  function handleCta() {
    onClose()
    navigate('/courses/new')
  }

  return (
    <div
      className="fixed inset-0 bg-ink/70 backdrop-blur-sm flex items-center justify-center z-[70] p-4 ams-anim-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      <Card variant="signature" padding="none" className="max-w-lg w-full overflow-hidden ams-anim-scale-in">
        {/* Bouton fermer + Skip */}
        <div className="flex items-center justify-between px-5 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="text-caption text-warm-500 hover:text-ink transition-colors"
          >
            {t('onboarding.skip')}
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="w-8 h-8 rounded-full flex items-center justify-center text-warm-500 hover:text-ink hover:bg-warm-100 transition-colors"
          >
            <CloseIcon size={18} />
          </button>
        </div>

        {/* Illustration : gros disque jaune + icône ligne blanche */}
        <div className="px-6 pt-2 pb-4 flex justify-center">
          <div className="w-24 h-24 rounded-full bg-airmess-yellow flex items-center justify-center shadow-glow-yellow">
            <span className="text-ink">
              <Icon size={44} />
            </span>
          </div>
        </div>

        {/* Contenu de la slide */}
        <div className="px-6 pb-2 text-center">
          <p className="text-caption uppercase tracking-widest font-bold text-warm-500 mb-2">
            {t('onboarding.stepOf', { current: step + 1, total: SLIDES.length })}
          </p>
          <h2 id="onboarding-title" className="text-h2 md:text-h1 text-ink font-bold leading-tight mb-3">
            {t(slide.titleKey)}
          </h2>
          <p className="text-body text-warm-600 leading-relaxed">
            {t(slide.bodyKey)}
          </p>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-2 py-4">
          {SLIDES.map((s, i) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setStep(i)}
              aria-label={t('onboarding.goToStep', { step: i + 1 })}
              className={
                'h-2 rounded-full transition-all duration-200 ' +
                (i === step ? 'w-8 bg-airmess-yellow' : 'w-2 bg-warm-300 hover:bg-warm-400')
              }
            />
          ))}
        </div>

        {/* Navigation footer */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-warm-200 bg-cream/40">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={isFirst}
            leftIcon={<ArrowLeftIcon size={14} />}
          >
            {t('common.previous')}
          </Button>

          {isLast ? (
            <Button
              variant="primary"
              size="md"
              pill
              onClick={handleCta}
              rightIcon={<SparklesIcon size={16} />}
            >
              {t('onboarding.finalCta')}
            </Button>
          ) : (
            <Button
              variant="primary"
              size="md"
              pill
              onClick={() => setStep((s) => Math.min(SLIDES.length - 1, s + 1))}
              rightIcon={<ArrowRightIcon size={14} />}
            >
              {t('common.next')}
            </Button>
          )}
        </div>
      </Card>
    </div>
  )
}
