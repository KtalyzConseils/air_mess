import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { CloseIcon } from '../ui/icons'

export const TUTORIAL_VIDEO_SRC = '/videos/airmess-tuto-demo.mp4'
export const TUTORIAL_POSTER_SRC = '/videos/airmess-tuto-demo-poster.jpg'

interface Props {
  open: boolean
  onClose: () => void
}

/**
 * Lecteur du tuto « Créer une course » (vidéo verticale ~3 min, 720×1772, servie depuis
 * /public/videos, hors précache PWA). Ne s'ouvre que sur action de l'utilisateur.
 */
export default function TutorialVideoModal({ open, onClose }: Props) {
  const { t } = useTranslation()

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-ink/80 backdrop-blur-sm p-4 ams-anim-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label={t('onboarding.firstCourse.videoTitle')}
      onClick={onClose}
    >
      <div className="relative" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('common.close')}
          className="absolute -top-12 right-0 inline-flex h-11 w-11 items-center justify-center rounded-full bg-off-white/10 text-cream hover:bg-off-white/20 transition-colors cursor-pointer"
        >
          <CloseIcon size={20} />
        </button>
        <video
          src={TUTORIAL_VIDEO_SRC}
          poster={TUTORIAL_POSTER_SRC}
          controls
          autoPlay
          playsInline
          preload="metadata"
          className="block max-h-[82vh] w-auto max-w-[92vw] aspect-[720/1772] rounded-2xl bg-ink shadow-2xl"
        />
      </div>
    </div>
  )
}
