import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, Link } from 'react-router-dom'
import { AxiosError } from 'axios'
import { useAuthStore } from '../stores/authStore'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Highlight from '../components/Highlight'
import { cn } from '../lib/cn'
import { EyeIcon, EyeOffIcon, ArrowRightIcon } from '../components/ui/icons'
import wordmark from '../assets/logo/airmess-wordmark.svg'
import mark from '../assets/logo/airmess-mark.svg'

type AccountType = 'individual' | 'marchant'

interface RegisterFormValues {
  email: string
  phone: string
  password: string
  password_confirmation: string
  first_name?: string
  last_name?: string
  gender?: 'M' | 'F' | 'autre' | ''
  name?: string
  raison_sociale?: string
  ifu_rccm?: string
  secteur_activite?: 'supermarche' | 'restaurant' | 'boutique' | 'pharmacie' | 'ecommerce' | 'autre'
}

const selectClass =
  'w-full bg-off-white border border-warm-300 rounded-md px-3 py-2.5 text-body text-ink ' +
  'transition-all duration-200 focus:outline-none focus:border-airmess-yellow focus:shadow-glow-yellow'

export default function RegisterPage() {
  const navigate = useNavigate()
  const registerIndividual = useAuthStore((s) => s.registerIndividual)
  const registerMarchant = useAuthStore((s) => s.registerMarchant)

  const [type, setType] = useState<AccountType>('individual')
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
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
          ? err.response?.data?.message ?? "Erreur lors de l'inscription."
          : 'Erreur inattendue.'
      setError(message)
    }
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-cream">
      {/* ============================================================
          GAUCHE — Formulaire d'inscription
          ============================================================ */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md">
          <Link to="/" className="inline-block mb-10">
            <img src={wordmark} alt="Air Mess" className="h-8 w-auto" />
          </Link>

          <h1 className="text-h1 text-ink mb-2">Créer un compte.</h1>
          <p className="text-body-l text-warm-500 mb-8">
            Rejoignez Air Mess en moins de 2 minutes.
          </p>

          {/* Toggle Particulier / Entreprise */}
          <div className="grid grid-cols-2 gap-2 mb-6 p-1 bg-warm-100 rounded-md">
            {(['individual', 'marchant'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={cn(
                  'py-2 rounded-md text-body-s font-semibold transition-all duration-200',
                  type === t
                    ? 'bg-airmess-dark text-cream shadow-sm'
                    : 'text-warm-600 hover:text-ink',
                )}
              >
                {t === 'individual' ? '👤 Particulier' : '🏢 Entreprise'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* ====== Champs particulier ====== */}
            {type === 'individual' && (
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Prénom"
                  placeholder="Mariam"
                  {...register('first_name', { required: 'Prénom requis' })}
                  error={errors.first_name?.message}
                />
                <Input
                  label="Nom"
                  placeholder="Tognon"
                  {...register('last_name', { required: 'Nom requis' })}
                  error={errors.last_name?.message}
                />
              </div>
            )}

            {/* ====== Champs marchand ====== */}
            {type === 'marchant' && (
              <>
                <Input
                  label="Nom du responsable"
                  placeholder="Jean Dossou"
                  {...register('name', { required: 'Nom du responsable requis' })}
                  error={errors.name?.message}
                />
                <Input
                  label="Raison sociale"
                  placeholder="Maison de Ganhi SARL"
                  {...register('raison_sociale', { required: 'Raison sociale requise' })}
                  error={errors.raison_sociale?.message}
                />
                <div>
                  <label className="block mb-1.5 text-caption text-warm-600 font-medium">
                    Secteur d'activité <span className="text-airmess-red">*</span>
                  </label>
                  <select
                    {...register('secteur_activite', { required: 'Secteur requis' })}
                    className={selectClass}
                    defaultValue=""
                  >
                    <option value="" disabled>— Choisir —</option>
                    <option value="supermarche">🛒 Supermarché</option>
                    <option value="restaurant">🍽️ Restaurant</option>
                    <option value="boutique">🛍️ Boutique</option>
                    <option value="pharmacie">💊 Pharmacie</option>
                    <option value="ecommerce">📦 E-commerce</option>
                    <option value="autre">🏷️ Autre</option>
                  </select>
                  {errors.secteur_activite && (
                    <p className="mt-1.5 text-caption text-airmess-red">
                      {errors.secteur_activite.message}
                    </p>
                  )}
                </div>
                <Input
                  label="IFU / RCCM"
                  helper="Optionnel — peut être ajouté plus tard"
                  placeholder="ex: 3201912345678"
                  {...register('ifu_rccm')}
                />
              </>
            )}

            {/* ====== Champs communs ====== */}
            <Input
              type="email"
              label="Email"
              placeholder="contact@example.com"
              {...register('email', { required: 'Email requis' })}
              error={errors.email?.message}
              autoComplete="email"
            />
            <Input
              type="tel"
              label="Téléphone"
              placeholder="+229 90 12 34 56"
              {...register('phone', { required: 'Téléphone requis' })}
              error={errors.phone?.message}
              autoComplete="tel"
            />
            <Input
              type={showPassword ? 'text' : 'password'}
              label="Mot de passe"
              helper="8 caractères minimum"
              {...register('password', {
                required: 'Mot de passe requis',
                minLength: { value: 8, message: '8 caractères minimum' },
              })}
              error={errors.password?.message}
              autoComplete="new-password"
              rightSlot={
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="p-2 text-warm-500 hover:text-ink transition-colors"
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {showPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                </button>
              }
            />
            <Input
              type={showConfirmation ? 'text' : 'password'}
              label="Confirmer le mot de passe"
              {...register('password_confirmation', { required: 'Confirmation requise' })}
              error={errors.password_confirmation?.message}
              autoComplete="new-password"
              rightSlot={
                <button
                  type="button"
                  onClick={() => setShowConfirmation((v) => !v)}
                  className="p-2 text-warm-500 hover:text-ink transition-colors"
                  aria-label={showConfirmation ? 'Masquer la confirmation' : 'Afficher la confirmation'}
                >
                  {showConfirmation ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                </button>
              }
            />

            {error && (
              <div
                role="alert"
                className="bg-danger-bg border border-airmess-red/30 text-airmess-red px-4 py-3 rounded-md text-body-s"
              >
                {error}
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              pill
              fullWidth
              loading={isSubmitting}
              rightIcon={!isSubmitting && <ArrowRightIcon size={18} />}
            >
              Créer mon compte
            </Button>
          </form>

          <p className="text-center text-body-s text-warm-500 mt-8">
            Déjà un compte ?{' '}
            <Link to="/login" className="text-ink font-semibold hover:text-airmess-red">
              Se connecter
            </Link>
          </p>

          <div className="border-t border-warm-200 mt-6 pt-4 text-center">
            <p className="text-body-s text-warm-500">
              🛵 Vous êtes livreur ?{' '}
              <Link to="/register/driver" className="text-ink font-semibold hover:text-airmess-red">
                Inscrivez-vous ici
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* ============================================================
          DROITE — Panel sombre avec proposition de valeur
          ============================================================ */}
      <div className="hidden md:flex flex-1 bg-airmess-dark text-cream p-12 items-center justify-center relative overflow-hidden">
        {/* Halo coloré ambiant */}
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-airmess-red/15 blur-3xl pointer-events-none" aria-hidden="true" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-airmess-yellow/10 blur-3xl pointer-events-none" aria-hidden="true" />

        <div className="relative max-w-md">
          <div className="flex items-center gap-3 mb-6">
            <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-airmess-red text-cream text-caption font-bold tabular-nums">
              01
            </span>
            <span className="text-eyebrow text-warm-300 uppercase">Rejoignez Air Mess</span>
          </div>

          <h2 className="text-display-2 leading-tight mb-10">
            Faites livrer vos <Highlight>commandes</Highlight> partout dans Cotonou.
          </h2>

          {/* 3 bénéfices, chacun avec un numéro à la signature */}
          <div className="space-y-5">
            <Benefit number={1} title="Inscription gratuite">
              Aucun frais d'ouverture. Vous ne payez que les livraisons effectuées.
            </Benefit>
            <Benefit number={2} title="Validation sous 24h">
              Un commercial vérifie votre dossier et active votre compte le jour même.
            </Benefit>
            <Benefit number={3} title="Réseau de livreurs vérifiés">
              Chaque livreur est identifié, formé et noté par les marchands.
            </Benefit>
          </div>

          {/* Petit mark décoratif en bas */}
          <div className="mt-12 flex items-center gap-3 opacity-40">
            <img src={mark} alt="" aria-hidden className="h-6 w-auto" />
            <span className="text-caption text-warm-400">Livraison express à Cotonou</span>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ============================================================
   Sous-composant : Benefit (un argument numéroté)
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
