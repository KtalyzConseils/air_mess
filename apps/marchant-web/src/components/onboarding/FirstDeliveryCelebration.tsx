import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Card from '../ui/Card'
import Button from '../ui/Button'
import { ArrowRightIcon, CloseIcon, SparklesIcon } from '../ui/icons'
import { useOnboardingProgress } from '../../stores/onboardingStore'

/**
 * Étape 4 du parcours : la première livraison réussie est célébrée une seule fois,
 * avec le pas suivant naturel (lancer la prochaine course).
 */
export default function FirstDeliveryCelebration() {
  const { t } = useTranslation()
  const { firstDeliveryCelebrated: celebrated, markFirstDeliveryCelebrated: markCelebrated } = useOnboardingProgress()

  if (celebrated) return null

  return (
    <Card variant="default" padding="md" className="mb-8 border-success/30! bg-success-bg!" role="status">
      <div className="flex items-start gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success text-off-white"
          aria-hidden="true"
        >
          <SparklesIcon size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-ink text-body-l">{t('onboarding.firstCourse.deliveredTitle')}</p>
          <p className="mt-0.5 text-body-s text-warm-700">{t('onboarding.firstCourse.deliveredBody')}</p>
          <Link to="/courses/new" onClick={markCelebrated} className="inline-block mt-4">
            <Button variant="primary" size="md" pill rightIcon={<ArrowRightIcon size={16} />}>
              {t('onboarding.firstCourse.deliveredCta')}
            </Button>
          </Link>
        </div>
        <button
          type="button"
          onClick={markCelebrated}
          aria-label={t('common.close')}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-warm-600 hover:bg-success/10 hover:text-ink transition-colors cursor-pointer"
        >
          <CloseIcon size={18} />
        </button>
      </div>
    </Card>
  )
}
