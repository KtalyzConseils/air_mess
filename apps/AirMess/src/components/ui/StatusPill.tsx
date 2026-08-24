import { View, Text } from 'react-native'

/**
 * StatusPill — badge de statut inline.
 *
 * Convention couleur cohérente avec les callouts email + admin pages :
 *   success : livrée, disponible, validé
 *   warning : en cours, en attente, à préparer
 *   danger  : échec, refus, suspendu
 *   info    : neutre informatif
 *   neutral : off/hors-ligne/statut faible
 *
 * `size='lg'` sert au badge géant "En course" affiché plein cadre sur la home.
 */

type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral'
type Size = 'sm' | 'md' | 'lg'

interface Props {
  tone: Tone
  size?: Size
  children: React.ReactNode
  /** Pastille circulaire à gauche du label (dot). */
  dot?: boolean
}

const TONE: Record<Tone, { bg: string; text: string; dot: string }> = {
  success: { bg: 'bg-success-bg', text: 'text-success', dot: 'bg-success' },
  warning: { bg: 'bg-warning-bg', text: 'text-warning', dot: 'bg-warning' },
  danger:  { bg: 'bg-danger-bg',  text: 'text-airmess-red', dot: 'bg-airmess-red' },
  info:    { bg: 'bg-info-bg',    text: 'text-info',    dot: 'bg-info' },
  neutral: { bg: 'bg-warm-200',   text: 'text-warm-600', dot: 'bg-warm-500' },
}

const SIZE: Record<Size, { container: string; text: string; dot: string }> = {
  sm: { container: 'px-2 py-0.5 rounded-md',      text: 'text-xs font-bold',   dot: 'w-1.5 h-1.5' },
  md: { container: 'px-3 py-1 rounded-lg',        text: 'text-sm font-bold',   dot: 'w-2 h-2' },
  lg: { container: 'px-4 py-2 rounded-xl',        text: 'text-base font-extrabold', dot: 'w-2.5 h-2.5' },
}

export default function StatusPill({ tone, size = 'md', children, dot = false }: Props) {
  const t = TONE[tone]
  const s = SIZE[size]
  return (
    <View className={['flex-row items-center self-start', s.container, t.bg].join(' ')}>
      {dot && (
        <View className={['rounded-full mr-2', s.dot, t.dot].join(' ')} />
      )}
      <Text className={[s.text, t.text].join(' ')}>{children}</Text>
    </View>
  )
}
