import api from './client'

export interface PlaceSuggestion {
  place_id: string
  description: string
  main_text: string
  secondary: string
}

export interface PlaceDetails {
  place_id: string
  name: string | null
  formatted_address: string | null
  lat: number
  lng: number
  quartier: string | null
  city: string | null
}

/**
 * Autocomplete via notre proxy Laravel (jamais directement Google).
 *
 * Le paramètre `sessionId` doit rester STABLE pendant toute une saisie
 * (initialiser à un uuid au focus, garder tant que l'utilisateur tape).
 * Le passer aussi à `fetchPlaceDetails` de la sélection finale : Google
 * facture alors autocomplete + details au tarif d'un seul "Details Session".
 */
export async function searchPlaces(
  q: string,
  sessionId?: string,
  language?: string,
): Promise<PlaceSuggestion[]> {
  const { data } = await api.get<{ results: PlaceSuggestion[] }>('/places/search', {
    params: { q, sessionId, language },
  })
  return data.results ?? []
}

export async function fetchPlaceDetails(
  placeId: string,
  sessionId?: string,
  language?: string,
): Promise<PlaceDetails> {
  const { data } = await api.get<{ place: PlaceDetails }>(
    `/places/details/${encodeURIComponent(placeId)}`,
    { params: { sessionId, language } },
  )
  return data.place
}
