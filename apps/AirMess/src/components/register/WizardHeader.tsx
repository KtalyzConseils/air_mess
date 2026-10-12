import { View, Text, Pressable } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

interface Props {
  step: number
  totalSteps: number
  /** Libelle global du parcours, affiche en haut a cote du compteur. */
  label: string
  /** Libelle du bouton retour (egalement utilise comme label d'accessibilite). */
  backLabel: string
  title: string
  subtitle?: string
  onBack?: () => void
  /** Desactive le bouton retour (premiere etape). */
  canGoBack: boolean
}

/**
 * En-tete du wizard d'inscription marchand.
 *
 * Meme pattern que l'app livreur :
 *  - bouton retour (chevron gauche), desactive sur l'etape 1
 *  - libelle global du parcours + compteur "3/6"
 *  - barre de progression segmentee (pas une barre continue) : le nombre de
 *    segments restants rend la fin du parcours previsible
 *  - titre et sous-titre de l'etape courante
 */
export default function WizardHeader({
  step,
  totalSteps,
  label,
  backLabel,
  title,
  subtitle,
  onBack,
  canGoBack,
}: Props) {
  return (
    <View className="px-5 pb-5 pt-4">
      <View className="mb-4 flex-row items-center">
        <Pressable
          onPress={canGoBack ? onBack : undefined}
          disabled={!canGoBack}
          hitSlop={10}
          className="mr-3"
          accessibilityRole="button"
          accessibilityLabel={backLabel}
          style={{ opacity: canGoBack ? 1 : 0.35 }}
        >
          <Ionicons name="arrow-back" size={24} color="#F5EFE3" />
        </Pressable>
        <Text className="flex-1 text-base font-bold text-cream">{label}</Text>
        <Text className="text-sm font-semibold tabular-nums text-warm-300">
          {step}/{totalSteps}
        </Text>
      </View>

      <View className="mb-5 flex-row gap-1.5">
        {Array.from({ length: totalSteps }).map((_, index) => {
          const active = index < step
          return (
            <View
              key={index}
              className={`h-1.5 flex-1 rounded-full ${active ? 'bg-airmess-yellow' : 'bg-warm-600/40'}`}
            />
          )
        })}
      </View>

      <Text className="text-2xl font-extrabold text-cream">{title}</Text>
      {subtitle ? <Text className="mt-1.5 text-sm text-warm-300">{subtitle}</Text> : null}
    </View>
  )
}
