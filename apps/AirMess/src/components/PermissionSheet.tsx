import { View, Text } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import BottomSheet from './ui/BottomSheet'
import Button from './ui/Button'
import type { PermissionKind } from '../lib/permissionPrompts'
import { useLanguageStore } from '../stores/languageStore'

const COPY = {
  fr: {
    notifications: {
      title: 'Activer les notifications',
      subtitle: 'Pour etre prevenu au bon moment',
      bullets: [
        'Une course acceptee par un livreur',
        'Un colis recupere ou livre',
        'Un paiement, un remboursement ou un retrait traite',
      ],
      allow: 'Autoriser les notifications',
      settings: 'Ouvrir les reglages',
      later: 'Plus tard',
      note: "Tu peux changer d'avis a tout moment dans les reglages du telephone.",
    },
    location: {
      title: 'Autoriser la position',
      subtitle: 'Pour remplir la prise en charge',
      bullets: [
        'Ton point de depart est pre-rempli automatiquement',
        'Le prix se calcule sur la distance reelle du trajet',
        "L'app marchand ne suit JAMAIS ta position en arriere-plan",
      ],
      allow: 'Autoriser la position',
      settings: 'Ouvrir les reglages',
      later: 'Plus tard',
      note: 'Tu pourras toujours saisir une adresse a la main.',
    },
  },
  en: {
    notifications: {
      title: 'Turn on notifications',
      subtitle: 'To be told at the right time',
      bullets: [
        'A delivery accepted by a courier',
        'A parcel picked up or delivered',
        'A payment, refund or withdrawal processed',
      ],
      allow: 'Allow notifications',
      settings: 'Open settings',
      later: 'Later',
      note: 'You can change your mind anytime in your phone settings.',
    },
    location: {
      title: 'Allow location',
      subtitle: 'To fill in the pickup point',
      bullets: [
        'Your pickup point is filled in automatically',
        'The price is computed from the real trip distance',
        'The merchant app NEVER tracks your location in the background',
      ],
      allow: 'Allow location',
      settings: 'Open settings',
      later: 'Later',
      note: 'You can still type an address by hand.',
    },
  },
} as const

interface Props {
  kind: PermissionKind
  visible: boolean
  /** True quand la permission est refusee sans recours : on envoie vers les reglages. */
  settingsOnly: boolean
  onAllow: () => void
  onLater: () => void
}

/**
 * Ecran d'explication affiche AVANT le prompt systeme, sur le modele de l'app
 * livreur : on dit pourquoi, puis on demande. Jamais de demande silencieuse.
 */
export default function PermissionSheet({ kind, visible, settingsOnly, onAllow, onLater }: Props) {
  const language = useLanguageStore((state) => state.language)
  const copy = COPY[language][kind]

  return (
    <BottomSheet
      visible={visible}
      onClose={onLater}
      title={copy.title}
      subtitle={copy.subtitle}
      footer={
        <View className="gap-2">
          <Button
            size="lg"
            onPress={onAllow}
            rightIcon={
              <Ionicons
                name={settingsOnly ? 'settings-outline' : kind === 'location' ? 'location-outline' : 'notifications-outline'}
                size={18}
                color="#1A1614"
              />
            }
          >
            {settingsOnly ? copy.settings : copy.allow}
          </Button>
          <Button variant="outline" size="lg" onPress={onLater}>
            {copy.later}
          </Button>
        </View>
      }
    >
      <View className="gap-3">
        {copy.bullets.map((bullet) => (
          <View key={bullet} className="flex-row items-start">
            <Ionicons name="checkmark-circle" size={18} color="#16A34A" style={{ marginTop: 1 }} />
            <Text className="ml-2 flex-1 text-sm font-semibold leading-5 text-ink dark:text-white">
              {bullet}
            </Text>
          </View>
        ))}
      </View>

      <Text className="mb-2 mt-4 text-xs font-semibold leading-5 text-warm-500 dark:text-[#AEB6C5]">
        {copy.note}
      </Text>
    </BottomSheet>
  )
}
