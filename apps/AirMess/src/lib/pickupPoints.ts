import * as SecureStore from 'expo-secure-store'

/**
 * Carnet de points de retrait, memorise dans l'app (SecureStore) et non en base.
 *
 * Comme les lieux enregistres sur Maps : on garde uniquement la position GPS et
 * de quoi l'afficher (rue/quartier/ville). Ni nom, ni telephone, ni compte
 * serveur : le contact de prise en charge reste celui du profil marchand.
 * Memoire par appareil (perdue a la desinstallation, pas visible sur la web).
 */

const STORAGE_KEY = 'airmess_pickup_points'

/** Au-dela, on garde les plus recents (limite SecureStore ~2 Ko par valeur). */
export const MAX_PICKUP_POINTS = 10

export interface PickupPoint {
  id: string
  /** Rue / lieu tel que renvoye par la recherche (peut etre vide). */
  address: string
  quartier: string
  city: string
  lat: number
  lng: number
  createdAt: string
}

export type PickupPointInput = Omit<PickupPoint, 'id' | 'createdAt'>

function isPickupPoint(value: unknown): value is PickupPoint {
  const point = value as Partial<PickupPoint> | null
  return (
    !!point &&
    typeof point.id === 'string' &&
    typeof point.lat === 'number' &&
    typeof point.lng === 'number' &&
    Number.isFinite(point.lat) &&
    Number.isFinite(point.lng)
  )
}

async function persist(points: PickupPoint[]): Promise<void> {
  await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(points)).catch(() => undefined)
}

export async function fetchPickupPoints(): Promise<PickupPoint[]> {
  try {
    const raw = await SecureStore.getItemAsync(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isPickupPoint)
  } catch {
    return []
  }
}

function samePosition(a: PickupPointInput, b: PickupPoint): boolean {
  return a.lat.toFixed(5) === b.lat.toFixed(5) && a.lng.toFixed(5) === b.lng.toFixed(5)
}

/**
 * Enregistre un point (le plus recent en tete). Un point deja present a la meme
 * position est mis a jour, pas duplique.
 */
export async function addPickupPoint(input: PickupPointInput): Promise<PickupPoint[]> {
  const current = await fetchPickupPoints()
  const existing = current.find((point) => samePosition(input, point))

  const next = existing
    ? [{ ...existing, ...input }, ...current.filter((point) => point.id !== existing.id)]
    : [
        { ...input, id: `${Date.now()}`, createdAt: new Date().toISOString() },
        ...current,
      ]

  const trimmed = next.slice(0, MAX_PICKUP_POINTS)
  await persist(trimmed)
  return trimmed
}

export async function removePickupPoint(id: string): Promise<PickupPoint[]> {
  const next = (await fetchPickupPoints()).filter((point) => point.id !== id)
  await persist(next)
  return next
}
