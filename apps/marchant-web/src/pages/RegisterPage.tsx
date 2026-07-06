import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, Link } from 'react-router-dom'
import { AxiosError } from 'axios'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../stores/authStore'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Highlight from '../components/Highlight'
import { cn } from '../lib/cn'
import { EyeIcon, EyeOffIcon, ArrowRightIcon } from '../components/ui/icons'
import LanguageToggle from '../components/ui/LanguageToggle'
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
  const { t } = useTranslation()
  const navigate = useNavigate()
  const registerIndividual = useAuthStore((s) => s.registerIndividual)
  const registerMarchant = useAuthStore((s) => s.registerMarchant)

  const [type, setType] = useState<AccountType>('individual')
  const [error, setError] = useState<string | null>(null)
  // Erreurs 422 par champ renvoyées par Laravel. Chaque champ récupère son
  // premier message via `serverErr(field)` en fallback des validations client.
  const [serverFieldErrors, setServerFieldErrors] = useState<Record<string, string[]>>({})
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>()

  async function onSubmit(values: RegisterFormValues) {
    setError(null)
    setServerFieldErrors({})
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
      // Messages toujours en FR : cohérence avec les messages Laravel côté API.
      if (err instanceof AxiosError) {
        const data = err.response?.data as { message?: string; errors?: Record<string, string[]> } | undefined
        setError(data?.message ?? "Erreur lors de l'inscription.")
        setServerFieldErrors(data?.errors ?? {})
      } else {
        setError('Erreur inattendue.')
      }
    }
  }

  function serverErr(field: string): string | undefined {
    return serverFieldErrors[field]?.[0]
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-cream relative">
      <div className="absolute top-4 right-4 z-10">
        <LanguageToggle variant="light" />
      </div>
      {/* ============================================================
          GAUCHE — Formulaire d'inscription
          ============================================================ */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md">
          <Link to="/" className="inline-block mb-10">
            <img src={wordmark} alt="Air Mess" className="h-8 w-auto" />
          </Link>

          <h1 className="text-h1 text-ink mb-2">{t('auth.register.title')}</h1>
          <p className="text-body-l text-warm-500 mb-8">
            {t('auth.register.subtitle')}
          </p>

          {/* Toggle Particulier / Entreprise */}
          <div className="grid grid-cols-2 gap-2 mb-6 p-1 bg-warm-100 rounded-md">
            {(['individual', 'marchant'] as const).map((kind) => (
              <button
                key={kind}
                type="button"
                onClick={() => setType(kind)}
                className={cn(
                  'py-2 rounded-md text-body-s font-semibold transition-all duration-200',
                  type === kind
                    ? 'bg-airmess-dark text-cream shadow-sm'
                    : 'text-warm-600 hover:text-ink',
                )}
              >
                {kind === 'individual' ? t('auth.register.typeIndividual') : t('auth.register.typeMarchant')}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* ====== Champs particulier ====== */}
            {type === 'individual' && (
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label={t('auth.register.firstName')}
                  placeholder={t('auth.register.firstNamePlaceholder')}
                  {...register('first_name', { required: t('auth.register.firstNameRequired') })}
                  error={errors.first_name?.message ?? serverErr('first_name')}
                />
                <Input
                  label={t('auth.register.lastName')}
                  placeholder={t('auth.register.lastNamePlaceholder')}
                  {...register('last_name', { required: t('auth.register.lastNameRequired') })}
                  error={errors.last_name?.message ?? serverErr('last_name')}
                />
              </div>
            )}

            {/* ====== Champs marchand ====== */}
            {type === 'marchant' && (
              <>
                <Input
                  label={t('auth.register.responsibleName')}
                  placeholder={t('auth.register.responsibleNamePlaceholder')}
                  {...register('name', { required: t('auth.register.responsibleNameRequired') })}
                  error={errors.name?.message ?? serverErr('name')}
                />
                <Input
                  label={t('auth.register.raisonSociale')}
                  placeholder={t('auth.register.raisonSocialePlaceholder')}
                  {...register('raison_sociale', { required: t('auth.register.raisonSocialeRequired') })}
                  error={errors.raison_sociale?.message ?? serverErr('raison_sociale')}
                />
                <div>
                  <label className="block mb-1.5 text-caption text-warm-600 font-medium">
                    {t('auth.register.sector')} <span className="text-airmess-red">*</span>
                  </label>
                  <select
                    {...register('secteur_activite', { required: t('auth.register.sectorRequired') })}
                    className={selectClass}
                    defaultValue=""
                  >
                    <option value="" disabled>{t('auth.register.sectorChoose')}</option>
                    <option value="supermarche">{t('auth.register.sectorSupermarche')}</option>
                    <option value="restaurant">{t('auth.register.sectorRestaurant')}</option>
                    <option value="boutique">{t('auth.register.sectorBoutique')}</option>
                    <option value="pharmacie">{t('auth.register.sectorPharmacie')}</option>
                    <option value="ecommerce">{t('auth.register.sectorEcommerce')}</option>
                    <option value="autre">{t('auth.register.sectorAutre')}</option>
                  </select>
                  {(errors.secteur_activite?.message || serverErr('secteur_activite')) && (
                    <p className="mt-1.5 text-caption text-airmess-red">
                      {errors.secteur_activite?.message ?? serverErr('secteur_activite')}
                    </p>
                  )}
                </div>
                <Input
                  label={t('auth.register.ifuRccm')}
                  helper={t('auth.register.ifuRccmHelper')}
                  placeholder={t('auth.register.ifuRccmPlaceholder')}
                  {...register('ifu_rccm')}
                  error={serverErr('ifu_rccm')}
                />
              </>
            )}

            {/* ====== Champs communs ====== */}
            <Input
              type="email"
              label={t('common.email')}
              placeholder={t('auth.register.emailPlaceholder')}
              {...register('email', { required: t('auth.register.emailRequired') })}
              error={errors.email?.message ?? serverErr('email')}
              autoComplete="email"
            />
            <Input
              type="tel"
              label={t('common.phone')}
              placeholder={t('auth.register.phonePlaceholder')}
              {...register('phone', { required: t('auth.register.phoneRequired') })}
              error={errors.phone?.message ?? serverErr('phone')}
              autoComplete="tel"
            />
            <Input
              type={showPassword ? 'text' : 'password'}
              label={t('common.password')}
              helper={t('auth.register.passwordHelper')}
              {...register('password', {
                required: t('auth.register.passwordRequired'),
                minLength: { value: 8, message: t('auth.register.passwordMinLength') },
              })}
              error={errors.password?.message ?? serverErr('password')}
              autoComplete="new-password"
              rightSlot={
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="p-2 text-warm-500 hover:text-ink transition-colors"
                  aria-label={showPassword ? t('common.hidePassword') : t('common.showPassword')}
                >
                  {showPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                </button>
              }
            />
            <Input
              type={showConfirmation ? 'text' : 'password'}
              label={t('common.passwordConfirm')}
              {...register('password_confirmation', { required: t('auth.register.confirmRequired') })}
              error={errors.password_confirmation?.message ?? serverErr('password_confirmation')}
              autoComplete="new-password"
              rightSlot={
                <button
                  type="button"
                  onClick={() => setShowConfirmation((v) => !v)}
                  className="p-2 text-warm-500 hover:text-ink transition-colors"
                  aria-label={showConfirmation ? t('common.hideConfirmation') : t('common.showConfirmation')}
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
              {t('auth.register.submit')}
            </Button>
          </form>

          <p className="text-center text-body-s text-warm-500 mt-8">
            {t('auth.register.alreadyRegistered')}{' '}
            <Link to="/login" className="text-ink font-semibold hover:text-airmess-red">
              {t('auth.register.loginLink')}
            </Link>
          </p>

          <div className="border-t border-warm-200 mt-6 pt-4 text-center">
            <p className="text-body-s text-warm-500">
              {t('auth.register.driverPrompt')}{' '}
              <Link to="/register/driver" className="text-ink font-semibold hover:text-airmess-red">
                {t('auth.register.driverLink')}
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
            <span className="text-eyebrow text-warm-300 uppercase">{t('auth.register.sidePanel.eyebrow')}</span>
          </div>

          <h2 className="text-display-2 leading-tight mb-10">
            {t('auth.register.sidePanel.taglineStart')}{' '}
            <Highlight>{t('auth.register.sidePanel.taglineHighlight')}</Highlight>{' '}
            {t('auth.register.sidePanel.taglineEnd')}
          </h2>

          {/* 3 bénéfices, chacun avec un numéro à la signature */}
          <div className="space-y-5">
            <Benefit number={1} title={t('auth.register.sidePanel.benefit1Title')}>
              {t('auth.register.sidePanel.benefit1Body')}
            </Benefit>
            <Benefit number={2} title={t('auth.register.sidePanel.benefit2Title')}>
              {t('auth.register.sidePanel.benefit2Body')}
            </Benefit>
            <Benefit number={3} title={t('auth.register.sidePanel.benefit3Title')}>
              {t('auth.register.sidePanel.benefit3Body')}
            </Benefit>
          </div>

          {/* Petit mark décoratif en bas */}
          <div className="mt-12 flex items-center gap-3 opacity-40">
            <img src={mark} alt="" aria-hidden className="h-6 w-auto" />
            <span className="text-caption text-warm-400">{t('auth.register.sidePanel.footer')}</span>
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
