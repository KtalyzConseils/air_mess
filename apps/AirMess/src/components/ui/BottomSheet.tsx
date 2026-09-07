import { Modal, View, Text, Pressable, ScrollView } from 'react-native'
import {
  KeyboardAvoidingView,
  KeyboardProvider,
} from 'react-native-keyboard-controller'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useThemeStore } from '../../stores/themeStore'

/**
 * BottomSheet — modal qui glisse depuis le bas de l'écran.
 *
 * Choix produit :
 *   - Pattern natif ("action sheet" / "half sheet") plus adapté au terrain
 *     qu'une modal centrée (plus proche du pouce, moins d'attention volée).
 *   - Header : drag handle (indicatif) + titre + close.
 *   - Contenu scrollable + footer d'actions.
 *
 * Fiabilité layout (leçons terrain) :
 *   - KeyboardAvoidingView EN DEHORS de la sheet (au niveau du backdrop, flex:1) :
 *     quand le clavier s'ouvre, toute la sheet est SOULEVÉE au-dessus du clavier
 *     (champ + footer visibles). Le mettre à l'intérieur ne suffit pas — la sheet
 *     reste ancrée en bas, derrière le clavier.
 *   - Safe-area bas sur le footer : sur Android edge-to-edge (RN 0.85), la barre de
 *     navigation système chevauchait les boutons Annuler/Continuer.
 */

interface Props {
  visible: boolean
  onClose: () => void
  title: string
  subtitle?: string
  /** Bloc d'actions au bas de la sheet (boutons Annuler/Confirmer). */
  footer?: React.ReactNode
  children: React.ReactNode
}

export default function BottomSheet({
  visible,
  onClose,
  title,
  subtitle,
  footer,
  children,
}: Props) {
  const theme = useThemeStore((state) => state.theme)
  const iconColor = theme === 'dark' ? '#FDFCF9' : '#1A1614'

  const insets = useSafeAreaInsets()
  // Marge basse : dégage la barre de navigation système (gestes / 3 boutons).
  const bottomPad = Math.max(16, insets.bottom + 12)

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      statusBarTranslucent
      navigationBarTranslucent
    >
      {/* KeyboardProvider requis DANS le Modal : le provider racine ne traverse
          pas la hiérarchie native d'un Modal RN. */}
      <KeyboardProvider navigationBarTranslucent statusBarTranslucent>
        {/* KeyboardAvoidingView au niveau backdrop : soulève la sheet entière
            au-dessus du clavier quand un champ est focalisé. */}
        <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
          {/* Backdrop cliquable pour fermer */}
          <Pressable onPress={onClose} className="flex-1 bg-airmess-dark/50 justify-end">
            {/* On stoppe la propagation pour que le contenu ne ferme pas */}
            <Pressable
              onPress={() => {}}
              className="bg-cream rounded-t-3xl overflow-hidden dark:bg-[#0F1115]"
              style={{ maxHeight: '92%' }}
            >
              {/* Drag handle */}
              <View className="items-center pt-3 pb-1">
                <View className="w-10 h-1 rounded-full bg-warm-300" />
              </View>

              {/* Header */}
              <View className="px-5 pt-2 pb-3 flex-row items-start">
                <View className="flex-1">
                  <Text className="text-xl font-extrabold text-ink dark:text-white">{title}</Text>
                  {subtitle && (
                    <Text className="text-xs text-warm-500 mt-1 dark:text-[#AEB6C5]">{subtitle}</Text>
                  )}
                </View>
                <Pressable
                  onPress={onClose}
                  className="w-9 h-9 rounded-full bg-off-white border border-warm-200 items-center justify-center dark:bg-[#181B24] dark:border-[#343A46]"
                  style={({ pressed }) => (pressed ? { opacity: 0.85 } : undefined)}
                  hitSlop={8}
                >
                  <Ionicons name="close" size={18} color={iconColor} />
                </Pressable>
              </View>

              {/* Body scrollable */}
              <ScrollView
                className="px-5"
                contentContainerStyle={{ paddingBottom: footer ? 8 : bottomPad }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {children}
              </ScrollView>

              {/* Footer actions — fond off-white + safe-area bas pour dégager la nav bar */}
              {footer && (
                <View
                  className="px-5 pt-3 bg-off-white border-t border-warm-200 dark:bg-[#151821] dark:border-[#2A2F3A]"
                  style={{ paddingBottom: bottomPad }}
                >
                  {footer}
                </View>
              )}
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </KeyboardProvider>
    </Modal>
  )
}
