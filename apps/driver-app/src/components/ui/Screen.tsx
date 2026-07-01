import { View, ScrollView, StatusBar, type ViewProps } from 'react-native'
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
  cream: 'bg-cream',
  dark: 'bg-airmess-dark',
  white: 'bg-off-white',
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
  const barStyle = variant === 'dark' ? 'light-content' : 'dark-content'

  const Content = scroll ? ScrollView : View
  const contentProps = scroll
    ? {
        contentContainerStyle: { paddingTop: py, paddingBottom: py + 24 },
        showsVerticalScrollIndicator: false,
      }
    : {
        style: { paddingTop: py, paddingBottom: py },
      }

  return (
    <SafeAreaView className={['flex-1', bg].join(' ')} edges={['top', 'left', 'right']}>
      <StatusBar barStyle={barStyle} translucent backgroundColor="transparent" />
      <Content className={['flex-1', className].join(' ')} {...contentProps} {...rest}>
        {children}
      </Content>
    </SafeAreaView>
  )
}
