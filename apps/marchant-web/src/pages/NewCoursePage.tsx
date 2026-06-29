import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { AxiosError } from 'axios'
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
          `Quota mensuel atteint (${result.used}/${result.limit}). ` +
          'Passez à un plan supérieur pour continuer.',
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
      setQuotaError("Position d'origine manquante. Cliquez sur la carte d'origine pour la définir.")
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    if (!Number.isFinite(dLat) || !Number.isFinite(dLng) || dLat === 0 || dLng === 0) {
      setQuotaError("Position de destination manquante. Cliquez sur la carte de destination pour la définir.")
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
      ...(user?.type === 'individual'
        ? { callback_url: `${window.location.origin}/billing/return` }
        : {}),
    }
    mutation.mutate(payload)
  }

  const apiError =
    mutation.error instanceof AxiosError
      ? mutation.error.response?.data?.message ?? 'Erreur de création.'
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
            ← Retour au tableau de bord
          </Link>
        </div>

        <PageEyebrow label="Nouvelle course" className="mb-4" />
        <h1 className="text-h1 md:text-display-2 text-ink leading-tight mb-2">
          Créez une <Highlight>livraison</Highlight>.
        </h1>
        <p className="text-body-l text-warm-500 mb-10">
          Remplissez les informations ci-dessous, le livreur est attribué automatiquement.
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
              <Button variant="primary" size="sm" pill>Recharger</Button>
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
                  <strong className="tabular-nums">{wallet.available.toLocaleString('fr-FR')} FCFA</strong> dans votre wallet.
                  Cette course (<span className="tabular-nums">{currentFee.toLocaleString('fr-FR')} FCFA</span>) sera débitée à la livraison.
                </span>
              </div>
              <Link to="/wallet" className="text-caption text-success underline shrink-0">Gérer →</Link>
            </Card>
          ) : (
            <Card padding="md" className="mb-4 bg-warning-bg! border-warning/30! flex items-start justify-between gap-3">
              <div className="flex items-start gap-2 text-body-s text-warning">
                <span>⚠️</span>
                <div>
                  <p className="font-semibold">
                    Wallet insuffisant (<span className="tabular-nums">{wallet.available.toLocaleString('fr-FR')} FCFA</span>)
                  </p>
                  <p className="text-caption mt-0.5">
                    Cette course (<span className="tabular-nums">{currentFee.toLocaleString('fr-FR')} FCFA</span>) sera réglée par paiement direct Fedapay à la création.
                  </p>
                </div>
              </div>
              <Link to="/wallet" className="shrink-0">
                <Button variant="primary" size="sm" pill>Recharger</Button>
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
                    ? `Quota mensuel atteint (${used}/${limit})`
                    : `Quota mensuel : ${used}/${limit} courses utilisées`}
                </p>
                {reached && (
                  <p className="text-caption mt-0.5">
                    Cette course sera débitée de votre wallet si le solde le permet, sinon par paiement direct Fedapay.
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
          <FormSection title="Colis" description="Que livrons-nous ?">
            <div className="mb-3">
              <AddressPicker onSelect={fillDestinationFromAddress} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Catégorie" required error={errors.package_category_id?.message}>
                <select
                  {...register('package_category_id', { required: 'Obligatoire' })}
                  className={inputClass}
                >
                  <option value="">— Choisir —</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </Field>

              <Field label="Taille" required>
                <select {...register('package_size')} className={inputClass}>
                  <option value="S">S — petit</option>
                  <option value="M">M — moyen</option>
                  <option value="L">L — grand</option>
                  <option value="XL">XL — encombrant</option>
                </select>
              </Field>

              <Field label="Poids (kg)">
                <input
                  type="number"
                  step="0.1"
                  {...register('package_weight_kg')}
                  className={inputClass}
                  placeholder="ex: 2.5"
                />
              </Field>

              <Field label="Description" required error={errors.package_description?.message} className="md:col-span-2">
                <input
                  {...register('package_description', { required: 'Obligatoire' })}
                  className={inputClass}
                  placeholder="ex: 2 pizzas Margherita + Reine"
                />
              </Field>

              <Field label="Urgence">
                <select {...register('urgency')} className={inputClass}>
                  <option value="standard">Standard — {fees.standard.toLocaleString('fr-FR')} FCFA</option>
                  <option value="express">Express — {fees.express.toLocaleString('fr-FR')} FCFA</option>
                </select>
              </Field>
            </div>
          </FormSection>

          {/* ORIGINE */}
          <FormSection title="Origine" description="D'où part le colis (pré-rempli depuis votre profil)">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Nom expéditeur" required error={errors.origin_name?.message}>
                <input {...register('origin_name', { required: 'Obligatoire' })} className={inputClass} />
              </Field>
              <Field label="Téléphone" required error={errors.origin_phone?.message}>
                <input {...register('origin_phone', { required: 'Obligatoire' })} className={inputClass} />
              </Field>
              <Field label="Adresse / rue">
                <input {...register('origin_street')} className={inputClass} />
              </Field>
              <Field label="Quartier" required>
                <input {...register('origin_quartier', { required: 'Obligatoire' })} className={inputClass} placeholder="ex: Ganhi" />
              </Field>
              <Field label="Ville" required>
                <input {...register('origin_city', { required: 'Obligatoire' })} className={inputClass} />
              </Field>
              <div className="md:col-span-2">
                <p className="text-caption text-warm-600 font-medium mb-1.5">Position sur la carte</p>
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
                  <p className="text-caption text-success mt-1.5">✓ Position détectée automatiquement. Vous pouvez l'ajuster ci-dessus.</p>
                )}
                {geoStatus === 'denied' && (
                  <p className="text-caption text-warning mt-1.5">Géolocalisation auto refusée — utilisez « Ma position actuelle » ou cliquez sur la carte.</p>
                )}
              </div>
            </div>
          </FormSection>

          {/* DESTINATION */}
          <FormSection title="Destination" description="À qui et où livrer">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Nom destinataire" required>
                <input {...register('destination_name', { required: 'Obligatoire' })} className={inputClass} />
              </Field>
              <Field label="Téléphone destinataire" required>
                <input {...register('destination_phone', { required: 'Obligatoire' })} className={inputClass} />
              </Field>
              <Field label="Adresse / rue">
                <input {...register('destination_street')} className={inputClass} />
              </Field>
              <Field label="Point de repère">
                <input {...register('destination_landmark')} className={inputClass} placeholder="ex: Maison à portail bleu" />
              </Field>
              <Field label="Quartier" required>
                <input {...register('destination_quartier', { required: 'Obligatoire' })} className={inputClass} />
              </Field>
              <Field label="Ville" required>
                <input {...register('destination_city', { required: 'Obligatoire' })} className={inputClass} />
              </Field>
              <div className="md:col-span-2">
                <p className="text-caption text-warm-600 font-medium mb-1.5">Position sur la carte</p>
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
                <p className="text-caption text-warm-400 mt-1.5">Cliquez sur la carte pour positionner.</p>
              </div>
              <Field label="Instructions livreur" className="md:col-span-2">
                <textarea {...register('destination_instructions')} className={inputClass} rows={2} placeholder="ex: Appeler 5 min avant" />
              </Field>
            </div>
          </FormSection>

          {/* ENCAISSEMENT */}
          <FormSection title="Encaissement à la livraison" description="Le livreur doit-il encaisser de l'argent ?">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                {...register('has_collection')}
                onClick={() => setCollectionDecided(true)}
                className="h-4 w-4 accent-airmess-yellow"
              />
              <span className="text-body text-ink">Oui, le livreur doit encaisser</span>
            </label>

            {hasCollection && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <Field label="Montant (FCFA)" required>
                  <input type="number" {...register('collection_amount')} className={inputClass} />
                </Field>
                <Field label="Méthode" required>
                  <select {...register('collection_method')} className={inputClass}>
                    <option value="cash">Cash</option>
                    <option value="mobile_money">Mobile Money</option>
                    <option value="prepaid">Déjà payé</option>
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
              <Button variant="secondary" size="lg" fullWidth>Annuler</Button>
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
              {mutation.isPending ? 'Création…' : 'Confirmer la course'}
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
            <h2 className="text-h2 text-ink font-bold">💰 Encaissement à la livraison ?</h2>
            <p className="text-body-s text-warm-600 mt-2">
              Vous n'avez pas précisé si le livreur doit récupérer un montant à la livraison.
              Souhaitez-vous activer l'encaissement ?
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
                Non, pas d'encaissement
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
                Oui, je précise
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
