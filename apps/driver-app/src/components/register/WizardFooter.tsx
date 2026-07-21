import { View } from 'react-native'
import Button from '../ui/Button'

interface Props {
  step: number
  totalSteps: number
  onNext: () => void
  onBack: () => void
  /** Vrai quand l'étape courante n'est pas encore valide → CTA en état disabled. */
  nextDisabled: boolean
  /** Loading global sur la dernière étape (appel réseau registerDriver). */
  submitting?: boolean
}

/**
 * Pied du wizard : bouton "Retour" secondaire (dès l'étape 2)
 * + bouton principal "Suivant" ou "Envoyer ma candidature" (dernière étape).
 *
 * Placé en bas dans un contenaneur avec padding pour respecter le safe-area
 * home indicator sur iOS (le parent SafeAreaView gère `bottom`).
 */
export default function WizardFooter({
  step,
  totalSteps,
  onNext,
  onBack,
  nextDisabled,
  submitting,
}: Props) {
  const isLast = step === totalSteps
  const canGoBack = step > 1

  return (
    <View className="px-5 pt-3 pb-4 bg-airmess-dark border-t border-warm-700/30">
      <View className="flex-row gap-3">
        {canGoBack && (
          <View className="flex-1">
            <Button
              variant="outline"
              size="lg"
              onPress={onBack}
              disabled={submitting}
            >
              Retour
            </Button>
          </View>
        )}
        <View className={canGoBack ? 'flex-1' : 'flex-1'}>
          <Button
            variant="primary"
            size="lg"
            onPress={onNext}
            disabled={nextDisabled || submitting}
            loading={submitting}
          >
            {isLast ? 'Envoyer ma candidature' : 'Suivant'}
          </Button>
        </View>
      </View>
    </View>
  )
}
