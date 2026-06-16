import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, Link } from 'react-router-dom'
import { AxiosError } from 'axios'
import { useAuthStore } from '../stores/authStore'


type AccountType = 'individual' | 'marchant'

// Tous les champs possibles des deux formulaires (les optionnels = '?')
interface RegisterFormValues {
  email: string
  phone: string
  password: string
  password_confirmation: string
  // particulier
  first_name?: string
  last_name?: string
  gender?: 'M' | 'F' | 'autre' | ''
  // marchand
  name?: string
  raison_sociale?: string
  ifu_rccm?: string
  secteur_activite?: 'supermarche' | 'restaurant' | 'boutique' | 'pharmacie' | 'ecommerce' | 'autre'
}

const inputClass =
  'w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-airmess-yellow focus:border-transparent outline-none'

  export default function RegisterPage() {
    const navigate = useNavigate()
    const registerIndividual = useAuthStore((s) => s.registerIndividual)
    const registerMarchant = useAuthStore((s) => s.registerMarchant)
  
    const [type, setType] = useState<AccountType>('individual')
    const [error, setError] = useState<string | null>(null)
    const {
      register,
      handleSubmit,
      formState: { errors, isSubmitting },
    } = useForm<RegisterFormValues>()
  
    async function onSubmit(values: RegisterFormValues) {
      setError(null)
      try {
        if (type === 'individual') {
          await registerIndividual({
            first_name: values.first_name!,
            last_name: values.last_name!,
            email: values.email,
            phone: values.phone,
            password: values.password,
            password_confirmation: values.password_confirmation,
            gender: values.gender || undefined,
          })
        } else {
          await registerMarchant({
            name: values.name!,
            email: values.email,
            phone: values.phone,
            password: values.password,
            password_confirmation: values.password_confirmation,
            raison_sociale: values.raison_sociale!,
            secteur_activite: values.secteur_activite!,
            ifu_rccm: values.ifu_rccm || undefined,
          })
        }
        navigate('/dashboard')
      } catch (err) {
        const message =
          err instanceof AxiosError
            ? err.response?.data?.message ?? 'Erreur lors de l\'inscription.'
            : 'Erreur inattendue.'
        setError(message)
      }
    }
  

  return (
    <div className="min-h-screen flex items-center justify-center bg-airmess-dark p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-airmess-dark">Créer un compte</h1>
          <p className="text-gray-500 mt-1">Air Mess</p>
        </div>

        {/* Sélecteur de type */}
        <div className="flex gap-2 mb-6">
          <button
            type="button"
            onClick={() => setType('individual')}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold border ${
              type === 'individual'
                ? 'bg-airmess-dark text-white border-airmess-dark'
                : 'bg-white text-gray-600 border-gray-200'
            }`}
          >
            Particulier
          </button>
          <button
            type="button"
            onClick={() => setType('marchant')}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold border ${
              type === 'marchant'
                ? 'bg-airmess-dark text-white border-airmess-dark'
                : 'bg-white text-gray-600 border-gray-200'
            }`}
          >
            Entreprise
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          {/* Champs particulier */}
          {type === 'individual' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <input {...register('first_name', { required: 'Prénom requis' })} placeholder="Prénom" className={inputClass} />
                {errors.first_name && <p className="text-xs text-red-600 mt-1">{errors.first_name.message}</p>}
              </div>
              <div>
                <input {...register('last_name', { required: 'Nom requis' })} placeholder="Nom" className={inputClass} />
                {errors.last_name && <p className="text-xs text-red-600 mt-1">{errors.last_name.message}</p>}
              </div>
            </div>
          )}

          {/* Champs marchand */}
          {type === 'marchant' && (
            <>
              <div>
                <input {...register('name', { required: 'Nom du responsable requis' })} placeholder="Nom du responsable" className={inputClass} />
                {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name.message}</p>}
              </div>
              <div>
                <input {...register('raison_sociale', { required: 'Raison sociale requise' })} placeholder="Raison sociale" className={inputClass} />
                {errors.raison_sociale && <p className="text-xs text-red-600 mt-1">{errors.raison_sociale.message}</p>}
              </div>
              <div>
                <select {...register('secteur_activite', { required: 'Secteur requis' })} className={inputClass} defaultValue="">
                  <option value="" disabled>Secteur d'activité…</option>
                  <option value="supermarche">Supermarché</option>
                  <option value="restaurant">Restaurant</option>
                  <option value="boutique">Boutique</option>
                  <option value="pharmacie">Pharmacie</option>
                  <option value="ecommerce">E-commerce</option>
                  <option value="autre">Autre</option>
                </select>
                {errors.secteur_activite && <p className="text-xs text-red-600 mt-1">{errors.secteur_activite.message}</p>}
              </div>
              <input {...register('ifu_rccm')} placeholder="IFU / RCCM (optionnel)" className={inputClass} />
            </>
          )}

          {/* Champs communs */}
          <div>
            <input type="email" {...register('email', { required: 'Email requis' })} placeholder="Email" className={inputClass} />
            {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>}
          </div>
          <div>
            <input {...register('phone', { required: 'Téléphone requis' })} placeholder="Téléphone" className={inputClass} />
            {errors.phone && <p className="text-xs text-red-600 mt-1">{errors.phone.message}</p>}
          </div>
          <div>
            <input type="password" {...register('password', { required: 'Mot de passe requis', minLength: { value: 8, message: '8 caractères minimum' } })} placeholder="Mot de passe" className={inputClass} />
            {errors.password && <p className="text-xs text-red-600 mt-1">{errors.password.message}</p>}
          </div>
          <div>
            <input type="password" {...register('password_confirmation', { required: 'Confirmation requise' })} placeholder="Confirmer le mot de passe" className={inputClass} />
            {errors.password_confirmation && <p className="text-xs text-red-600 mt-1">{errors.password_confirmation.message}</p>}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-airmess-yellow text-airmess-dark font-bold py-3 rounded-lg hover:opacity-90 transition disabled:opacity-50"
          >
            {isSubmitting ? 'Création…' : 'Créer mon compte'}
          </button>
        </form>
        
        <p className="text-center text-sm text-gray-500 mt-6">
          Déjà un compte ?{' '}
          <Link to="/login" className="text-airmess-dark font-semibold hover:underline">
            Se connecter
          </Link>
        </p>

        <div className="border-t border-gray-100 mt-6 pt-4 text-center">
          <p className="text-sm text-gray-500">
            🛵 Vous êtes livreur ?{' '}
            <Link to="/register/driver" className="text-airmess-dark font-semibold hover:underline">
              Inscrivez-vous ici
            </Link>
          </p>
        </div>

      </div>
    </div>
  )
}
