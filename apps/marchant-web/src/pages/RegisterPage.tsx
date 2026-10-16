import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { AxiosError } from 'axios'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../stores/authStore'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Highlight from '../components/Highlight'
import { signInWithGoogle } from '../lib/firebase'
import { EyeIcon, EyeOffIcon, ArrowRightIcon, GoogleIcon, CheckIcon, StoreIcon, UserIcon } from '../components/ui/icons'
import LanguageToggle from '../components/ui/LanguageToggle'
import AuthSupportFooter from '../components/AuthSupportFooter'
import InstallPwaButton from '../components/InstallPwaButton'
import TermsCheckbox from '../components/TermsCheckbox'
import wordmark from '../assets/logo/airmess-wordmark.svg'
import mark from '../assets/logo/airmess-mark.svg'
import { fetchWaitlistActivation } from '../api/waitlist'

type AccountType = 'individual' | 'marchant'

interface RegisterFormValues {
  email: string
  phone: string
  password: string
  password_confirmation: string
  email_code: string
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
  const [searchParams, setSearchParams] = useSearchParams()
  const activationToken = searchParams.get('activation') ?? ''
  const registerIndividual = useAuthStore((s) => s.registerIndividual)
  const registerMarchant = useAuthStore((s) => s.registerMarchant)
  const sendRegistrationEmailCode = useAuthStore((s) => s.sendRegistrationEmailCode)

  // Le type de compte vient de l'adresse (?type=marchant|individual) : tant qu'il
  // n'est pas choisi, on affiche l'écran de choix au lieu d'un formulaire par défaut
  // (beaucoup de commerçants remplissaient le formulaire particulier sans voir l'onglet).
  // Le lien d'activation d'une candidature est toujours un compte marchand.
  const typeParam = searchParams.get('type')
  const type: AccountType | null = activationToken
    ? 'marchant'
    : typeParam === 'marchant' || typeParam === 'individual'
      ? typeParam
      : null

  // Nouvelle entrée d'historique : le bouton « retour » ramène à l'écran de choix.
  function chooseType(kind: AccountType | null) {
    setError(null)
    setServerFieldErrors({})
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (kind) next.set('type', kind)
      else next.delete('type')
      return next
    })
  }
  const [error, setError] = useState<string | null>(null)
  // Erreurs 422 par champ renvoyées par Laravel. Chaque champ récupère son
  // premier message via `serverErr(field)` en fallback des validations client.
  const [serverFieldErrors, setServerFieldErrors] = useState<Record<string, string[]>>({})
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [showTermsError, setShowTermsError] = useState(false)
  // Connexion Google (optionnelle) : jeton + email prouvé, champ email verrouillé.
  const [googleToken, setGoogleToken] = useState<string | null>(null)
  const [googleEmail, setGoogleEmail] = useState<string | null>(null)
  const [googleBusy, setGoogleBusy] = useState(false)
  // Code de confirmation email : envoye avant la creation du compte.
  const [codeSentTo, setCodeSentTo] = useState<string | null>(null)
  const [codeBusy, setCodeBusy] = useState(false)

  // D-07 : la vérification email ne concerne plus les marchands — le code de
  // confirmation n'est demandé qu'aux particuliers.
  const emailCodeRequired = type === 'individual'

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>()

  useEffect(() => {
    if (!activationToken) return
    void fetchWaitlistActivation(activationToken)
      .then((prefill) => {
        if (prefill.kind !== 'merchant') throw new Error('wrong_kind')
        if (prefill.email) setValue('email', prefill.email)
        if (prefill.phone) setValue('phone', prefill.phone)
        if (prefill.name) setValue('name', prefill.name)
        if (prefill.raison_sociale) setValue('raison_sociale', prefill.raison_sociale)
        if (prefill.secteur_activite) setValue('secteur_activite', prefill.secteur_activite)
      })
      .catch(() => setError("Ce lien d'activation est invalide, expiré ou déjà utilisé."))
  }, [activationToken, setValue])

  async function handleGoogle() {
    setError(null)
    setGoogleBusy(true)
    try {
      const result = await signInWithGoogle()
      setGoogleToken(result.idToken)
      setGoogleEmail(result.email)
      // Pré-remplissage : email (verrouillé) + nom selon le type de compte.
      setValue('email', result.email, { shouldValidate: true })
      if (result.firstName && !watch('first_name')) setValue('first_name', result.firstName)
      if (result.lastName && !watch('last_name')) setValue('last_name', result.lastName)
      if (result.displayName && !watch('name')) setValue('name', result.displayName)
    } catch (err) {
      const code = (err as { code?: string })?.code ?? ''
      // Trace complète pour diagnostiquer (popup bloquée, cookies tiers, domaine…).
      console.error('[RegisterPage] Google sign-in error:', code, err)
      // Popup fermée par l'utilisateur = pas une erreur à afficher.
      if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') {
        setError(`${t('auth.register.googleError')}${code ? ` (${code})` : ''}`)
      }
    } finally {
      setGoogleBusy(false)
    }
  }

  function clearGoogle() {
    setGoogleToken(null)
    setGoogleEmail(null)
  }

  /**
   * Envoie le code de confirmation a l'email saisi. Seule voie de
   * confirmation de l'inscription (hors connexion Google, qui prouve deja
   * l'adresse).
   */
  async function handleSendCode() {
    setError(null)

    const emailIsValid = await trigger('email')
    const email = (getValues('email') ?? '').trim()
    if (!emailIsValid || !email) return

    setCodeBusy(true)
    try {
      await sendRegistrationEmailCode(email, type === 'marchant' ? getValues('name') : undefined)
      setCodeSentTo(email)
    } catch (err) {
      if (err instanceof AxiosError) {
        const data = err.response?.data as { message?: string; errors?: Record<string, string[]> } | undefined
        setError(data?.message ?? t('auth.register.emailCodeError'))
        setServerFieldErrors(data?.errors ?? {})
      } else {
        setError(t('auth.register.emailCodeError'))
      }
    } finally {
      setCodeBusy(false)
    }
  }

  async function onSubmit(values: RegisterFormValues) {
    if (!type) return
    setError(null)
    setServerFieldErrors({})
    if (!acceptedTerms) {
      setShowTermsError(true)
      return
    }
    // Sécurité : le jeton Google ne vaut que pour l'email prouvé par Google.
    const googleStillValid = googleToken && googleEmail?.toLowerCase() === values.email.toLowerCase()
    try {
      if (type === 'individual') {
        await registerIndividual({
          first_name: values.first_name!,
          last_name: values.last_name!,
          email: values.email,
          phone: values.phone,
          password: values.password,
          password_confirmation: values.password_confirmation,
          email_code: googleStillValid ? undefined : values.email_code,
          gender: values.gender || undefined,
          firebase_google_id_token: googleStillValid ? googleToken : undefined,
          accepted_terms: true,
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
          firebase_google_id_token: googleStillValid ? googleToken : undefined,
          accepted_terms: true,
          activation_token: activationToken || undefined,
        })
      }
      navigate('/dashboard', {
        replace: true,
        state: {
          showWelcomeBonus: type === 'individual',
          showMerchantBonus: type === 'marchant' && Boolean(activationToken),
        },
      })
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
          {/* Logo */}
          <Link to="/" className="inline-block mb-10">
            <img src={wordmark} alt="AirMess" className="h-8 w-auto" />
          </Link>

          <h1 className="text-h1 text-ink mb-2">{t('auth.register.title')}</h1>
          <p className="text-body-l text-warm-500 mb-6">
            {t('auth.register.subtitle')}
          </p>

          {/* Installation PWA — bloc autonome (pas de collision avec le sélecteur
              de langue en absolute sur mobile). Rendu seulement si proposé. */}
          <InstallPwaButton variant="light" className="mb-6" />

          {/* Étape 1 : choix explicite du type de compte, avant tout formulaire. */}
          {!type && <AccountTypeChoice onChoose={chooseType} />}

          {type && (
          <>
          {/* Rappel du type choisi + retour au choix (sauf lien d'activation marchand) */}
          <div className="mb-6 flex items-center justify-between gap-3 rounded-md border border-warm-200 bg-off-white px-4 py-3">
            <span className="inline-flex items-center gap-2 text-body-s font-semibold text-ink">
              {type === 'marchant' ? <StoreIcon size={18} /> : <UserIcon size={18} />}
              {type === 'marchant' ? t('auth.register.choice.recapMarchant') : t('auth.register.choice.recapIndividual')}
            </span>
            {!activationToken && (
              <button
                type="button"
                onClick={() => chooseType(null)}
                className="text-body-s font-medium text-warm-600 underline hover:text-ink cursor-pointer"
              >
                {t('auth.register.choice.change')}
              </button>
            )}
          </div>

          {/* Connexion Google : pré-remplit et prouve l'email (optionnel). */}
          <button
            type="button"
            onClick={() => void handleGoogle()}
            disabled={googleBusy || !!googleToken}
            className="w-full inline-flex items-center justify-center gap-3 rounded-md border border-warm-300 bg-off-white px-4 py-2.5 text-body font-medium text-ink transition-all duration-200 hover:border-warm-400 hover:bg-warm-100 disabled:opacity-60 disabled:cursor-not-allowed mb-4"
          >
            <GoogleIcon size={18} />
            {googleToken
              ? t('auth.register.googleConnected')
              : googleBusy
                ? t('auth.register.googleBusy')
                : t('auth.register.googleCta')}
            {googleToken && <CheckIcon size={16} className="text-success" />}
          </button>

          <div className="flex items-center gap-3 mb-4" role="separator">
            <span className="h-px flex-1 bg-warm-200" aria-hidden />
            <span className="text-caption text-warm-500 uppercase">{t('auth.register.googleOr')}</span>
            <span className="h-px flex-1 bg-warm-200" aria-hidden />
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
              helper={googleToken ? t('auth.register.googleEmailLocked') : undefined}
              readOnly={!!googleToken}
              autoComplete="email"
              rightSlot={
                googleToken ? (
                  <button
                    type="button"
                    onClick={clearGoogle}
                    className="p-2 text-caption text-warm-500 hover:text-airmess-red"
                  >
                    {t('auth.register.googleUnlink')}
                  </button>
                ) : emailCodeRequired ? (
                  <button
                    type="button"
                    onClick={() => void handleSendCode()}
                    disabled={codeBusy}
                    className="p-2 text-caption font-semibold text-airmess-red hover:text-ink transition-colors disabled:opacity-40"
                  >
                    {codeBusy
                      ? t('auth.register.emailCodeSending')
                      : codeSentTo
                        ? t('auth.register.emailCodeResend')
                        : t('auth.register.emailCodeSend')}
                  </button>
                ) : undefined
              }
            />

            {!googleToken && emailCodeRequired && (
              <Input
                label={t('auth.register.emailCode')}
                placeholder="123456"
                inputMode="numeric"
                autoComplete="one-time-code"
                helper={
                  codeSentTo
                    ? t('auth.register.emailCodeSentTo', { email: codeSentTo })
                    : t('auth.register.emailCodeHelper')
                }
                {...register('email_code', { required: t('auth.register.emailCodeRequired') })}
                error={errors.email_code?.message ?? serverErr('email_code')}
              />
            )}
            <Input
              type="tel"
              label={t('common.phone')}
              placeholder="+229 01 90 12 34 56"
              {...register('phone', { required: t('auth.register.phoneRequired') })}
              error={errors.phone?.message ?? serverErr('phone') ?? undefined}
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

            <TermsCheckbox
              checked={acceptedTerms}
              onChange={setAcceptedTerms}
              error={showTermsError && !acceptedTerms ? t('legal.checkbox.requiredError') : undefined}
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
              {activationToken && type === 'marchant'
                ? t('auth.register.activationSubmit')
                : t('auth.register.submit')}
            </Button>
          </form>
          </>
          )}

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

          <AuthSupportFooter context="Register" />
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
   Sous-composant : choix du type de compte (étape 1)
   ============================================================ */
function AccountTypeChoice({ onChoose }: { onChoose: (kind: AccountType) => void }) {
  const { t } = useTranslation()
  const options = [
    { kind: 'marchant' as const, Icon: StoreIcon },
    { kind: 'individual' as const, Icon: UserIcon },
  ]

  return (
    // min-w-0 : un <fieldset> prend par défaut la largeur de son contenu et déborde sur mobile.
    <fieldset className="mb-2 min-w-0">
      <legend className="text-body font-semibold text-ink mb-3">{t('auth.register.choice.question')}</legend>
      <div className="space-y-3">
        {options.map(({ kind, Icon }) => (
          <button
            key={kind}
            type="button"
            onClick={() => onChoose(kind)}
            className="group w-full flex items-center gap-4 rounded-xl border-2 border-warm-200 bg-off-white px-5 py-4 text-left transition-all duration-200 hover:border-airmess-yellow hover:shadow-sm focus-visible:border-airmess-yellow focus-visible:outline-none cursor-pointer"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-airmess-yellow/20 text-ink">
              <Icon size={24} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-body-l font-bold text-ink">{t(`auth.register.choice.${kind}Title`)}</span>
              <span className="block text-body-s text-warm-600 mt-0.5">{t(`auth.register.choice.${kind}Body`)}</span>
            </span>
            <span className="text-warm-400 group-hover:text-ink transition-colors" aria-hidden="true">
              <ArrowRightIcon size={18} />
            </span>
          </button>
        ))}
      </div>
    </fieldset>
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
