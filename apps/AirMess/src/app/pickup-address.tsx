import { useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import Screen from '../components/ui/Screen'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import PlaceSearchBox from '../components/PlaceSearchBox'
import { addPickupPoint } from '../lib/pickupPoints'
import type { PlaceDetails } from '../api/places'
import { useLanguageStore } from '../stores/languageStore'

const COPY = {
  fr: {
    title: 'Nouveau retrait',
    subtitle: 'Cherche le lieu, puis donne-lui un nom (Maison, Travail...).',
    searchPlaceholder: 'Rechercher une adresse de retrait',
    nameLabel: 'Nom du retrait',
    namePlaceholder: 'Ex: Maison, Travail, Entrepot',
    save: 'Enregistrer ce retrait',
    back: 'Retour',
    searchAgain: 'Chercher un autre lieu',
  },
  en: {
    title: 'New pickup',
    subtitle: 'Search the place, then give it a name (Home, Work...).',
    searchPlaceholder: 'Search a pickup address',
    nameLabel: 'Pickup name',
    namePlaceholder: 'Ex: Home, Work, Warehouse',
    save: 'Save this pickup',
    back: 'Back',
    searchAgain: 'Search another place',
  },
} as const

const LABEL_SUGGESTIONS = {
  fr: ['Maison', 'Travail'],
  en: ['Home', 'Work'],
} as const

export default function PickupAddressScreen() {
  const router = useRouter()
  const language = useLanguageStore((state) => state.language)
  const copy = COPY[language]
  const suggestions = LABEL_SUGGESTIONS[language]

  const [place, setPlace] = useState<PlaceDetails | null>(null)
  const [label, setLabel] = useState('')
  const [saving, setSaving] = useState(false)

  const canSave = !!place && label.trim().length >= 2 && !saving

  function selectPlace(selected: PlaceDetails) {
    setPlace(selected)
    setLabel((current) => current || selected.name || selected.quartier || '')
  }

  async function save() {
    if (!place || !canSave) return
    setSaving(true)
    try {
      await addPickupPoint({
        label: label.trim(),
        address: place.formatted_address ?? place.name ?? '',
        quartier: place.quartier ?? '',
        city: place.city ?? 'Cotonou',
        lat: place.lat,
        lng: place.lng,
      })
      router.back()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Screen scroll py={16} className="px-5">
      <Pressable
        onPress={() => router.back()}
        className="mb-4 h-11 w-11 items-center justify-center rounded-full bg-off-white dark:bg-[#181B24]"
        accessibilityRole="button"
        accessibilityLabel={copy.back}
      >
        <Ionicons name="arrow-back" size={24} color="#1A1614" />
      </Pressable>

      <Text className="text-2xl font-extrabold text-ink dark:text-white">{copy.title}</Text>
      <Text className="mt-1.5 text-sm font-semibold leading-5 text-warm-500 dark:text-[#AEB6C5]">
        {copy.subtitle}
      </Text>

      <Card className="mt-5" padding="md">
        <PlaceSearchBox
          resetKey="pickup"
          placeholder={copy.searchPlaceholder}
          placesLanguage={language}
          onSelect={selectPlace}
        />

        {place && (
          <View className="mt-4">
            <View className="flex-row items-start rounded-2xl border border-warm-200 bg-off-white p-3 dark:border-[#343A46] dark:bg-[#181B24]">
              <Ionicons name="location" size={18} color="#D40511" />
              <View className="ml-2 flex-1">
                <Text className="text-sm font-extrabold text-ink dark:text-white" numberOfLines={2}>
                  {place.formatted_address ?? place.name}
                </Text>
                <Text className="mt-0.5 text-xs font-semibold text-warm-500">
                  {[place.quartier, place.city].filter(Boolean).join(', ')}
                </Text>
              </View>
            </View>

            <Text className="mb-2 mt-4 text-xs font-extrabold uppercase text-warm-500 dark:text-[#AEB6C5]">
              {copy.nameLabel}
            </Text>
            <View className="flex-row gap-2">
              {suggestions.map((suggestion) => (
                <Pressable
                  key={suggestion}
                  onPress={() => setLabel(suggestion)}
                  className={[
                    'rounded-full border px-3 py-1.5',
                    label === suggestion
                      ? 'border-airmess-yellow bg-airmess-yellow'
                      : 'border-warm-200 bg-white dark:border-[#343A46] dark:bg-[#181B24]',
                  ].join(' ')}
                  accessibilityRole="button"
                >
                  <Text className="text-xs font-extrabold text-ink dark:text-white">{suggestion}</Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              value={label}
              onChangeText={setLabel}
              placeholder={copy.namePlaceholder}
              placeholderTextColor="#A89F95"
              className="mt-3 h-14 rounded-2xl border border-warm-200 bg-white px-4 text-base font-semibold text-ink dark:border-[#343A46] dark:bg-[#181B24] dark:text-white"
            />

            <Button
              className="mt-5"
              size="lg"
              onPress={() => void save()}
              loading={saving}
              disabled={!canSave}
              rightIcon={<Ionicons name="bookmark" size={18} color="#1A1614" />}
            >
              {copy.save}
            </Button>

            <Pressable
              onPress={() => {
                setPlace(null)
                setLabel('')
              }}
              className="mt-4 self-center"
              accessibilityRole="button"
            >
              <Text className="text-sm font-extrabold text-airmess-red">{copy.searchAgain}</Text>
            </Pressable>
          </View>
        )}
      </Card>
    </Screen>
  )
}
