import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Card from '../ui/Card'
import Button from '../ui/Button'
import { ArrowRightIcon, PlayIcon, SparklesIcon } from '../ui/icons'
import TutorialVideoModal, { TUTORIAL_POSTER_SRC } from './TutorialVideoModal'

/**
 * Tableau de bord d'un compte sans aucune course : une seule chose à faire.
 * Le tuto vidéo est proposé (jamais imposé) juste à côté de l'unique bouton
 * d'action, « Créer ma première course ».
 */
export default function FirstCourseHero({ showBonus }: { showBonus: boolean }) {
  const { t } = useTranslation()
  const [videoOpen, setVideoOpen] = useState(false)

  return (
    <section aria-labelledby="first-course-title">
      <Card variant="elevated" padding="none" className="overflow-hidden">
        <div className="grid md:grid-cols-[minmax(0,1fr)_260px] items-center">
          <div className="p-6 md:p-10">
            <p className="text-eyebrow uppercase text-airmess-red mb-3">
              {t('onboarding.firstCourse.eyebrow')}
            </p>
            <h2 id="first-course-title" className="text-h1 md:text-display-2 text-ink leading-tight">
              {t('onboarding.firstCourse.title')}
            </h2>
            <p className="text-body-l text-warm-600 mt-3 max-w-xl">
              {t('onboarding.firstCourse.body')}
            </p>

            {showBonus && (
              <p className="mt-5 inline-flex items-center gap-2 rounded-full border border-airmess-yellow/60 bg-airmess-yellow/15 px-4 py-2 text-body-s font-semibold text-ink">
                <SparklesIcon size={16} />
                {t('onboarding.firstCourse.bonus')}
              </p>
            )}

            <div className="mt-7 flex flex-col sm:flex-row gap-3">
              <Link to="/courses/new" className="block">
                <Button variant="primary" size="lg" pill fullWidth rightIcon={<ArrowRightIcon size={18} />}>
                  {t('onboarding.firstCourse.cta')}
                </Button>
              </Link>
              <Button
                variant="secondary"
                size="lg"
                pill
                leftIcon={<PlayIcon size={16} />}
                onClick={() => setVideoOpen(true)}
                className="md:hidden"
              >
                {t('onboarding.firstCourse.watch')}
              </Button>
            </div>
          </div>

          {/* Vignette du tuto (desktop) : un clic lance la vidéo */}
          <button
            type="button"
            onClick={() => setVideoOpen(true)}
            className="group relative hidden md:block h-full min-h-[360px] bg-ink cursor-pointer"
            aria-label={t('onboarding.firstCourse.watch')}
          >
            <img
              src={TUTORIAL_POSTER_SRC}
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-80 group-hover:opacity-95 transition-opacity"
            />
            <span className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-airmess-yellow text-ink shadow-glow-yellow group-hover:scale-105 transition-transform motion-reduce:transition-none">
                <PlayIcon size={26} />
              </span>
              <span className="rounded-full bg-ink/75 px-3 py-1 text-caption font-semibold text-cream">
                {t('onboarding.firstCourse.watch')}
              </span>
            </span>
          </button>
        </div>
      </Card>

      <TutorialVideoModal open={videoOpen} onClose={() => setVideoOpen(false)} />
    </section>
  )
}
