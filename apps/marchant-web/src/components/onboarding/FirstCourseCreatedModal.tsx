import { useTranslation } from 'react-i18next'
import Button from '../ui/Button'
import { ArrowRightIcon, CheckIcon } from '../ui/icons'

interface Props {
  courseId: number
  onView: () => void
  onClose: () => void
}

/** Étape 2 du parcours : confirmation de la toute première course, avec un seul prochain pas. */
export default function FirstCourseCreatedModal({ courseId, onView, onClose }: Props) {
  const { t } = useTranslation()

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-ink/65 px-4 py-8 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`first-course-created-${courseId}`}
    >
      <div className="w-full max-w-md rounded-2xl border border-warm-200 bg-off-white p-7 text-center shadow-2xl md:p-10 ams-anim-scale-in">
        <div
          className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-success text-off-white"
          aria-hidden="true"
        >
          <CheckIcon size={30} />
        </div>
        <h2 id={`first-course-created-${courseId}`} className="text-h1 text-ink mb-3">
          {t('onboarding.firstCourse.createdTitle')}
        </h2>
        <p className="text-body-l text-warm-600 mb-7">{t('onboarding.firstCourse.createdBody')}</p>
        <Button variant="primary" size="lg" pill fullWidth rightIcon={<ArrowRightIcon size={18} />} onClick={onView}>
          {t('onboarding.firstCourse.createdCta')}
        </Button>
        <button
          type="button"
          onClick={onClose}
          className="mt-3 text-body-s font-medium text-warm-600 hover:text-ink cursor-pointer"
        >
          {t('onboarding.firstCourse.later')}
        </button>
      </div>
    </div>
  )
}
