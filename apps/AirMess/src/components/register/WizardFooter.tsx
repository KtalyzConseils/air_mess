import { View } from 'react-native'
import Button from '../ui/Button'

interface Props {
  /** Vrai sur la derniere etape : le CTA declenche la creation du compte. */
  isLast: boolean
  canGoBack: boolean
  onNext: () => void
  onBack: () => void
  /** Vrai quand l'etape courante n'est pas encore valide. */
  nextDisabled: boolean
  submitting?: boolean
  backLabel: string
  nextLabel: string
  submitLabel: string
}

/**
 * Pied du wizard : bouton "Retour" secondaire (des l'etape 2) et bouton
 * principal "Suivant" ou CTA final de creation du compte.
 *
 * Meme comportement que l'app livreur : le parent gerant le safe-area, ce
 * composant ne s'occupe que de la barre d'actions.
 */
export default function WizardFooter({
  isLast,
  canGoBack,
  onNext,
  onBack,
  nextDisabled,
  submitting,
  backLabel,
  nextLabel,
  submitLabel,
}: Props) {
  return (
    <View className="border-t border-warm-600/30 bg-airmess-dark px-5 pb-4 pt-3">
      <View className="flex-row gap-3">
        {canGoBack && (
          <View className="flex-1">
            <Button variant="outline" size="lg" onPress={onBack} disabled={submitting}>
              {backLabel}
            </Button>
          </View>
        )}
        <View className="flex-1">
          <Button
            variant="primary"
            size="lg"
            onPress={onNext}
            disabled={nextDisabled || submitting}
            loading={submitting}
          >
            {isLast ? submitLabel : nextLabel}
          </Button>
        </View>
      </View>
    </View>
  )
}
