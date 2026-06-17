import { useState , useEffect} from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { AxiosError } from 'axios'
import AppHeader from '../components/AppHeader'
import FormSection from '../components/FormSection'
import Field from '../components/Field'
import { fetchPackageCategories } from '../api/packageCategories'
import { createCourse, fetchDeliveryFees, type CreateCoursePayload } from '../api/courses'
import AddressPicker from '../components/AddressPicker'
import type { Address } from '../api/addresses'
import LocationPicker from '../components/LocationPicker'
import { useAuthStore } from '../stores/authStore'

type FormValues = CreateCoursePayload

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

  // Tarifs de livraison pour afficher le prix dans le select d'urgence.
  // Fallback aux valeurs par défaut (1500/2500) si la requête échoue.
  const { data: fees = { standard: 1500, express: 2500 } } = useQuery({
    queryKey: ['delivery-fees'],
    queryFn: fetchDeliveryFees,
    staleTime: 5 * 60 * 1000, // 5 min : les tarifs changent rarement
  })

  // Pré-remplissage de l'expéditeur depuis le profil
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

  // Encaissement intelligent : si l'utilisateur n'a pas explicitement décidé
  // (coché ou non), on lui pose la question au submit via un modal.
  const [collectionDecided, setCollectionDecided] = useState(false)
  const [pendingValues, setPendingValues] = useState<FormValues | null>(null)

  const [quotaError, setQuotaError] = useState<string | null>(null)
  const [geoStatus, setGeoStatus] = useState<'idle' | 'loading' | 'success' | 'denied'>('idle')

  // Pré-remplissage géoloc HTML5 pour les particuliers (qui n'ont pas d'adresse profil)
  // Auto-tenté une seule fois au montage si origin_lat est vide.
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
      () => {
        // Refus utilisateur ou erreur — silencieux, le user devra cliquer sur la carte.
        setGeoStatus('denied')
      },
      { enableHighAccuracy: false, timeout: 6000, maximumAge: 5 * 60_000 },
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.type])

  const mutation = useMutation({
    mutationFn: createCourse,
    onSuccess: (result) => {
      // Cas 1 : course créée normalement
      if (result.course) {
        queryClient.invalidateQueries({ queryKey: ['courses'] })
        navigate('/dashboard')
        return
      }
      // Cas 2 : paiement requis (particulier au-dessus du quota)
      if (result.payment_required && result.checkout_url) {
        window.location.href = result.checkout_url
        return
      }
      // Cas 3 : quota marchand atteint
      if (result.quota_reached) {
        setQuotaError(
          `Quota mensuel atteint (${result.used}/${result.limit}). ` +
          'Passez à un plan supérieur pour continuer.',
        )
      }
    },
  })

  const inputClass =
    'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-airmess-yellow focus:border-transparent outline-none'

  function onSubmit(values: FormValues) {
    // Si encaissement non décidé explicitement (ni coché, ni "Non" via modal) → on demande
    if (!values.has_collection && !collectionDecided) {
      setPendingValues(values)
      return
    }
    performCreate(values)
  }

  function performCreate(values: FormValues) {
    setQuotaError(null)

    // Validation explicite des coordonnées GPS (inputs cachés que react-hook-form n'arrive pas à bloquer).
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

    // Conversion explicite des nombres (les inputs HTML renvoient toujours des strings)
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
      // Pour le flux one-shot (particulier au-delà du quota) : URL de retour Fedapay
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
      
  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader />

      <main className="max-w-4xl mx-auto p-4 md:p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <Link to="/dashboard" className="text-sm text-gray-500 hover:underline">
              ← Retour au tableau de bord
            </Link>
            <h2 className="text-2xl font-bold text-airmess-dark mt-2">Nouvelle livraison</h2>
          </div>
        </div>

        {quotaError && (
          <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 mb-4 flex items-start justify-between">
            <div className="flex items-start gap-2">
              <span className="text-xl">⚠️</span>
              <p className="text-sm text-amber-900">{quotaError}</p>
            </div>
            <Link
              to="/billing"
              className="ml-3 px-3 py-1.5 bg-airmess-yellow text-airmess-dark text-sm font-semibold rounded-lg hover:opacity-90"
            >
              Voir les plans
            </Link>
          </div>
        )}

        {user?.type === 'individual' && user.individual && (() => {
          const used = user.individual.monthly_courses_used
          const limit = user.individual.monthly_courses_limit
          const reached = used >= limit
          return (
            <div className={`rounded-xl p-3 mb-4 text-sm flex items-start gap-2 border ${
              reached
                ? 'bg-amber-50 border-amber-300 text-amber-900'
                : 'bg-blue-50 border-blue-200 text-blue-900'
            }`}>
              <span>{reached ? '💳' : 'ℹ️'}</span>
              <div>
                <p className="font-semibold">
                  {reached
                    ? `Quota mensuel atteint (${used}/${limit})`
                    : `Quota mensuel : ${used}/${limit} courses utilisées`}
                </p>
                {reached && (
                  <p className="text-xs mt-0.5">
                    Vous pouvez tout de même créer cette course — un paiement à l'unité vous sera demandé.
                  </p>
                )}
              </div>
            </div>
          )
        })()}

        <form onSubmit={handleSubmit(onSubmit)}>
          {/* COLIS */}
          <FormSection
            title="Destination"
            description="À qui et où livrer"
          >
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
          <FormSection title="Origine" description="D'où part le colis (pré-rempli depuis votre profil, modifiable)">
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
              <div className="grid grid-cols-2 gap-2">
                <div className="md:col-span-2">
                  <p className="text-sm font-medium text-gray-700 mb-1">Position sur la carte</p>
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
                    <p className="text-xs text-green-600 mt-1">✓ Position détectée automatiquement. Vous pouvez l'ajuster ci-dessus.</p>
                  )}
                  {geoStatus === 'denied' && (
                    <p className="text-xs text-amber-600 mt-1">Géolocalisation auto refusée — utilisez « Ma position actuelle » ou cliquez sur la carte.</p>
                  )}
                </div>
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
              <div className="grid grid-cols-2 gap-2">
                <div className="md:col-span-2">
                  <p className="text-sm font-medium text-gray-700 mb-1">Position sur la carte</p>
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
                  <p className="text-xs text-gray-400 mt-1">Cliquez sur la carte pour positionner.</p>
                </div>
              </div>
              <Field label="Instructions livreur" className="md:col-span-2">
                <textarea {...register('destination_instructions')} className={inputClass} rows={2} placeholder="ex: Appeler 5 min avant" />
              </Field>
            </div>
          </FormSection>

          {/* ENCAISSEMENT */}
          <FormSection title="Encaissement à la livraison" description="Le livreur doit-il encaisser de l'argent ?">
            <Field label="">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  {...register('has_collection')}
                  onClick={() => setCollectionDecided(true)}
                />
                <span>Oui, le livreur doit encaisser</span>
              </label>
            </Field>

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
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
              {apiError}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Link to="/dashboard" className="px-6 py-3 rounded-lg border border-gray-300 hover:bg-gray-50">
              Annuler
            </Link>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="bg-airmess-yellow text-airmess-dark font-bold px-6 py-3 rounded-lg hover:opacity-90 disabled:opacity-50"
            >
              {mutation.isPending ? 'Création...' : 'Créer la livraison'}
            </button>
          </div>
        </form>
      </main>

      {/* Modal encaissement : s'affiche si l'utilisateur a soumis sans avoir décidé */}
      {pendingValues && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
            <h2 className="text-xl font-bold text-airmess-dark">💰 Encaissement à la livraison ?</h2>
            <p className="text-sm text-gray-600 mt-2">
              Vous n'avez pas précisé si le livreur doit récupérer un montant à la livraison.
              Souhaitez-vous activer l'encaissement ?
            </p>
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  // Non → on confirme l'absence d'encaissement et on poursuit la création
                  setCollectionDecided(true)
                  const values = pendingValues
                  setPendingValues(null)
                  performCreate({ ...values, has_collection: false })
                }}
                className="flex-1 px-4 py-3 rounded-lg border border-gray-300 hover:bg-gray-50 font-medium"
              >
                Non, pas d'encaissement
              </button>
              <button
                type="button"
                onClick={() => {
                  // Oui → on coche, on ferme le modal, l'utilisateur complète les champs
                  setValue('has_collection', true)
                  setCollectionDecided(true)
                  setPendingValues(null)
                  // Scroll vers la section encaissement
                  setTimeout(() => {
                    document.querySelector('input[name="collection_amount"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                    ;(document.querySelector('input[name="collection_amount"]') as HTMLInputElement | null)?.focus()
                  }, 100)
                }}
                className="flex-1 bg-airmess-yellow text-airmess-dark font-bold px-4 py-3 rounded-lg hover:opacity-90"
              >
                Oui, je précise
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
