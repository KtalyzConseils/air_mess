import { useTranslation } from 'react-i18next'
import Card from '../ui/Card'
import Button from '../ui/Button'
import { CheckIcon, ShareIcon, WhatsappIcon } from '../ui/icons'
import { useOnboardingProgress } from '../../stores/onboardingStore'

interface Props {
  whatsappHref: string
  copied: boolean
  onCopy: () => void
}

/**
 * Étape 3 du parcours, sur le détail d'une course : tant que l'utilisateur n'a
 * jamais envoyé de lien de suivi, on lui propose de le faire maintenant.
 * Disparaît définitivement dès le premier partage (WhatsApp ou copie).
 */
export default function ShareTrackingPrompt({ whatsappHref, copied, onCopy }: Props) {
  const { t } = useTranslation()
  const { trackingShared, markTrackingShared } = useOnboardingProgress()

  if (trackingShared && !copied) return null

  return (
    <Card
      variant="default"
      padding="md"
      className="mb-6 border-airmess-yellow/60! bg-airmess-yellow/10!"
      role="region"
      aria-label={t('onboarding.firstCourse.shareTitle')}
    >
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-eyebrow uppercase text-airmess-red mb-1">{t('onboarding.firstCourse.shareEyebrow')}</p>
          <p className="text-body font-bold text-ink">{t('onboarding.firstCourse.shareTitle')}</p>
          <p className="text-body-s text-warm-600 mt-0.5">{t('onboarding.firstCourse.shareBody')}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 shrink-0">
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={markTrackingShared}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#25D366] px-5 py-2.5 text-body-s font-semibold text-white hover:opacity-90 transition-opacity"
          >
            <WhatsappIcon size={18} />
            {t('onboarding.firstCourse.shareWhatsapp')}
          </a>
          <Button
            variant="secondary"
            size="md"
            pill
            onClick={onCopy}
            leftIcon={copied ? <CheckIcon size={16} /> : <ShareIcon size={16} />}
          >
            {copied ? t('common.copied') : t('onboarding.firstCourse.shareCopy')}
          </Button>
        </div>
      </div>
    </Card>
  )
}
