import { useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as Location from 'expo-location'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import { fetchAddresses } from '../../api/addresses'
import { createCourse, estimateCourseFee, fetchPackageCategories } from '../../api/courses'
import { fetchPlaceDetails, searchPlaces, type PlaceDetails, type PlaceSuggestion } from '../../api/places'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Screen from '../../components/ui/Screen'
import { getPaymentCallbackUrl } from '../../lib/payment'
import { useAuthStore } from '../../stores/authStore'
import { useLanguageStore, type AppLanguage } from '../../stores/languageStore'
import { getApiErrorMessage } from '../../lib/apiError'

type Step = 'package' | 'location' | 'details' | 'recap'
type LocationTarget = 'origin' | 'destination'

interface PackageType {
  id: string
  categoryCode: string
  title: string
  subtitle: string
  icon: keyof typeof Ionicons.glyphMap
  size: 'S' | 'M' | 'L'
}

interface LocationDraft {
  originName: string
  originPhone: string
  originPhoneSecondary: string
  originAddress: string
  originQuartier: string
  originCity: string
  originLat: number | null
  originLng: number | null
  destinationName: string
  destinationPhone: string
  destinationPhoneSecondary: string
  destinationAddress: string
  destinationQuartier: string
  destinationCity: string
  destinationLat: number | null
  destinationLng: number | null
  packageDescription: string
  urgency: 'standard' | 'express'
  packageDeclaredValue: string
  deliveryFeePaidBy: 'sender' | 'recipient'
}

const NEW_COURSE_COPY = {
  fr: {
    locale: 'fr-FR',
    packageTypes: [
      { id: 'parcel', categoryCode: 'standard', title: 'Colis', subtitle: 'Paquet simple', icon: 'cube-outline' as const, size: 'M' as const },
      { id: 'food', categoryCode: 'hot_meal', title: 'Repas', subtitle: 'Restaurant, snack', icon: 'fast-food-outline' as const, size: 'S' as const },
      { id: 'documents', categoryCode: 'document', title: 'Documents', subtitle: 'Plis et papiers', icon: 'document-text-outline' as const, size: 'S' as const },
      { id: 'shopping', categoryCode: 'standard', title: 'Courses', subtitle: 'Achats client', icon: 'bag-handle-outline' as const, size: 'M' as const },
      { id: 'pharmacy', categoryCode: 'pharmacy', title: 'Pharmacie', subtitle: 'Produit sensible', icon: 'medkit-outline' as const, size: 'S' as const },
      { id: 'other', categoryCode: 'standard', title: 'Autre', subtitle: 'A preciser apres', icon: 'ellipsis-horizontal-circle-outline' as const, size: 'L' as const },
    ],
    locationPermissionDenied: 'Active la localisation pour detecter le point de depart.',
    positionUnavailable: 'Impossible de detecter la position actuelle.',
    missingBoth: 'la prise en charge et la destination',
    missingOrigin: 'la prise en charge',
    missingDestination: 'la destination',
    title: 'Nouvelle course',
    stepPackage: 'Colis',
    stepTrip: 'Trajet',
    stepDetails: 'Details',
    stepRecap: 'Recap',
    whatAreWeDelivering: 'Nous livrons quoi ?',
    pickup: 'Prise en charge',
    currentPosition: 'Position actuelle',
    editPickup: 'Modifier la prise en charge',
    useMyPosition: 'Utiliser ma position',
    destination: 'Destination',
    whereToDeliver: 'Ou livrer ?',
    editDestination: 'Modifier la destination',
    searchPickup: 'Rechercher la prise en charge',
    searchDestination: 'Rechercher une destination',
    reception: 'Reception',
    addressBook: 'Carnet',
    noAddressSaved: 'Aucune adresse enregistree.',
    destinationLabel: 'Destination',
    deliveryAddress: 'Adresse de livraison',
    customerName: 'Nom du client',
    fullName: 'Nom complet',
    customerPhone: 'Telephone du client',
    customerPhoneSecondary: 'Second numero du client',
    optionalPhone: '+229... (optionnel)',
    sender: 'Expediteur',
    departureAddress: 'Adresse de depart',
    businessName: 'Nom du commerce',
    businessPhone: 'Telephone du commerce',
    continueLabel: 'Continuer',
    usefulDetails: 'Details utiles',
    urgency: 'Urgence',
    standard: 'Standard',
    standardSubtitle: 'Livraison normale',
    express: 'Express',
    expressSubtitle: 'Prioritaire',
    packageDescription: 'Description du colis (optionnel)',
    packageDescriptionPlaceholder: 'Ex: petit paquet, repas, documents...',
    merchantPhoneSecondary: 'Second numero a joindre (marchand)',
    advancedOptions: 'Options avancees',
    advancedOptionsSubtitle: 'Valeur et paiement de la livraison',
    paidBy: 'Frais de livraison payes par',
    paidByMerchant: 'Le commerce',
    paidByMerchantSubtitle: 'Debite du wallet AirMess',
    paidByRecipient: 'Le destinataire',
    paidByRecipientSubtitle: 'Le client paie a la livraison',
    declaredValue: 'Valeur declaree du colis (optionnel)',
    declaredValuePlaceholder: 'Montant en FCFA',
    createCourse: 'Creer une course',
    summary: 'Synthese',
    verifyBeforeCreating: 'Verifie avant de creer',
    estimatedPrice: 'Prix estime',
    calculating: 'Calcul...',
    toCalculate: 'A calculer',
    selectExactPositions: 'Selectionne les positions exactes pour voir le prix.',
    recapPackage: 'Colis',
    recapTrip: 'Trajet',
    recapTripValue: (origin: string, destination: string) => `${origin || 'Depart'} vers ${destination || 'Destination'}`,
    recapClient: 'Client',
    recapClientSecondary: 'Second numero client',
    recapMerchantSecondary: 'Second numero marchand',
    recapUrgency: 'Urgence',
    recapDetails: 'Details',
    recapPayment: 'Paiement',
    recapPaymentRecipient: 'Le client paie les frais a la livraison',
    recapPaymentSender: 'Le commerce paie via son wallet',
    recapValue: 'Valeur',
    missingPositionTitle: 'Position exacte manquante',
    missingPositionSubtitle: (missing: string) =>
      `Selectionne ${missing} dans les resultats de recherche pour permettre au livreur de trouver le trajet.`,
    createFinal: 'Creer la course',
    placesLanguage: 'fr',
  },
  en: {
    locale: 'en-US',
    packageTypes: [
      { id: 'parcel', categoryCode: 'standard', title: 'Parcel', subtitle: 'Simple package', icon: 'cube-outline' as const, size: 'M' as const },
      { id: 'food', categoryCode: 'hot_meal', title: 'Food', subtitle: 'Restaurant, snack', icon: 'fast-food-outline' as const, size: 'S' as const },
      { id: 'documents', categoryCode: 'document', title: 'Documents', subtitle: 'Papers and mail', icon: 'document-text-outline' as const, size: 'S' as const },
      { id: 'shopping', categoryCode: 'standard', title: 'Shopping', subtitle: "Customer's purchases", icon: 'bag-handle-outline' as const, size: 'M' as const },
      { id: 'pharmacy', categoryCode: 'pharmacy', title: 'Pharmacy', subtitle: 'Sensitive product', icon: 'medkit-outline' as const, size: 'S' as const },
      { id: 'other', categoryCode: 'standard', title: 'Other', subtitle: 'To specify later', icon: 'ellipsis-horizontal-circle-outline' as const, size: 'L' as const },
    ],
    locationPermissionDenied: 'Enable location to detect the pickup point.',
    positionUnavailable: 'Unable to detect your current location.',
    missingBoth: 'the pickup and the destination',
    missingOrigin: 'the pickup',
    missingDestination: 'the destination',
    title: 'New delivery',
    stepPackage: 'Package',
    stepTrip: 'Trip',
    stepDetails: 'Details',
    stepRecap: 'Summary',
    whatAreWeDelivering: 'What are we delivering?',
    pickup: 'Pickup',
    currentPosition: 'Current location',
    editPickup: 'Edit pickup',
    useMyPosition: 'Use my location',
    destination: 'Destination',
    whereToDeliver: 'Where to deliver?',
    editDestination: 'Edit destination',
    searchPickup: 'Search for the pickup',
    searchDestination: 'Search for a destination',
    reception: 'Recipient',
    addressBook: 'Address book',
    noAddressSaved: 'No saved address.',
    destinationLabel: 'Destination',
    deliveryAddress: 'Delivery address',
    customerName: "Customer's name",
    fullName: 'Full name',
    customerPhone: "Customer's phone",
    customerPhoneSecondary: "Customer's second number",
    optionalPhone: '+229... (optional)',
    sender: 'Sender',
    departureAddress: 'Departure address',
    businessName: 'Business name',
    businessPhone: 'Business phone',
    continueLabel: 'Continue',
    usefulDetails: 'Useful details',
    urgency: 'Urgency',
    standard: 'Standard',
    standardSubtitle: 'Regular delivery',
    express: 'Express',
    expressSubtitle: 'Priority',
    packageDescription: 'Package description (optional)',
    packageDescriptionPlaceholder: 'Ex: small package, meal, documents...',
    merchantPhoneSecondary: 'Second number to reach (merchant)',
    advancedOptions: 'Advanced options',
    advancedOptionsSubtitle: 'Value and delivery payment',
    paidBy: 'Delivery fee paid by',
    paidByMerchant: 'The business',
    paidByMerchantSubtitle: 'Debited from the AirMess wallet',
    paidByRecipient: 'The recipient',
    paidByRecipientSubtitle: 'Customer pays on delivery',
    declaredValue: 'Declared package value (optional)',
    declaredValuePlaceholder: 'Amount in FCFA',
    createCourse: 'Create a delivery',
    summary: 'Summary',
    verifyBeforeCreating: 'Check before creating',
    estimatedPrice: 'Estimated price',
    calculating: 'Calculating...',
    toCalculate: 'To calculate',
    selectExactPositions: 'Select exact positions to see the price.',
    recapPackage: 'Package',
    recapTrip: 'Trip',
    recapTripValue: (origin: string, destination: string) => `${origin || 'Pickup'} to ${destination || 'Destination'}`,
    recapClient: 'Customer',
    recapClientSecondary: "Customer's second number",
    recapMerchantSecondary: "Merchant's second number",
    recapUrgency: 'Urgency',
    recapDetails: 'Details',
    recapPayment: 'Payment',
    recapPaymentRecipient: 'Customer pays the fee on delivery',
    recapPaymentSender: 'Business pays via its wallet',
    recapValue: 'Value',
    missingPositionTitle: 'Exact position missing',
    missingPositionSubtitle: (missing: string) =>
      `Select ${missing} from the search results so the driver can find the trip.`,
    createFinal: 'Create delivery',
    placesLanguage: 'en',
  },
} as const

type NewCourseCopy = (typeof NEW_COURSE_COPY)[AppLanguage]

export default function NewCourseScreen() {
  const router = useRouter()
  const user = useAuthStore((state) => state.user)
  const language = useLanguageStore((state) => state.language)
  const copy = NEW_COURSE_COPY[language]
  const { addressId } = useLocalSearchParams<{ addressId?: string }>()
  const [step, setStep] = useState<Step>('package')
  const [selectedPackage, setSelectedPackage] = useState<PackageType | null>(null)
  const [locationTarget, setLocationTarget] = useState<LocationTarget>('destination')
  const [locating, setLocating] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [createError, setCreateError] = useState<string | null>(null)
  const [draft, setDraft] = useState<LocationDraft>({
    originName: user?.marchant?.raison_sociale ?? user?.name ?? '',
    originPhone: user?.phone ?? '',
    originPhoneSecondary: '',
    originAddress: '',
    originQuartier: '',
    originCity: 'Cotonou',
    originLat: null,
    originLng: null,
    destinationName: '',
    destinationPhone: '',
    destinationPhoneSecondary: '',
    destinationAddress: '',
    destinationQuartier: '',
    destinationCity: 'Cotonou',
    destinationLat: null,
    destinationLng: null,
    packageDescription: '',
    urgency: 'standard',
    packageDeclaredValue: '',
    deliveryFeePaidBy: 'sender',
  })

  const { data: addresses = [] } = useQuery({
    queryKey: ['addresses'],
    queryFn: fetchAddresses,
  })
  const { data: categories = [] } = useQuery({
    queryKey: ['package-categories'],
    queryFn: fetchPackageCategories,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const useCurrentLocation = async () => {
    setLocating(true)
    setLocationError(null)
    try {
      const permission = await Location.requestForegroundPermissionsAsync()
      if (permission.status !== 'granted') {
        setLocationError(copy.locationPermissionDenied)
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
      setLocationError(copy.positionUnavailable)
    } finally {
      setLocating(false)
    }
  }

  const handleSelectPackage = (item: PackageType) => {
    setSelectedPackage(item)
    setStep('location')
  }

  const handleSelectPlace = (place: PlaceDetails) => {
    setLocationError(null)

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
  const originLat = draft.originLat ?? 0
  const originLng = draft.originLng ?? 0
  const destinationLat = draft.destinationLat ?? 0
  const destinationLng = draft.destinationLng ?? 0
  const missingPositionLabel =
    !hasOriginCoords && !hasDestinationCoords
      ? copy.missingBoth
      : !hasOriginCoords
        ? copy.missingOrigin
        : !hasDestinationCoords
          ? copy.missingDestination
          : ''
  const canContinueLocation =
    !!selectedPackage &&
    draft.originName.trim().length >= 2 &&
    draft.originPhone.trim().length >= 4 &&
    draft.destinationAddress.trim().length >= 2 &&
    draft.destinationName.trim().length >= 2 &&
    draft.destinationPhone.trim().length >= 4
  const canContinueDetails = true
  const packageCategory = categories.find((category) => category.code === selectedPackage?.categoryCode)
  const canCreateCourse =
    canContinueLocation &&
    canContinueDetails &&
    hasOriginCoords &&
    hasDestinationCoords &&
    !!packageCategory
  const estimateQuery = useQuery({
    queryKey: ['course-estimate', originLat, originLng, destinationLat, destinationLng, draft.urgency],
    queryFn: () =>
      estimateCourseFee({
        origin_lat: originLat,
        origin_lng: originLng,
        destination_lat: destinationLat,
        destination_lng: destinationLng,
        urgency: draft.urgency,
      }),
    enabled: hasOriginCoords && hasDestinationCoords,
    staleTime: 30_000,
  })
  const currentFee = estimateQuery.data?.fee ?? null

  const resetForm = () => {
    setStep('package')
    setSelectedPackage(null)
    setLocationTarget('destination')
    setLocationError(null)
    setCreateError(null)
    setShowAddressBook(false)
    setDraft({
      originName: user?.marchant?.raison_sociale ?? user?.name ?? '',
      originPhone: user?.phone ?? '',
      originPhoneSecondary: '',
      originAddress: '',
      originQuartier: '',
      originCity: 'Cotonou',
      originLat: null,
      originLng: null,
      destinationName: '',
      destinationPhone: '',
      destinationPhoneSecondary: '',
      destinationAddress: '',
      destinationQuartier: '',
      destinationCity: 'Cotonou',
      destinationLat: null,
      destinationLng: null,
      packageDescription: '',
      urgency: 'standard',
      packageDeclaredValue: '',
      deliveryFeePaidBy: 'sender',
    })
  }

  const createMutation = useMutation({
    mutationFn: () => {
      if (!selectedPackage || !packageCategory || !draft.originLat || !draft.originLng || !draft.destinationLat || !draft.destinationLng) {
        throw new Error(copy.missingPositionSubtitle(missingPositionLabel))
      }

      const declaredValue = Number(draft.packageDeclaredValue)
      return createCourse({
        package_category_id: packageCategory.id,
        urgency: draft.urgency,
        package_description: draft.packageDescription.trim() || undefined,
        package_size: selectedPackage.size,
        package_declared_value: Number.isFinite(declaredValue) && declaredValue > 0 ? declaredValue : undefined,
        origin_name: draft.originName.trim(),
        origin_phone: draft.originPhone.trim(),
        origin_phone_secondary: draft.originPhoneSecondary.trim() || undefined,
        origin_street: draft.originAddress.trim() || undefined,
        origin_quartier: draft.originQuartier.trim() || draft.originAddress.trim(),
        origin_city: draft.originCity.trim() || 'Cotonou',
        origin_lat: draft.originLat,
        origin_lng: draft.originLng,
        destination_name: draft.destinationName.trim(),
        destination_phone: draft.destinationPhone.trim(),
        destination_phone_secondary: draft.destinationPhoneSecondary.trim() || undefined,
        destination_street: draft.destinationAddress.trim() || undefined,
        destination_quartier: draft.destinationQuartier.trim() || draft.destinationAddress.trim(),
        destination_city: draft.destinationCity.trim() || 'Cotonou',
        destination_lat: draft.destinationLat,
        destination_lng: draft.destinationLng,
        has_collection: false,
        delivery_fee_paid_by: draft.deliveryFeePaidBy,
        callback_url: getPaymentCallbackUrl('course'),
      })
    },
    onSuccess: (result) => {
      setCreateError(null)
      if (result.checkout_url) {
        router.push({
          pathname: '/payment',
          params: {
            checkoutUrl: result.checkout_url,
            context: 'course',
            paymentId: String(result.payment_id ?? ''),
          },
        })
        return
      }
      if (result.course?.id) {
        resetForm()
        router.replace({ pathname: '/courses/[id]', params: { id: String(result.course.id) } })
      }
    },
    onError: (error) => setCreateError(getApiErrorMessage(error, language)),
  })

  const fillDestinationFromAddress = (address: (typeof addresses)[number]) => {
    setLocationError(null)
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

  return (
    <Screen scroll py={16} className="px-5">
      <View className="mb-4">
        <Text className="text-2xl font-extrabold text-ink dark:text-white">{copy.title}</Text>
        <View className="mt-3 flex-row items-center">
          <StepDot active={step === 'package'} done={!!selectedPackage} label={copy.stepPackage} />
          <View className="mx-2 h-0.5 flex-1 bg-warm-200" />
          <StepDot active={step === 'location'} done={canContinueLocation} label={copy.stepTrip} />
          <View className="mx-2 h-0.5 flex-1 bg-warm-200" />
          <StepDot active={step === 'details'} done={canContinueDetails} label={copy.stepDetails} />
          <View className="mx-2 h-0.5 flex-1 bg-warm-200" />
          <StepDot active={step === 'recap'} done={!!createMutation.data?.course} label={copy.stepRecap} />
        </View>
      </View>

      {step === 'package' ? (
        <View>
          <Text className="mb-3 text-base font-extrabold text-ink dark:text-white">{copy.whatAreWeDelivering}</Text>
          <View className="flex-row flex-wrap gap-3">
            {copy.packageTypes.map((item) => (
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
              className="h-10 flex-row items-center rounded-full bg-off-white px-3 dark:bg-[#181B24]"
              accessibilityRole="button"
            >
              <Ionicons name="chevron-back" size={18} color="#1A1614" />
              <Text className="ml-1 text-sm font-extrabold text-ink dark:text-white">{copy.stepPackage}</Text>
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
                  accessibilityLabel={copy.editPickup}
                >
                  <Ionicons name="storefront" size={25} color="#1A1614" />
                </Pressable>
                <Pressable
                  onPress={() => setLocationTarget('origin')}
                  className="flex-1"
                  accessibilityRole="button"
                >
                  <View className="flex-row items-center">
                    <Text className="text-sm font-bold text-warm-400">{copy.pickup}</Text>
                    {hasOriginCoords && (
                      <Ionicons name="checkmark-circle" size={15} color="#16A34A" style={{ marginLeft: 6 }} />
                    )}
                  </View>
                  <Text className="mt-0.5 text-xl font-extrabold text-ink dark:text-white" numberOfLines={1}>
                    {formatCompactPlace(draft.originQuartier, draft.originCity) || copy.currentPosition}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={useCurrentLocation}
                  className="ml-2 h-9 w-9 items-center justify-center rounded-full bg-warm-100"
                  accessibilityRole="button"
                  accessibilityLabel={copy.useMyPosition}
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
                  accessibilityLabel={copy.editDestination}
                >
                  <Ionicons name="flag" size={24} color="#FFFFFF" />
                </Pressable>
                <Pressable
                  onPress={() => setLocationTarget('destination')}
                  className="flex-1"
                  accessibilityRole="button"
                >
                  <View className="flex-row items-center">
                    <Text className="text-sm font-bold text-warm-400">{copy.destination}</Text>
                    {hasDestinationCoords && (
                      <Ionicons name="checkmark-circle" size={15} color="#16A34A" style={{ marginLeft: 6 }} />
                    )}
                  </View>
                  <Text className="mt-0.5 text-xl font-extrabold text-ink dark:text-white" numberOfLines={2}>
                    {draft.destinationAddress ||
                      formatCompactPlace(draft.destinationQuartier, draft.destinationCity) ||
                      copy.whereToDeliver}
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
                copy={copy}
                onSelect={handleSelectPlace}
                onSearchChange={() => setLocationError(null)}
                placeholder={locationTarget === 'origin' ? copy.searchPickup : copy.searchDestination}
              />
            </View>
          </View>

          {locationTarget === 'destination' ? (
            <Card className="mb-4" padding="md">
              <View className="flex-row items-center justify-between">
                <Text className="text-base font-extrabold text-ink dark:text-white">{copy.reception}</Text>
                <Pressable
                  onPress={() => setShowAddressBook((value) => !value)}
                  className="h-9 flex-row items-center rounded-full bg-warm-100 px-3"
                  accessibilityRole="button"
                >
                  <Ionicons name="people" size={16} color="#1A1614" />
                  <Text className="ml-1 text-xs font-extrabold text-ink">{copy.addressBook}</Text>
                </Pressable>
              </View>

              {showAddressBook && (
                <View className="mt-3 overflow-hidden rounded-2xl border border-warm-200 bg-white dark:border-[#343A46] dark:bg-[#181B24]">
                  {addresses.length === 0 ? (
                    <Text className="px-4 py-3 text-sm font-semibold text-warm-500">
                      {copy.noAddressSaved}
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
                          <Text className="text-sm font-extrabold text-ink dark:text-white" numberOfLines={1}>
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

              <FieldLabel required>{copy.destinationLabel}</FieldLabel>
              <CourseInput
                value={draft.destinationAddress}
                onChangeText={(value) => {
                  setLocationError(null)
                  setDraft((current) => ({ ...current, destinationAddress: value }))
                }}
                placeholder={copy.deliveryAddress}
              />
              <FieldLabel required>{copy.customerName}</FieldLabel>
              <CourseInput
                value={draft.destinationName}
                onChangeText={(value) => setDraft((current) => ({ ...current, destinationName: value }))}
                placeholder={copy.fullName}
                textContentType="name"
              />
              <FieldLabel required>{copy.customerPhone}</FieldLabel>
              <CourseInput
                value={draft.destinationPhone}
                onChangeText={(value) => setDraft((current) => ({ ...current, destinationPhone: value }))}
                placeholder="+229..."
                keyboardType="phone-pad"
                textContentType="telephoneNumber"
              />
              <FieldLabel>{copy.customerPhoneSecondary}</FieldLabel>
              <CourseInput
                value={draft.destinationPhoneSecondary}
                onChangeText={(value) => setDraft((current) => ({ ...current, destinationPhoneSecondary: value }))}
                placeholder={copy.optionalPhone}
                keyboardType="phone-pad"
                textContentType="telephoneNumber"
              />
            </Card>
          ) : (
            <Card className="mb-4" padding="md">
              <Text className="text-base font-extrabold text-ink dark:text-white">{copy.sender}</Text>
              <FieldLabel required>{copy.pickup}</FieldLabel>
              <CourseInput
                value={draft.originAddress}
                onChangeText={(value) => {
                  setLocationError(null)
                  setDraft((current) => ({ ...current, originAddress: value }))
                }}
                placeholder={copy.departureAddress}
              />
              <FieldLabel required>{copy.businessName}</FieldLabel>
              <CourseInput
                value={draft.originName}
                onChangeText={(value) => setDraft((current) => ({ ...current, originName: value }))}
                placeholder={copy.businessName}
                textContentType="name"
              />
              <FieldLabel required>{copy.businessPhone}</FieldLabel>
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
            {copy.continueLabel}
          </Button>
        </View>
      ) : step === 'details' ? (
        <View>
          <View className="mb-4 flex-row items-center justify-between">
            <Pressable
              onPress={() => setStep('location')}
              className="h-10 flex-row items-center rounded-full bg-off-white px-3 dark:bg-[#181B24]"
              accessibilityRole="button"
            >
              <Ionicons name="chevron-back" size={18} color="#1A1614" />
              <Text className="ml-1 text-sm font-extrabold text-ink dark:text-white">{copy.stepTrip}</Text>
            </Pressable>
            {selectedPackage && (
              <View className="flex-row items-center rounded-full bg-airmess-yellow px-3 py-2">
                <Ionicons name={selectedPackage.icon} size={17} color="#1A1614" />
                <Text className="ml-1 text-xs font-extrabold text-ink">{selectedPackage.title}</Text>
              </View>
            )}
          </View>

          <Card className="mb-4" padding="md">
            <Text className="text-base font-extrabold text-ink dark:text-white">{copy.usefulDetails}</Text>
            <FieldLabel required>{copy.urgency}</FieldLabel>
            <View className="flex-row gap-3">
              <OptionCard
                title={copy.standard}
                subtitle={copy.standardSubtitle}
                icon="time-outline"
                selected={draft.urgency === 'standard'}
                onPress={() => setDraft((current) => ({ ...current, urgency: 'standard' }))}
              />
              <OptionCard
                title={copy.express}
                subtitle={copy.expressSubtitle}
                icon="flash-outline"
                selected={draft.urgency === 'express'}
                onPress={() => setDraft((current) => ({ ...current, urgency: 'express' }))}
              />
            </View>

            <FieldLabel>{copy.packageDescription}</FieldLabel>
            <TextInput
              value={draft.packageDescription}
              onChangeText={(value) => setDraft((current) => ({ ...current, packageDescription: value }))}
              className="min-h-20 rounded-2xl border border-warm-200 bg-white px-4 py-3 text-sm font-semibold text-ink dark:border-[#343A46] dark:bg-[#181B24] dark:text-white"
              placeholder={copy.packageDescriptionPlaceholder}
              placeholderTextColor="#A89F95"
              multiline
              textAlignVertical="top"
            />

            <FieldLabel>{copy.merchantPhoneSecondary}</FieldLabel>
            <CourseInput
              value={draft.originPhoneSecondary}
              onChangeText={(value) => setDraft((current) => ({ ...current, originPhoneSecondary: value }))}
              placeholder={copy.optionalPhone}
              keyboardType="phone-pad"
              textContentType="telephoneNumber"
            />
          </Card>

          <Card className="mb-4" padding="md">
            <View className="min-h-12 flex-row items-center">
              <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-warm-100">
                <Ionicons name="options-outline" size={20} color="#1A1614" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-extrabold text-ink dark:text-white">{copy.advancedOptions}</Text>
                <Text className="mt-0.5 text-xs font-semibold text-warm-500">
                  {copy.advancedOptionsSubtitle}
                </Text>
              </View>
            </View>

            <View className="mt-3 border-t border-warm-200 pt-1">
                <FieldLabel>{copy.paidBy}</FieldLabel>
                <View className="gap-2">
                  <PaymentOption
                    title={copy.paidByMerchant}
                    subtitle={copy.paidByMerchantSubtitle}
                    selected={draft.deliveryFeePaidBy === 'sender'}
                    onPress={() => setDraft((current) => ({ ...current, deliveryFeePaidBy: 'sender' }))}
                  />
                  <PaymentOption
                    title={copy.paidByRecipient}
                    subtitle={copy.paidByRecipientSubtitle}
                    selected={draft.deliveryFeePaidBy === 'recipient'}
                    onPress={() => setDraft((current) => ({ ...current, deliveryFeePaidBy: 'recipient' }))}
                  />
                </View>

                <FieldLabel>{copy.declaredValue}</FieldLabel>
                <CourseInput
                  value={draft.packageDeclaredValue}
                  onChangeText={(value) => setDraft((current) => ({ ...current, packageDeclaredValue: value }))}
                  placeholder={copy.declaredValuePlaceholder}
                  keyboardType="numeric"
                />
            </View>
          </Card>

          <Button
            onPress={() => setStep('recap')}
            disabled={!canContinueDetails}
            rightIcon={<Ionicons name="arrow-forward" size={20} color="#1A1614" />}
          >
            {copy.createCourse}
          </Button>
        </View>
      ) : (
        <View>
          <View className="mb-4 flex-row items-center justify-between">
            <Pressable
              onPress={() => setStep('details')}
              className="h-10 flex-row items-center rounded-full bg-off-white px-3 dark:bg-[#181B24]"
              accessibilityRole="button"
            >
              <Ionicons name="chevron-back" size={18} color="#1A1614" />
              <Text className="ml-1 text-sm font-extrabold text-ink dark:text-white">{copy.stepDetails}</Text>
            </Pressable>
          </View>

          <Card className="mb-4" padding="lg">
            <View className="mb-4 flex-row items-center">
              <View className="mr-3 h-11 w-11 items-center justify-center rounded-full bg-airmess-yellow">
                <Ionicons name="receipt-outline" size={22} color="#1A1614" />
              </View>
              <View className="flex-1">
                <Text className="text-xl font-extrabold text-ink dark:text-white">{copy.summary}</Text>
                <Text className="mt-0.5 text-sm font-semibold text-warm-500">{copy.verifyBeforeCreating}</Text>
              </View>
            </View>

            <View className="mb-4 rounded-2xl bg-ink p-4">
              <View className="flex-row items-center justify-between">
                <View className="flex-1 pr-3">
                  <Text className="text-xs font-extrabold uppercase text-airmess-yellow">
                    {copy.estimatedPrice}
                  </Text>
                  <Text className="mt-1 text-3xl font-extrabold text-white">
                    {estimateQuery.isFetching
                      ? copy.calculating
                      : currentFee !== null
                        ? `${currentFee.toLocaleString(copy.locale)} FCFA`
                        : copy.toCalculate}
                  </Text>
                  <Text className="mt-1 text-xs font-semibold text-warm-300">
                    {currentFee !== null && estimateQuery.data
                      ? `${estimateQuery.data.distance_km.toFixed(1)} km - ${draft.urgency === 'express' ? copy.express : copy.standard}`
                      : copy.selectExactPositions}
                  </Text>
                </View>
                <View className="h-12 w-12 items-center justify-center rounded-2xl bg-airmess-yellow">
                  {estimateQuery.isFetching ? (
                    <ActivityIndicator color="#1A1614" />
                  ) : (
                    <Ionicons name="cash-outline" size={24} color="#1A1614" />
                  )}
                </View>
              </View>
            </View>

            <RecapRow icon="cube-outline" label={copy.recapPackage} value={selectedPackage?.title ?? '--'} />
            <RecapRow
              icon="navigate-outline"
              label={copy.recapTrip}
              value={copy.recapTripValue(formatCompactPlace(draft.originQuartier, draft.originCity), draft.destinationAddress)}
            />
            <RecapRow icon="person-outline" label={copy.recapClient} value={`${draft.destinationName} - ${draft.destinationPhone}`} />
            {!!draft.destinationPhoneSecondary.trim() && (
              <RecapRow icon="call-outline" label={copy.recapClientSecondary} value={draft.destinationPhoneSecondary.trim()} />
            )}
            {!!draft.originPhoneSecondary.trim() && (
              <RecapRow icon="call-outline" label={copy.recapMerchantSecondary} value={draft.originPhoneSecondary.trim()} />
            )}
            <RecapRow icon="flash-outline" label={copy.recapUrgency} value={draft.urgency === 'express' ? copy.express : copy.standard} />
            {!!draft.packageDescription.trim() && (
              <RecapRow icon="document-text-outline" label={copy.recapDetails} value={draft.packageDescription.trim()} />
            )}
            <RecapRow
              icon={draft.deliveryFeePaidBy === 'recipient' ? 'cash-outline' : 'wallet-outline'}
              label={copy.recapPayment}
              value={draft.deliveryFeePaidBy === 'recipient' ? copy.recapPaymentRecipient : copy.recapPaymentSender}
            />
            {!!draft.packageDeclaredValue.trim() && (
              <RecapRow icon="shield-checkmark-outline" label={copy.recapValue} value={`${draft.packageDeclaredValue.trim()} FCFA`} />
            )}

            {(!hasOriginCoords || !hasDestinationCoords) && (
              <View className="mt-4 rounded-2xl border border-warning/30 bg-warning-bg p-3">
                <Text className="text-sm font-bold text-ink dark:text-white">{copy.missingPositionTitle}</Text>
                <Text className="mt-1 text-xs font-semibold leading-5 text-warm-600">
                  {copy.missingPositionSubtitle(missingPositionLabel)}
                </Text>
              </View>
            )}

            {createError && (
              <Text className="mt-4 text-sm font-bold text-airmess-red">{createError}</Text>
            )}
          </Card>

          <Button
            onPress={() => createMutation.mutate()}
            loading={createMutation.isPending}
            disabled={!canCreateCourse || createMutation.isPending}
            rightIcon={<Ionicons name="checkmark" size={20} color="#1A1614" />}
          >
            {copy.createFinal}
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
        selected ? 'border-airmess-yellow bg-airmess-yellow' : 'border-warm-200 bg-off-white dark:border-[#343A46] dark:bg-[#181B24]',
      ].join(' ')}
      accessibilityRole="button"
    >
      <View className="mb-2 h-9 w-9 items-center justify-center rounded-full bg-white dark:bg-[#11141B]">
        <Ionicons name={item.icon} size={20} color="#1A1614" />
      </View>
      <Text className={['text-sm font-extrabold', selected ? 'text-ink' : 'text-ink dark:text-white'].join(' ')}>{item.title}</Text>
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
  copy,
  onSelect,
  onSearchChange,
}: {
  target: LocationTarget
  placeholder: string
  copy: NewCourseCopy
  onSelect: (place: PlaceDetails) => void
  onSearchChange?: () => void
}) {
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const sessionIdRef = useRef(generateSessionId())

  useEffect(() => {
    setQuery('')
    setDebounced('')
    setDetailError(null)
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

  const { data: suggestions = [], isFetching, error: searchError } = useQuery({
    queryKey: ['places-search', debounced, copy.placesLanguage],
    queryFn: () => searchPlaces(debounced, sessionIdRef.current, copy.placesLanguage),
    enabled: debounced.length >= 2,
    staleTime: 5 * 60 * 1000,
  })

  const selectPlace = async (suggestion: PlaceSuggestion) => {
    setLoadingDetail(true)
    setDetailError(null)
    try {
      const place = await fetchPlaceDetails(suggestion.place_id, sessionIdRef.current, copy.placesLanguage)
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
      className="h-12 rounded-2xl border border-warm-200 bg-white px-4 text-sm font-semibold text-ink dark:border-[#343A46] dark:bg-[#181B24] dark:text-white"
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
        selected ? 'border-airmess-yellow bg-airmess-yellow' : 'border-warm-200 bg-white dark:border-[#343A46] dark:bg-[#181B24]',
      ].join(' ')}
      accessibilityRole="button"
    >
      <Ionicons name={icon} size={20} color="#1A1614" />
      <Text className={['mt-2 text-sm font-extrabold', selected ? 'text-ink' : 'text-ink dark:text-white'].join(' ')}>{title}</Text>
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
        selected ? 'border-airmess-yellow bg-airmess-yellow/20' : 'border-warm-200 bg-white dark:border-[#343A46] dark:bg-[#181B24]',
      ].join(' ')}
      accessibilityRole="button"
    >
      <Ionicons
        name={selected ? 'radio-button-on' : 'radio-button-off'}
        size={20}
        color={selected ? '#1A1614' : '#8A7E68'}
      />
      <View className="ml-3 flex-1">
        <Text className="text-sm font-extrabold text-ink dark:text-white">{title}</Text>
        <Text className="mt-0.5 text-xs font-semibold text-warm-500">{subtitle}</Text>
      </View>
    </Pressable>
  )
}

function RecapRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  value: string
}) {
  return (
    <View className="flex-row items-start border-t border-warm-100 py-3">
      <View className="mr-3 h-9 w-9 items-center justify-center rounded-full bg-warm-100">
        <Ionicons name={icon} size={18} color="#1A1614" />
      </View>
      <View className="flex-1">
        <Text className="text-xs font-extrabold uppercase text-warm-500">{label}</Text>
        <Text className="mt-0.5 text-sm font-extrabold leading-5 text-ink dark:text-white">{value}</Text>
      </View>
    </View>
  )
}

function formatCompactPlace(quartier: string, city: string) {
  return [quartier, city].filter(Boolean).join(', ')
}

function generateSessionId() {
  const rand = () => Math.floor(Math.random() * 0xffff).toString(16).padStart(4, '0')
  return `${rand()}${rand()}-${rand()}-${rand()}-${rand()}-${rand()}${rand()}${rand()}`
}
