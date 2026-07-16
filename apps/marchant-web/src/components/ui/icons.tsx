import type { SVGProps } from 'react'

/**
 * Petite bibliothèque d'icônes SVG inline.
 * - Trait fin (strokeWidth 1.75), bouts ronds
 * - currentColor pour hériter du parent (text-warm-500, text-ink, etc.)
 * - Par défaut 16×16, ajustable via `size` ou className
 *
 * On préfère ces icônes aux emojis pour les zones sensibles (auth, contrôles
 * de mot de passe) : rendu cohérent quelle que soit la plateforme + couleur
 * pilotable + accessibilité.
 */

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'children'> {
  size?: number
}

function baseProps({ size = 16, ...rest }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.75,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    ...rest,
  }
}

export function EyeIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

export function EyeOffIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M9.88 9.88a3 3 0 0 0 4.24 4.24" />
      <path d="M10.73 5.08A11 11 0 0 1 12 5c6.5 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3.5 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" y1="2" x2="22" y2="22" />
    </svg>
  )
}

export function MailIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  )
}

export function LockIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  )
}

export function PhoneIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.86 19.86 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.86 19.86 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.8a2 2 0 0 1-.45 2.11L8.1 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.84.57 2.8.7A2 2 0 0 1 22 16.92Z" />
    </svg>
  )
}

export function UserIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  )
}

export function ArrowLeftIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  )
}

/* ============================================================
   Icônes Admin / Console
   ============================================================ */

export function DashboardIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  )
}

export function StoreIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M3 9 4.5 4h15L21 9" />
      <path d="M3 9v11h18V9" />
      <path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0" />
      <path d="M9 20v-6h6v6" />
    </svg>
  )
}

export function UsersIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

export function PackageIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="m7.5 4.27 9 5.15" />
      <path d="M21 8 12 3 3 8l9 5 9-5Z" />
      <path d="M3 8v8l9 5 9-5V8" />
      <path d="M12 13v9" />
    </svg>
  )
}

export function BikeIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <circle cx="5.5" cy="17.5" r="3.5" />
      <circle cx="18.5" cy="17.5" r="3.5" />
      <path d="M15 6h3l3 5h-7" />
      <path d="m9 17.5 3-6 3 6" />
      <path d="m6 11 3-3h3" />
    </svg>
  )
}

export function AlertTriangleIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

export function BankIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="m3 10 9-7 9 7" />
      <path d="M5 10v9h14v-9" />
      <line x1="8" y1="13" x2="8" y2="17" />
      <line x1="12" y1="13" x2="12" y2="17" />
      <line x1="16" y1="13" x2="16" y2="17" />
      <line x1="3" y1="21" x2="21" y2="21" />
    </svg>
  )
}

export function BarChartIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <line x1="4" y1="20" x2="4" y2="10" />
      <line x1="10" y1="20" x2="10" y2="4" />
      <line x1="16" y1="20" x2="16" y2="14" />
      <line x1="2" y1="20" x2="22" y2="20" />
    </svg>
  )
}

export function SettingsIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
  )
}

export function BellIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}

export function LogOutIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}

export function SearchIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

export function MenuIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  )
}

export function CloseIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

export function ChevronLeftIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}

export function CheckIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

export function ClockIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

export function CodeIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  )
}

export function GlobeIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  )
}

// Sac (livraison) — sac isotherme
export function BagIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
      <path d="M3 6h18" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  )
}

// Carte d'identité — section identité
export function IdCardIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="8.5" cy="11" r="2" />
      <path d="M5.5 16c.4-1.3 1.5-2 3-2s2.6.7 3 2" />
      <line x1="14" y1="10" x2="18" y2="10" />
      <line x1="14" y1="14" x2="18" y2="14" />
    </svg>
  )
}

// Point d'interrogation cerclé — bouton "Aide" / onboarding
export function HelpCircleIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

// Étincelles — accent onboarding, "nouveauté", CTA final du guide
export function SparklesIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
      <path d="M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  )
}

// Épingle carte — étape "où" du guide (origine/destination)
export function MapPinIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}

// Route — étape "un livreur prend en charge"
export function RouteIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <circle cx="6" cy="19" r="3" />
      <path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15" />
      <circle cx="18" cy="5" r="3" />
    </svg>
  )
}

// Œil radar — étape "suivez en temps réel"
export function RadarIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" opacity="0.5" />
      <circle cx="12" cy="12" r="1.75" />
      <path d="M12 3v3" />
    </svg>
  )
}

// Moto — type de véhicule (carénage + guidon haut)
export function MotorcycleIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <circle cx="5" cy="17" r="3.5" />
      <circle cx="19" cy="17" r="3.5" />
      <path d="M9.5 17 12 11h3.5" />
      <path d="M12 11 9.5 8H7" />
      <path d="M15.5 11 17 8h1.5" />
      <path d="M17 8l2 9" />
    </svg>
  )
}

// Scooter — type de véhicule (plancher plat + colonne de direction)
export function ScooterIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <circle cx="5.5" cy="17.5" r="3" />
      <circle cx="18.5" cy="17.5" r="3" />
      <path d="M8.5 17.5h4L15 6h2.5" />
      <path d="M15.5 8.5 18 17.5" />
      <path d="M13.5 6H15" />
    </svg>
  )
}

// Voiture — type de véhicule
export function CarIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M5 11 6.5 6.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.5L19 11" />
      <path d="M3 16v-3a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v3" />
      <path d="M3 16h18" />
      <circle cx="7" cy="16" r="2" />
      <circle cx="17" cy="16" r="2" />
    </svg>
  )
}

// Fichier texte — section documents
export function FileTextIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2v6h6" />
      <line x1="9" y1="13" x2="15" y2="13" />
      <line x1="9" y1="17" x2="13" y2="17" />
    </svg>
  )
}

// Smartphone — bannière téléchargement app
export function SmartphoneIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <rect x="7" y="2" width="10" height="20" rx="2" />
      <line x1="11" y1="18" x2="13" y2="18" />
    </svg>
  )
}

// Appareil photo — capture de documents
export function CameraIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M4 7h3l2-3h6l2 3h3a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  )
}

// Trombone — bouton "choisir un fichier"
export function PaperclipIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
  )
}

// WhatsApp — canal de réponse (bulle + combiné, style trait maison)
export function WhatsappIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M12 3a9 9 0 0 0-7.8 13.5L3 21l4.65-1.15A9 9 0 1 0 12 3Z" />
      <path d="M9.3 8.2c-.6.6-.6 1.7.1 2.9a9.2 9.2 0 0 0 3.5 3.5c1.2.7 2.3.7 2.9.1l.5-.5-1.9-1.3-1 .7a7.1 7.1 0 0 1-2.5-2.5l.7-1-1.3-1.9-.5.5" />
    </svg>
  )
}

// Logo Google — bouton "Continuer avec Google" (couleurs officielles, en fill :
// exception assumée au style trait, une marque ne se redessine pas).
export function GoogleIcon({ size = 16, ...rest }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden {...rest}>
      <path d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.63h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.58-5.17 3.58-8.8Z" fill="#4285F4" />
      <path d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.88-3.01c-1.07.72-2.44 1.15-4.06 1.15-3.13 0-5.78-2.11-6.72-4.95H1.27v3.1A12 12 0 0 0 12 24Z" fill="#34A853" />
      <path d="M5.28 14.28a7.2 7.2 0 0 1 0-4.56v-3.1H1.27a12 12 0 0 0 0 10.76l4.01-3.1Z" fill="#FBBC05" />
      <path d="M12 4.77c1.76 0 3.34.61 4.59 1.8l3.44-3.44A11.98 11.98 0 0 0 1.27 6.62l4.01 3.1C6.22 6.88 8.87 4.77 12 4.77Z" fill="#EA4335" />
    </svg>
  )
}

// Flocon — chaîne du froid / sac réfrigéré
export function SnowflakeIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <line x1="12" y1="2" x2="12" y2="22" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
      <line x1="19.07" y1="4.93" x2="4.93" y2="19.07" />
      <path d="M12 2 9.5 4.5M12 2l2.5 2.5M12 22l-2.5-2.5M12 22l2.5-2.5" />
      <path d="M2 12l2.5-2.5M2 12l2.5 2.5M22 12l-2.5-2.5M22 12l-2.5 2.5" />
    </svg>
  )
}
