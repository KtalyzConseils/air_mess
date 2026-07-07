import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { AxiosError } from 'axios'
import { useTranslation } from 'react-i18next'
import AppHeader from '../components/AppHeader'
import FormSection from '../components/FormSection'
import Field from '../components/Field'
import Highlight from '../components/Highlight'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import PageEyebrow from '../components/ui/PageEyebrow'
import { fetchPackageCategories } from '../api/packageCategories'
import { createCourse, fetchDeliveryFees, type CreateCoursePayload } from '../api/courses'
import AddressPicker from '../components/AddressPicker'
import type { Address } from '../api/addresses'
import LocationPicker from '../components/LocationPicker'
import { useAuthStore } from '../stores/authStore'
import { fetchWallet } from '../api/wallet'

type FormValues = CreateCoursePayload

// Classes communes appliquées aux inputs natifs des FormSection.
// Reproduit le look du composant <Input/> de notre design system (atomic).
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
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      urgency: 'standard',
      package_size: 'M',
      origin_name: senderName,
      origin_phone: senderPhone,
      origin_city: 'Cotonou',
      destination_city: 'Cotonou',
      has_collection: false,
    },
  })

  const hasCollection = watch('has_collection')

  const [collectionDecided, setCollectionDecided] = useState(false)
  const [pendingValues, setPendingValues] = useState<FormValues | null>(null)
  const [quotaError, setQuotaError] = useState<string | null>(null)
  const [geoStatus, setGeoStatus] = useState<'idle' | 'loading' | 'success' | 'denied'>('idle')

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

  function performCreate(values: FormValues) {
    setQuotaError(null)

    const oLat = Number(values.origin_lat)
    const oLng = Number(values.origin_lng)
    const dLat = Number(values.destination_lat)
    const dLng = Number(values.destination_lng)
    if (!Number.isFinite(oLat) || !Number.isFinite(oLng) || oLat === 0 || oLng === 0) {
      setQuotaError(t('courses.new.originPositionMissing'))
      window.scrollTo({ top: 0, behavior: 'smooth' })
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
      // callback_url pour le pay-as-you-go Fedapay : nécessaire dès que le user
      // peut être payeur — marchand (toujours) comme particulier (hors quota).
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
  }

  // Calcul du fee courant pour les bandeaux wallet/quota
  const currentFee = (watch('urgency') ?? 'standard') === 'express' ? fees.express : fees.standard

  return (
    <div className="min-h-screen bg-cream">
      <AppHeader />

      <main className="max-w-4xl mx-auto px-4 md:px-6 py-8 md:py-12">
        {/* ============================================================
            HERO — Section marker + H1 avec highlight signature
            ============================================================ */}
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
          {t('courses.new.title')} <Highlight>{t('courses.new.titleHighlight')}</Highlight>{t('courses.new.titleEnd')}
        </h1>
        <p className="text-body-l text-warm-500 mb-10">
          {t('courses.new.subtitle')}
        </p>

        {/* ============================================================
            BANDEAUX D'ÉTAT (quota / wallet / individual quota)
            ============================================================ */}
        {quotaError && (
          <Card
            variant="default"
            padding="md"
            className="mb-4 bg-warning-bg! border-warning/30! flex items-start justify-between gap-3"
          >
            <div className="flex items-start gap-2">
              <span className="text-h3">⚠️</span>
              <p className="text-body-s text-warning">{quotaError}</p>
            </div>
            <Link to="/wallet">
              <Button variant="primary" size="sm" pill>{t('courses.new.topUpCta')}</Button>
            </Link>
          </Card>
        )}

        {isPayerUser && wallet && (() => {
          const individualOutOfQuota =
            user?.type === 'individual' &&
            user.individual &&
            user.individual.monthly_courses_used >= user.individual.monthly_courses_limit
          const isPayer = user?.type === 'marchant' || individualOutOfQuota
          if (!isPayer) return null

          const canCover = wallet.available >= currentFee

          return canCover ? (
            <Card padding="md" className="mb-4 bg-success-bg! border-success/20! flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-body-s text-success">
                <span>💰</span>
                <span>
                  <strong className="tabular-nums">{wallet.available.toLocaleString('fr-FR')} FCFA</strong> {t('courses.new.walletCoveredPrefix')}<span className="tabular-nums">{currentFee.toLocaleString('fr-FR')} FCFA</span>{t('courses.new.walletCoveredSuffix')}
                </span>
              </div>
              <Link to="/wallet" className="text-caption text-success underline shrink-0">{t('courses.new.manageWallet')}</Link>
            </Card>
          ) : (
            <Card padding="md" className="mb-4 bg-warning-bg! border-warning/30! flex items-start justify-between gap-3">
              <div className="flex items-start gap-2 text-body-s text-warning">
                <span>⚠️</span>
                <div>
                  <p className="font-semibold">
                    {t('courses.new.walletInsufficientTitle')} (<span className="tabular-nums">{wallet.available.toLocaleString('fr-FR')} FCFA</span>)
                  </p>
                  <p className="text-caption mt-0.5">
                    {t('courses.new.walletCourseLabel')} (<span className="tabular-nums">{currentFee.toLocaleString('fr-FR')} FCFA</span>) {t('courses.new.walletInsufficientBody')}
                  </p>
                </div>
              </div>
              <Link to="/wallet" className="shrink-0">
                <Button variant="primary" size="sm" pill>{t('courses.new.topUpCta')}</Button>
              </Link>
            </Card>
          )
        })()}

        {user?.type === 'individual' && user.individual && (() => {
          const used = user.individual.monthly_courses_used
          const limit = user.individual.monthly_courses_limit
          const reached = used >= limit
          return (
            <Card
              padding="md"
              className={
                reached
                  ? 'mb-4 bg-warning-bg! border-warning/30! flex items-start gap-2'
                  : 'mb-4 bg-info-bg! border-info/20! flex items-start gap-2'
              }
            >
              <span>{reached ? '💳' : 'ℹ️'}</span>
              <div className={reached ? 'text-warning' : 'text-info'}>
                <p className="font-semibold text-body-s">
                  {reached
                    ? t('courses.new.quotaReachedTitle', { used, limit })
                    : t('courses.new.quotaProgress', { used, limit })}
                </p>
                {reached && (
                  <p className="text-caption mt-0.5">
                    {t('courses.new.quotaReachedBody')}
                  </p>
                )}
              </div>
            </Card>
          )
        })()}

        {/* ============================================================
            FORMULAIRE
            ============================================================ */}
        <form onSubmit={handleSubmit(onSubmit)}>
          {/* COLIS */}
          <FormSection title={t('courses.new.packageSectionTitle')} description={t('courses.new.packageSectionDesc')}>
            <div className="mb-3">
              <AddressPicker onSelect={fillDestinationFromAddress} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label={t('courses.new.categoryLabel')} required error={errors.package_category_id?.message}>
                <select
                  {...register('package_category_id', { required: t('courses.new.required') })}
                  className={inputClass}
                >
                  <option value="">{t('courses.new.categoryChoose')}</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
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

              <Field label={t('courses.new.packageWeight')}>
                <input
                  type="number"
                  step="0.1"
                  {...register('package_weight_kg')}
                  className={inputClass}
                  placeholder={t('courses.new.packageWeightPlaceholder')}
                />
              </Field>

              <Field label={t('courses.new.packageDescription')} required error={errors.package_description?.message} className="md:col-span-2">
                <input
                  {...register('package_description', { required: t('courses.new.required') })}
                  className={inputClass}
                  placeholder={t('courses.new.packageDescPlaceholder')}
                />
              </Field>

              <Field label={t('courses.new.urgencyLabel')}>
                <select {...register('urgency')} className={inputClass}>
                  <option value="standard">{t('courses.new.urgencyStandardOption', { fee: fees.standard.toLocaleString('fr-FR') })}</option>
                  <option value="express">{t('courses.new.urgencyExpressOption', { fee: fees.express.toLocaleString('fr-FR') })}</option>
                </select>
              </Field>
            </div>
          </FormSection>

          {/* ORIGINE */}
          <FormSection title={t('courses.new.originSectionTitle')} description={t('courses.new.originSectionDesc')}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label={t('courses.new.senderName')} required error={errors.origin_name?.message}>
                <input {...register('origin_name', { required: t('courses.new.required') })} className={inputClass} />
              </Field>
              <Field label={t('courses.new.phoneLabel')} required error={errors.origin_phone?.message}>
                <input {...register('origin_phone', { required: t('courses.new.required') })} className={inputClass} />
              </Field>
              <Field label={t('courses.new.streetLabel')}>
                <input {...register('origin_street')} className={inputClass} />
              </Field>
              <Field label={t('courses.new.originQuartier')} required>
                <input {...register('origin_quartier', { required: t('courses.new.required') })} className={inputClass} placeholder={t('courses.new.quartierPlaceholder')} />
              </Field>
              <Field label={t('courses.new.originCity')} required>
                <input {...register('origin_city', { required: t('courses.new.required') })} className={inputClass} />
              </Field>
              <div className="md:col-span-2">
                <p className="text-caption text-warm-600 font-medium mb-1.5">{t('courses.new.mapPosition')}</p>
                <LocationPicker
                  lat={Number(watch('origin_lat')) || undefined}
                  lng={Number(watch('origin_lng')) || undefined}
                  onChange={(la, ln) => {
                    setValue('origin_lat', la)
                    setValue('origin_lng', ln)
                  }}
                />
                <input type="hidden" {...register('origin_lat', { required: true })} />
                <input type="hidden" {...register('origin_lng', { required: true })} />
                {geoStatus === 'success' && (
                  <p className="text-caption text-success mt-1.5">{t('courses.new.geoSuccess')}</p>
                )}
                {geoStatus === 'denied' && (
                  <p className="text-caption text-warning mt-1.5">{t('courses.new.geoDenied')}</p>
                )}
              </div>
            </div>
          </FormSection>

          {/* DESTINATION */}
          <FormSection title={t('courses.new.destinationSectionTitle')} description={t('courses.new.destinationSectionDesc')}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label={t('courses.new.recipientNameLabel')} required>
                <input {...register('destination_name', { required: t('courses.new.required') })} className={inputClass} />
              </Field>
              <Field label={t('courses.new.recipientPhoneLabel')} required>
                <input {...register('destination_phone', { required: t('courses.new.required') })} className={inputClass} />
              </Field>
              <Field label={t('courses.new.streetLabel')}>
                <input {...register('destination_street')} className={inputClass} />
              </Field>
              <Field label={t('courses.new.landmarkLabel')}>
                <input {...register('destination_landmark')} className={inputClass} placeholder={t('courses.new.landmarkPlaceholder')} />
              </Field>
              <Field label={t('courses.new.destinationQuartier')} required>
                <input {...register('destination_quartier', { required: t('courses.new.required') })} className={inputClass} />
              </Field>
              <Field label={t('courses.new.destinationCity')} required>
                <input {...register('destination_city', { required: t('courses.new.required') })} className={inputClass} />
              </Field>
              <div className="md:col-span-2">
                <p className="text-caption text-warm-600 font-medium mb-1.5">{t('courses.new.mapPosition')}</p>
                <LocationPicker
                  lat={Number(watch('destination_lat')) || undefined}
                  lng={Number(watch('destination_lng')) || undefined}
                  onChange={(la, ln) => {
                    setValue('destination_lat', la)
                    setValue('destination_lng', ln)
                  }}
                />
                <input type="hidden" {...register('destination_lat', { required: true })} />
                <input type="hidden" {...register('destination_lng', { required: true })} />
                <p className="text-caption text-warm-400 mt-1.5">{t('courses.new.mapClickHint')}</p>
              </div>
              <Field label={t('courses.new.driverInstructions')} className="md:col-span-2">
                <textarea {...register('destination_instructions')} className={inputClass} rows={2} placeholder={t('courses.new.driverInstructionsPlaceholder')} />
              </Field>
            </div>
          </FormSection>

          {/* ENCAISSEMENT */}
          <FormSection title={t('courses.new.collectionSectionTitle')} description={t('courses.new.collectionSectionDesc')}>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                {...register('has_collection')}
                onClick={() => setCollectionDecided(true)}
                className="h-4 w-4 accent-airmess-yellow"
              />
              <span className="text-body text-ink">{t('courses.new.collectionYes')}</span>
            </label>

            {hasCollection && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <Field label={t('courses.new.collectionAmount')} required>
                  <input type="number" {...register('collection_amount')} className={inputClass} />
                </Field>
                <Field label={t('courses.new.collectionMethod')} required>
                  <select {...register('collection_method')} className={inputClass}>
                    <option value="cash">{t('courses.new.collectionCash')}</option>
                    <option value="mobile_money">{t('courses.new.collectionMobileMoney')}</option>
                    <option value="prepaid">{t('courses.new.collectionPrepaid')}</option>
                  </select>
                </Field>
              </div>
            )}
          </FormSection>

          {apiError && (
            <Card padding="md" className="mb-4 bg-danger-bg! border-airmess-red/30! text-airmess-red">
              {apiError}
            </Card>
          )}

          <div className="flex flex-col md:flex-row justify-end gap-3 mt-6">
            <Link to="/dashboard" className="md:order-1">
              <Button variant="secondary" size="lg" fullWidth>{t('common.cancel')}</Button>
            </Link>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              pill
              loading={mutation.isPending}
              rightIcon={!mutation.isPending && <span aria-hidden>→</span>}
              className="md:order-2"
            >
              {mutation.isPending ? t('courses.new.creating') : t('courses.new.confirmCta')}
            </Button>
          </div>
        </form>
      </main>

      {/* ============================================================
          MODAL d'encaissement (gardé tel quel, restylé)
          ============================================================ */}
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
                  setPendingValues(null)
                  setTimeout(() => {
                    document.querySelector('input[name="collection_amount"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                    ;(document.querySelector('input[name="collection_amount"]') as HTMLInputElement | null)?.focus()
                  }, 100)
                }}
              >
                {t('courses.new.collectionModalYes')}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
