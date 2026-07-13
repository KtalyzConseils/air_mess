import { useState } from 'react'
import { View, Text, Pressable, Modal, Linking, ScrollView } from 'react-native'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { acceptTerms, TERMS_URL, PRIVACY_URL } from '../api/terms'
import Button from './ui/Button'

interface Props {
  visible: boolean
  onAccepted: () => void
}

/**
 * Modale BLOQUANTE plein écran pour l'acceptation des CGU + politique de confidentialité.
 *
 * Pilotée par le parent depuis `terms.needs_acceptance` retourné par `/auth/me`.
 * Volontairement sans bouton "Fermer" ni "Plus tard" — sortie unique via
 * "J'accepte et continue" (activé par la checkbox).
 *
 * Les liens vers CGU / privacy pointent sur marchant-web (pages HTML) via
 * Linking.openURL — l'utilisateur revient dans l'app une fois lu.
 */
export default function AcceptTermsSheet({ visible, onAccepted }: Props) {
  const queryClient = useQueryClient()
  const [checked, setChecked] = useState(false)

  const mutation = useMutation({
    mutationFn: acceptTerms,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] })
      onAccepted()
    },
  })

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={() => {
        // Volontairement no-op : blocking, pas de sortie par bouton back
      }}
      statusBarTranslucent
    >
      <SafeAreaView className="flex-1 bg-cream" edges={['top', 'left', 'right', 'bottom']}>
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        >
          <View className="items-center mb-5">
            <View className="w-16 h-16 rounded-full bg-airmess-yellow/20 items-center justify-center mb-4">
              <Ionicons name="document-text" size={30} color="#1A1614" />
            </View>
            <Text className="text-2xl font-extrabold text-ink text-center">
              Nos conditions ont besoin de votre accord
            </Text>
            <Text className="text-sm text-warm-600 text-center mt-2 leading-5">
              Depuis votre inscription, nous avons formalisé nos règles d'utilisation et
              notre politique de confidentialité. Prenez un moment pour les lire.
            </Text>
          </View>

          <View className="gap-2 mb-5">
            <Pressable
              onPress={() => Linking.openURL(TERMS_URL)}
              className="flex-row items-center justify-between bg-white border border-warm-200 rounded-2xl px-4 py-4"
              style={({ pressed }) => (pressed ? { opacity: 0.85 } : undefined)}
            >
              <View className="flex-1">
                <Text className="text-base font-extrabold text-ink">
                  Conditions générales
                </Text>
                <Text className="text-xs text-warm-500 mt-0.5">
                  Ce que vous acceptez en utilisant Air Mess
                </Text>
              </View>
              <Ionicons name="open-outline" size={20} color="#6E6558" />
            </Pressable>

            <Pressable
              onPress={() => Linking.openURL(PRIVACY_URL)}
              className="flex-row items-center justify-between bg-white border border-warm-200 rounded-2xl px-4 py-4"
              style={({ pressed }) => (pressed ? { opacity: 0.85 } : undefined)}
            >
              <View className="flex-1">
                <Text className="text-base font-extrabold text-ink">
                  Politique de confidentialité
                </Text>
                <Text className="text-xs text-warm-500 mt-0.5">
                  Comment nous protégeons vos données
                </Text>
              </View>
              <Ionicons name="open-outline" size={20} color="#6E6558" />
            </Pressable>
          </View>

          <Pressable
            onPress={() => setChecked((v) => !v)}
            className={[
              'flex-row items-start gap-3 rounded-2xl px-4 py-3 border',
              checked
                ? 'bg-success-bg border-success/30'
                : 'bg-white border-warm-200',
            ].join(' ')}
            style={({ pressed }) => (pressed ? { opacity: 0.85 } : undefined)}
          >
            <View
              className={[
                'w-5 h-5 rounded border-2 items-center justify-center mt-0.5',
                checked ? 'bg-success border-success' : 'bg-white border-warm-400',
              ].join(' ')}
            >
              {checked && <Ionicons name="checkmark" size={14} color="white" />}
            </View>
            <Text className="flex-1 text-sm text-ink leading-5">
              J'ai lu et j'accepte les conditions générales et la politique de confidentialité d'Air Mess.
            </Text>
          </Pressable>

          {mutation.isError && (
            <View className="mt-3 px-4 py-3 rounded-xl bg-airmess-red/10 border border-airmess-red/30">
              <Text className="text-sm text-airmess-red">
                Impossible d'enregistrer votre acceptation. Vérifiez votre connexion et réessayez.
              </Text>
            </View>
          )}

          <View className="mt-5">
            <Button
              variant="primary"
              size="lg"
              disabled={!checked || mutation.isPending}
              loading={mutation.isPending}
              onPress={() => mutation.mutate()}
            >
              J'accepte et continue
            </Button>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  )
}
