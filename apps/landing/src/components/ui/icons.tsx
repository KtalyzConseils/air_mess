export interface IconProps {
  size?: number
  className?: string
}

function baseProps({ size = 24, className }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    className,
  }
}

export function ArrowLeftIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
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

export function ShareIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  )
}

export function SparklesIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Z" />
      <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z" />
    </svg>
  )
}

export function StoreIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M3 9l1-4h16l1 4" />
      <path d="M4 9v11h16V9" />
      <path d="M4 9h16" />
      <path d="M9 20v-5h6v5" />
    </svg>
  )
}

export function WhatsappIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M12 3a9 9 0 0 0-7.8 13.5L3 21l4.65-1.15A9 9 0 1 0 12 3Z" />
      <path d="M9.3 8.2c-.6.6-.6 1.7.1 2.9a9.2 9.2 0 0 0 3.5 3.5c1.2.7 2.3.7 2.9.1l.5-.5-1.9-1.3-1 .7a7.1 7.1 0 0 1-2.5-2.5l.7-1-1.3-1.9-.5.5" />
    </svg>
  )
}