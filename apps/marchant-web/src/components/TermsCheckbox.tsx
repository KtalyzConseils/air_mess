import { Link } from 'react-router-dom'
import { Trans, useTranslation } from 'react-i18next'

interface Props {
  checked: boolean
  onChange: (checked: boolean) => void
  /** Erreur affichée sous le champ (typiquement "Vous devez accepter les CGU"). */
  error?: string
}

/**
 * Checkbox d'acceptation des CGU + politique de confidentialité — obligatoire
 * sur les 3 formulaires d'inscription (marchand, particulier, driver).
 * Le back exige `accepted_terms=true` (règle Laravel `accepted`).
 */
export default function TermsCheckbox({ checked, onChange, error }: Props) {
  const { t } = useTranslation()

  return (
    <div>
      <label
        className={[
          'flex items-start gap-3 cursor-pointer bg-cream/50 rounded-xl px-4 py-3 transition-colors border',
          error ? 'border-airmess-red bg-airmess-red/5' : 'border-warm-200 hover:bg-cream',
        ].join(' ')}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-0.5 h-4 w-4 accent-airmess-yellow shrink-0"
        />
        <span className="text-caption text-ink leading-relaxed">
          <Trans
            i18nKey="legal.checkbox.label"
            t={t}
            components={{
              terms: (
                <Link
                  to="/legal/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold underline underline-offset-2 hover:text-airmess-red"
                  onClick={(e) => e.stopPropagation()}
                />
              ),
              privacy: (
                <Link
                  to="/legal/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold underline underline-offset-2 hover:text-airmess-red"
                  onClick={(e) => e.stopPropagation()}
                />
              ),
            }}
          />
        </span>
      </label>
      {error && (
        <p className="mt-1.5 text-caption text-airmess-red">{error}</p>
      )}
    </div>
  )
}
