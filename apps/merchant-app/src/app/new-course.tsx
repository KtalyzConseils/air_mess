import { useEffect, useMemo, useState, type ComponentProps } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  Switch,
} from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import { useAuthStore } from '../stores/authStore'
import { fetchPackageCategories } from '../api/packageCategories'
import {
  createCourse,
  estimateCourseFee,
  type CreateCoursePayload,
  type CourseFeeEstimate,
} from '../api/courses'
import { fetchWallet } from '../api/wallet'
import PlaceSearchField from '../components/PlaceSearchField'
import type { PlaceDetails } from '../api/places'
import CourseRouteMap from '../components/CourseRouteMap'
import Button from '../components/ui/Button'
import { normalizePhone } from '../lib/phone'

type Step = 1 | 2 | 3
type PackageSize = 'S' | 'M' | 'L' | 'XL'
type Urgency = 'standard' | 'express'

const SIZES: { value: PackageSize; label: string }[] = [
  { value: 'S', label: 'S' },
  { value: 'M', label: 'M' },
  { value: 'L', label: 'L' },
  { value: 'XL', label: 'XL' },
]

function placeLabel(p: PlaceDetails | null): string | undefined {
  if (!p) return undefined
  return [p.name, p.quartier, p.city].filter(Boolean).join(' · ') || p.formatted_address || undefined
}

function pinFromMap(lat: number, lng: number, existing: PlaceDetails | null): PlaceDetails {
  return {
    place_id: existing?.place_id?.startsWith('manual_')
      ? `manual_${lat.toFixed(5)}_${lng.toFixed(5)}`
      : existing?.place_id ?? `manual_${lat.toFixed(5)}_${lng.toFixed(5)}`,
    name: existing?.name ?? null,
    formatted_address: existing?.formatted_address ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
    lat,
    lng,
    quartier: existing?.quartier || 'Position carte',
    city: existing?.city || 'Cotonou',
  }
}

/**
 * Wizard création de course — recherche lieux + carte dual-pin + estimation.
 */
export default function NewCourseScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)

  const pendingValidation = user?.type === 'marchant' && !user.marchant?.validated_at

  const [step, setStep] = useState<Step>(1)
  const [error, setError] = useState<string | null>(null)
  const [activePin, setActivePin] = useState<'A' | 'B'>('A')

  // Step 1 — trajet
  const [origin, setOrigin] = useState<PlaceDetails | null>(null)
  const [destination, setDestination] = useState<PlaceDetails | null>(null)
  const [originName, setOriginName] = useState('')
  const [originPhone, setOriginPhone] = useState('')
  const [destName, setDestName] = useState('')
  const [destPhone, setDestPhone] = useState('')

  // Step 2 — colis
  const [categoryId, setCategoryId] = useState<number | null>(null)
  const [description, setDescription] = useState('')
  const [size, setSize] = useState<PackageSize>('M')
  const [urgency, setUrgency] = useState<Urgency>('standard')
  const [hasCollection, setHasCollection] = useState(false)
  const [collectionAmount, setCollectionAmount] = useState('')
  const [paidByRecipient, setPaidByRecipient] = useState(false)

  // Step 3
  const [estimate, setEstimate] = useState<CourseFeeEstimate | null>(null)
  const [estimating, setEstimating] = useState(false)

  const { data: categories = [], isLoading: catsLoading } = useQuery({
    queryKey: ['package-categories'],
    queryFn: fetchPackageCategories,
  })

  const { data: wallet } = useQuery({
    queryKey: ['wallet'],
    queryFn: fetchWallet,
    staleTime: 30_000,
  })

  useEffect(() => {
    if (!user) return
    const name =
      user.type === 'marchant'
        ? (user.marchant?.raison_sociale ?? user.name)
        : user.individual
          ? `${user.individual.first_name} ${user.individual.last_name}`
          : user.name
    setOriginName(name)
    setOriginPhone(user.phone ?? '')
  }, [user])

  useEffect(() => {
    if (categories.length && categoryId == null) {
      setCategoryId(categories[0].id)
    }
  }, [categories, categoryId])

  const canStep1 =
    !!origin &&
    !!destination &&
    !!originName.trim() &&
    !!originPhone.trim() &&
    !!destName.trim() &&
    !!destPhone.trim()

  const canStep2 = !!categoryId && description.trim().length >= 3

  const mutation = useMutation({
    mutationFn: createCourse,
    onSuccess: (result) => {
      if (result.course) {
        queryClient.invalidateQueries({ queryKey: ['courses'] })
        queryClient.invalidateQueries({ queryKey: ['wallet'] })
        Alert.alert('Course créée', `Réf. ${result.course.reference}`, [
          {
            text: 'Voir le détail',
            onPress: () => router.replace(`/course/${result.course!.id}`),
          },
        ])
        return
      }
      if (result.payment_required && result.checkout_url) {
        router.push({
          pathname: '/payment',
          params: {
            url: result.checkout_url,
            payment_id: String(result.payment_id ?? ''),
          },
        })
        return
      }
      if (result.quota_reached) {
        setError(
          `Quota mensuel atteint (${result.used}/${result.limit}). Recharge ton wallet ou paie à la course.`,
        )
        return
      }
      setError(result.message ?? 'Création impossible.')
    },
    onError: (err) => {
      if (err instanceof AxiosError) {
        const data = err.response?.data as {
          message?: string
          errors?: Record<string, string[]>
        }
        const first = data?.errors ? Object.values(data.errors)[0]?.[0] : null
        setError(first ?? data?.message ?? 'Création impossible.')
      } else {
        setError((err as Error).message)
      }
    },
  })

  async function goEstimate() {
    if (!origin || !destination) return
    setError(null)
    setEstimating(true)
    try {
      const est = await estimateCourseFee({
        origin_lat: origin.lat,
        origin_lng: origin.lng,
        destination_lat: destination.lat,
        destination_lng: destination.lng,
        urgency,
      })
      setEstimate(est)
      setStep(3)
    } catch {
      setError('Impossible d’estimer le tarif. Vérifie les adresses.')
    } finally {
      setEstimating(false)
    }
  }

  function buildPayload(): CreateCoursePayload & { callback_url?: string } {
    const base = (process.env.EXPO_PUBLIC_API_BASE_URL ?? '').replace(/\/+$/, '')
    return {
      package_category_id: categoryId!,
      urgency,
      package_description: description.trim(),
      package_size: size,
      origin_name: originName.trim(),
      origin_phone: normalizePhone(originPhone),
      origin_quartier: origin?.quartier || origin?.name || '—',
      origin_city: origin?.city || 'Cotonou',
      origin_lat: origin!.lat,
      origin_lng: origin!.lng,
      origin_street: origin?.formatted_address ?? undefined,
      destination_name: destName.trim(),
      destination_phone: normalizePhone(destPhone),
      destination_quartier: destination?.quartier || destination?.name || '—',
      destination_city: destination?.city || 'Cotonou',
      destination_lat: destination!.lat,
      destination_lng: destination!.lng,
      destination_street: destination?.formatted_address ?? undefined,
      has_collection: hasCollection,
      collection_amount: hasCollection ? Number(collectionAmount) || 0 : undefined,
      collection_method: hasCollection ? 'cash' : undefined,
      delivery_fee_paid_by: paidByRecipient ? 'recipient' : 'sender',
      callback_url: base ? `${base}/payments/return-to-app` : undefined,
    }
  }

  function submit() {
    setError(null)
    mutation.mutate(buildPayload())
  }

  const stepTitle = useMemo(() => {
    if (step === 1) return 'Trajet'
    if (step === 2) return 'Colis'
    return 'Confirmation'
  }, [step])

  if (pendingValidation) {
    return (
      <SafeAreaView className="flex-1 bg-cream px-5 justify-center" edges={['top', 'left', 'right']}>
        <Text className="text-2xl font-extrabold text-ink mb-2">Compte en validation</Text>
        <Text className="text-warm-500 mb-6">
          La création de courses sera disponible après validation commerciale.
        </Text>
        <Button variant="dark" onPress={() => router.back()}>
          Retour
        </Button>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />
      <View className="px-5 pt-2 pb-3 flex-row items-center">
        <Pressable onPress={() => (step === 1 ? router.back() : setStep((s) => (s - 1) as Step))} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color="#1A1614" />
        </Pressable>
        <View className="ml-3 flex-1">
          <Text className="text-warm-500 text-[10px] font-extrabold uppercase tracking-widest">
            Étape {step}/3
          </Text>
          <Text className="text-xl font-extrabold text-ink">{stepTitle}</Text>
        </View>
      </View>

      <View className="px-5 flex-row gap-2 mb-3">
        {([1, 2, 3] as Step[]).map((s) => (
          <View
            key={s}
            className={`flex-1 h-1.5 rounded-full ${s <= step ? 'bg-airmess-yellow' : 'bg-warm-200'}`}
          />
        ))}
      </View>

      <KeyboardAwareScrollView
        bottomOffset={24}
        contentContainerStyle={{ padding: 20, paddingTop: 8, paddingBottom: 40 + insets.bottom }}
        keyboardShouldPersistTaps="handled"
      >
        {step === 1 && (
          <>
            <CourseRouteMap
              editable
              activePin={activePin}
              onActivePinChange={setActivePin}
              origin={origin ? { lat: origin.lat, lng: origin.lng } : null}
              destination={destination ? { lat: destination.lat, lng: destination.lng } : null}
              onOriginChange={(lat, lng) => setOrigin((prev) => pinFromMap(lat, lng, prev))}
              onDestChange={(lat, lng) => setDestination((prev) => pinFromMap(lat, lng, prev))}
              height={260}
            />

            <PlaceSearchField
              label="Point de départ (recherche)"
              valueLabel={placeLabel(origin)}
              onPicked={(p) => {
                setOrigin(p)
                setActivePin('B')
              }}
              onCleared={() => setOrigin(null)}
            />
            <Field label="Expéditeur" value={originName} onChangeText={setOriginName} />
            <Field
              label="Tél. expéditeur"
              value={originPhone}
              onChangeText={setOriginPhone}
              keyboardType="phone-pad"
            />

            <PlaceSearchField
              label="Destination (recherche)"
              valueLabel={placeLabel(destination)}
              onPicked={(p) => {
                setDestination(p)
                setActivePin('B')
              }}
              onCleared={() => setDestination(null)}
            />
            <Field label="Destinataire" value={destName} onChangeText={setDestName} />
            <Field
              label="Tél. destinataire"
              value={destPhone}
              onChangeText={setDestPhone}
              keyboardType="phone-pad"
            />

            {error && <ErrorBox text={error} />}
            <Button
              variant="primary"
              size="lg"
              disabled={!canStep1}
              onPress={() => {
                setError(null)
                setStep(2)
              }}
            >
              Continuer
            </Button>
          </>
        )}

        {step === 2 && (
          <>
            <Text className="text-[10px] uppercase text-warm-500 tracking-widest font-extrabold mb-2">
              Catégorie
            </Text>
            {catsLoading ? (
              <ActivityIndicator color="#1A1614" className="mb-4" />
            ) : (
              <View className="flex-row flex-wrap gap-2 mb-4">
                {categories.map((c) => (
                  <Pressable
                    key={c.id}
                    onPress={() => setCategoryId(c.id)}
                    className={`px-3 py-2 rounded-full border ${
                      categoryId === c.id
                        ? 'bg-airmess-yellow border-airmess-yellow'
                        : 'bg-off-white border-warm-200'
                    }`}
                  >
                    <Text className="text-xs font-bold text-ink">{c.name}</Text>
                  </Pressable>
                ))}
              </View>
            )}

            <Field
              label="Description du colis"
              value={description}
              onChangeText={setDescription}
              placeholder="Ex. Documents, repas…"
            />

            <Text className="text-[10px] uppercase text-warm-500 tracking-widest font-extrabold mb-2">
              Taille
            </Text>
            <View className="flex-row gap-2 mb-4">
              {SIZES.map((s) => (
                <Pressable
                  key={s.value}
                  onPress={() => setSize(s.value)}
                  className={`flex-1 py-3 rounded-2xl items-center border-2 ${
                    size === s.value
                      ? 'bg-airmess-dark border-airmess-dark'
                      : 'bg-off-white border-warm-200'
                  }`}
                >
                  <Text
                    className={`font-extrabold ${size === s.value ? 'text-airmess-yellow' : 'text-ink'}`}
                  >
                    {s.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text className="text-[10px] uppercase text-warm-500 tracking-widest font-extrabold mb-2">
              Urgence
            </Text>
            <View className="flex-row gap-2 mb-4">
              {(['standard', 'express'] as Urgency[]).map((u) => (
                <Pressable
                  key={u}
                  onPress={() => setUrgency(u)}
                  className={`flex-1 py-3 rounded-2xl items-center border-2 ${
                    urgency === u
                      ? 'bg-airmess-yellow border-airmess-yellow'
                      : 'bg-off-white border-warm-200'
                  }`}
                >
                  <Text className="font-bold text-ink">
                    {u === 'standard' ? 'Standard' : 'Express'}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View className="flex-row items-center justify-between mb-3 bg-off-white border border-warm-200 rounded-2xl px-4 py-3">
              <Text className="text-ink font-semibold flex-1">Encaissement à la livraison</Text>
              <Switch value={hasCollection} onValueChange={setHasCollection} />
            </View>
            {hasCollection && (
              <Field
                label="Montant à encaisser (FCFA)"
                value={collectionAmount}
                onChangeText={setCollectionAmount}
                keyboardType="numeric"
              />
            )}

            <View className="flex-row items-center justify-between mb-5 bg-off-white border border-warm-200 rounded-2xl px-4 py-3">
              <View className="flex-1 mr-3">
                <Text className="text-ink font-semibold">Frais payés par le destinataire</Text>
                <Text className="text-warm-500 text-xs mt-0.5">
                  Sinon débités sur ton wallet
                </Text>
              </View>
              <Switch value={paidByRecipient} onValueChange={setPaidByRecipient} />
            </View>

            {error && <ErrorBox text={error} />}
            <Button variant="primary" size="lg" disabled={!canStep2 || estimating} loading={estimating} onPress={goEstimate}>
              Voir le tarif
            </Button>
          </>
        )}

        {step === 3 && estimate && (
          <>
            <CourseRouteMap
              origin={origin ? { lat: origin.lat, lng: origin.lng } : null}
              destination={destination ? { lat: destination.lat, lng: destination.lng } : null}
              height={200}
            />

            <View className="bg-airmess-dark rounded-3xl p-5 mb-4">
              <Text className="text-airmess-yellow text-[10px] font-extrabold uppercase tracking-widest">
                Estimation
              </Text>
              <Text className="text-white text-3xl font-extrabold mt-1">
                {estimate.fee.toLocaleString('fr-FR')} FCFA
              </Text>
              <Text className="text-warm-400 text-sm mt-1">
                ~{estimate.distance_km.toFixed(1)} km · {urgency === 'express' ? 'Express' : 'Standard'}
              </Text>
              {wallet && !paidByRecipient && (
                <Text className="text-warm-300 text-xs mt-3">
                  Solde dispo : {wallet.available.toLocaleString('fr-FR')} FCFA
                </Text>
              )}
            </View>

            <RecapRow label="Départ" value={placeLabel(origin) ?? '—'} />
            <RecapRow label="Arrivée" value={placeLabel(destination) ?? '—'} />
            <RecapRow label="Destinataire" value={`${destName} · ${destPhone}`} />
            <RecapRow label="Colis" value={description} />
            <RecapRow
              label="Catégorie"
              value={categories.find((c) => c.id === categoryId)?.name ?? '—'}
            />

            {error && <ErrorBox text={error} />}

            <View className="mt-4">
              <Button variant="primary" size="lg" loading={mutation.isPending} onPress={submit}>
                Confirmer la course
              </Button>
            </View>
          </>
        )}
      </KeyboardAwareScrollView>
    </SafeAreaView>
  )
}

function Field({
  label,
  ...props
}: { label: string } & ComponentProps<typeof TextInput>) {
  return (
    <View className="mb-4">
      <Text className="text-[10px] uppercase text-warm-500 tracking-widest font-extrabold mb-1.5">
        {label}
      </Text>
      <TextInput
        placeholderTextColor="#B8AF9F"
        className="border-2 border-warm-200 rounded-2xl px-4 h-14 text-base text-ink bg-off-white"
        {...props}
      />
    </View>
  )
}

function RecapRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="mb-3 pb-3 border-b border-warm-200">
      <Text className="text-[10px] uppercase text-warm-500 tracking-widest font-extrabold">
        {label}
      </Text>
      <Text className="text-ink font-semibold mt-0.5">{value}</Text>
    </View>
  )
}

function ErrorBox({ text }: { text: string }) {
  return (
    <View className="bg-danger-bg border border-airmess-red/30 rounded-2xl p-3 mb-4">
      <Text className="text-airmess-red text-sm font-semibold">{text}</Text>
    </View>
  )
}
