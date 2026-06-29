import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, Link } from 'react-router-dom'
import { AxiosError } from 'axios'
import { useAuthStore, type RegisterDriverPayload } from '../stores/authStore'
import FormSection from '../components/FormSection'
import Field from '../components/Field'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Card from '../components/ui/Card'
import Highlight from '../components/Highlight'
import { cn } from '../lib/cn'
import wordmark from '../assets/logo/airmess-wordmark.svg'
import mark from '../assets/logo/airmess-mark.svg'

const selectClass =
  'w-full bg-off-white border border-warm-300 rounded-md px-3 py-2.5 text-body text-ink ' +
  'transition-all duration-200 focus:outline-none focus:border-airmess-yellow focus:shadow-glow-yellow'

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
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
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

  function serverErr(field: string): string | undefined {
    return serverFieldErrors[field]?.[0]
  }

  return (
    <div className="min-h-screen lg:h-screen flex flex-col lg:flex-row bg-cream overflow-x-hidden lg:overflow-hidden">
      {/* ============================================================
          GAUCHE — Panel sombre avec proposition de valeur
          Sur lg+ : pleine hauteur écran avec son propre scroll si pitch
          long. Sur mobile : flux normal en haut.
          overflow-hidden : clip les halos pour qu'ils ne débordent pas.
          ============================================================ */}
      <aside className="lg:w-2/5 xl:w-1/3 bg-airmess-dark text-cream p-8 md:p-12 lg:h-screen lg:overflow-y-auto relative overflow-hidden">
        {/* Halos colorés ambiants */}
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-airmess-yellow/10 blur-3xl pointer-events-none" aria-hidden />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-airmess-red/15 blur-3xl pointer-events-none" aria-hidden />

        <div className="relative max-w-md">
          <Link to="/" className="inline-block mb-12">
            <img src={wordmark} alt="Air Mess" className="h-8 w-auto" />
          </Link>

          <h2 className="text-display-2 leading-tight mb-3">
            Sillonnez la ville.
            <br />
            Soyez payé pour <Highlight>ça</Highlight>.
          </h2>
          <p className="text-body-l text-warm-300 mb-10">
            Rejoignez le réseau de livreurs Air Mess et commencez à accepter
            des courses dès l'activation de votre compte.
          </p>

          {/* 3 bénéfices numérotés — légitime ici, séquence d'arguments */}
          <div className="space-y-5">
            <Benefit number={1} title="Choisissez vos horaires">
              Vous travaillez quand vous voulez. Vous vous mettez en pause ou hors-ligne en un tap.
            </Benefit>
            <Benefit number={2} title="Rémunération transparente">
              Vous voyez le gain de chaque course avant d'accepter. Aucune surprise au paiement.
            </Benefit>
            <Benefit number={3} title="Paiements hebdomadaires">
              Vos gains sont versés sur votre Mobile Money chaque semaine. Retrait à la demande.
            </Benefit>
          </div>

          {/* Petit mark décoratif en bas */}
          <div className="mt-12 pt-8 border-t border-warm-600/30 flex items-center gap-3 opacity-50">
            <img src={mark} alt="" aria-hidden className="h-6 w-auto" />
            <span className="text-caption text-warm-400">Livraison express à Cotonou</span>
          </div>
        </div>
      </aside>

      {/* ============================================================
          DROITE — Formulaire d'inscription
          Sur lg+ : zone scrollable autonome (la page ne scrolle pas).
          ============================================================ */}
      <div className="flex-1 px-4 md:px-8 lg:px-12 py-8 md:py-12 lg:h-screen lg:overflow-y-auto">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-h1 text-ink mb-2">Devenir livreur Air Mess.</h1>
          <p className="text-body-l text-warm-500 mb-8">
            Remplissez ce formulaire — nos équipes vérifient vos documents sous 48h.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* ====================== IDENTITÉ ====================== */}
            <FormSection title="🪪 Votre identité" description="Tel que sur votre pièce d'identité.">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Prénom"
                  {...register('first_name', { required: 'Prénom requis' })}
                  error={errors.first_name?.message ?? serverErr('first_name')}
                />
                <Input
                  label="Nom"
                  {...register('last_name', { required: 'Nom requis' })}
                  error={errors.last_name?.message ?? serverErr('last_name')}
                />
                <Field label="Genre *" error={errors.gender?.message ?? serverErr('gender')}>
                  <select
                    {...register('gender', { required: 'Genre requis' })}
                    className={selectClass}
                    defaultValue=""
                  >
                    <option value="" disabled>— Sélectionner —</option>
                    <option value="M">Homme</option>
                    <option value="F">Femme</option>
                    <option value="autre">Autre</option>
                  </select>
                </Field>
                <Input
                  type="date"
                  label="Date de naissance"
                  helper="16 ans minimum"
                  max={MAX_BIRTH_DATE}
                  {...register('birth_date', { required: 'Date requise' })}
                  error={errors.birth_date?.message ?? serverErr('birth_date')}
                />
              </div>
            </FormSection>

            {/* ====================== COMPTE ====================== */}
            <FormSection title="🔐 Votre compte" description="Vos identifiants de connexion à l'app livreur.">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  type="email"
                  label="Email"
                  autoComplete="email"
                  {...register('email', { required: 'Email requis' })}
                  error={errors.email?.message ?? serverErr('email')}
                />
                <Input
                  type="tel"
                  label="Téléphone"
                  placeholder="+229 90 12 34 56"
                  autoComplete="tel"
                  {...register('phone', { required: 'Téléphone requis' })}
                  error={errors.phone?.message ?? serverErr('phone')}
                />
                <Input
                  type="password"
                  label="Mot de passe"
                  helper="8 caractères minimum"
                  autoComplete="new-password"
                  {...register('password', {
                    required: 'Mot de passe requis',
                    minLength: { value: 8, message: '8 caractères minimum' },
                  })}
                  error={errors.password?.message ?? serverErr('password')}
                />
                <Input
                  type="password"
                  label="Confirmer le mot de passe"
                  autoComplete="new-password"
                  {...register('password_confirmation', { required: 'Confirmation requise' })}
                  error={errors.password_confirmation?.message}
                />
              </div>
            </FormSection>

            {/* ====================== VÉHICULE ====================== */}
            <FormSection title="🛵 Votre véhicule">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Field label="Type *" error={errors.vehicle_type?.message ?? serverErr('vehicle_type')}>
                  <select
                    {...register('vehicle_type', { required: 'Type requis' })}
                    className={selectClass}
                    defaultValue=""
                  >
                    <option value="" disabled>— Sélectionner —</option>
                    <option value="moto">🛵 Moto</option>
                    <option value="scooter">🛴 Scooter</option>
                    <option value="voiture">🚗 Voiture</option>
                    <option value="velo">🚲 Vélo</option>
                  </select>
                </Field>
                <Input
                  label="Plaque"
                  {...register('vehicle_plate', { required: 'Plaque requise' })}
                  error={errors.vehicle_plate?.message ?? serverErr('vehicle_plate')}
                />
                <Input
                  label="Couleur"
                  helper="Optionnel"
                  placeholder="ex: Rouge"
                  {...register('vehicle_color')}
                />
              </div>
            </FormSection>

            {/* ====================== ÉQUIPEMENT ====================== */}
            <FormSection
              title="🎒 Votre équipement"
              description="Permet de matcher avec des courses spécifiques (restauration, livraisons fraîches…)."
            >
              <div className="space-y-2">
                <CheckboxRow {...register('equipment_isothermal_bag')} icon="🍱" label="Sac isotherme" />
                <CheckboxRow {...register('equipment_top_case')} icon="📦" label="Top case" />
                <CheckboxRow {...register('equipment_refrigerated_bag')} icon="❄️" label="Sac réfrigéré" />
              </div>
            </FormSection>

            {/* ====================== CONTACT D'URGENCE ====================== */}
            <FormSection
              title="🆘 Contact d'urgence"
              description="Personne à prévenir en cas d'accident ou d'incident pendant une course."
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Nom"
                  {...register('emergency_contact_name', { required: 'Nom du contact requis' })}
                  error={errors.emergency_contact_name?.message ?? serverErr('emergency_contact_name')}
                />
                <Input
                  type="tel"
                  label="Téléphone"
                  placeholder="+229 90 12 34 56"
                  {...register('emergency_contact_phone', { required: 'Téléphone du contact requis' })}
                  error={errors.emergency_contact_phone?.message ?? serverErr('emergency_contact_phone')}
                />
              </div>
            </FormSection>

            {/* ====================== DOCUMENTS ====================== */}
            <FormSection
              title="📄 Vos documents"
              description="CNI et permis sont obligatoires. Photo de profil optionnelle."
            >
              <div className="space-y-3">
                <FileDropZone
                  label="Photo de profil"
                  helper="Optionnel · JPG/PNG · max 2 Mo · min 200×200"
                  accept="image/jpeg,image/png"
                  file={photo}
                  onChange={setPhoto}
                  error={serverErr('photo')}
                />
                <FileDropZone
                  label="CNI"
                  required
                  helper="JPG/PNG/PDF · max 5 Mo"
                  accept="image/jpeg,image/png,application/pdf"
                  file={cni}
                  onChange={setCni}
                  error={serverErr('cni')}
                />
                <FileDropZone
                  label="Permis de conduire"
                  required
                  helper="JPG/PNG/PDF · max 5 Mo"
                  accept="image/jpeg,image/png,application/pdf"
                  file={drivingLicense}
                  onChange={setDrivingLicense}
                  error={serverErr('driving_license')}
                />
              </div>
              {fileError && (
                <p className="mt-4 text-body-s text-airmess-red bg-danger-bg border border-airmess-red/30 px-3 py-2 rounded-md">
                  ⚠️ {fileError}
                </p>
              )}
            </FormSection>

            {/* ====================== ERREUR GLOBALE ====================== */}
            {serverError && (
              <div
                role="alert"
                className="bg-danger-bg border border-airmess-red/30 text-airmess-red px-4 py-3 rounded-md text-body-s"
              >
                ⚠️ {serverError}
              </div>
            )}

            {/* ====================== SUBMIT ====================== */}
            <Card variant="default" padding="md" className="mt-6">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                pill
                fullWidth
                loading={isSubmitting}
                rightIcon={!isSubmitting && <span aria-hidden>→</span>}
              >
                Soumettre ma candidature
              </Button>
              <p className="text-center text-body-s text-warm-500 mt-4">
                Déjà inscrit ?{' '}
                <Link to="/login" className="text-ink font-semibold hover:text-airmess-red">
                  Se connecter
                </Link>
              </p>
            </Card>
          </form>
        </div>
      </div>
    </div>
  )
}

/* ============================================================
   Sous-composant : Benefit (panel sombre gauche)
   ============================================================ */
interface BenefitProps {
  number: number
  title: string
  children: React.ReactNode
}

function Benefit({ number, title, children }: BenefitProps) {
  return (
    <div className="flex gap-4">
      <span className="shrink-0 inline-flex items-center justify-center h-8 w-8 rounded-full bg-airmess-yellow text-ink text-caption font-bold tabular-nums">
        {String(number).padStart(2, '0')}
      </span>
      <div>
        <h3 className="text-body font-bold text-cream">{title}</h3>
        <p className="text-body-s text-warm-300 mt-1">{children}</p>
      </div>
    </div>
  )
}

/* ============================================================
   Sous-composant : CheckboxRow
   ============================================================ */
interface CheckboxRowProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  icon: string
}

const CheckboxRow = (() => {
  return function CheckboxRow({ label, icon, ...inputProps }: CheckboxRowProps) {
    return (
      <label className="flex items-center gap-3 px-3 py-2.5 bg-off-white border border-warm-200 rounded-md hover:border-warm-400 cursor-pointer transition-colors">
        <input
          type="checkbox"
          {...inputProps}
          className="h-4 w-4 accent-airmess-yellow"
        />
        <span className="text-h3 leading-none" aria-hidden>{icon}</span>
        <span className="text-body text-ink">{label}</span>
      </label>
    )
  }
})()

/* ============================================================
   Sous-composant : FileDropZone
   Drop-zone visuelle pour les uploads — état vide / rempli
   ============================================================ */
interface FileDropZoneProps {
  label: string
  helper?: string
  required?: boolean
  accept: string
  file: File | null
  onChange: (f: File | null) => void
  error?: string
}

function FileDropZone({ label, helper, required, accept, file, onChange, error }: FileDropZoneProps) {
  const inputId = `file-${label.replace(/\s+/g, '-').toLowerCase()}`
  const isImage = file && file.type.startsWith('image/')

  return (
    <div>
      <label htmlFor={inputId} className="block mb-1.5 text-caption text-warm-600 font-medium">
        {label} {required && <span className="text-airmess-red">*</span>}
      </label>

      <label
        htmlFor={inputId}
        className={cn(
          'flex items-center gap-3 px-4 py-3 rounded-md cursor-pointer transition-all duration-200',
          file
            ? 'bg-success-bg border border-success/30'
            : 'bg-off-white border border-dashed border-warm-300 hover:border-airmess-yellow hover:bg-airmess-yellow/5',
          error && 'border-airmess-red bg-danger-bg!',
        )}
      >
        <span className="text-h3 leading-none shrink-0" aria-hidden>
          {file ? (isImage ? '🖼' : '📄') : '📎'}
        </span>
        <div className="flex-1 min-w-0">
          {file ? (
            <>
              <p className="text-body-s font-medium text-success truncate">{file.name}</p>
              <p className="text-caption text-warm-500">
                {(file.size / 1024).toFixed(0)} Ko · cliquez pour remplacer
              </p>
            </>
          ) : (
            <>
              <p className="text-body-s font-medium text-ink">Cliquez pour sélectionner un fichier</p>
              {helper && <p className="text-caption text-warm-500">{helper}</p>}
            </>
          )}
        </div>
        {file && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              onChange(null)
            }}
            className="shrink-0 text-warm-500 hover:text-airmess-red text-body-s"
            aria-label="Retirer le fichier"
          >
            ✕
          </button>
        )}
      </label>

      <input
        id={inputId}
        type="file"
        accept={accept}
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
        className="hidden"
      />

      {error && <p className="mt-1.5 text-caption text-airmess-red">{error}</p>}
    </div>
  )
}
