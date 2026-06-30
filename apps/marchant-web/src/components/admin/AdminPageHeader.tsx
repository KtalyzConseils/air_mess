import type { ReactNode } from 'react'

interface AdminPageHeaderProps {
  title: string
  subtitle?: string
  /** Élément à droite : boutons d'action, filtres rapides, etc. */
  actions?: ReactNode
  /** Barre additionnelle sous le titre (filtres, tabs, recherche…). */
  toolbar?: ReactNode
}

/**
 * Header de page admin — compact, dense, sans fioritures.
 *
 * Anti-pattern marchant : pas de `PageEyebrow` + `display-2`. L'admin n'a
 * pas besoin de "présenter" son sujet, juste de l'identifier.
 *
 * Layout :
 *   Titre               · subtitle             [Actions à droite]
 *   ──────────────────────────────────────────────────────────────
 *   [toolbar facultative : filtres, tabs, search]
 */
export default function AdminPageHeader({ title, subtitle, actions, toolbar }: AdminPageHeaderProps) {
  return (
    <div className="border-b border-warm-200 bg-off-white">
      <div className="px-4 md:px-6 lg:px-8 py-4 md:py-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <h1 className="text-h2 text-ink font-bold leading-tight">{title}</h1>
            {subtitle && (
              <p className="text-body-s text-warm-500 mt-0.5">{subtitle}</p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
        </div>
      </div>
      {toolbar && (
        <div className="px-4 md:px-6 lg:px-8 py-3 border-t border-warm-200 bg-cream/50">
          {toolbar}
        </div>
      )}
    </div>
  )
}
