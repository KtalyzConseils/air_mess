import { forwardRef } from 'react'
import { Pressable, Text, ActivityIndicator, View, type PressableProps } from 'react-native'

/**
 * Button — primitif tactile Air Mess Driver.
 *
 * Cibles tactiles : 48px min (`md`), 56px (`lg`), 64px (`xl` pour l'action
 * principale de la course active). Toujours ≥ HIG 44px.
 *
 * Variants :
 *   - primary  : fond jaune brand — actions positives, CTA principal
 *   - dark     : fond dark #1A1614 — actions secondaires, dispo toggle off
 *   - danger   : fond rouge brand — refus, incident, échec
 *   - ghost    : transparent + bordure — actions tertiaires
 *   - outline  : fond off-white + bordure — actions neutres
 */

type Variant = 'primary' | 'dark' | 'danger' | 'ghost' | 'outline'
type Size = 'md' | 'lg' | 'xl'

interface Props extends Omit<PressableProps, 'children' | 'style'> {
  children: React.ReactNode
  variant?: Variant
  size?: Size
  loading?: boolean
  fullWidth?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const SIZE_CLASSES: Record<Size, string> = {
  md: 'h-12 px-4',   // 48px
  lg: 'h-14 px-5',   // 56px
  xl: 'h-16 px-6',   // 64px — action principale course
}

const TEXT_SIZE_CLASSES: Record<Size, string> = {
  md: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
}

// Chaque variant expose : container + texte, plus l'overlay au press.
const VARIANT: Record<
  Variant,
  { container: string; text: string; disabled: string; pressed: string }
> = {
  primary: {
    container: 'bg-airmess-yellow',
    text: 'text-ink font-extrabold',
    disabled: 'opacity-40',
    pressed: 'bg-airmess-yellow-hi',
  },
  dark: {
    container: 'bg-airmess-dark',
    text: 'text-white font-bold',
    disabled: 'opacity-40',
    pressed: 'bg-warm-600',
  },
  danger: {
    container: 'bg-airmess-red',
    text: 'text-white font-bold',
    disabled: 'opacity-40',
    pressed: 'bg-airmess-red/85',
  },
  ghost: {
    container: 'bg-transparent',
    text: 'text-ink font-semibold',
    disabled: 'opacity-40',
    pressed: 'bg-warm-100',
  },
  outline: {
    container: 'bg-off-white border-2 border-warm-300',
    text: 'text-ink font-semibold',
    disabled: 'opacity-40',
    pressed: 'bg-cream',
  },
}

const Button = forwardRef<View, Props>(function Button(
  {
    children,
    variant = 'primary',
    size = 'lg',
    loading = false,
    disabled,
    fullWidth = true,
    leftIcon,
    rightIcon,
    ...rest
  },
  ref,
) {
  const v = VARIANT[variant]
  const isDisabled = disabled || loading

  return (
    <Pressable
      ref={ref}
      disabled={isDisabled}
      accessibilityRole="button"
      className={[
        'rounded-2xl flex-row items-center justify-center',
        SIZE_CLASSES[size],
        v.container,
        fullWidth ? 'w-full' : '',
        isDisabled ? v.disabled : '',
      ].join(' ')}
      style={({ pressed }) => (pressed && !isDisabled ? { opacity: 0.9 } : undefined)}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' || variant === 'outline' || variant === 'ghost' ? '#1A1614' : '#ffffff'} />
      ) : (
        <>
          {leftIcon && <View className="mr-2">{leftIcon}</View>}
          <Text className={[TEXT_SIZE_CLASSES[size], v.text].join(' ')} numberOfLines={1}>
            {children}
          </Text>
          {rightIcon && <View className="ml-2">{rightIcon}</View>}
        </>
      )}
    </Pressable>
  )
})

export default Button
