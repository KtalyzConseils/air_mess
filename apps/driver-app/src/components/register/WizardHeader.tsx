import { View, Text, Pressable } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

interface Props {
  step: number
  totalSteps: number
  title: string
  subtitle?: string
  onBack?: () => void
  /** Désactive le bouton retour (première étape). */
  canGoBack: boolean
}

/**
 * En-tête du wizard d'inscription driver.
 *
 * Contient :
 *  - un bouton retour (chevron gauche) — désactivé sur l'étape 1
 *  - le titre principal ("Devenir livreur") + compteur "3/6"
 *  - le titre de l'étape courante + sous-titre optionnel
 *  - une barre de progression (segments égaux, jaune Air Mess)
 *
 * Le pattern segmentaire (pas une barre continue) donne un signal visuel
 * plus fort de "où j'en suis" et rend la fin de parcours prévisible.
 */
export default function WizardHeader({
  step,
  totalSteps,
  title,
  subtitle,
  onBack,
  canGoBack,
}: Props) {
  return (
    <View className="px-5 pt-4 pb-5">
      {/* Ligne 1 : retour + label global + compteur */}
      <View className="flex-row items-center mb-4">
        <Pressable
          onPress={canGoBack ? onBack : undefined}
          disabled={!canGoBack}
          hitSlop={10}
          className="mr-3"
          accessibilityLabel="Étape précédente"
          style={{ opacity: canGoBack ? 1 : 0.35 }}
        >
          <Ionicons name="arrow-back" size={24} color="#F5EFE3" />
        </Pressable>
        <Text className="text-cream text-base font-bold flex-1">Devenir livreur</Text>
        <Text className="text-warm-300 text-sm font-semibold tabular-nums">
          {step}/{totalSteps}
        </Text>
      </View>

      {/* Barre de progression segmentée */}
      <View className="flex-row gap-1.5 mb-5">
        {Array.from({ length: totalSteps }).map((_, i) => {
          const active = i < step
          return (
            <View
              key={i}
              className={`flex-1 h-1.5 rounded-full ${
                active ? 'bg-airmess-yellow' : 'bg-warm-700/40'
              }`}
            />
          )
        })}
      </View>

      {/* Titre de l'étape */}
      <Text className="text-cream text-2xl font-extrabold">{title}</Text>
      {subtitle && (
        <Text className="text-warm-300 text-sm mt-1.5">{subtitle}</Text>
      )}
    </View>
  )
}
