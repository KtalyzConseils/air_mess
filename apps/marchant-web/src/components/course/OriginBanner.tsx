import { useTranslation } from 'react-i18next'
import { PencilIcon, MapPinIcon, AlertTriangleIcon } from '../ui/icons'

interface Props {
  name: string
  quartier: string
  city: string
  onEdit: () => void
  /**
   * Signale un ou plusieurs champs d'origine invalides (nom, tel, quartier, ville).
   * Ajoute une bordure rouge + un pictogramme d'alerte, et une ligne d'erreur
   * cliquable qui pointe vers le drawer d'édition.
   */
  hasError?: boolean
  errorMessage?: string
}

/**
 * Bannière compacte "De: {expéditeur} — {quartier}, {ville}" avec un bouton
 * "Modifier" à droite. Rend visible que le retrait est pré-rempli sans
 * occuper un écran de formulaire complet.
 */
export default function OriginBanner({ name, quartier, city, onEdit, hasError, errorMessage }: Props) {
  const { t } = useTranslation()
  const displayName = name?.trim() || t('courses.new.originBanner.placeholder')
  const location = [quartier, city].filter(Boolean).join(', ')

  return (
    <div
      className={[
        'flex items-center gap-3 rounded-lg border bg-off-white px-4 py-3 transition-colors',
        hasError ? 'border-airmess-red border-2 shadow-[0_0_0_3px_rgba(212,5,17,0.12)]' : 'border-warm-200',
      ].join(' ')}
    >
      <span
        className={[
          'shrink-0 grid h-9 w-9 place-items-center rounded-full',
          hasError ? 'bg-airmess-red/15 text-airmess-red' : 'bg-airmess-yellow/20 text-ink',
        ].join(' ')}
      >
        {hasError ? <AlertTriangleIcon size={18} /> : <MapPinIcon size={18} />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-caption text-warm-500 uppercase tracking-wide">
          {t('courses.new.originBanner.label')}
        </p>
        <p className="text-body font-semibold text-ink truncate">{displayName}</p>
        {location && !hasError && (
          <p className="text-caption text-warm-500 truncate">{location}</p>
        )}
        {hasError && (
          <p className="text-caption text-airmess-red font-medium truncate">
            {errorMessage ?? t('courses.new.originBanner.errorGeneric')}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={onEdit}
        className={[
          'shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-caption font-semibold transition-colors',
          hasError
            ? 'border-airmess-red bg-airmess-red text-white hover:bg-airmess-red/90'
            : 'border-warm-300 bg-off-white text-ink hover:border-airmess-yellow hover:bg-airmess-yellow/10',
        ].join(' ')}
      >
        <PencilIcon size={14} />
        {hasError ? t('courses.new.originBanner.fix') : t('courses.new.originBanner.edit')}
      </button>
    </div>
  )
}
