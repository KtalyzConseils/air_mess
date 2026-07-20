import { useTranslation } from 'react-i18next'
import { PencilIcon, MapPinIcon } from '../ui/icons'

interface Props {
  name: string
  quartier: string
  city: string
  onEdit: () => void
}

/**
 * Bannière compacte "De: {expéditeur} — {quartier}, {ville}" avec un bouton
 * "Modifier" à droite. Rend visible que le retrait est pré-rempli sans
 * occuper un écran de formulaire complet.
 */
export default function OriginBanner({ name, quartier, city, onEdit }: Props) {
  const { t } = useTranslation()
  const displayName = name?.trim() || t('courses.new.originBanner.placeholder')
  const location = [quartier, city].filter(Boolean).join(', ')

  return (
    <div className="flex items-center gap-3 rounded-lg border border-warm-200 bg-off-white px-4 py-3">
      <span className="shrink-0 grid h-9 w-9 place-items-center rounded-full bg-airmess-yellow/20 text-ink">
        <MapPinIcon size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-caption text-warm-500 uppercase tracking-wide">
          {t('courses.new.originBanner.label')}
        </p>
        <p className="text-body font-semibold text-ink truncate">{displayName}</p>
        {location && (
          <p className="text-caption text-warm-500 truncate">{location}</p>
        )}
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-warm-300 bg-off-white px-3 py-1.5 text-caption font-medium text-ink hover:border-airmess-yellow hover:bg-airmess-yellow/10 transition-colors"
      >
        <PencilIcon size={14} />
        {t('courses.new.originBanner.edit')}
      </button>
    </div>
  )
}
