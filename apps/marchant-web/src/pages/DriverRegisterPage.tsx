import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, Link } from 'react-router-dom'
import { AxiosError } from 'axios'
import { useAuthStore, type RegisterDriverPayload } from '../stores/authStore'

const inputClass =
  'w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-airmess-yellow focus:border-transparent outline-none'
const labelClass = 'block text-sm font-medium text-gray-700 mb-1'
const sectionClass = 'bg-white rounded-2xl p-6 shadow-sm'

// Date max acceptée pour birth_date : il y a exactement 16 ans, jour pour jour.
const MAX_BIRTH_DATE = (() => {
  const d = new Date()
  d.setFullYear(d.getFullYear() - 16)
  return d.toISOString().split('T')[0]
})()

type FormValues = Omit<RegisterDriverPayload, 'photo' | 'cni' | 'driving_license'>

export default function DriverRegisterPage() {
  const navigate = useNavigate()
  const registerDriver = useAuthStore((s) => s.registerDriver)

  const [photo, setPhoto] = useState<File | null>(null)
  const [cni, setCni] = useState<File | null>(null)
  const [drivingLicense, setDrivingLicense] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const [serverFieldErrors, setServerFieldErrors] = useState<Record<string, string[]>>({})

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>()

  async function onSubmit(values: FormValues) {
    setServerError(null)
    setFileError(null)
    setServerFieldErrors({})

    if (!cni || !drivingLicense) {
      setFileError('La CNI et le permis sont obligatoires.')
      return
    }

    try {
      await registerDriver({
        ...values,
        photo,
        cni,
        driving_license: drivingLicense,
      })
      navigate('/register/driver/success')
    } catch (err) {
      if (err instanceof AxiosError) {
        const data = err.response?.data as { message?: string; errors?: Record<string, string[]> } | undefined
        setServerError(data?.message ?? "Erreur lors de l'inscription.")
        setServerFieldErrors(data?.errors ?? {})
      } else {
        setServerError('Erreur inattendue.')
      }
    }
  }

  function showServerError(field: string): string | undefined {
    return serverFieldErrors[field]?.[0]
  }

  return (
    <div className="min-h-screen bg-airmess-dark py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-white">Devenir livreur Air Mess</h1>
          <p className="text-gray-300 mt-2">
            Remplissez ce formulaire — nos équipes vérifient vos documents sous 48h.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Section 1 — Identité */}
          <section className={sectionClass}>
            <h2 className="text-lg font-bold mb-4 text-airmess-dark">🪪 Votre identité</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Prénom *</label>
                <input {...register('first_name', { required: 'Prénom requis' })} className={inputClass} />
                {(errors.first_name || showServerError('first_name')) && (
                  <p className="text-xs text-red-600 mt-1">{errors.first_name?.message ?? showServerError('first_name')}</p>
                )}
              </div>
              <div>
                <label className={labelClass}>Nom *</label>
                <input {...register('last_name', { required: 'Nom requis' })} className={inputClass} />
                {(errors.last_name || showServerError('last_name')) && (
                  <p className="text-xs text-red-600 mt-1">{errors.last_name?.message ?? showServerError('last_name')}</p>
                )}
              </div>
              <div>
                <label className={labelClass}>Genre *</label>
                <select {...register('gender', { required: 'Genre requis' })} className={inputClass} defaultValue="">
                  <option value="" disabled>Sélectionner…</option>
                  <option value="M">Homme</option>
                  <option value="F">Femme</option>
                  <option value="autre">Autre</option>
                </select>
                {(errors.gender || showServerError('gender')) && (
                  <p className="text-xs text-red-600 mt-1">{errors.gender?.message ?? showServerError('gender')}</p>
                )}
              </div>
              <div>
                <label className={labelClass}>Date de naissance * <span className="text-gray-400">(16 ans minimum)</span></label>
                <input
                  type="date"
                  max={MAX_BIRTH_DATE}
                  {...register('birth_date', { required: 'Date requise' })}
                  className={inputClass}
                />
                {(errors.birth_date || showServerError('birth_date')) && (
                  <p className="text-xs text-red-600 mt-1">{errors.birth_date?.message ?? showServerError('birth_date')}</p>
                )}
              </div>
            </div>
          </section>

          {/* Section 2 — Compte */}
          <section className={sectionClass}>
            <h2 className="text-lg font-bold mb-4 text-airmess-dark">🔐 Votre compte</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Email *</label>
                <input type="email" {...register('email', { required: 'Email requis' })} className={inputClass} />
                {(errors.email || showServerError('email')) && (
                  <p className="text-xs text-red-600 mt-1">{errors.email?.message ?? showServerError('email')}</p>
                )}
              </div>
              <div>
                <label className={labelClass}>Téléphone *</label>
                <input {...register('phone', { required: 'Téléphone requis' })} placeholder="+229..." className={inputClass} />
                {(errors.phone || showServerError('phone')) && (
                  <p className="text-xs text-red-600 mt-1">{errors.phone?.message ?? showServerError('phone')}</p>
                )}
              </div>
              <div>
                <label className={labelClass}>Mot de passe * <span className="text-gray-400">(8 caractères mini)</span></label>
                <input
                  type="password"
                  {...register('password', { required: 'Mot de passe requis', minLength: { value: 8, message: '8 caractères minimum' } })}
                  className={inputClass}
                />
                {(errors.password || showServerError('password')) && (
                  <p className="text-xs text-red-600 mt-1">{errors.password?.message ?? showServerError('password')}</p>
                )}
              </div>
              <div>
                <label className={labelClass}>Confirmer le mot de passe *</label>
                <input
                  type="password"
                  {...register('password_confirmation', { required: 'Confirmation requise' })}
                  className={inputClass}
                />
                {errors.password_confirmation && (
                  <p className="text-xs text-red-600 mt-1">{errors.password_confirmation.message}</p>
                )}
              </div>
            </div>
          </section>

          {/* Section 3 — Véhicule */}
          <section className={sectionClass}>
            <h2 className="text-lg font-bold mb-4 text-airmess-dark">🛵 Votre véhicule</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className={labelClass}>Type *</label>
                <select {...register('vehicle_type', { required: 'Type requis' })} className={inputClass} defaultValue="">
                  <option value="" disabled>Sélectionner…</option>
                  <option value="moto">Moto</option>
                  <option value="scooter">Scooter</option>
                  <option value="voiture">Voiture</option>
                  <option value="velo">Vélo</option>
                </select>
                {(errors.vehicle_type || showServerError('vehicle_type')) && (
                  <p className="text-xs text-red-600 mt-1">{errors.vehicle_type?.message ?? showServerError('vehicle_type')}</p>
                )}
              </div>
              <div>
                <label className={labelClass}>Plaque *</label>
                <input {...register('vehicle_plate', { required: 'Plaque requise' })} className={inputClass} />
                {(errors.vehicle_plate || showServerError('vehicle_plate')) && (
                  <p className="text-xs text-red-600 mt-1">{errors.vehicle_plate?.message ?? showServerError('vehicle_plate')}</p>
                )}
              </div>
              <div>
                <label className={labelClass}>Couleur <span className="text-gray-400">(optionnel)</span></label>
                <input {...register('vehicle_color')} className={inputClass} placeholder="ex: Rouge" />
              </div>
            </div>
          </section>

          {/* Section 4 — Équipement */}
          <section className={sectionClass}>
            <h2 className="text-lg font-bold mb-4 text-airmess-dark">🎒 Votre équipement</h2>
            <p className="text-sm text-gray-500 mb-3">Pour matcher avec des courses qui en ont besoin (ex : sac isotherme pour la restauration).</p>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" {...register('equipment_isothermal_bag')} className="w-4 h-4" />
                <span className="text-sm">Sac isotherme</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" {...register('equipment_top_case')} className="w-4 h-4" />
                <span className="text-sm">Top case</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" {...register('equipment_refrigerated_bag')} className="w-4 h-4" />
                <span className="text-sm">Sac réfrigéré</span>
              </label>
            </div>
          </section>

          {/* Section 5 — Contact d'urgence */}
          <section className={sectionClass}>
            <h2 className="text-lg font-bold mb-4 text-airmess-dark">🆘 Contact d'urgence</h2>
            <p className="text-sm text-gray-500 mb-3">Personne à prévenir en cas d'accident ou d'incident pendant une course.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Nom *</label>
                <input
                  {...register('emergency_contact_name', { required: 'Nom du contact requis' })}
                  className={inputClass}
                />
                {(errors.emergency_contact_name || showServerError('emergency_contact_name')) && (
                  <p className="text-xs text-red-600 mt-1">
                    {errors.emergency_contact_name?.message ?? showServerError('emergency_contact_name')}
                  </p>
                )}
              </div>
              <div>
                <label className={labelClass}>Téléphone *</label>
                <input
                  {...register('emergency_contact_phone', { required: 'Téléphone du contact requis' })}
                  placeholder="+229..."
                  className={inputClass}
                />
                {(errors.emergency_contact_phone || showServerError('emergency_contact_phone')) && (
                  <p className="text-xs text-red-600 mt-1">
                    {errors.emergency_contact_phone?.message ?? showServerError('emergency_contact_phone')}
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* Section 6 — Documents */}
          <section className={sectionClass}>
            <h2 className="text-lg font-bold mb-4 text-airmess-dark">📄 Vos documents</h2>
            <p className="text-sm text-gray-500 mb-3">
              CNI et permis sont obligatoires. Photo de profil optionnelle.
            </p>
            <div className="space-y-3">
              <div>
                <label className={labelClass}>Photo de profil <span className="text-gray-400">(optionnel, JPG/PNG, max 2 Mo, min 200×200)</span></label>
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
                  className="w-full text-sm"
                />
                {showServerError('photo') && <p className="text-xs text-red-600 mt-1">{showServerError('photo')}</p>}
              </div>
              <div>
                <label className={labelClass}>CNI * <span className="text-gray-400">(JPG/PNG/PDF, max 5 Mo)</span></label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,application/pdf"
                  onChange={(e) => setCni(e.target.files?.[0] ?? null)}
                  className="w-full text-sm"
                />
                {showServerError('cni') && <p className="text-xs text-red-600 mt-1">{showServerError('cni')}</p>}
              </div>
              <div>
                <label className={labelClass}>Permis de conduire * <span className="text-gray-400">(JPG/PNG/PDF, max 5 Mo)</span></label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,application/pdf"
                  onChange={(e) => setDrivingLicense(e.target.files?.[0] ?? null)}
                  className="w-full text-sm"
                />
                {showServerError('driving_license') && <p className="text-xs text-red-600 mt-1">{showServerError('driving_license')}</p>}
              </div>
              {fileError && <p className="text-sm text-red-600">{fileError}</p>}
            </div>
          </section>

          {/* Erreur globale du serveur */}
          {serverError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              ⚠️ {serverError}
            </div>
          )}

          {/* Bouton submit */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-airmess-yellow text-airmess-dark font-bold py-3 rounded-lg hover:opacity-90 transition disabled:opacity-50"
            >
              {isSubmitting ? 'Envoi en cours…' : 'Soumettre ma candidature'}
            </button>
            <p className="text-center text-sm text-gray-500 mt-3">
              Déjà inscrit ?{' '}
              <Link to="/login" className="text-airmess-dark font-semibold hover:underline">
                Se connecter
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}
