import type { ReactNode } from 'react'

/**
 * Composant signature Air Mess — surligneur "Stabilo" jaune (ou rouge) sous un mot.
 *
 * Règles d'usage (à respecter pour préserver l'impact) :
 * - Max 1 mot par phrase, jamais 2 mots côte à côte
 * - Uniquement sur les mots-clés d'action/bénéfice :
 *   livraison(s) · courses · wallet · express · temps réel · marchand · livreur
 * - Uniquement sur les headlines (H1/H2), jamais dans le body
 * - Une seule fois par page (sauf sections distinctes)
 *
 * Le tracé SVG est volontairement irrégulier (courbes Bézier) pour évoquer
 * un coup de marker manuel, pas un background CSS plat.
 */
interface Props {
  children: ReactNode
  /** Couleur du surlignage. Par défaut jaune brand. `red` reste rare. */
  color?: 'yellow' | 'red'
  /** Classes additionnelles sur le span parent. */
  className?: string
}

export default function Highlight({ children, color = 'yellow', className = '' }: Props) {
  const fillColor = color === 'red' ? '#D40511' : '#FFCC00'
  // Le rouge est plus saturé donc on baisse l'opacité pour rester lisible
  const opacity = color === 'red' ? 0.22 : 0.65

  return (
    <span className={`relative inline-block ${className}`}>
      {/* Le mot lui-même reste au-dessus du marker */}
      <span className="relative z-10">{children}</span>

      {/* Le coup de Stabilo — SVG tracé irrégulier, animé en draw-in au mount */}
      <svg
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 -mb-0.5 h-[55%] w-full pointer-events-none ams-anim-highlight-draw"
        viewBox="0 0 200 30"
        preserveAspectRatio="none"
      >
        <path
          d="M3 22 Q 35 8, 75 18 T 145 16 Q 175 10, 197 22 L 197 30 L 3 30 Z"
          fill={fillColor}
          opacity={opacity}
        />
      </svg>
    </span>
  )
}
