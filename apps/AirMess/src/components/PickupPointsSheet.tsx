import { View, Text, Pressable } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import BottomSheet from './ui/BottomSheet'
import Button from './ui/Button'
import { MAX_PICKUP_POINTS, type PickupPoint } from '../lib/pickupPoints'
import { useLanguageStore } from '../stores/languageStore'

const COPY = {
  fr: {
    title: 'Mes retraits',
    subtitle: 'Comme les lieux enregistrés sur Maps.',
    empty: "Aucun retrait enregistré pour l'instant.",
    emptyHint: 'Choisis une position, puis enregistre-la pour la réutiliser.',
    save: 'Enregistrer cette position',
    delete: 'Supprimer',
    close: 'Fermer',
    full: `Maximum ${MAX_PICKUP_POINTS} retraits. Supprime-en un pour en ajouter un autre.`,
    currentPositionMissing: "Choisis d'abord une position de retrait.",
  },
  en: {
    title: 'My pickups',
    subtitle: 'Like saved places on Maps.',
    empty: 'No saved pickup yet.',
    emptyHint: 'Pick a position, then save it to reuse it later.',
    save: 'Save this position',
    delete: 'Delete',
    close: 'Close',
    full: `Maximum ${MAX_PICKUP_POINTS} pickups. Delete one to add another.`,
    currentPositionMissing: 'Pick a pickup position first.',
  },
} as const

interface Props {
  visible: boolean
  onClose: () => void
  points: PickupPoint[]
  /** Null quand la prise en charge courante n'a pas de position GPS. */
  onSaveCurrent: (() => void) | null
  onUse: (point: PickupPoint) => void
  onDelete: (id: string) => void
}

export default function PickupPointsSheet({
  visible,
  onClose,
  points,
  onSaveCurrent,
  onUse,
  onDelete,
}: Props) {
  const language = useLanguageStore((state) => state.language)
  const copy = COPY[language]
  const isFull = points.length >= MAX_PICKUP_POINTS

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={copy.title}
      subtitle={copy.subtitle}
      footer={
        <View className="gap-2">
          <Button
            size="lg"
            onPress={onSaveCurrent ?? undefined}
            disabled={!onSaveCurrent || isFull}
            rightIcon={<Ionicons name="bookmark-outline" size={18} color="#1A1614" />}
          >
            {copy.save}
          </Button>
          <Button variant="outline" size="lg" onPress={onClose}>
            {copy.close}
          </Button>
        </View>
      }
    >
      {points.length === 0 ? (
        <View className="pb-2">
          <Text className="text-sm font-extrabold text-ink dark:text-white">{copy.empty}</Text>
          <Text className="mt-1.5 text-xs font-semibold leading-5 text-warm-500 dark:text-[#AEB6C5]">
            {copy.emptyHint}
          </Text>
        </View>
      ) : (
        <View className="gap-2 pb-1">
          {points.map((point) => {
            const title = point.address || [point.quartier, point.city].filter(Boolean).join(', ')
            const subtitle = [point.quartier, point.city].filter(Boolean).join(', ')

            return (
              <View
                key={point.id}
                className="flex-row items-center rounded-2xl border border-warm-200 bg-off-white px-3 py-2.5 dark:border-[#343A46] dark:bg-[#181B24]"
              >
                <Pressable
                  onPress={() => onUse(point)}
                  className="flex-1 flex-row items-center"
                  accessibilityRole="button"
                >
                  <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-airmess-yellow">
                    <Ionicons name="location" size={19} color="#1A1614" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-extrabold text-ink dark:text-white" numberOfLines={1}>
                      {title || `${point.lat.toFixed(4)}, ${point.lng.toFixed(4)}`}
                    </Text>
                    {!!subtitle && subtitle !== title && (
                      <Text className="mt-0.5 text-xs font-semibold text-warm-500 dark:text-[#AEB6C5]" numberOfLines={1}>
                        {subtitle}
                      </Text>
                    )}
                  </View>
                </Pressable>
                <Pressable
                  onPress={() => onDelete(point.id)}
                  hitSlop={8}
                  className="ml-2 h-9 w-9 items-center justify-center rounded-full bg-danger-bg"
                  accessibilityRole="button"
                  accessibilityLabel={copy.delete}
                >
                  <Ionicons name="trash-outline" size={17} color="#D40511" />
                </Pressable>
              </View>
            )
          })}
        </View>
      )}

      {!onSaveCurrent && (
        <Text className="mt-3 text-xs font-semibold text-airmess-red">
          {copy.currentPositionMissing}
        </Text>
      )}
      {isFull && (
        <Text className="mt-3 text-xs font-semibold text-warm-500 dark:text-[#AEB6C5]">
          {copy.full}
        </Text>
      )}
    </BottomSheet>
  )
}
