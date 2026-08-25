import { useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import * as Location from 'expo-location'
import { useLocalSearchParams } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { fetchAddresses } from '../../api/addresses'
import { fetchPlaceDetails, searchPlaces, type PlaceDetails, type PlaceSuggestion } from '../../api/places'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Screen from '../../components/ui/Screen'
import { useAuthStore } from '../../stores/authStore'

type Step = 'package' | 'location' | 'details'
type LocationTarget = 'origin' | 'destination'

interface PackageType {
  id: string
  title: string
  subtitle: string
  icon: keyof typeof Ionicons.glyphMap
  size: 'S' | 'M' | 'L'
}

interface LocationDraft {
  originName: string
  originPhone: string
  originAddress: string
  originQuartier: string
  originCity: string
  originLat: number | null
  originLng: number | null
  destinationName: string
  destinationPhone: string
  destinationAddress: string
  destinationQuartier: string
  destinationCity: string
  destinationLat: number | null
  destinationLng: number | null
  packageDescription: string
  packagePhotoUri: string | null
  urgency: 'standard' | 'express'
  packageDeclaredValue: string
  deliveryFeePaidBy: 'sender' | 'recipient'
}

const PACKAGE_TYPES: PackageType[] = [
  { id: 'parcel', title: 'Colis', subtitle: 'Paquet simple', icon: 'cube-outline', size: 'M' },
  { id: 'food', title: 'Repas', subtitle: 'Restaurant, snack', icon: 'fast-food-outline', size: 'S' },
  { id: 'documents', title: 'Documents', subtitle: 'Plis et papiers', icon: 'document-text-outline', size: 'S' },
  { id: 'shopping', title: 'Courses', subtitle: 'Achats client', icon: 'bag-handle-outline', size: 'M' },
  { id: 'pharmacy', title: 'Pharmacie', subtitle: 'Produit sensible', icon: 'medkit-outline', size: 'S' },
  { id: 'other', title: 'Autre', subtitle: 'A preciser apres', icon: 'ellipsis-horizontal-circle-outline', size: 'L' },
]

export default function NewCourseScreen() {
  const user = useAuthStore((state) => state.user)
  const { addressId } = useLocalSearchParams<{ addressId?: string }>()
  const [step, setStep] = useState<Step>('package')
  const [selectedPackage, setSelectedPackage] = useState<PackageType | null>(null)
  const [locationTarget, setLocationTarget] = useState<LocationTarget>('destination')
  const [locating, setLocating] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [draft, setDraft] = useState<LocationDraft>({
    originName: user?.marchant?.raison_sociale ?? user?.name ?? '',
    originPhone: user?.phone ?? '',
    originAddress: '',
    originQuartier: '',
    originCity: 'Cotonou',
    originLat: null,
    originLng: null,
    destinationName: '',
    destinationPhone: '',
    destinationAddress: '',
    destinationQuartier: '',
    destinationCity: 'Cotonou',
    destinationLat: null,
    destinationLng: null,
    packageDescription: '',
    packagePhotoUri: null,
    urgency: 'standard',
    packageDeclaredValue: '',
    deliveryFeePaidBy: 'sender',
  })

  const { data: addresses = [] } = useQuery({
    queryKey: ['addresses'],
    queryFn: fetchAddresses,
  })

  const selectedAddress = useMemo(
    () => addresses.find((address) => String(address.id) === addressId),
    [addressId, addresses],
  )
  const [showAddressBook, setShowAddressBook] = useState(false)

  useEffect(() => {
    if (!selectedAddress) return
    setDraft((current) => ({
      ...current,
      destinationName: selectedAddress.recipient_name,
      destinationPhone: selectedAddress.recipient_phone,
      destinationAddress: selectedAddress.street || `${selectedAddress.quartier}, ${selectedAddress.city}`,
      destinationQuartier: selectedAddress.quartier,
      destinationCity: selectedAddress.city,
      destinationLat: selectedAddress.lat,
      destinationLng: selectedAddress.lng,
    }))
    setStep('location')
  }, [selectedAddress])

  useEffect(() => {
    setDraft((current) => ({
      ...current,
      originName: current.originName || user?.marchant?.raison_sociale || user?.name || '',
      originPhone: current.originPhone || user?.phone || '',
    }))
  }, [user])

  useEffect(() => {
    void useCurrentLocation()
  }, [])

  const useCurrentLocation = async () => {
    setLocating(true)
    setLocationError(null)
    try {
      const permission = await Location.requestForegroundPermissionsAsync()
      if (permission.status !== 'granted') {
        setLocationError('Active la localisation pour detecter le point de depart.')
        return
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      })
      const latitude = position.coords.latitude
      const longitude = position.coords.longitude
      const reverse = await Location.reverseGeocodeAsync({ latitude, longitude }).catch(() => [])
      const first = reverse[0]

      setDraft((current) => ({
        ...current,
        originLat: latitude,
        originLng: longitude,
        originAddress:
          [first?.street, first?.name].filter(Boolean).join(' ') || current.originAddress,
        originQuartier:
          first?.district || first?.subregion || first?.street || current.originQuartier,
        originCity: first?.city || first?.region || current.originCity || 'Cotonou',
      }))
    } catch {
      setLocationError('Impossible de detecter la position actuelle.')
    } finally {
      setLocating(false)
    }
  }

  const handleSelectPackage = (item: PackageType) => {
    setSelectedPackage(item)
    setStep('location')
  }

  const handleSelectPlace = (place: PlaceDetails) => {
    if (locationTarget === 'origin') {
      setDraft((current) => ({
        ...current,
        originAddress: place.formatted_address ?? place.name ?? current.originAddress,
        originQuartier: place.quartier ?? place.name ?? current.originQuartier,
        originCity: place.city ?? current.originCity,
        originLat: place.lat,
        originLng: place.lng,
      }))
      return
    }

    setDraft((current) => ({
      ...current,
      destinationAddress: place.formatted_address ?? place.name ?? current.destinationAddress,
      destinationQuartier: place.quartier ?? place.name ?? current.destinationQuartier,
      destinationCity: place.city ?? current.destinationCity,
      destinationLat: place.lat,
      destinationLng: place.lng,
    }))
  }

  const hasOriginCoords = draft.originLat !== null && draft.originLng !== null
  const hasDestinationCoords = draft.destinationLat !== null && draft.destinationLng !== null
  const canContinueLocation =
    !!selectedPackage &&
    draft.originName.trim().length >= 2 &&
    draft.originPhone.trim().length >= 4 &&
    draft.destinationAddress.trim().length >= 2 &&
    draft.destinationName.trim().length >= 2 &&
    draft.destinationPhone.trim().length >= 4
  const canContinueDetails = draft.packageDescription.trim().length >= 2

  const fillDestinationFromAddress = (address: (typeof addresses)[number]) => {
    setDraft((current) => ({
      ...current,
      destinationName: address.recipient_name,
      destinationPhone: address.recipient_phone,
      destinationAddress: address.street || `${address.quartier}, ${address.city}`,
      destinationQuartier: address.quartier,
      destinationCity: address.city,
      destinationLat: address.lat,
      destinationLng: address.lng,
    }))
    setLocationTarget('destination')
    setShowAddressBook(false)
  }

  const pickPackagePhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()

    if (permission.status !== 'granted') {
      setLocationError('Autorise les photos pour ajouter une image du colis.')
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.75,
      legacy: true,
    })

    if (!result.canceled) {
      setDraft((current) => ({ ...current, packagePhotoUri: result.assets[0]?.uri ?? null }))
    }
  }

  return (
    <Screen scroll py={16} className="px-5">
      <View className="mb-4">
        <Text className="text-2xl font-extrabold text-ink">Nouvelle course</Text>
        <View className="mt-3 flex-row items-center">
          <StepDot active={step === 'package'} done={!!selectedPackage} label="Colis" />
          <View className="mx-2 h-0.5 flex-1 bg-warm-200" />
          <StepDot active={step === 'location'} done={canContinueLocation} label="Trajet" />
          <View className="mx-2 h-0.5 flex-1 bg-warm-200" />
          <StepDot active={step === 'details'} done={canContinueDetails} label="Details" />
        </View>
      </View>

      {step === 'package' ? (
        <View>
          <Text className="mb-3 text-base font-extrabold text-ink">Nous livrons quoi ?</Text>
          <View className="flex-row flex-wrap gap-3">
            {PACKAGE_TYPES.map((item) => (
              <PackageCard
                key={item.id}
                item={item}
                selected={selectedPackage?.id === item.id}
                onPress={() => handleSelectPackage(item)}
              />
            ))}
          </View>
        </View>
      ) : step === 'location' ? (
        <View>
          <View className="mb-4 flex-row items-center justify-between">
            <Pressable
              onPress={() => setStep('package')}
              className="h-10 flex-row items-center rounded-full bg-off-white px-3"
              accessibilityRole="button"
            >
              <Ionicons name="chevron-back" size={18} color="#1A1614" />
              <Text className="ml-1 text-sm font-extrabold text-ink">Colis</Text>
            </Pressable>
            {selectedPackage && (
              <View className="flex-row items-center rounded-full bg-airmess-yellow px-3 py-2">
                <Ionicons name={selectedPackage.icon} size={17} color="#1A1614" />
                <Text className="ml-1 text-xs font-extrabold text-ink">{selectedPackage.title}</Text>
              </View>
            )}
          </View>

          <View className="mb-4">
            <Card className="shadow-card" padding="md">
              <Pressable
                onPress={() => setLocationTarget('origin')}
                className={[
                  'flex-row items-center rounded-2xl p-1.5',
                  locationTarget === 'origin' ? 'bg-airmess-yellow/20' : '',
                ].join(' ')}
                accessibilityRole="button"
              >
                <Pressable
                  onPress={() => setLocationTarget('origin')}
                  className="mr-3 h-11 w-11 items-center justify-center"
                  accessibilityRole="button"
                  accessibilityLabel="Modifier la prise en charge"
                >
                  <Ionicons name="storefront" size={25} color="#1A1614" />
                </Pressable>
                <Pressable
                  onPress={() => setLocationTarget('origin')}
                  className="flex-1"
                  accessibilityRole="button"
                >
                  <View className="flex-row items-center">
                    <Text className="text-sm font-bold text-warm-400">Prise en charge</Text>
                    {hasOriginCoords && (
                      <Ionicons name="checkmark-circle" size={15} color="#16A34A" style={{ marginLeft: 6 }} />
                    )}
                  </View>
                  <Text className="mt-0.5 text-xl font-extrabold text-ink" numberOfLines={1}>
                    {formatCompactPlace(draft.originQuartier, draft.originCity) || 'Position actuelle'}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={useCurrentLocation}
                  className="ml-2 h-9 w-9 items-center justify-center rounded-full bg-warm-100"
                  accessibilityRole="button"
                  accessibilityLabel="Utiliser ma position"
                >
                  {locating ? (
                    <ActivityIndicator size="small" color="#1A1614" />
                  ) : (
                    <Ionicons name="locate" size={18} color="#1A1614" />
                  )}
                </Pressable>
              </Pressable>

              <View className="my-3 ml-[58px] h-px bg-warm-200" />

              <Pressable
                onPress={() => setLocationTarget('destination')}
                className={[
                  'flex-row items-center rounded-2xl p-1.5',
                  locationTarget === 'destination' ? 'bg-airmess-red/10' : '',
                ].join(' ')}
                accessibilityRole="button"
              >
                <Pressable
                  onPress={() => setLocationTarget('destination')}
                  className="mr-3 h-11 w-11 items-center justify-center rounded-xl bg-airmess-red"
                  accessibilityRole="button"
                  accessibilityLabel="Modifier la destination"
                >
                  <Ionicons name="flag" size={24} color="#FFFFFF" />
                </Pressable>
                <Pressable
                  onPress={() => setLocationTarget('destination')}
                  className="flex-1"
                  accessibilityRole="button"
                >
                  <View className="flex-row items-center">
                    <Text className="text-sm font-bold text-warm-400">Destination</Text>
                    {hasDestinationCoords && (
                      <Ionicons name="checkmark-circle" size={15} color="#16A34A" style={{ marginLeft: 6 }} />
                    )}
                  </View>
                  <Text className="mt-0.5 text-xl font-extrabold text-ink" numberOfLines={2}>
                    {draft.destinationAddress ||
                      formatCompactPlace(draft.destinationQuartier, draft.destinationCity) ||
                      'Ou livrer ?'}
                  </Text>
                </Pressable>
              </Pressable>
            </Card>

            {locationError && (
              <Text className="mt-3 text-sm font-bold text-airmess-red">{locationError}</Text>
            )}

            <View className="mt-3">
              <PlaceSearchBox
                target={locationTarget}
                onSelect={handleSelectPlace}
                placeholder={
                  locationTarget === 'origin'
                    ? 'Rechercher la prise en charge'
                    : 'Rechercher une destination'
                }
              />
            </View>
          </View>

          {locationTarget === 'destination' ? (
            <Card className="mb-4" padding="md">
              <View className="flex-row items-center justify-between">
                <Text className="text-base font-extrabold text-ink">Reception</Text>
                <Pressable
                  onPress={() => setShowAddressBook((value) => !value)}
                  className="h-9 flex-row items-center rounded-full bg-warm-100 px-3"
                  accessibilityRole="button"
                >
                  <Ionicons name="people" size={16} color="#1A1614" />
                  <Text className="ml-1 text-xs font-extrabold text-ink">Carnet</Text>
                </Pressable>
              </View>

              {showAddressBook && (
                <View className="mt-3 overflow-hidden rounded-2xl border border-warm-200 bg-white">
                  {addresses.length === 0 ? (
                    <Text className="px-4 py-3 text-sm font-semibold text-warm-500">
                      Aucune adresse enregistree.
                    </Text>
                  ) : (
                    addresses.slice(0, 5).map((address) => (
                      <Pressable
                        key={address.id}
                        onPress={() => fillDestinationFromAddress(address)}
                        className="min-h-16 flex-row items-center px-4 py-2"
                        accessibilityRole="button"
                      >
                        <View className="h-9 w-9 items-center justify-center rounded-full bg-warm-100">
                          <Ionicons name="person" size={18} color="#1A1614" />
                        </View>
                        <View className="ml-3 flex-1">
                          <Text className="text-sm font-extrabold text-ink" numberOfLines={1}>
                            {address.label || address.recipient_name}
                          </Text>
                          <Text className="mt-0.5 text-xs font-bold text-warm-600" numberOfLines={1}>
                            {address.recipient_name} - {address.recipient_phone}
                          </Text>
                          <Text className="mt-0.5 text-xs font-semibold text-warm-500" numberOfLines={1}>
                            {[address.street, address.quartier, address.city].filter(Boolean).join(', ')}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color="#B8AF9F" />
                      </Pressable>
                    ))
                  )}
                </View>
              )}

              <FieldLabel required>Destination</FieldLabel>
              <CourseInput
                value={draft.destinationAddress}
                onChangeText={(value) => setDraft((current) => ({ ...current, destinationAddress: value }))}
                placeholder="Adresse de livraison"
              />
              <FieldLabel required>Nom du client</FieldLabel>
              <CourseInput
                value={draft.destinationName}
                onChangeText={(value) => setDraft((current) => ({ ...current, destinationName: value }))}
                placeholder="Nom complet"
                textContentType="name"
              />
              <FieldLabel required>Telephone du client</FieldLabel>
              <CourseInput
                value={draft.destinationPhone}
                onChangeText={(value) => setDraft((current) => ({ ...current, destinationPhone: value }))}
                placeholder="+229..."
                keyboardType="phone-pad"
                textContentType="telephoneNumber"
              />
            </Card>
          ) : (
            <Card className="mb-4" padding="md">
              <Text className="text-base font-extrabold text-ink">Expediteur</Text>
              <FieldLabel required>Nom du commerce</FieldLabel>
              <CourseInput
                value={draft.originName}
                onChangeText={(value) => setDraft((current) => ({ ...current, originName: value }))}
                placeholder="Nom du commerce"
                textContentType="name"
              />
              <FieldLabel required>Telephone du commerce</FieldLabel>
              <CourseInput
                value={draft.originPhone}
                onChangeText={(value) => setDraft((current) => ({ ...current, originPhone: value }))}
                placeholder="+229..."
                keyboardType="phone-pad"
                textContentType="telephoneNumber"
              />
            </Card>
          )}

          <Button
            onPress={() => setStep('details')}
            disabled={!canContinueLocation}
            rightIcon={<Ionicons name="arrow-forward" size={20} color="#1A1614" />}
          >
            Continuer
          </Button>
        </View>
      ) : (
        <View>
          <View className="mb-4 flex-row items-center justify-between">
            <Pressable
              onPress={() => setStep('location')}
              className="h-10 flex-row items-center rounded-full bg-off-white px-3"
              accessibilityRole="button"
            >
              <Ionicons name="chevron-back" size={18} color="#1A1614" />
              <Text className="ml-1 text-sm font-extrabold text-ink">Trajet</Text>
            </Pressable>
            {selectedPackage && (
              <View className="flex-row items-center rounded-full bg-airmess-yellow px-3 py-2">
                <Ionicons name={selectedPackage.icon} size={17} color="#1A1614" />
                <Text className="ml-1 text-xs font-extrabold text-ink">{selectedPackage.title}</Text>
              </View>
            )}
          </View>

          <Card className="mb-4" padding="md">
            <Text className="text-base font-extrabold text-ink">Details utiles</Text>
            <FieldLabel required>Urgence</FieldLabel>
            <View className="flex-row gap-3">
              <OptionCard
                title="Standard"
                subtitle="Livraison normale"
                icon="time-outline"
                selected={draft.urgency === 'standard'}
                onPress={() => setDraft((current) => ({ ...current, urgency: 'standard' }))}
              />
              <OptionCard
                title="Express"
                subtitle="Prioritaire"
                icon="flash-outline"
                selected={draft.urgency === 'express'}
                onPress={() => setDraft((current) => ({ ...current, urgency: 'express' }))}
              />
            </View>

            <FieldLabel required>Description du colis</FieldLabel>
            <TextInput
              value={draft.packageDescription}
              onChangeText={(value) => setDraft((current) => ({ ...current, packageDescription: value }))}
              className="min-h-20 rounded-2xl border border-warm-200 bg-white px-4 py-3 text-sm font-semibold text-ink"
              placeholder="Ex: petit paquet, repas, documents..."
              placeholderTextColor="#A89F95"
              multiline
              textAlignVertical="top"
            />

            <FieldLabel>Photo du colis</FieldLabel>
            <View className="rounded-2xl border border-dashed border-warm-300 bg-white p-3">
              {draft.packagePhotoUri ? (
                <View className="flex-row items-center">
                  <View className="mr-3 h-12 w-12 items-center justify-center rounded-xl bg-success-bg">
                    <Ionicons name="image-outline" size={24} color="#16A34A" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-extrabold text-ink" numberOfLines={1}>
                      Photo ajoutee
                    </Text>
                    <Text className="mt-0.5 text-xs font-semibold text-warm-500" numberOfLines={1}>
                      {draft.packagePhotoUri}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => setDraft((current) => ({ ...current, packagePhotoUri: null }))}
                    className="h-10 w-10 items-center justify-center rounded-full bg-danger-bg"
                    accessibilityRole="button"
                    accessibilityLabel="Retirer la photo"
                  >
                    <Ionicons name="trash-outline" size={19} color="#D40511" />
                  </Pressable>
                </View>
              ) : (
                <Text className="text-sm font-semibold text-warm-500">
                  Optionnel, utile pour identifier le colis.
                </Text>
              )}

              <Pressable
                onPress={() => void pickPackagePhoto()}
                className="mt-3 h-11 flex-row items-center justify-center rounded-xl bg-warm-100"
                accessibilityRole="button"
              >
                <Ionicons name="image-outline" size={19} color="#1A1614" />
                <Text className="ml-2 text-sm font-extrabold text-ink">Ajouter une photo</Text>
              </Pressable>
            </View>
          </Card>

          <Card className="mb-4" padding="md">
            <View className="min-h-12 flex-row items-center">
              <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-warm-100">
                <Ionicons name="options-outline" size={20} color="#1A1614" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-extrabold text-ink">Options avancees</Text>
                <Text className="mt-0.5 text-xs font-semibold text-warm-500">
                  Valeur et paiement
                </Text>
              </View>
            </View>

            <View className="mt-3 border-t border-warm-200 pt-1">
               
                <FieldLabel>Frais de livraison payes par</FieldLabel>
                <View className="gap-2">
                  <PaymentOption
                    title="Le commerce"
                    subtitle="Debite du wallet AirMess"
                    selected={draft.deliveryFeePaidBy === 'sender'}
                    onPress={() => setDraft((current) => ({ ...current, deliveryFeePaidBy: 'sender' }))}
                  />
                  <PaymentOption
                    title="Le destinataire"
                    subtitle="Le client paie a la livraison"
                    selected={draft.deliveryFeePaidBy === 'recipient'}
                    onPress={() => setDraft((current) => ({ ...current, deliveryFeePaidBy: 'recipient' }))}
                  />
                </View>

                <FieldLabel>Valeur declaree du colis (optionnel)</FieldLabel>
                <CourseInput
                  value={draft.packageDeclaredValue}
                  onChangeText={(value) => setDraft((current) => ({ ...current, packageDeclaredValue: value }))}
                  placeholder="Montant en FCFA"
                  keyboardType="numeric"
                />
            </View>
          </Card>

          <Button
            disabled={!canContinueDetails}
            rightIcon={<Ionicons name="arrow-forward" size={20} color="#1A1614" />}
          >
            Voir le recapitulatif
          </Button>
        </View>
      )}
    </Screen>
  )
}

function PackageCard({
  item,
  selected,
  onPress,
}: {
  item: PackageType
  selected: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      onPress={onPress}
      className={[
        'min-h-[96px] w-[47%] rounded-2xl border p-3',
        selected ? 'border-airmess-yellow bg-airmess-yellow' : 'border-warm-200 bg-off-white',
      ].join(' ')}
      accessibilityRole="button"
    >
      <View className="mb-2 h-9 w-9 items-center justify-center rounded-full bg-white">
        <Ionicons name={item.icon} size={20} color="#1A1614" />
      </View>
      <Text className="text-sm font-extrabold text-ink">{item.title}</Text>
      <Text className="mt-0.5 text-[11px] font-semibold leading-4 text-warm-600">{item.subtitle}</Text>
    </Pressable>
  )
}

function StepDot({ active, done, label }: { active: boolean; done: boolean; label: string }) {
  return (
    <View className="flex-row items-center">
      <View
        className={[
          'h-6 w-6 items-center justify-center rounded-full',
          active || done ? 'bg-airmess-yellow' : 'bg-warm-200',
        ].join(' ')}
      >
        <Ionicons name={done ? 'checkmark' : 'ellipse'} size={done ? 14 : 7} color="#1A1614" />
      </View>
      <Text className="ml-2 text-[11px] font-extrabold text-warm-600">{label}</Text>
    </View>
  )
}

function PlaceSearchBox({
  target,
  placeholder,
  onSelect,
}: {
  target: LocationTarget
  placeholder: string
  onSelect: (place: PlaceDetails) => void
}) {
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const sessionIdRef = useRef(generateSessionId())

  useEffect(() => {
    setQuery('')
    setDebounced('')
    setError(null)
  }, [target])

  useEffect(() => {
    const trimmed = query.trim()
    if (trimmed.length < 2) {
      setDebounced('')
      return
    }

    const timer = setTimeout(() => setDebounced(trimmed), 350)
    return () => clearTimeout(timer)
  }, [query])

  const { data: suggestions = [], isFetching } = useQuery({
    queryKey: ['places-search', debounced],
    queryFn: () => searchPlaces(debounced, sessionIdRef.current, 'fr'),
    enabled: debounced.length >= 2,
    staleTime: 5 * 60 * 1000,
  })

  const selectPlace = async (suggestion: PlaceSuggestion) => {
    setLoadingDetail(true)
    setError(null)
    try {
      const place = await fetchPlaceDetails(suggestion.place_id, sessionIdRef.current, 'fr')
      onSelect(place)
      setQuery(suggestion.main_text || suggestion.description)
      setDebounced('')
      sessionIdRef.current = generateSessionId()
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setLoadingDetail(false)
    }
  }

  return (
    <View>
      <View className="h-12 flex-row items-center rounded-2xl border border-warm-200 bg-white px-4">
        <Ionicons name="search" size={19} color="#6F665D" />
        <TextInput
          value={query}
          onChangeText={setQuery}
          className="ml-3 h-full flex-1 text-sm font-semibold text-ink"
          placeholder={placeholder}
          placeholderTextColor="#A89F95"
        />
        {(isFetching || loadingDetail) && <ActivityIndicator color="#1A1614" />}
      </View>

      {error && <Text className="mt-2 text-sm font-bold text-airmess-red">{error}</Text>}

      {debounced.length >= 2 && suggestions.length > 0 && (
        <View className="mt-2 overflow-hidden rounded-2xl border border-warm-200 bg-off-white">
          {suggestions.slice(0, 5).map((suggestion, index) => (
            <Pressable
              key={suggestion.place_id}
              onPress={() => void selectPlace(suggestion)}
              className="min-h-12 flex-row items-center px-4"
              accessibilityRole="button"
            >
              <Ionicons name="location-outline" size={17} color="#6F665D" />
              <View className="ml-3 flex-1">
                <Text className="text-sm font-extrabold text-ink" numberOfLines={1}>
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

function FieldLabel({ children, required = false }: { children: React.ReactNode; required?: boolean }) {
  return (
    <Text className="mb-2 mt-3 text-xs font-extrabold uppercase text-warm-500">
      {children}
      {required && <Text className="text-airmess-red"> *</Text>}
    </Text>
  )
}

function CourseInput({
  value,
  onChangeText,
  placeholder,
  keyboardType,
  textContentType,
}: {
  value: string
  onChangeText: (value: string) => void
  placeholder: string
  keyboardType?: 'default' | 'phone-pad' | 'numeric'
  textContentType?: 'name' | 'telephoneNumber'
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      keyboardType={keyboardType}
      textContentType={textContentType}
      className="h-12 rounded-2xl border border-warm-200 bg-white px-4 text-sm font-semibold text-ink"
      placeholder={placeholder}
      placeholderTextColor="#A89F95"
    />
  )
}

function OptionCard({
  title,
  subtitle,
  icon,
  selected,
  onPress,
}: {
  title: string
  subtitle: string
  icon: keyof typeof Ionicons.glyphMap
  selected: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      onPress={onPress}
      className={[
        'min-h-20 flex-1 rounded-2xl border p-3',
        selected ? 'border-airmess-yellow bg-airmess-yellow' : 'border-warm-200 bg-white',
      ].join(' ')}
      accessibilityRole="button"
    >
      <Ionicons name={icon} size={20} color="#1A1614" />
      <Text className="mt-2 text-sm font-extrabold text-ink">{title}</Text>
      <Text className="mt-0.5 text-[11px] font-semibold text-warm-600">{subtitle}</Text>
    </Pressable>
  )
}

function PaymentOption({
  title,
  subtitle,
  selected,
  onPress,
}: {
  title: string
  subtitle: string
  selected: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      onPress={onPress}
      className={[
        'min-h-14 flex-row items-center rounded-2xl border px-4 py-2',
        selected ? 'border-airmess-yellow bg-airmess-yellow/20' : 'border-warm-200 bg-white',
      ].join(' ')}
      accessibilityRole="button"
    >
      <Ionicons
        name={selected ? 'radio-button-on' : 'radio-button-off'}
        size={20}
        color={selected ? '#1A1614' : '#8A7E68'}
      />
      <View className="ml-3 flex-1">
        <Text className="text-sm font-extrabold text-ink">{title}</Text>
        <Text className="mt-0.5 text-xs font-semibold text-warm-500">{subtitle}</Text>
      </View>
    </Pressable>
  )
}

function formatCompactPlace(quartier: string, city: string) {
  return [quartier, city].filter(Boolean).join(', ')
}

function generateSessionId() {
  const rand = () => Math.floor(Math.random() * 0xffff).toString(16).padStart(4, '0')
  return `${rand()}${rand()}-${rand()}-${rand()}-${rand()}-${rand()}${rand()}${rand()}`
}

function getApiErrorMessage(error: unknown) {
  if (isAxiosError(error)) {
    const data = error.response?.data as { message?: string; errors?: Record<string, string[]> } | undefined
    return data?.message ?? Object.values(data?.errors ?? {})[0]?.[0] ?? 'Recherche indisponible.'
  }

  return 'Recherche indisponible.'
}
