import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useQuery } from '@tanstack/react-query'
import {
  fetchPlaceDetails,
  searchPlaces,
  type PlaceDetails,
  type PlaceSuggestion,
} from '../api/places'
import { getApiErrorMessage } from '../lib/apiError'

export function generateSessionId() {
  const rand = () => Math.floor(Math.random() * 0xffff).toString(16).padStart(4, '0')
  return `${rand()}${rand()}-${rand()}-${rand()}-${rand()}-${rand()}${rand()}${rand()}`
}

interface Props {
  /** Quand cette valeur change, la recherche est videe (ex: origine -> destination). */
  resetKey: string
  placeholder: string
  placesLanguage: string
  onSelect: (place: PlaceDetails) => void
  onSearchChange?: () => void
}

/**
 * Recherche de lieu Google Places (session facturee une fois par selection).
 * Extrait de la creation de course pour etre reutilise par l'ecran "Nouveau
 * retrait" : une seule implementation de la recherche dans l'app.
 */
export default function PlaceSearchBox({
  resetKey,
  placeholder,
  placesLanguage,
  onSelect,
  onSearchChange,
}: Props) {
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const sessionIdRef = useRef(generateSessionId())

  useEffect(() => {
    setQuery('')
    setDebounced('')
    setDetailError(null)
  }, [resetKey])

  useEffect(() => {
    const trimmed = query.trim()
    if (trimmed.length < 2) {
      setDebounced('')
      return
    }

    const timer = setTimeout(() => setDebounced(trimmed), 350)
    return () => clearTimeout(timer)
  }, [query])

  const { data: suggestions = [], isFetching, error: searchError } = useQuery({
    queryKey: ['places-search', debounced, placesLanguage],
    queryFn: () => searchPlaces(debounced, sessionIdRef.current, placesLanguage),
    enabled: debounced.length >= 2,
    staleTime: 5 * 60 * 1000,
  })

  const selectPlace = async (suggestion: PlaceSuggestion) => {
    setLoadingDetail(true)
    setDetailError(null)
    try {
      const place = await fetchPlaceDetails(suggestion.place_id, sessionIdRef.current, placesLanguage)
      onSelect(place)
      setQuery(suggestion.main_text || suggestion.description)
      setDebounced('')
      sessionIdRef.current = generateSessionId()
    } catch (err) {
      setDetailError(getApiErrorMessage(err))
    } finally {
      setLoadingDetail(false)
    }
  }

  return (
    <View>
      <View className="h-12 flex-row items-center rounded-2xl border border-warm-200 bg-white px-4 dark:border-[#343A46] dark:bg-[#181B24]">
        <Ionicons name="search" size={19} color="#6F665D" />
        <TextInput
          value={query}
          onChangeText={(value) => {
            onSearchChange?.()
            setQuery(value)
          }}
          className="ml-3 h-full flex-1 text-sm font-semibold text-ink dark:text-white"
          placeholder={placeholder}
          placeholderTextColor="#A89F95"
        />
        {(isFetching || loadingDetail) && <ActivityIndicator color="#1A1614" />}
      </View>

      {(detailError || searchError) && (
        <Text className="mt-2 text-sm font-bold text-airmess-red">
          {detailError ?? getApiErrorMessage(searchError)}
        </Text>
      )}

      {debounced.length >= 2 && suggestions.length > 0 && (
        <View className="mt-2 overflow-hidden rounded-2xl border border-warm-200 bg-off-white dark:border-[#343A46] dark:bg-[#181B24]">
          {suggestions.slice(0, 5).map((suggestion, index) => (
            <Pressable
              key={suggestion.place_id}
              onPress={() => void selectPlace(suggestion)}
              className="min-h-12 flex-row items-center px-4"
              accessibilityRole="button"
            >
              <Ionicons name="location-outline" size={17} color="#6F665D" />
              <View className="ml-3 flex-1">
                <Text className="text-sm font-extrabold text-ink dark:text-white" numberOfLines={1}>
                  {suggestion.main_text}
                </Text>
                {!!suggestion.secondary && (
                  <Text className="mt-0.5 text-xs font-semibold text-warm-500" numberOfLines={1}>
                    {suggestion.secondary}
                  </Text>
                )}
              </View>
              {index === 0 && <Ionicons name="chevron-forward" size={18} color="#B8AF9F" />}
            </Pressable>
          ))}
        </View>
      )}
    </View>
  )
}
