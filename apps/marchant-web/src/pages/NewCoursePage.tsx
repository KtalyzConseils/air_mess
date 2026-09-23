import { useState, useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { AxiosError } from 'axios'
import { useTranslation } from 'react-i18next'
import AppHeader from '../components/AppHeader'
import Field from '../components/Field'
import Highlight from '../components/Highlight'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import PageEyebrow from '../components/ui/PageEyebrow'
import { fetchPackageCategories } from '../api/packageCategories'
import {
  createCourse,
  estimateCourseFee,
  type CreateCoursePayload,
  type CourseFeeEstimate,
} from '../api/courses'
import AddressPicker from '../components/AddressPicker'
import type { Address } from '../api/addresses'
import type { PlaceDetails } from '../api/places'
import { useAuthStore } from '../stores/authStore'
import { fetchWallet } from '../api/wallet'
import { useOnboardingStore } from '../stores/onboardingStore'
import Coachmark, { type CoachStep } from '../components/onboarding/Coachmark'
import OriginDrawer from '../components/course/OriginDrawer'
import CoursePriceRecap from '../components/course/CoursePriceRecap'
import MobileCoursePriceBar from '../components/course/MobileCoursePriceBar'
import DualPinMap from '../components/course/DualPinMap'
import MissingFieldsBanner, {
  type MissingField,
} from '../components/course/MissingFieldsBanner'
import {
  AlertTriangleIcon,
  ArrowRightIcon,
  BagIcon,
  ChevronDownIcon,
  ClockIcon,
  FileTextIcon,
  MapPinIcon,
  PackageIcon,
  RouteIcon,
  SettingsIcon,
  SnowflakeIcon,
  StoreIcon,
} from '../components/ui/icons'

type FormValues = CreateCoursePayload
type CourseFormStep = 1 | 2 | 3
type TripSubStep = 'origin' | 'destination'
type PackagePreset = {
  id: string
  categoryCode: string
  title: string
  subtitle: string
  size: 'S' | 'M' | 'L'
  Icon: typeof PackageIcon
}

/**
 * Métadonnées de chaque champ obligatoire pour piloter le bandeau d'erreurs :
 * - labelKey : clé i18n du libellé humain
 * - location : où trouver le champ dans l'UI (guide l'auto-ouverture drawer/accordion + scroll)
 * - dedupKey  : plusieurs erreurs qui pointent le même problème (ex: lat & lng du même pin)
 *               partagent une clé pour n'afficher qu'une seule entrée dans le bandeau
 */
type FieldLocation = 'package' | 'drawer' | 'options' | 'main' | 'map_A' | 'map_B'

const FIELD_META: Record<string, { labelKey: string; location: FieldLocation; dedupKey?: string }> = {
  origin_name:          { labelKey: 'courses.new.senderName',       location: 'drawer' },
  origin_phone:         { labelKey: 'courses.new.phoneLabel',       location: 'drawer' },
  origin_quartier:      { labelKey: 'courses.new.originQuartier',   location: 'drawer' },
  origin_city:          { labelKey: 'courses.new.originCity',       location: 'drawer' },
  origin_lat:           { labelKey: 'courses.new.errors.mapA',      location: 'map_A', dedupKey: 'map_A' },
  origin_lng:           { labelKey: 'courses.new.errors.mapA',      location: 'map_A', dedupKey: 'map_A' },
  destination_name:     { labelKey: 'courses.new.recipientNameLabel', location: 'main' },
  destination_phone:    { labelKey: 'courses.new.recipientPhoneLabel', location: 'main' },
  destination_quartier: { labelKey: 'courses.new.destinationQuartier', location: 'main' },
  destination_city:     { labelKey: 'courses.new.destinationCity',   location: 'main' },
  destination_lat:      { labelKey: 'courses.new.errors.mapB',      location: 'map_B', dedupKey: 'map_B' },
  destination_lng:      { labelKey: 'courses.new.errors.mapB',      location: 'map_B', dedupKey: 'map_B' },
  package_category_id:  { labelKey: 'courses.new.categoryLabel',    location: 'package' },
}

const inputClass =
  'w-full bg-off-white border border-warm-300 rounded-md px-3 py-2.5 text-body text-ink ' +
  'placeholder:text-warm-400 transition-all duration-200 ' +
  'focus:outline-none focus:border-airmess-yellow focus:shadow-glow-yellow ' +
  'disabled:opacity-60 disabled:cursor-not-allowed'

const STEP_FIELD_NAMES: Record<CourseFormStep, Array<keyof FormValues>> = {
  1: ['package_category_id'],
  2: ['origin_name', 'origin_phone', 'origin_quartier', 'origin_lat', 'origin_lng',
    'destination_name',
    'destination_phone',
    'destination_quartier',
    'destination_lat',
    'destination_lng',
  ],
  3: [],
}

const ORIGIN_STEP_FIELDS: Array<keyof FormValues> = [
  'origin_name',
  'origin_phone',
  'origin_quartier',
  'origin_lat',
  'origin_lng',
]

const DESTINATION_STEP_FIELDS: Array<keyof FormValues> = [
  'destination_name',
  'destination_phone',
  'destination_quartier',
  'destination_lat',
  'destination_lng',
]

const PACKAGE_PRESETS: PackagePreset[] = [
  {
    id: 'parcel',
    categoryCode: 'standard',
    title: 'Colis',
    subtitle: 'Paquet simple, objet, petit achat',
    size: 'M',
    Icon: PackageIcon,
  },
  {
    id: 'food',
    categoryCode: 'hot_meal',
    title: 'Repas',
    subtitle: 'Restaurant, snack, plat prepare',
    size: 'S',
    Icon: StoreIcon,
  },
  {
    id: 'documents',
    categoryCode: 'document',
    title: 'Documents',
    subtitle: 'Plis, papiers, dossiers',
    size: 'S',
    Icon: FileTextIcon,
  },
  {
    id: 'shopping',
    categoryCode: 'standard',
    title: 'Courses',
    subtitle: 'Achats client ou commande boutique',
    size: 'M',
    Icon: BagIcon,
  },
  {
    id: 'pharmacy',
    categoryCode: 'pharmacy',
    title: 'Pharmacie',
    subtitle: 'Produit sensible ou urgent',
    size: 'S',
    Icon: SnowflakeIcon,
  },
  {
    id: 'other',
    categoryCode: 'standard',
    title: 'Autre',
    subtitle: 'A preciser dans les details',
    size: 'L',
    Icon: ClockIcon,
  },
]

export default function NewCoursePage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language === 'en' ? 'en-US' : 'fr-FR'
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)

  const isPendingMarchant = user?.type === 'marchant' && !user.marchant?.validated_at

  useEffect(() => {
    if (isPendingMarchant) {
      navigate('/dashboard', { replace: true })
    }
  }, [isPendingMarchant, navigate])

  const { data: categories = [] } = useQuery({
    queryKey: ['package-categories'],
    queryFn: fetchPackageCategories,
  })

  const isPayerUser = user?.type === 'marchant' || user?.type === 'individual'
  const { data: wallet } = useQuery({
    queryKey: ['wallet'],
    queryFn: fetchWallet,
    enabled: isPayerUser,
    staleTime: 30_000,
  })

  const senderName =
    user?.marchant?.raison_sociale ??
    [user?.individual?.first_name, user?.individual?.last_name].filter(Boolean).join(' ') ??
    ''
  const senderPhone = user?.phone ?? ''

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setFocus,
    setError,
    trigger,
    getValues,
    formState: { errors, isSubmitted },
  } = useForm<FormValues>({
    defaultValues: {
      urgency: 'standard',
      package_size: 'M',
      origin_name: senderName,
      origin_phone: senderPhone,
      origin_city: 'Cotonou',
      destination_city: 'Cotonou',
      has_collection: false,
      delivery_fee_paid_by: 'recipient',
    },
  })

  const hasCollection = watch('has_collection')
  const collectionAmountWatch = Number(watch('collection_amount') ?? 0)
  const declaredValueWatch = Number(watch('package_declared_value') ?? 0)
  const paidBy = watch('delivery_fee_paid_by') ?? 'recipient'
  const isRecipientPaid = paidBy === 'recipient'
  const merchantPaysDelivery = paidBy === 'sender'
  const urgencyWatch = (watch('urgency') ?? 'standard') as 'standard' | 'express'
  const packageSizeWatch = (watch('package_size') ?? 'M') as 'S' | 'M' | 'L' | 'XL'
  const originName = watch('origin_name') ?? ''
  const originQuartier = watch('origin_quartier') ?? ''
  const originCity = watch('origin_city') ?? ''
  const destinationQuartier = watch('destination_quartier') ?? ''
  const destinationCity = watch('destination_city') ?? ''
  const destinationName = watch('destination_name') ?? ''
  const selectedCategoryId = Number(watch('package_category_id')) || undefined
  const [currentStep, setCurrentStep] = useState<CourseFormStep>(1)
  const [tripSubStep, setTripSubStep] = useState<TripSubStep>('origin')
  const [openTripPanel, setOpenTripPanel] = useState<TripSubStep | null>('origin')
  const [tripAutoAdvanced, setTripAutoAdvanced] = useState(false)
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null)
  const selectedPackagePreset = useMemo(
    () =>
      PACKAGE_PRESETS.find((preset) => preset.id === selectedPresetId) ??
      PACKAGE_PRESETS.find((preset) => {
        const category = categories.find((item) => item.id === selectedCategoryId)
        return category?.code === preset.categoryCode && packageSizeWatch === preset.size
      }) ??
      null,
    [categories, packageSizeWatch, selectedCategoryId, selectedPresetId],
  )
  const SelectedPackageIcon = selectedPackagePreset?.Icon

  const shouldSuggestDeclared = collectionAmountWatch >= 20000 && !declaredValueWatch
  const exposurePreview = Math.max(collectionAmountWatch || 0, declaredValueWatch || 0)
  const HIGH_VALUE_UI_THRESHOLD = 30000
  const willBePremium = exposurePreview >= HIGH_VALUE_UI_THRESHOLD

  const [collectionDecided, setCollectionDecided] = useState(false)
  const [pendingValues, setPendingValues] = useState<FormValues | null>(null)
  const [quotaError, setQuotaError] = useState<string | null>(null)
  const [geoStatus, setGeoStatus] = useState<'idle' | 'loading' | 'success' | 'denied'>('idle')

  const [showWeight, setShowWeight] = useState(false)
  const [showDestExtra, setShowDestExtra] = useState(false)
  const [showDeclared, setShowDeclared] = useState(false)
  const [originDrawerOpen, setOriginDrawerOpen] = useState(false)
  const [locationTarget, setLocationTarget] = useState<'A' | 'B'>('A')

  // Onboarding — coach-marks du formulaire. Si l'utilisateur ne les a pas
  // encore vus, on ouvre l'accordion "Options" pour que les cibles
  // (encaissement, valeur déclarée) soient visibles à l'écran.
  const formTipsSeen = useOnboardingStore((s) => s.formTipsSeen)
  const markFormTipsSeen = useOnboardingStore((s) => s.markFormTipsSeen)
  const [optionsOpen, setOptionsOpen] = useState(!formTipsSeen)

  useEffect(() => {
    if (shouldSuggestDeclared) {
      setShowDeclared(true)
      setOptionsOpen(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldSuggestDeclared])

  const coachSteps: CoachStep[] = [
    {
      targetSelector: '[data-onboarding-id="origin"]',
      title: t('onboarding.tips.origin.title'),
      body: t('onboarding.tips.origin.body'),
    },
    {
      targetSelector: '[data-onboarding-id="urgency"]',
      title: t('onboarding.tips.urgency.title'),
      body: t('onboarding.tips.urgency.body'),
    },
    {
      targetSelector: '[data-onboarding-id="collection"]',
      title: t('onboarding.tips.collection.title'),
      body: t('onboarding.tips.collection.body'),
    },
    {
      targetSelector: '[data-onboarding-id="declared"]',
      title: t('onboarding.tips.declared.title'),
      body: t('onboarding.tips.declared.body'),
    },
  ]

  useEffect(() => {
    if (user?.type !== 'individual') return
    if (watch('origin_lat')) return
    if (!navigator.geolocation) return

    setGeoStatus('loading')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setValue('origin_lat', pos.coords.latitude)
        setValue('origin_lng', pos.coords.longitude)
        setGeoStatus('success')
      },
      () => setGeoStatus('denied'),
      { enableHighAccuracy: false, timeout: 6000, maximumAge: 5 * 60_000 },
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.type])

  const mutation = useMutation({
    mutationFn: createCourse,
    onSuccess: (result) => {
      if (result.course) {
        queryClient.invalidateQueries({ queryKey: ['courses'] })
        navigate('/dashboard')
        return
      }
      if (result.payment_required && result.checkout_url) {
        if (result.payment_id) {
          sessionStorage.setItem('airmess_pending_payment_id', String(result.payment_id))
        }
        window.location.href = result.checkout_url
        return
      }
      if (result.quota_reached) {
        setQuotaError(
          t('courses.new.quotaMonthlyReached', { used: result.used, limit: result.limit }),
        )
      }
    },
  })

  function onSubmit(values: FormValues) {
    const allMissingFields = ([1, 2, 3] as CourseFormStep[]).flatMap(getMissingStepFields)
    if (allMissingFields.length > 0) {
      allMissingFields.forEach((field) => {
        setError(field.fieldName as keyof FormValues, {
          type: 'required',
          message: t('courses.new.required'),
        })
      })
      handleFirstMissing(allMissingFields)
      return
    }

    if (!values.has_collection && !collectionDecided) {
      setPendingValues(values)
      return
    }
    performCreate(values)
  }

  /**
   * Extrait la liste dédupliquée des champs obligatoires manquants à partir
   * d'un objet d'erreurs RHF. Sert à la fois au rendu du bandeau (via useMemo)
   * et au callback onInvalid (qui reçoit `errs` avant le prochain rerender).
   */
  function extractMissingFields(errs: Record<string, unknown>): MissingField[] {
    const list: MissingField[] = []
    const seen = new Set<string>()
    for (const key of Object.keys(errs)) {
      const meta = FIELD_META[key]
      if (!meta) continue
      const dedup = meta.dedupKey ?? key
      if (seen.has(dedup)) continue
      seen.add(dedup)
      list.push({ fieldName: key, label: t(meta.labelKey) })
    }
    return list
  }

  const missingFields: MissingField[] = useMemo(
    () => extractMissingFields(errors as Record<string, unknown>),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [errors, t],
  )

  // Extrait la map { field → [messages] } d'une réponse Laravel 422. Fallback
  // sur `message` (erreur simple sans champ) → mappé sur "form" pour être ignoré
  // du calcul par champ.
  const backendFieldErrors = useMemo<Record<string, string[]>>(() => {
    if (!(mutation.error instanceof AxiosError)) return {}
    const raw = mutation.error.response?.data?.errors
    if (raw && typeof raw === 'object') {
      const out: Record<string, string[]> = {}
      for (const [k, v] of Object.entries(raw)) {
        if (Array.isArray(v)) out[k] = v.map(String)
        else if (typeof v === 'string') out[k] = [v]
      }
      return out
    }
    return {}
  }, [mutation.error])

  // Détection dédiée des erreurs sur les champs d'origine — sert à peindre en rouge
  // la bannière "Retrait" (qui reste visible sur la page principale) même quand le
  // drawer est fermé, avec un message ciblé sur le champ le plus fréquent.
  // Prend en compte À LA FOIS les erreurs client (RHF) et backend (Laravel 422),
  // car Laravel peut refuser un champ que RHF n'avait pas validé.
  // Au retour d'une erreur backend qui concerne l'origine, remonter en haut pour
  // que la bannière rouge soit visible tout de suite (comme pour le submit client).
  const firstBackendField = Object.keys(backendFieldErrors).find((k) => FIELD_META[k])
  useEffect(() => {
    if (!firstBackendField) return
    handleMissingFieldClick(firstBackendField)
    window.scrollTo({ top: 0, behavior: 'smooth' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firstBackendField])

  /**
   * Navigue vers le champ manquant cliqué : ouvre le drawer / l'accordion si
   * nécessaire, scroll vers la DualPinMap pour les positions, ou setFocus RHF
   * pour les inputs "classiques".
   */
  function handleMissingFieldClick(fieldName: string) {
    const meta = FIELD_META[fieldName]
    if (!meta) return
    if (meta.location === 'package') {
      setCurrentStep(1)
    } else if (meta.location === 'drawer' || meta.location === 'map_A') {
      setCurrentStep(2)
      setTripSubStep('origin')
      setOpenTripPanel('origin')
      setLocationTarget('A')
    } else if (meta.location === 'main' || meta.location === 'map_B') {
      setCurrentStep(2)
      setTripSubStep('destination')
      setOpenTripPanel('destination')
      setLocationTarget('B')
    } else if (meta.location === 'options') {
      setCurrentStep(3)
      setOptionsOpen(true)
    }

    // Petit tick pour laisser le drawer/accordion se monter avant focus.
    setTimeout(() => {
      if (meta.location === 'map_A' || meta.location === 'map_B') {
        document.getElementById('dual-pin-map')?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        })
        return
      }
      try {
        setFocus(fieldName as keyof FormValues)
      } catch {
        /* champ pas monté (drawer/accordion pas encore ouvert) — silencieux */
      }
    }, 200)
  }

  // Au submit invalide, on cible automatiquement le 1er champ manquant.
  function handleFirstMissing(fields: MissingField[]) {
    const first = fields[0]
    if (!first) return
    handleMissingFieldClick(first.fieldName)
  }

  function getMissingStepFields(step: CourseFormStep): MissingField[] {
    return STEP_FIELD_NAMES[step]
      .filter((name) => {
        const value = getValues(name)
        if (name === 'origin_lat' || name === 'origin_lng' || name === 'destination_lat' || name === 'destination_lng') {
          const numeric = Number(value)
          return !Number.isFinite(numeric) || numeric === 0
        }
        if (name === 'origin_quartier') {
          return !String(value ?? getValues('origin_street') ?? '').trim()
        }
        if (name === 'destination_quartier') {
          return !String(value ?? getValues('destination_street') ?? '').trim()
        }
        return value == null || String(value).trim() === ''
      })
      .map((name) => {
        const meta = FIELD_META[String(name)]
        return {
          fieldName: String(name),
          label: meta ? t(meta.labelKey) : String(name),
        }
      })
  }

  function selectPackagePreset(preset: PackagePreset) {
    const category =
      categories.find((item) => item.code === preset.categoryCode) ??
      categories.find((item) => item.code === 'standard') ??
      categories[0]

    if (!category) {
      setQuotaError('Les categories de colis ne sont pas encore chargees.')
      return
    }

    setQuotaError(null)
    setSelectedPresetId(preset.id)
    setValue('package_category_id', category.id, { shouldDirty: true, shouldValidate: true })
    setValue('package_size', preset.size, { shouldDirty: true, shouldValidate: true })
    if (!watch('package_description') && preset.id !== 'other') {
      setValue('package_description', preset.title, { shouldDirty: true })
    }
    setCurrentStep(2)
    setTripSubStep('origin')
    setOpenTripPanel('origin')
    setTripAutoAdvanced(false)
    setLocationTarget('A')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function goToNextStep() {
    const fieldsToValidate =
      currentStep === 2 && tripSubStep === 'origin'
        ? ORIGIN_STEP_FIELDS
        : currentStep === 2 && tripSubStep === 'destination'
          ? DESTINATION_STEP_FIELDS
          : STEP_FIELD_NAMES[currentStep]

    const missingFieldsBeforeTrigger = getMissingStepFields(currentStep)
      .filter((field) => fieldsToValidate.includes(field.fieldName as keyof FormValues))
    if (missingFieldsBeforeTrigger.length > 0) {
      missingFieldsBeforeTrigger.forEach((field) => {
        setError(field.fieldName as keyof FormValues, {
          type: 'required',
          message: t('courses.new.required'),
        })
      })
      window.scrollTo({ top: 0, behavior: 'smooth' })
      handleFirstMissing(missingFieldsBeforeTrigger)
      return
    }

    const valid = await trigger(fieldsToValidate, { shouldFocus: false })
    if (!valid) {
      const fields = getMissingStepFields(currentStep)
        .filter((field) => fieldsToValidate.includes(field.fieldName as keyof FormValues))
      window.scrollTo({ top: 0, behavior: 'smooth' })
      handleFirstMissing(fields)
      return
    }

    if (currentStep === 2 && tripSubStep === 'origin') {
      setTripSubStep('destination')
      setOpenTripPanel('destination')
      setTripAutoAdvanced(true)
      setLocationTarget('B')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    setCurrentStep((step) => Math.min(3, step + 1) as CourseFormStep)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  /**
   * Compte réactif des champs obligatoires vides — se met à jour à chaque
   * saisie (indépendamment des erreurs RHF, qui n'existent qu'après un submit).
   * Alimente le badge CompletionStatus dans le récap.
   */
  const missingCount = useMemo(() => {
    const required = [
      originName,
      watch('origin_phone'),
      originQuartier,
      originCity,
      destinationName,
      watch('destination_phone'),
      destinationQuartier,
      destinationCity,
      watch('package_category_id'),
    ]
    let count = required.filter((v) => !v || String(v).trim() === '').length
    // + positions carte (comptées comme 1 chacune, pas 2 par pin)
    const originPositioned =
      Number(watch('origin_lat')) !== 0 && Number(watch('origin_lng')) !== 0
    const destPositioned =
      Number(watch('destination_lat')) !== 0 && Number(watch('destination_lng')) !== 0
    if (!originPositioned) count += 1
    if (!destPositioned) count += 1
    return count
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    originName,
    originQuartier,
    originCity,
    destinationName,
    destinationQuartier,
    destinationCity,
    watch('origin_phone'),
    watch('destination_phone'),
    watch('package_category_id'),
    watch('origin_lat'),
    watch('origin_lng'),
    watch('destination_lat'),
    watch('destination_lng'),
  ])

  function performCreate(values: FormValues) {
    setQuotaError(null)

    const oLat = Number(values.origin_lat)
    const oLng = Number(values.origin_lng)
    const dLat = Number(values.destination_lat)
    const dLng = Number(values.destination_lng)
    if (!Number.isFinite(oLat) || !Number.isFinite(oLng) || oLat === 0 || oLng === 0) {
      setQuotaError(t('courses.new.originPositionMissing'))
      setCurrentStep(2)
      setTripSubStep('origin')
      setOpenTripPanel('origin')
      setLocationTarget('A')
      return
    }
    if (!Number.isFinite(dLat) || !Number.isFinite(dLng) || dLat === 0 || dLng === 0) {
      setQuotaError(t('courses.new.destinationPositionMissing'))
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    const payload: CreateCoursePayload & { callback_url?: string } = {
      ...values,
      package_category_id: Number(values.package_category_id),
      package_weight_kg: values.package_weight_kg ? Number(values.package_weight_kg) : undefined,
      origin_lat: Number(values.origin_lat),
      origin_lng: Number(values.origin_lng),
      origin_quartier: values.origin_quartier || values.origin_street || 'Position actuelle',
      origin_city: values.origin_city || 'Cotonou',
      destination_lat: Number(values.destination_lat),
      destination_lng: Number(values.destination_lng),
      destination_quartier: values.destination_quartier || values.destination_street || 'Destination',
      destination_city: values.destination_city || 'Cotonou',
      collection_amount: values.has_collection ? Number(values.collection_amount) : undefined,
      collection_method: values.has_collection ? values.collection_method : undefined,
      package_declared_value: values.package_declared_value ? Number(values.package_declared_value) : undefined,
      callback_url: `${window.location.origin}/billing/return`,
    }
    mutation.mutate(payload)
  }

  const apiError =
    mutation.error instanceof AxiosError
      ? mutation.error.response?.data?.message ?? t('courses.new.createErrorShort')
      : null

  function fillDestinationFromAddress(addr: Address) {
    setValue('destination_name', addr.recipient_name)
    setValue('destination_phone', addr.recipient_phone)
    setValue('destination_street', addr.street ?? '')
    setValue('destination_landmark', addr.landmark ?? '')
    setValue('destination_quartier', addr.quartier)
    setValue('destination_city', addr.city)
    if (addr.lat) setValue('destination_lat', addr.lat)
    if (addr.lng) setValue('destination_lng', addr.lng)
    setValue('destination_instructions', addr.instructions ?? '')
    if (addr.street || addr.landmark || addr.instructions) setShowDestExtra(true)
  }

  function fillOriginFromPlace(place: PlaceDetails) {
    setValue('origin_lat', place.lat, { shouldDirty: true, shouldValidate: true })
    setValue('origin_lng', place.lng, { shouldDirty: true, shouldValidate: true })
    if (place.quartier) {
      setValue('origin_quartier', place.quartier, { shouldDirty: true, shouldValidate: true })
    } else if (place.formatted_address || place.name) {
      setValue('origin_quartier', place.formatted_address ?? place.name ?? '', { shouldDirty: true, shouldValidate: true })
    }
    if (place.city) {
      setValue('origin_city', place.city, { shouldDirty: true, shouldValidate: true })
    }
    if (place.formatted_address) {
      setValue('origin_street', place.formatted_address, { shouldDirty: true })
    }
  }

  function fillDestinationFromPlace(place: PlaceDetails) {
    setValue('destination_lat', place.lat, { shouldDirty: true, shouldValidate: true })
    setValue('destination_lng', place.lng, { shouldDirty: true, shouldValidate: true })
    if (place.quartier) {
      setValue('destination_quartier', place.quartier, { shouldDirty: true, shouldValidate: true })
    } else if (place.formatted_address || place.name) {
      setValue('destination_quartier', place.formatted_address ?? place.name ?? '', { shouldDirty: true, shouldValidate: true })
    }
    if (place.city) {
      setValue('destination_city', place.city, { shouldDirty: true, shouldValidate: true })
    }
    if (place.formatted_address) {
      setValue('destination_street', place.formatted_address, { shouldDirty: true })
    }
  }

  function fillOriginFromMapClick(lat: number, lng: number) {
    const label = `Point selectionne sur la carte (${lat.toFixed(5)}, ${lng.toFixed(5)})`
    setValue('origin_lat', lat, { shouldDirty: true, shouldValidate: true })
    setValue('origin_lng', lng, { shouldDirty: true, shouldValidate: true })
    setValue('origin_street', label, { shouldDirty: true, shouldValidate: true })
    setValue('origin_quartier', label, { shouldDirty: true, shouldValidate: true })
  }

  function fillDestinationFromMapClick(lat: number, lng: number) {
    const label = `Destination selectionnee sur la carte (${lat.toFixed(5)}, ${lng.toFixed(5)})`
    setValue('destination_lat', lat, { shouldDirty: true, shouldValidate: true })
    setValue('destination_lng', lng, { shouldDirty: true, shouldValidate: true })
    setValue('destination_street', label, { shouldDirty: true, shouldValidate: true })
    setValue('destination_quartier', label, { shouldDirty: true, shouldValidate: true })
  }

  // Coords utilisées à la fois pour la carte, le récap et l'estimation tarif.
  // Reboxées explicitement pour être stables dans les deps du useQuery estimate.
  const originLat = Number(watch('origin_lat')) || 0
  const originLng = Number(watch('origin_lng')) || 0
  const destinationLat = Number(watch('destination_lat')) || 0
  const destinationLng = Number(watch('destination_lng')) || 0
  const hasFullCoords =
    originLat !== 0 && originLng !== 0 && destinationLat !== 0 && destinationLng !== 0
  const originSubStepComplete =
    String(originName ?? '').trim() !== '' &&
    String(watch('origin_phone') ?? '').trim() !== '' &&
    String(originQuartier || watch('origin_street') || '').trim() !== '' &&
    originLat !== 0 &&
    originLng !== 0

  useEffect(() => {
    if (currentStep !== 2 || tripSubStep !== 'origin' || tripAutoAdvanced || !originSubStepComplete) return

    const timeout = window.setTimeout(() => {
      setTripSubStep('destination')
      setOpenTripPanel('destination')
      setLocationTarget('B')
      setTripAutoAdvanced(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }, 450)

    return () => window.clearTimeout(timeout)
  }, [currentStep, originSubStepComplete, tripAutoAdvanced, tripSubStep])

  // Estimation tarif live — appelée dès que les 2 pins sont posés et à chaque
  // changement d'urgence. React Query mémoïse par clé donc pas d'appel doublon
  // si les valeurs ne changent pas.
  const { data: estimate } = useQuery<CourseFeeEstimate>({
    queryKey: ['course-estimate', originLat, originLng, destinationLat, destinationLng, urgencyWatch, paidBy],
    queryFn: () =>
      estimateCourseFee({
        origin_lat: originLat,
        origin_lng: originLng,
        destination_lat: destinationLat,
        destination_lng: destinationLng,
        urgency: urgencyWatch,
        delivery_fee_paid_by: paidBy as 'sender' | 'recipient',
      }),
    enabled: hasFullCoords,
    staleTime: 30_000,
  })

  // Prix uniquement lorsque l'estimate est revenu. Avant (pas de coords /
  // loading), on n'affiche rien : les composants récap montreront un état
  // "pose les repères pour voir le prix" à la place.
  const currentFee: number | null = estimate?.fee ?? null
  const walletAvailable = isPayerUser && wallet ? wallet.available : null

  const submitLabel = mutation.isPending
    ? t('courses.new.creating')
    : t('courses.new.confirmCta')
  const stepPrimaryAction =
    currentStep < 3
      ? {
          label: currentStep === 2 && tripSubStep === 'origin' ? 'Continuer vers le destinataire' : 'Continuer',
          onClick: () => {
            void goToNextStep()
          },
        }
      : undefined

  const packageCategoryId = selectedCategoryId
  const packageCategoryLabel =
    packageCategoryId != null
      ? categories.find((c) => c.id === packageCategoryId)?.name
      : undefined

  const packageWeightWatch = Number(watch('package_weight_kg')) || undefined

  const summaryData = {
    originName,
    originPhone: watch('origin_phone') ?? '',
    originQuartier,
    originCity,
    originStreet: (watch('origin_street') ?? '') || undefined,
    destName: destinationName,
    destPhone: watch('destination_phone') ?? '',
    destQuartier: destinationQuartier,
    destCity: destinationCity,
    destStreet: (watch('destination_street') ?? '') || undefined,
    destLandmark: (watch('destination_landmark') ?? '') || undefined,
    destInstructions: (watch('destination_instructions') ?? '') || undefined,
    packageCategoryLabel,
    packageDescription: (watch('package_description') ?? '') as string,
    packageSize: packageSizeWatch,
    packageWeight: packageWeightWatch,
    packageDeclaredValue: declaredValueWatch || undefined,
    urgency: urgencyWatch,
    paidBy: paidBy as 'sender' | 'recipient',
    hasCollection: !!hasCollection,
    collectionAmount: hasCollection && collectionAmountWatch ? collectionAmountWatch : undefined,
    collectionMethod: hasCollection
      ? ((watch('collection_method') ?? 'cash') as 'cash' | 'mobile_money' | 'prepaid')
      : undefined,
  }

  return (
    <div className="min-h-screen bg-cream">
      <AppHeader />

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-12 pb-32 lg:pb-12">
        {/* HERO */}
        <div className="mb-6">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1 text-caption text-warm-500 hover:text-ink"
          >
            {t('courses.new.backToDashboard')}
          </Link>
        </div>

        <PageEyebrow label={t('courses.new.eyebrow')} className="mb-4" />
        <h1 className="text-h1 md:text-display-2 text-ink leading-tight mb-2">
          {t('courses.new.title')} <Highlight>{t('courses.new.titleHighlight')}</Highlight>
          {t('courses.new.titleEnd')}
        </h1>
        <p className="text-body-l text-warm-500 mb-8">{t('courses.new.subtitle')}</p>

        <div className="mb-6 grid grid-cols-3 gap-2 rounded-xl bg-warm-100 p-1">
          {[
            { step: 1 as const, label: 'Colis' },
            { step: 2 as const, label: 'Trajet' },
            { step: 3 as const, label: 'Détails' },
          ].map((item) => (
            <button
              key={item.step}
              type="button"
              onClick={() => setCurrentStep(item.step)}
              className={[
                'rounded-lg px-2 py-2 text-caption sm:text-body-s font-bold transition-all',
                currentStep === item.step
                  ? 'bg-off-white text-ink shadow-sm ring-1 ring-warm-200'
                  : 'text-warm-500 hover:text-ink',
              ].join(' ')}
              aria-current={currentStep === item.step ? 'step' : undefined}
            >
              <span className="hidden sm:inline">{item.step}. </span>
              {item.label}
            </button>
          ))}
        </div>

        {/* Bandeau erreur quota / position manquante */}
        {quotaError && (
          <Card
            variant="default"
            padding="md"
            className="mb-4 bg-warning-bg! border-warning/30! flex items-start justify-between gap-3"
          >
            <div className="flex items-start gap-2">
              <span className="text-warning shrink-0 mt-0.5">
                <AlertTriangleIcon size={20} />
              </span>
              <p className="text-body-s text-warning">{quotaError}</p>
            </div>
            <Link to="/wallet">
              <Button variant="primary" size="sm" pill>
                {t('courses.new.topUpCta')}
              </Button>
            </Link>
          </Card>
        )}

        <form
          onSubmit={handleSubmit(onSubmit, (errs) => {
            // onInvalid : recalcule la liste depuis `errs` (state RHF pas encore rerender)
            // pour cibler directement le 1er champ manquant. Le bandeau s'affichera
            // ensuite via useMemo(errors) au prochain rerender.
            const fields = extractMissingFields(errs as Record<string, unknown>)
            // Scroll haut de page : le bandeau erreurs + la bannière origine (rouge si concernée)
            // sont là. Sans ça, un submit en bas de page laisse l'utilisateur devant "Confirmer"
            // sans voir d'où vient le blocage.
            window.scrollTo({ top: 0, behavior: 'smooth' })
            handleFirstMissing(fields)
          })}
          id="new-course-form"
        >
          <input type="hidden" {...register('origin_lat', { required: true })} />
          <input type="hidden" {...register('origin_lng', { required: true })} />
          <input type="hidden" {...register('destination_lat', { required: true })} />
          <input type="hidden" {...register('destination_lng', { required: true })} />
          <input type="hidden" {...register('origin_quartier')} />
          <input type="hidden" {...register('origin_city')} />
          <input type="hidden" {...register('destination_quartier')} />
          <input type="hidden" {...register('destination_city')} />

          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-6">
            {/* ===================== Colonne formulaire ===================== */}
            <div className="space-y-4">
              {/* Bandeau des champs obligatoires manquants (après 1ʳᵉ tentative) */}
              {isSubmitted && missingFields.length > 0 && (
                <MissingFieldsBanner
                  fields={missingFields}
                  onFieldClick={handleMissingFieldClick}
                />
              )}

              {/* Bloc EXPÉDITEUR (bannière compacte).
                  Bordure rouge quand un champ origine est en erreur (le drawer est fermé
                  par défaut → l'utilisateur ne voit sinon pas quel bloc corriger). */}
              {currentStep === 1 && (
                <section className="bg-off-white border border-warm-200 rounded-lg p-5 md:p-6">
                  <div className="mb-5 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-caption font-bold uppercase text-warm-500">
                        {t('courses.new.packageSectionDesc')}
                      </p>
                      <h3 className="text-h2 text-ink font-bold">
                        Nous livrons quoi ?
                      </h3>
                    </div>
                    <span className="hidden sm:grid h-11 w-11 place-items-center rounded-full bg-airmess-yellow text-ink">
                      <PackageIcon size={20} />
                    </span>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                    {PACKAGE_PRESETS.map((preset) => {
                      const selected = selectedPackagePreset?.id === preset.id
                      const Icon = preset.Icon

                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => selectPackagePreset(preset)}
                          className={[
                            'min-h-[116px] rounded-xl border-2 p-4 text-left transition-all',
                            'hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-airmess-yellow/50',
                            selected
                              ? 'border-airmess-yellow bg-airmess-yellow text-ink shadow-sm'
                              : 'border-warm-200 bg-cream hover:border-airmess-yellow/70',
                          ].join(' ')}
                        >
                          <span
                            className={[
                              'mb-3 grid h-10 w-10 place-items-center rounded-full',
                              selected ? 'bg-off-white text-ink' : 'bg-off-white text-warm-700',
                            ].join(' ')}
                          >
                            <Icon size={19} />
                          </span>
                          <span className="block text-body font-extrabold text-ink">
                            {preset.title}
                          </span>
                          <span className="mt-1 block text-caption leading-5 text-warm-600">
                            {preset.subtitle}
                          </span>
                        </button>
                      )
                    })}
                  </div>

                  <input
                    type="hidden"
                    {...register('package_category_id', { required: t('courses.new.required') })}
                  />
                </section>
              )}

              {/* Bloc TRAJET (expediteur puis destinataire) */}
              {currentStep === 2 && (
              <>
              <section className="bg-off-white border border-warm-200 rounded-lg p-5 md:p-6">
                <div className="mb-5 pb-4 border-b border-warm-100">
                  <div className="flex items-start gap-3">
                    <span className="mt-1 text-warm-600">
                      <RouteIcon size={18} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-caption font-bold uppercase text-warm-500">
                        {t('courses.new.blocks.trip.title')}
                      </p>
                      <h3 className="text-h2 text-ink font-bold">
                        {tripSubStep === 'origin' ? 'Adresse de prise en charge' : 'Adresse de livraison'}
                      </h3>
                      <p className="mt-1 text-body-s text-warm-600">
                        {tripSubStep === 'origin'
                          ? 'Confirme le point ou le livreur recupere le colis.'
                          : 'Renseigne le destinataire et le lieu exact de livraison.'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mb-4 rounded-2xl border border-warm-200 bg-cream p-2 shadow-sm">
                  <button
                    type="button"
                          onClick={() => {
                            setTripSubStep('origin')
                            setTripAutoAdvanced(false)
                            setOpenTripPanel((panel) => (panel === 'origin' ? null : 'origin'))
                            setLocationTarget('A')
                          }}
                    className={[
                      'w-full rounded-xl p-3 text-left transition-colors flex items-center gap-3',
                      openTripPanel === 'origin' ? 'bg-airmess-yellow/20' : 'hover:bg-off-white',
                    ].join(' ')}
                  >
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-off-white text-ink shrink-0">
                      <StoreIcon size={20} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 text-caption font-bold text-warm-500">
                        Prise en charge
                        {originLat !== 0 && originLng !== 0 && (
                          <span className="text-success">✓</span>
                        )}
                      </span>
                      <span className="block truncate text-h3 font-extrabold text-ink">
                        {originQuartier || watch('origin_street') || 'Position actuelle'}
                      </span>
                    </span>
                    <span
                      className={[
                        'text-warm-500 transition-transform duration-200',
                        openTripPanel === 'origin' ? 'rotate-180' : '',
                      ].join(' ')}
                      aria-hidden
                    >
                      <ChevronDownIcon size={18} />
                    </span>
                  </button>

                  <div className="mx-14 h-px bg-warm-200" />

                  <button
                    type="button"
                    onClick={() => {
                      setTripSubStep('destination')
                      setOpenTripPanel((panel) => (panel === 'destination' ? null : 'destination'))
                      setLocationTarget('B')
                    }}
                    className={[
                      'w-full rounded-xl p-3 text-left transition-colors flex items-center gap-3',
                      openTripPanel === 'destination' ? 'bg-airmess-red/10' : 'hover:bg-off-white',
                    ].join(' ')}
                  >
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-airmess-red text-white shrink-0">
                      <MapPinIcon size={20} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 text-caption font-bold text-warm-500">
                        Destination
                        {destinationLat !== 0 && destinationLng !== 0 && (
                          <span className="text-success">✓</span>
                        )}
                      </span>
                      <span className="block truncate text-h3 font-extrabold text-ink">
                        {watch('destination_street') || destinationQuartier || 'Où livrer ?'}
                      </span>
                    </span>
                    <span
                      className={[
                        'text-warm-500 transition-transform duration-200',
                        openTripPanel === 'destination' ? 'rotate-180' : '',
                      ].join(' ')}
                      aria-hidden
                    >
                      <ChevronDownIcon size={18} />
                    </span>
                  </button>
                </div>

                <div
                  className={[
                    'grid transition-[grid-template-rows,opacity,transform,margin] duration-300 ease-out',
                    openTripPanel === 'origin'
                      ? 'grid-rows-[1fr] opacity-100 translate-y-0 mb-4'
                      : 'grid-rows-[0fr] opacity-0 -translate-y-1 mb-0',
                  ].join(' ')}
                >
                  <div className="overflow-hidden">
                    <div className="rounded-xl border border-warm-200 bg-cream p-4">
                      <div className="mb-3 flex items-center gap-2">
                        <StoreIcon size={18} />
                        <p className="text-body font-extrabold text-ink">{t('courses.new.senderSectionTitle')}</p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Field label={t('courses.new.originDrawer.streetLabel')} required className="md:col-span-2">
                          <input
                            {...register('origin_street')}
                            className={inputClass}
                            placeholder={t('courses.new.originDrawer.streetPlaceholder')}
                          />
                        </Field>
                        <Field label={t('courses.new.senderName')} required>
                          <input
                            {...register('origin_name', { required: t('courses.new.required') })}
                            className={inputClass}
                          />
                        </Field>
                        <Field label={t('courses.new.phoneLabel')} required>
                          <input
                            {...register('origin_phone', { required: t('courses.new.required') })}
                            className={inputClass}
                            placeholder="+229..."
                          />
                        </Field>
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  className={[
                    'grid transition-[grid-template-rows,opacity,transform,margin] duration-300 ease-out',
                    openTripPanel === 'destination'
                      ? 'grid-rows-[1fr] opacity-100 translate-y-0 mb-4'
                      : 'grid-rows-[0fr] opacity-0 -translate-y-1 mb-0',
                  ].join(' ')}
                >
                  <div className="overflow-hidden">
                    <div className="space-y-4">
                      <div className="flex justify-end">
                        <AddressPicker onSelect={fillDestinationFromAddress} />
                      </div>
                      <Field label={t('courses.new.destinationFieldLabel')} required>
                        <input
                          {...register('destination_street')}
                          className={inputClass}
                          placeholder={t('courses.new.destinationSearchPlaceholder')}
                        />
                      </Field>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Field label={t('courses.new.recipientNameLabel')} required>
                          <input
                            {...register('destination_name', { required: t('courses.new.required') })}
                            className={inputClass}
                            placeholder={t('courses.new.recipientNamePlaceholder')}
                          />
                        </Field>
                        <Field label={t('courses.new.recipientPhoneLabel')} required>
                          <input
                            {...register('destination_phone', { required: t('courses.new.required') })}
                            className={inputClass}
                            placeholder="+229..."
                          />
                        </Field>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Précisions destination (rue + landmark + instructions) */}
                {openTripPanel === 'destination' && (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => setShowDestExtra((v) => !v)}
                    className="text-caption font-medium text-warm-600 hover:text-ink underline"
                  >
                    {showDestExtra
                      ? t('courses.new.hideDetails')
                      : t('courses.new.moreDestination')}
                  </button>
                  {showDestExtra && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                      <Field label={t('courses.new.landmarkLabel')} optional>
                        <input
                          {...register('destination_landmark')}
                          className={inputClass}
                          placeholder={t('courses.new.landmarkPlaceholder')}
                        />
                      </Field>
                      <Field label={t('courses.new.driverInstructions')} optional className="md:col-span-2">
                        <textarea
                          {...register('destination_instructions')}
                          className={inputClass}
                          rows={2}
                          placeholder={t('courses.new.driverInstructionsPlaceholder')}
                        />
                      </Field>
                    </div>
                  )}
                </div>
                )}

                {openTripPanel && (
                <div className="mt-4" id="dual-pin-map">
                  <DualPinMap
                    originLat={Number(watch('origin_lat')) || undefined}
                    originLng={Number(watch('origin_lng')) || undefined}
                    destLat={Number(watch('destination_lat')) || undefined}
                    destLng={Number(watch('destination_lng')) || undefined}
                    defaultActive={openTripPanel === 'origin' ? 'A' : 'B'}
                    activePin={locationTarget}
                    onActivePinChange={(pin) => {
                      setLocationTarget(pin)
                      setTripSubStep(pin === 'A' ? 'origin' : 'destination')
                      setOpenTripPanel(pin === 'A' ? 'origin' : 'destination')
                    }}
                    height="260px"
                    onOriginChange={fillOriginFromMapClick}
                    onOriginPlaceSelect={fillOriginFromPlace}
                    onDestChange={fillDestinationFromMapClick}
                    onDestPlaceSelect={fillDestinationFromPlace}
                  />
                  {geoStatus === 'success' && (
                    <p className="text-caption text-success mt-1.5">{t('courses.new.geoSuccess')}</p>
                  )}
                  {geoStatus === 'denied' && (
                    <p className="text-caption text-warning mt-1.5">{t('courses.new.geoDenied')}</p>
                  )}
                </div>
                )}
              </section>
              </>
              )}

              {/* Bloc COLIS */}
              {currentStep === 3 && (
              <>
              <section className="bg-off-white border border-warm-200 rounded-lg p-5 md:p-6">
                <div className="mb-4 pb-3 border-b border-warm-100 flex items-center gap-2">
                  <span className="text-warm-600">
                    <PackageIcon size={18} />
                  </span>
                  <h3 className="text-h3 text-ink font-bold">
                    {t('courses.new.blocks.package.title')}
                  </h3>
                </div>

                <div className="space-y-4">
                  <div className="rounded-xl border border-warm-200 bg-cream px-4 py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="grid h-10 w-10 place-items-center rounded-full bg-airmess-yellow text-ink shrink-0">
                        {SelectedPackageIcon ? (
                          <SelectedPackageIcon size={18} />
                        ) : (
                          <PackageIcon size={18} />
                        )}
                      </span>
                      <div className="min-w-0">
                        <p className="text-body font-extrabold text-ink truncate">
                          {selectedPackagePreset?.title ?? packageCategoryLabel ?? t('courses.new.categoryLabel')}
                        </p>
                        <p className="text-caption text-warm-600">
                          Taille {packageSizeWatch}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      pill
                      onClick={() => setCurrentStep(1)}
                    >
                      Modifier
                    </Button>
                  </div>

                  <input
                    type="hidden"
                    {...register('package_category_id', { required: t('courses.new.required') })}
                  />
                  <input type="hidden" {...register('package_size')} />

                  <div data-onboarding-id="urgency">
                    <Field label={t('courses.new.urgencyLabel')}>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {(['standard', 'express'] as const).map((opt) => {
                          const selected = urgencyWatch === opt
                          return (
                            <label
                              key={opt}
                              className={[
                                'block cursor-pointer rounded-xl border-2 px-4 py-3 transition-all',
                                selected
                                  ? 'border-airmess-yellow bg-airmess-yellow/10'
                                  : 'border-warm-200 hover:border-warm-300 bg-off-white',
                              ].join(' ')}
                            >
                              <input
                                type="radio"
                                value={opt}
                                {...register('urgency')}
                                className="sr-only"
                              />
                              <p className="text-body font-bold text-ink">
                                {opt === 'standard'
                                  ? t('courses.new.urgencyStandardTitle')
                                  : t('courses.new.urgencyExpressTitle')}
                              </p>
                              <p className="text-caption text-warm-600 mt-0.5">
                                {opt === 'standard'
                                  ? t('courses.new.urgencyStandardHint')
                                  : t('courses.new.urgencyExpressHint')}
                              </p>
                            </label>
                          )
                        })}
                      </div>
                    </Field>
                  </div>

                  <Field label={`${t('courses.new.packageDescription')} (optionnel)`}>
                    <input
                      {...register('package_description')}
                      className={inputClass}
                      placeholder={t('courses.new.packageDescPlaceholder')}
                    />
                  </Field>
                </div>

                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => setShowWeight((v) => !v)}
                    className="text-caption font-medium text-warm-600 hover:text-ink underline"
                  >
                    {showWeight ? t('courses.new.hideDetails') : t('courses.new.moreWeight')}
                  </button>
                  {showWeight && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                      <Field label={t('courses.new.packageWeight')} optional>
                        <input
                          type="number"
                          step="0.1"
                          {...register('package_weight_kg')}
                          className={inputClass}
                          placeholder={t('courses.new.packageWeightPlaceholder')}
                        />
                      </Field>
                    </div>
                  )}
                </div>
              </section>

              {/* Bloc OPTIONS AVANCÉES (accordéon replié par défaut) */}
              <section className="bg-off-white border border-warm-200 rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOptionsOpen((v) => !v)}
                  aria-expanded={optionsOpen}
                  className="w-full flex items-center gap-3 p-5 md:p-6 text-left hover:bg-warm-100/40 transition-colors"
                >
                  <span className="text-warm-600 shrink-0">
                    <SettingsIcon size={18} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-h3 text-ink font-bold">
                      {t('courses.new.blocks.options.title')}
                    </h3>
                    <p className="text-caption text-warm-500 mt-0.5">
                      {t('courses.new.blocks.options.hint')}
                    </p>
                  </div>
                  <span
                    className={`text-warm-500 transition-transform duration-200 ${
                      optionsOpen ? 'rotate-180' : ''
                    }`}
                    aria-hidden
                  >
                    <ChevronDownIcon size={18} />
                  </span>
                </button>

                {optionsOpen && (
                  <div className="border-t border-warm-100 p-5 md:p-6 space-y-6">
                    {/* Encaissement à la livraison */}
                    <div>
                      <label
                        data-onboarding-id="collection"
                        className="inline-flex items-center gap-2 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          {...register('has_collection')}
                          onClick={() => setCollectionDecided(true)}
                          className="h-4 w-4 accent-airmess-yellow"
                        />
                        <span className="text-body text-ink font-medium">
                          {t('courses.new.collectionYes')}
                        </span>
                      </label>

                      {hasCollection && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                          <Field label={t('courses.new.collectionAmount')} required>
                            <input
                              type="number"
                              {...register('collection_amount')}
                              className={inputClass}
                            />
                          </Field>
                          <Field label={t('courses.new.collectionMethod')} required>
                            <select {...register('collection_method')} className={inputClass}>
                              <option value="cash">{t('courses.new.collectionCash')}</option>
                              <option value="mobile_money">
                                {t('courses.new.collectionMobileMoney')}
                              </option>
                              <option value="prepaid">{t('courses.new.collectionPrepaid')}</option>
                            </select>
                          </Field>
                        </div>
                      )}
                    </div>

                    {/* Frais de livraison */}
                    <div>
                      <p className="text-caption text-warm-600 font-medium mb-2">
                        {t('courses.new.paidBySectionTitle')}
                      </p>
                      <input type="hidden" {...register('delivery_fee_paid_by')} />
                      <label
                        className={[
                          'flex cursor-pointer items-start gap-3 rounded-xl border-2 px-4 py-3 transition-all',
                          merchantPaysDelivery
                            ? 'border-airmess-yellow bg-airmess-yellow/10'
                            : 'border-warm-200 hover:border-warm-300 bg-off-white',
                        ].join(' ')}
                      >
                        <input
                          type="checkbox"
                          checked={merchantPaysDelivery}
                          onChange={(event) =>
                            setValue(
                              'delivery_fee_paid_by',
                              event.target.checked ? 'sender' : 'recipient',
                              { shouldDirty: true, shouldValidate: true },
                            )
                          }
                          className="mt-1 h-4 w-4 rounded border-warm-300 accent-airmess-yellow"
                        />
                        <span className="min-w-0">
                          <span className="block text-body font-bold text-ink">
                            {t('courses.new.paidByMerchantCheckbox')}
                          </span>
                          <span className="block text-caption text-warm-600 mt-0.5">
                            {merchantPaysDelivery
                              ? t('courses.new.paidByMerchantHint')
                              : t('courses.new.paidByRecipientHint')}
                          </span>
                        </span>
                      </label>

                      {isRecipientPaid && currentFee != null && (() => {
                        const feeToCollect = currentFee
                        const totalToCollect = (collectionAmountWatch || 0) + feeToCollect
                        return (
                          <div className="mt-3 space-y-2">
                            <div className="rounded-md bg-airmess-yellow/10 border border-airmess-yellow/40 px-3 py-2.5 text-body-s text-ink">
                              {hasCollection && collectionAmountWatch > 0
                                ? t('courses.new.paidByPreviewCombined', {
                                    product: (collectionAmountWatch || 0).toLocaleString(locale),
                                    fee: feeToCollect.toLocaleString(locale),
                                    total: totalToCollect.toLocaleString(locale),
                                  })
                                : t('courses.new.paidByPreviewFeeOnly', {
                                    fee: feeToCollect.toLocaleString(locale),
                                  })}
                            </div>
                          </div>
                        )
                      })()}

                      {merchantPaysDelivery && currentFee != null && (
                        <div className="mt-3 rounded-md bg-warm-100 border border-warm-200 px-3 py-2.5 text-body-s text-ink">
                          {t('courses.new.paidByMerchantPreview', {
                            fee: currentFee.toLocaleString(locale),
                          })}
                        </div>
                      )}
                    </div>

                    {/* Valeur déclarée du colis */}
                    <div data-onboarding-id="declared">
                      <button
                        type="button"
                        onClick={() => setShowDeclared((v) => !v)}
                        className="text-caption font-medium text-warm-600 hover:text-ink underline"
                      >
                        {showDeclared
                          ? t('courses.new.hideDetails')
                          : t('courses.new.moreDeclared')}
                      </button>

                      {showDeclared && (
                        <div className="mt-3">
                          <Field label={t('courses.new.declaredValueLabel')} optional>
                            <input
                              type="number"
                              min={0}
                              placeholder="0"
                              {...register('package_declared_value')}
                              className={inputClass}
                            />
                          </Field>
                          <p className="mt-1.5 text-caption text-warm-500">
                            {t('courses.new.declaredValueHelper')}
                          </p>

                          {shouldSuggestDeclared && (
                            <p className="mt-2 text-caption text-warning bg-warning-bg border border-warning/30 rounded-md px-3 py-2">
                              {t('courses.new.declaredValueSuggestion')}
                            </p>
                          )}
                          {willBePremium && (
                            <p className="mt-2 text-caption text-ink bg-airmess-yellow/10 border border-airmess-yellow/40 rounded-md px-3 py-2">
                              {t('courses.new.premiumHint', {
                                threshold: HIGH_VALUE_UI_THRESHOLD.toLocaleString(locale),
                              })}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </section>

              {apiError && (
                <Card
                  padding="md"
                  className="bg-danger-bg! border-airmess-red/30! text-airmess-red"
                >
                  {apiError}
                </Card>
              )}
              </>
              )}

              <div className="flex flex-col-reverse sm:flex-row gap-3 justify-between pt-2">
                {currentStep > 1 ? (
                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    pill
                    onClick={() => {
                      if (currentStep === 2 && tripSubStep === 'destination') {
                        setTripSubStep('origin')
                        setTripAutoAdvanced(false)
                        setLocationTarget('A')
                      } else {
                        setCurrentStep((step) => Math.max(1, step - 1) as CourseFormStep)
                      }
                      window.scrollTo({ top: 0, behavior: 'smooth' })
                    }}
                  >
                    Retour
                  </Button>
                ) : (
                  <span />
                )}
                {currentStep < 3 && (
                  <Button
                    type="button"
                    variant="primary"
                    size="md"
                    pill
                    onClick={() => {
                      void goToNextStep()
                    }}
                    rightIcon={<ArrowRightIcon size={16} />}
                  >
                    {currentStep === 2 && tripSubStep === 'origin' ? 'Continuer vers le destinataire' : 'Continuer'}
                  </Button>
                )}
              </div>
            </div>

            {/* ===================== Colonne récap (desktop only) ===================== */}
            <CoursePriceRecap
              data={summaryData}
              originLat={originLat || undefined}
              originLng={originLng || undefined}
              destinationLat={destinationLat || undefined}
              destinationLng={destinationLng || undefined}
              fee={currentFee}
              estimate={estimate}
              walletAvailable={walletAvailable}
              isSubmitting={mutation.isPending}
              submitLabel={submitLabel}
              missingCount={missingCount}
              primaryAction={stepPrimaryAction}
            />
          </div>

          {/* Barre sticky bas (mobile only) */}
          <MobileCoursePriceBar
            data={summaryData}
            fee={currentFee}
            estimate={estimate}
            walletAvailable={walletAvailable}
            isSubmitting={mutation.isPending}
            submitLabel={submitLabel}
            missingCount={missingCount}
            originLat={originLat || undefined}
            originLng={originLng || undefined}
            destinationLat={destinationLat || undefined}
            destinationLng={destinationLng || undefined}
            primaryAction={stepPrimaryAction}
          />
        </form>
      </main>

      {/* Drawer d'édition de l'origine */}
      <OriginDrawer
        open={originDrawerOpen}
        onClose={() => setOriginDrawerOpen(false)}
        register={register}
        watch={watch}
        errors={errors}
        geoStatus={geoStatus}
        inputClass={inputClass}
      />

      {/* Modal d'encaissement (garde-fou : "sûr que tu n'encaisses rien ?") */}
      {pendingValues && (
        <div className="fixed inset-0 bg-ink/60 backdrop-blur-sm flex items-center justify-center z-[2000] p-4 ams-anim-fade-in">
          <Card variant="signature" padding="lg" className="max-w-md w-full ams-anim-scale-in">
            <h2 className="text-h2 text-ink font-bold">{t('courses.new.collectionModalTitle')}</h2>
            <p className="text-body-s text-warm-600 mt-2">
              {t('courses.new.collectionModalBody')}
            </p>
            <div className="flex flex-col-reverse sm:flex-row gap-3 mt-6">
              <Button
                variant="secondary"
                size="md"
                fullWidth
                onClick={() => {
                  setCollectionDecided(true)
                  const values = pendingValues
                  setPendingValues(null)
                  performCreate({ ...values, has_collection: false })
                }}
              >
                {t('courses.new.collectionModalNo')}
              </Button>
              <Button
                variant="primary"
                size="md"
                pill
                fullWidth
                onClick={() => {
                  setValue('has_collection', true)
                  setCollectionDecided(true)
                  setOptionsOpen(true)
                  setPendingValues(null)
                  setTimeout(() => {
                    document
                      .querySelector('input[name="collection_amount"]')
                      ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                    ;(
                      document.querySelector(
                        'input[name="collection_amount"]',
                      ) as HTMLInputElement | null
                    )?.focus()
                  }, 100)
                }}
              >
                {t('courses.new.collectionModalYes')}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Onboarding — coach-marks du formulaire */}
      <Coachmark
        open={!formTipsSeen}
        steps={coachSteps}
        onClose={markFormTipsSeen}
        onFinish={markFormTipsSeen}
      />
    </div>
  )
}
