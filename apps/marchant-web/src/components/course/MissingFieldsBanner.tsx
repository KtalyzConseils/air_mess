import { useTranslation } from 'react-i18next'
import { AlertTriangleIcon } from '../ui/icons'

export interface MissingField {
  fieldName: string
  label: string
}

interface Props {
  fields: MissingField[]
  onFieldClick: (fieldName: string) => void
}

/**
 * Bandeau d'erreurs au submit — liste les champs obligatoires manquants
 * avec des liens cliquables. Le parent gère la navigation (scroll, focus,
 * auto-ouverture du drawer / accordéon / carte).
 *
 * Ne s'affiche que si `fields.length > 0` — le parent contrôle le fait
 * qu'il n'apparaît qu'après une tentative de submit (formState.isSubmitted).
 */
export default function MissingFieldsBanner({ fields, onFieldClick }: Props) {
  const { t } = useTranslation()
  if (fields.length === 0) return null

  return (
    <div
      role="alert"
      className="mb-4 rounded-xl border border-airmess-red/40 bg-danger-bg px-5 py-4 ams-anim-fade-in"
    >
      <div className="flex items-start gap-3">
        <span className="text-airmess-red shrink-0 mt-0.5">
          <AlertTriangleIcon size={20} />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-body-s font-bold text-airmess-red">
            {t('courses.new.errors.title', { count: fields.length })}
          </p>
          <p className="text-caption text-warm-600 mt-0.5">
            {t('courses.new.errors.subtitle')}
          </p>
          <ul className="mt-2.5 flex flex-wrap gap-x-2 gap-y-1.5">
            {fields.map((f) => (
              <li key={f.fieldName}>
                <button
                  type="button"
                  onClick={() => onFieldClick(f.fieldName)}
                  className="text-body-s text-ink font-medium underline underline-offset-2 decoration-airmess-red/40 hover:decoration-airmess-red hover:text-airmess-red transition-colors"
                >
                  {f.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
