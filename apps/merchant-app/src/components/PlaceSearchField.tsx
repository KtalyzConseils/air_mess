import { useEffect, useId, useRef, useState } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  type TextInputProps,
} from 'react-native'
import {
  searchPlaces,
  fetchPlaceDetails,
  type PlaceDetails,
  type PlaceSuggestion,
} from '../api/places'

type Props = {
  label: string
  placeholder?: string
  valueLabel?: string
  onPicked: (place: PlaceDetails) => void
  onCleared?: () => void
} & Pick<TextInputProps, 'editable'>

/**
 * Autocomplete lieux via proxy API (/places/search + /places/details).
 * sessionId stable pour la session Google Places.
 */
export default function PlaceSearchField({
  label,
  placeholder = 'Rechercher une adresse…',
  valueLabel,
  onPicked,
  onCleared,
  editable = true,
}: Props) {
  const reactId = useId()
  const sessionId = useRef(`sess_${reactId.replace(/:/g, '')}_${Date.now()}`).current
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PlaceSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [resolving, setResolving] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const q = query.trim()
    if (q.length < 3) {
      setResults([])
      return
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const list = await searchPlaces(q, sessionId, 'fr')
        setResults(list)
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 350)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, sessionId])

  async function pick(item: PlaceSuggestion) {
    setResolving(true)
    setResults([])
    setQuery('')
    try {
      const place = await fetchPlaceDetails(item.place_id, sessionId, 'fr')
      onPicked(place)
    } catch {
      // ignore — parent garde l'état précédent
    } finally {
      setResolving(false)
    }
  }

  return (
    <View className="mb-4">
      <Text className="text-[10px] uppercase text-warm-500 tracking-widest font-extrabold mb-1.5">
        {label}
      </Text>
      {valueLabel ? (
        <View className="flex-row items-center bg-off-white border-2 border-warm-200 rounded-2xl px-4 py-3">
          <Text className="flex-1 text-ink font-semibold" numberOfLines={2}>
            {valueLabel}
          </Text>
          {editable && (
            <Pressable
              hitSlop={8}
              onPress={() => {
                onCleared?.()
              }}
            >
              <Text className="text-airmess-red text-xs font-bold ml-2">Changer</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <View className="relative">
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={placeholder}
            placeholderTextColor="#B8AF9F"
            editable={editable && !resolving}
            className="border-2 border-warm-200 rounded-2xl px-4 h-14 text-base text-ink bg-off-white"
          />
          {(loading || resolving) && (
            <ActivityIndicator
              color="#1A1614"
              style={{ position: 'absolute', right: 16, top: 16 }}
            />
          )}
        </View>
      )}
      {results.length > 0 && !valueLabel && (
        <View className="mt-1 bg-off-white border border-warm-200 rounded-2xl overflow-hidden">
          {results.slice(0, 5).map((r) => (
            <Pressable
              key={r.place_id}
              onPress={() => pick(r)}
              className="px-4 py-3 border-b border-warm-100"
            >
              <Text className="text-ink font-semibold" numberOfLines={1}>
                {r.main_text || r.description}
              </Text>
              {!!r.secondary && (
                <Text className="text-warm-500 text-xs mt-0.5" numberOfLines={1}>
                  {r.secondary}
                </Text>
              )}
            </Pressable>
          ))}
        </View>
      )}
    </View>
  )
}
