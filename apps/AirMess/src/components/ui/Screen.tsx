import { View, type ViewProps } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller'
import { SafeAreaView } from 'react-native-safe-area-context'

/**
 * Screen — wrapper standard pour toutes les pages de l'app driver.
 *
 * Responsabilités :
 *   - Safe area (encoche iPhone, notch Android)
 *   - Fond brand (cream par défaut, dark si `variant='dark'`)
 *   - StatusBar contrastée
 *   - Scroll optionnel (`scroll=true`)
 *
 * Ne gère PAS le padding horizontal — c'est aux enfants d'aligner leur
 * contenu (permet des blocs full-bleed comme les headers ou les maps).
 */

type Variant = 'cream' | 'dark' | 'white'

interface Props extends ViewProps {
  variant?: Variant
  scroll?: boolean
  /** Padding vertical top/bottom appliqué au contenu. */
  py?: number
  children: React.ReactNode
}

const BG: Record<Variant, string> = {
  cream: 'bg-cream dark:bg-[#0F1115]',
  dark: 'bg-airmess-dark',
  white: 'bg-off-white dark:bg-[#151821]',
}

export default function Screen({
  variant = 'cream',
  scroll = false,
  py = 0,
  className = '',
  children,
  ...rest
}: Props) {
  const bg = BG[variant]
  const barStyle = variant === 'dark' ? 'light' : 'dark'
  return (
    <SafeAreaView className={['flex-1', bg].join(' ')} edges={['top', 'left', 'right']}>
      <StatusBar style={barStyle} animated />
      {scroll ? (
        <KeyboardAwareScrollView
          className={['flex-1', className].join(' ')}
          contentContainerStyle={{ paddingTop: py, paddingBottom: py + 24 }}
          bottomOffset={96}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
          {...rest}
        >
          {children}
        </KeyboardAwareScrollView>
      ) : (
        <View
          className={['flex-1', className].join(' ')}
          style={{ paddingTop: py, paddingBottom: py }}
          {...rest}
        >
          {children}
        </View>
      )}
    </SafeAreaView>
  )
}
