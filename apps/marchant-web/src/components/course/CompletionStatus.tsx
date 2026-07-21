import { useTranslation } from 'react-i18next'
import { AlertTriangleIcon, CheckIcon } from '../ui/icons'

interface Props {
  missingCount: number
  variant?: 'panel' | 'compact'
}

/**
 * Badge de complétion — signal "prêt à envoyer" ou "il te reste N champs".
 * Deux variantes :
 * - panel   : pleine largeur, pour le panneau récap desktop et la sheet mobile
 * - compact : petite pastille, pour intégration inline (si besoin plus tard)
 */
export default function CompletionStatus({ missingCount, variant = 'panel' }: Props) {
  const { t } = useTranslation()
  const ready = missingCount === 0

  if (variant === 'compact') {
    return (
      <span
        className={[
          'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-caption font-semibold',
          ready ? 'bg-success-bg text-success' : 'bg-warning-bg text-warning',
        ].join(' ')}
      >
        {ready ? <CheckIcon size={12} /> : <AlertTriangleIcon size={12} />}
        {ready
          ? t('courses.new.completion.ready')
          : t('courses.new.completion.missing', { count: missingCount })}
      </span>
    )
  }

  return (
    <div
      className={[
        'px-5 py-3 flex items-start gap-2 border-t border-warm-100',
        ready ? 'bg-success-bg text-success' : 'bg-warning-bg text-warning',
      ].join(' ')}
      role="status"
    >
      <span className="mt-0.5 shrink-0">
        {ready ? <CheckIcon size={16} /> : <AlertTriangleIcon size={16} />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-caption font-semibold">
          {ready
            ? t('courses.new.completion.readyTitle')
            : t('courses.new.completion.missingTitle', { count: missingCount })}
        </p>
        <p className="text-caption">
          {ready
            ? t('courses.new.completion.readyHint')
            : t('courses.new.completion.missingHint')}
        </p>
      </div>
    </div>
  )
}
