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
import { createCourse, fetchDeliveryFees, type CreateCoursePayload } from '../api/courses'
import AddressPicker from '../components/AddressPicker'
import type { Address } from '../api/addresses'
import { useAuthStore } from '../stores/authStore'
import { fetchWallet } from '../api/wallet'
import { useOnboardingStore } from '../stores/onboardingStore'
import Coachmark, { type CoachStep } from '../components/onboarding/Coachmark'
import OriginBanner from '../components/course/OriginBanner'
import OriginDrawer from '../components/course/OriginDrawer'
import CoursePriceRecap from '../components/course/CoursePriceRecap'
import MobileCoursePriceBar from '../components/course/MobileCoursePriceBar'
import DualPinMap from '../components/course/DualPinMap'
import MissingFieldsBanner, {
  type MissingField,
} from '../components/course/MissingFieldsBanner'
import {
  AlertTriangleIcon,
  ChevronDownIcon,
  PackageIcon,
  RouteIcon,
  SettingsIcon,
} from '../components/ui/icons'

type FormValues = CreateCoursePayload

/**
 * Métadonnées de chaque champ obligatoire pour piloter le bandeau d'erreurs :
 * - labelKey : clé i18n du libellé humain
 * - location : où trouver le champ dans l'UI (guide l'auto-ouverture drawer/accordion + scroll)
 * - dedupKey  : plusieurs erreurs qui pointent le même problème (ex: lat & lng du même pin)
 *               partagent une clé pour n'afficher qu'une seule entrée dans le bandeau
 */
type FieldLocation = 'drawer' | 'options' | 'main' | 'map_A' | 'map_B'

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
  package_category_id:  { labelKey: 'courses.new.categoryLabel',    location: 'main' },
  package_description:  { labelKey: 'courses.new.packageDescription', location: 'main' },
}

const inputClass =
  'w-full bg-off-white border border-warm-300 rounded-md px-3 py-2.5 text-body text-ink ' +
  'placeholder:text-warm-400 transition-all duration-200 ' +
  'focus:outline-none focus:border-airmess-yellow focus:shadow-glow-yellow ' +
  'disabled:opacity-60 disabled:cursor-not-allowed'

export default function NewCoursePage() {
  const { t } = useTranslation()
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

  const { data: fees = { standard: 1500, express: 2500 } } = useQuery({
    queryKey: ['delivery-fees'],
    queryFn: fetchDeliveryFees,
    staleTime: 5 * 60 * 1000,
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
      delivery_fee_paid_by: 'sender',
    },
  })

  const hasCollection = watch('has_collection')
  const collectionAmountWatch = Number(watch('collection_amount') ?? 0)
  const declaredValueWatch = Number(watch('package_declared_value') ?? 0)
  const paidBy = watch('delivery_fee_paid_by') ?? 'sender'
  const isRecipientPaid = paidBy === 'recipient'
  const urgencyWatch = (watch('urgency') ?? 'standard') as 'standard' | 'express'
  const originName = watch('origin_name') ?? ''
  const originQuartier = watch('origin_quartier') ?? ''
  const originCity = watch('origin_city') ?? ''
  const destinationQuartier = watch('destination_quartier') ?? ''
  const destinationCity = watch('destination_city') ?? ''
  const destinationName = watch('destination_name') ?? ''

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

  /**
   * Navigue vers le champ manquant cliqué : ouvre le drawer / l'accordion si
   * nécessaire, scroll vers la DualPinMap pour les positions, ou setFocus RHF
   * pour les inputs "classiques".
   */
  function handleMissingFieldClick(fieldName: string) {
    const meta = FIELD_META[fieldName]
    if (!meta) return
    if (meta.location === 'drawer') setOriginDrawerOpen(true)
    if (meta.location === 'options') setOptionsOpen(true)

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
      watch('package_description'),
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
    watch('package_description'),
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
      setOriginDrawerOpen(true)
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
      destination_lat: Number(values.destination_lat),
      destination_lng: Number(values.destination_lng),
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

  const currentFee = urgencyWatch === 'express' ? fees.express : fees.standard
  const walletAvailable = isPayerUser && wallet ? wallet.available : null

  const submitLabel = mutation.isPending
    ? t('courses.new.creating')
    : t('courses.new.confirmCta')

  const packageCategoryId = Number(watch('package_category_id')) || undefined
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
    packageSize: (watch('package_size') ?? 'M') as 'S' | 'M' | 'L' | 'XL',
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
            handleFirstMissing(fields)
          })}
          id="new-course-form"
        >
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

              {/* Bloc EXPÉDITEUR (bannière compacte) */}
              <div data-onboarding-id="origin">
                <OriginBanner
                  name={originName}
                  quartier={originQuartier}
                  city={originCity}
                  onEdit={() => setOriginDrawerOpen(true)}
                />
              </div>

              {/* Bloc TRAJET (destinataire + carte destination) */}
              <section className="bg-off-white border border-warm-200 rounded-lg p-5 md:p-6">
                <div className="mb-4 pb-3 border-b border-warm-100 flex items-center gap-2">
                  <span className="text-warm-600">
                    <RouteIcon size={18} />
                  </span>
                  <h3 className="text-h3 text-ink font-bold">
                    {t('courses.new.blocks.trip.title')}
                  </h3>
                </div>

                <div className="mb-3">
                  <AddressPicker onSelect={fillDestinationFromAddress} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label={t('courses.new.recipientNameLabel')} required>
                    <input
                      {...register('destination_name', { required: t('courses.new.required') })}
                      className={inputClass}
                    />
                  </Field>
                  <Field label={t('courses.new.recipientPhoneLabel')} required>
                    <input
                      {...register('destination_phone', { required: t('courses.new.required') })}
                      className={inputClass}
                    />
                  </Field>
                  <Field label={t('courses.new.destinationQuartier')} required>
                    <input
                      {...register('destination_quartier', { required: t('courses.new.required') })}
                      className={inputClass}
                    />
                  </Field>
                  <Field label={t('courses.new.destinationCity')} required>
                    <input
                      {...register('destination_city', { required: t('courses.new.required') })}
                      className={inputClass}
                    />
                  </Field>
                  <div className="md:col-span-2" id="dual-pin-map">
                    <p className="text-caption text-warm-600 font-medium mb-1.5">
                      {t('courses.new.dualMap.blockTitle')}
                    </p>
                    <DualPinMap
                      originLat={Number(watch('origin_lat')) || undefined}
                      originLng={Number(watch('origin_lng')) || undefined}
                      destLat={Number(watch('destination_lat')) || undefined}
                      destLng={Number(watch('destination_lng')) || undefined}
                      onOriginChange={(la, ln) => {
                        setValue('origin_lat', la)
                        setValue('origin_lng', ln)
                      }}
                      onDestChange={(la, ln) => {
                        setValue('destination_lat', la)
                        setValue('destination_lng', ln)
                      }}
                    />
                    <input type="hidden" {...register('origin_lat', { required: true })} />
                    <input type="hidden" {...register('origin_lng', { required: true })} />
                    <input type="hidden" {...register('destination_lat', { required: true })} />
                    <input type="hidden" {...register('destination_lng', { required: true })} />
                    {geoStatus === 'success' && (
                      <p className="text-caption text-success mt-1.5">{t('courses.new.geoSuccess')}</p>
                    )}
                    {geoStatus === 'denied' && (
                      <p className="text-caption text-warning mt-1.5">{t('courses.new.geoDenied')}</p>
                    )}
                  </div>
                </div>

                {/* Précisions destination (rue + landmark + instructions) */}
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
                      <Field label={t('courses.new.streetLabel')} optional>
                        <input {...register('destination_street')} className={inputClass} />
                      </Field>
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
              </section>

              {/* Bloc COLIS */}
              <section className="bg-off-white border border-warm-200 rounded-lg p-5 md:p-6">
                <div className="mb-4 pb-3 border-b border-warm-100 flex items-center gap-2">
                  <span className="text-warm-600">
                    <PackageIcon size={18} />
                  </span>
                  <h3 className="text-h3 text-ink font-bold">
                    {t('courses.new.blocks.package.title')}
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Field
                    label={t('courses.new.categoryLabel')}
                    required
                    error={errors.package_category_id?.message}
                  >
                    <select
                      {...register('package_category_id', { required: t('courses.new.required') })}
                      className={inputClass}
                    >
                      <option value="">{t('courses.new.categoryChoose')}</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label={t('courses.new.sizeLabel')} required>
                    <select {...register('package_size')} className={inputClass}>
                      <option value="S">{t('courses.new.sizeSmall')}</option>
                      <option value="M">{t('courses.new.sizeMedium')}</option>
                      <option value="L">{t('courses.new.sizeLarge')}</option>
                      <option value="XL">{t('courses.new.sizeXL')}</option>
                    </select>
                  </Field>

                  <div data-onboarding-id="urgency">
                    <Field label={t('courses.new.urgencyLabel')}>
                      <select {...register('urgency')} className={inputClass}>
                        <option value="standard">
                          {t('courses.new.urgencyStandardOption', {
                            fee: fees.standard.toLocaleString('fr-FR'),
                          })}
                        </option>
                        <option value="express">
                          {t('courses.new.urgencyExpressOption', {
                            fee: fees.express.toLocaleString('fr-FR'),
                          })}
                        </option>
                      </select>
                    </Field>
                  </div>

                  <Field
                    label={t('courses.new.packageDescription')}
                    required
                    error={errors.package_description?.message}
                    className="md:col-span-3"
                  >
                    <input
                      {...register('package_description', { required: t('courses.new.required') })}
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

                    {/* Qui paie les frais */}
                    <div>
                      <p className="text-caption text-warm-600 font-medium mb-2">
                        {t('courses.new.paidBySectionTitle')}
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {(['sender', 'recipient'] as const).map((opt) => {
                          const selected = paidBy === opt
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
                                {...register('delivery_fee_paid_by')}
                                className="sr-only"
                              />
                              <p className="text-body font-bold text-ink">
                                {opt === 'sender'
                                  ? t('courses.new.paidByOptionSender')
                                  : t('courses.new.paidByOptionRecipient')}
                              </p>
                              <p className="text-caption text-warm-600 mt-0.5">
                                {opt === 'sender'
                                  ? t('courses.new.paidByOptionSenderHint')
                                  : t('courses.new.paidByOptionRecipientHint')}
                              </p>
                            </label>
                          )
                        })}
                      </div>

                      {isRecipientPaid && (() => {
                        const feeToCollect = currentFee
                        const totalToCollect = (collectionAmountWatch || 0) + feeToCollect
                        return (
                          <div className="mt-3 space-y-2">
                            <div className="rounded-md bg-airmess-yellow/10 border border-airmess-yellow/40 px-3 py-2.5 text-body-s text-ink">
                              {hasCollection && collectionAmountWatch > 0
                                ? t('courses.new.paidByPreviewCombined', {
                                    product: (collectionAmountWatch || 0).toLocaleString('fr-FR'),
                                    fee: feeToCollect.toLocaleString('fr-FR'),
                                    total: totalToCollect.toLocaleString('fr-FR'),
                                  })
                                : t('courses.new.paidByPreviewFeeOnly', {
                                    fee: feeToCollect.toLocaleString('fr-FR'),
                                  })}
                            </div>
                            <div className="rounded-md bg-info-bg border border-info/20 px-3 py-2.5 text-caption text-info">
                              {t('courses.new.paidByAirmessNote')}
                            </div>
                          </div>
                        )
                      })()}
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
                                threshold: HIGH_VALUE_UI_THRESHOLD.toLocaleString('fr-FR'),
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
            </div>

            {/* ===================== Colonne récap (desktop only) ===================== */}
            <CoursePriceRecap
              data={summaryData}
              originLat={Number(watch('origin_lat')) || undefined}
              originLng={Number(watch('origin_lng')) || undefined}
              destinationLat={Number(watch('destination_lat')) || undefined}
              destinationLng={Number(watch('destination_lng')) || undefined}
              fee={currentFee}
              walletAvailable={walletAvailable}
              isSubmitting={mutation.isPending}
              submitLabel={submitLabel}
              missingCount={missingCount}
            />
          </div>

          {/* Barre sticky bas (mobile only) */}
          <MobileCoursePriceBar
            data={summaryData}
            fee={currentFee}
            walletAvailable={walletAvailable}
            isSubmitting={mutation.isPending}
            submitLabel={submitLabel}
            missingCount={missingCount}
            originLat={Number(watch('origin_lat')) || undefined}
            originLng={Number(watch('origin_lng')) || undefined}
            destinationLat={Number(watch('destination_lat')) || undefined}
            destinationLng={Number(watch('destination_lng')) || undefined}
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
        <div className="fixed inset-0 bg-ink/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 ams-anim-fade-in">
          <Card variant="signature" padding="lg" className="max-w-md w-full ams-anim-scale-in">
            <h2 className="text-h2 text-ink font-bold">{t('courses.new.collectionModalTitle')}</h2>
            <p className="text-body-s text-warm-600 mt-2">
              {t('courses.new.collectionModalBody')}
            </p>
            <div className="flex gap-3 mt-6">
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
