import { View, type ViewProps } from 'react-native'

/**
 * Card — conteneur générique.
 *
 * Variants :
 *   - default   : off-white + border warm-200 (par défaut)
 *   - elevated  : off-white + shadow-card (pour se détacher du fond cream)
 *   - dark      : dark bg + text light (utilisé pour la course active ou
 *                 les blocs "on-duty")
 *   - accent    : jaune brand — CTA visuel, blocs d'action prioritaires
 *   - warning / danger / success : versions colorées pour états
 */

type Variant = 'default' | 'elevated' | 'dark' | 'accent' | 'warning' | 'danger' | 'success'
type Padding = 'none' | 'sm' | 'md' | 'lg'

interface Props extends ViewProps {
  variant?: Variant
  padding?: Padding
  children: React.ReactNode
}

const PADDING: Record<Padding, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-5',
}

const VARIANT: Record<Variant, string> = {
  default:  'bg-off-white border border-warm-200',
  elevated: 'bg-off-white shadow-card',
  dark:     'bg-airmess-dark',
  accent:   'bg-airmess-yellow',
  warning:  'bg-warning-bg border border-warning/30',
  danger:   'bg-danger-bg border border-airmess-red/30',
  success:  'bg-success-bg border border-success/30',
}

export default function Card({
  variant = 'default',
  padding = 'md',
  className = '',
  children,
  ...rest
}: Props) {
  return (
    <View
      className={['rounded-2xl', VARIANT[variant], PADDING[padding], className].join(' ')}
      {...rest}
    >
      {children}
    </View>
  )
}
