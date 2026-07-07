import type { ReactNode } from 'react'

interface Props {
  title: string
  description?: string
  icon?: ReactNode
  children: ReactNode
}

/**
 * Section de formulaire — titre + description + contenu, dans une card claire.
 * Conserve son API d'origine pour ne pas casser les formulaires existants.
 * `icon` (optionnel) : petite icône affichée avant le titre.
 */
export default function FormSection({ title, description, icon, children }: Props) {
  return (
    <section className="bg-off-white border border-warm-200 rounded-lg p-5 md:p-6 mb-4">
      <div className="mb-5 pb-4 border-b border-warm-100">
        <h3 className="text-h3 text-ink font-bold flex items-center gap-2">
          {icon && <span className="text-warm-600 shrink-0 flex" aria-hidden>{icon}</span>}
          {title}
        </h3>
        {description && <p className="text-body-s text-warm-500 mt-1">{description}</p>}
      </div>
      {children}
    </section>
  )
}
