import { Modal, View, Text, Pressable, ScrollView } from 'react-native'
import { KeyboardAvoidingView, KeyboardProvider } from 'react-native-keyboard-controller'
import { Ionicons } from '@expo/vector-icons'

/**
 * BottomSheet — modal qui glisse depuis le bas de l'écran.
 *
 * Choix produit :
 *   - Pattern natif ("action sheet" / "half sheet") plus adapté au terrain
 *     qu'une modal centrée (plus proche du pouce, moins d'attention volée).
 *   - Header : drag handle (indicatif, la sheet n'est PAS draggable pour
 *     l'instant — juste un signal visuel qu'on peut fermer) + titre + close.
 *   - Content scrollable si besoin.
 *   - Actions row (footer) à passer en `footer`.
 *
 * TODO(v2) : rendre draggable via react-native-reanimated pour un vrai
 * comportement natif (l'app en a déjà la dépendance).
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
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* KeyboardProvider requis DANS le Modal : le provider racine ne traverse
          pas la hiérarchie native d'un Modal RN. */}
      <KeyboardProvider>
      {/* Backdrop cliquable pour fermer */}
      <Pressable onPress={onClose} className="flex-1 bg-airmess-dark/50 justify-end">
        {/* On stoppe la propagation pour que le contenu ne ferme pas */}
        <Pressable
          onPress={() => {}}
          className="bg-cream rounded-t-3xl overflow-hidden"
          style={{ maxHeight: '92%' }}
        >
          <KeyboardAvoidingView
            // keyboard-controller : gère correctement l'edge-to-edge (RN 0.85),
            // pousse toute la sheet (champ + footer d'actions) au-dessus du clavier.
            behavior="padding"
            keyboardVerticalOffset={12}
          >
            {/* Drag handle */}
            <View className="items-center pt-3 pb-1">
              <View className="w-10 h-1 rounded-full bg-warm-300" />
            </View>

            {/* Header */}
            <View className="px-5 pt-2 pb-3 flex-row items-start">
              <View className="flex-1">
                <Text className="text-xl font-extrabold text-ink">{title}</Text>
                {subtitle && (
                  <Text className="text-xs text-warm-500 mt-1">{subtitle}</Text>
                )}
              </View>
              <Pressable
                onPress={onClose}
                className="w-9 h-9 rounded-full bg-off-white border border-warm-200 items-center justify-center"
                style={({ pressed }) => (pressed ? { opacity: 0.85 } : undefined)}
                hitSlop={8}
              >
                <Ionicons name="close" size={18} color="#1A1614" />
              </Pressable>
            </View>

            {/* Body scrollable */}
            <ScrollView
              className="px-5"
              contentContainerStyle={{ paddingBottom: 12 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {children}
            </ScrollView>

            {/* Footer actions — fond off-white pour marquer la séparation */}
            {footer && (
              <View className="px-5 pt-3 pb-6 bg-off-white border-t border-warm-200">
                {footer}
              </View>
            )}
          </KeyboardAvoidingView>
        </Pressable>
      </Pressable>
      </KeyboardProvider>
    </Modal>
  )
}
