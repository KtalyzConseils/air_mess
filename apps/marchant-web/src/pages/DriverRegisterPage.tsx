import { useEffect, useRef, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { AxiosError } from 'axios'
import { useTranslation } from 'react-i18next'
import { useAuthStore, type RegisterDriverPayload } from '../stores/authStore'
import FormSection from '../components/FormSection'
import Field from '../components/Field'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Card from '../components/ui/Card'
import {
  BagIcon, PackageIcon, SnowflakeIcon, IdCardIcon, LockIcon, BikeIcon, AlertTriangleIcon,
  MotorcycleIcon, ScooterIcon, CarIcon, FileTextIcon, ArrowRightIcon, ArrowLeftIcon,
} from '../components/ui/icons'
import AuthSupportFooter from '../components/AuthSupportFooter'
import TermsCheckbox from '../components/TermsCheckbox'
import VehicleTypeCards from '../components/driver/VehicleTypeCards'
import DocumentCapture from '../components/driver/DocumentCapture'
import { cn } from '../lib/cn'
import { VEHICLE_BRANDS } from '../lib/constants'
import wordmark from '../assets/logo/airmess-wordmark.svg'
import recruitmentPoster from '../assets/recruitment/affiche-livreur.jpeg'
import { fetchWaitlistActivation } from '../api/waitlist'
import './DriverRegisterPage.css'

const selectClass =
  'w-full bg-off-white border border-warm-300 rounded-md px-3 py-2.5 text-body text-ink ' +
  'transition-all duration-200 focus:outline-none focus:border-airmess-yellow focus:shadow-glow-yellow'

// Date max acceptée pour birth_date : il y a exactement 16 ans, jour pour jour.
const MAX_BIRTH_DATE = (() => {
  const d = new Date()
  d.setFullYear(d.getFullYear() - 16)
  return d.toISOString().split('T')[0]
})()

type FormValues = Omit<RegisterDriverPayload, 'photo' | 'cni' | 'cni_back' | 'driving_license' | 'firebase_id_token'>

// Champs validés au passage de l'étape 1 → 2 (le reste est validé à la soumission).
const STEP1_FIELDS = [
  'first_name', 'last_name', 'gender', 'birth_date',
  'email', 'phone', 'password', 'password_confirmation',
  'vehicle_type', 'vehicle_plate', 'vehicle_brand',
] as const

export default function DriverRegisterPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const registerDriver = useAuthStore((s) => s.registerDriver)
  const referralCode = (searchParams.get('ref') ?? '').trim().toUpperCase()
  const activationToken = searchParams.get('activation') ?? ''
  const submitLock = useRef(false)
  const formHeadingRef = useRef<HTMLHeadingElement>(null)

  const [photo, setPhoto] = useState<File | null>(null)
  const [cni, setCni] = useState<File | null>(null)
  const [cniBack, setCniBack] = useState<File | null>(null)
  const [drivingLicense, setDrivingLicense] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const [serverFieldErrors, setServerFieldErrors] = useState<Record<string, string[]>>({})
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [showTermsError, setShowTermsError] = useState(false)
  // Formulaire découpé en 2 étapes : 1 = profil/compte/véhicule, 2 = équipement/contacts/documents.
  const [step, setStep] = useState<1 | 2>(1)

  const {
    register,
    handleSubmit,
    control,
    getValues,
    trigger,
    setValue,
    getFieldState,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ shouldFocusError: false })

  // Le permis de conduire n'est demandé que pour une voiture.
  const vehicleType = useWatch({ control, name: 'vehicle_type' })
  const isCar = vehicleType === 'voiture'
  // Type de pièce d'identité : la CNIB a un verso, CIP/passeport une seule face.
  const cniType = useWatch({ control, name: 'cni_type' })
  const isCnib = cniType === 'cnib'

  useEffect(() => {
    if (referralCode) setValue('referral_code', referralCode)
  }, [referralCode, setValue])

  useEffect(() => {
    if (!activationToken) return
    let cancelled = false
    void fetchWaitlistActivation(activationToken)
      .then((prefill) => {
        if (cancelled) return
        if (prefill.kind !== 'driver') throw new Error('wrong_kind')
        for (const field of ['first_name', 'last_name', 'email', 'phone', 'vehicle_type'] as const) {
          if (prefill[field] && !getFieldState(field).isDirty) setValue(field, prefill[field])
        }
      })
      .catch(() => { if (!cancelled) setServerError(t('driverRegister.recruitment.activationError')) })
    return () => { cancelled = true }
  }, [activationToken, setValue, getFieldState, t])

  function focusForm() {
    formHeadingRef.current?.focus({ preventScroll: true })
    formHeadingRef.current?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
      block: 'start',
    })
  }

  /** Étape 1 → 2 : valide les champs de l'étape. */
  async function goToStep2() {
    const fieldsOk = await trigger([...STEP1_FIELDS])
    if (!fieldsOk) {
      setServerError(t('driverRegister.recruitment.correctFields'))
      focusForm()
      return
    }
    setServerError(null)
    setStep(2)
    focusForm()
  }

  function backToStep1() {
    setStep(1)
    focusForm()
  }

  async function onSubmit(values: FormValues) {
    if (submitLock.current) return
    setServerError(null)
    setFileError(null)
    setServerFieldErrors({})

    const carSelected = values.vehicle_type === 'voiture'
    const cnibSelected = values.cni_type === 'cnib'
    if (!cni || (cnibSelected && !cniBack) || (carSelected && !drivingLicense)) {
      setFileError(
        cnibSelected && cni && !cniBack
          ? t('driverRegister.cniBackRequired')
          : !cni ? t('driverRegister.recruitment.identityRequired') : t('driverRegister.recruitment.licenseRequired'),
      )
      focusForm()
      return
    }

    if (!acceptedTerms) {
      setShowTermsError(true)
      focusForm()
      return
    }

    submitLock.current = true
    try {
      const { token } = await registerDriver({
        ...values,
        photo,
        cni,
        // Verso pris en compte uniquement pour une CNIB.
        cni_back: cnibSelected ? cniBack : null,
        // Permis pris en compte uniquement pour une voiture.
        driving_license: carSelected ? drivingLicense : null,
        accepted_terms: true,
        activation_token: activationToken || undefined,
      })
      // Le token Sanctum permet à la page succès d'enregistrer le canal de
      // réponse préféré (navigation state uniquement, jamais localStorage).
      navigate('/register/driver/success', {
        state: { registrationToken: token, completedPublicApplication: Boolean(activationToken) },
      })
    } catch (err) {
      submitLock.current = false
      // Messages toujours en FR : cohérence avec les messages Laravel côté API.
      if (err instanceof AxiosError) {
        const data = err.response?.data as { message?: string; errors?: Record<string, string[]> } | undefined
        setServerError(data?.message ?? t('driverRegister.recruitment.retryError'))
        setServerFieldErrors(data?.errors ?? {})
        // Si l'erreur serveur concerne un champ de l'étape 1 (email/téléphone pris…),
        // on y ramène l'utilisateur pour qu'il voie le champ en rouge.
        const errorFields = Object.keys(data?.errors ?? {})
        if (errorFields.some((f) => (STEP1_FIELDS as readonly string[]).includes(f))) {
          setStep(1)
        }
      } else {
        setServerError(t('driverRegister.recruitment.retryError'))
      }
      focusForm()
    }
  }

  function serverErr(field: string): string | undefined {
    return serverFieldErrors[field]?.[0]
  }

  return (
    <div className="driver-recruitment">
      <header className="recruitment-header">
        <Link to="/" aria-label="AirMess"><img src={wordmark} alt="AirMess" width="154" height="40" /></Link>
        <Link to="/login" className="recruitment-login">{t('driverRegister.loginLink')} <ArrowRightIcon size={16} /></Link>
      </header>

      <section className="recruitment-hero" aria-labelledby="recruitment-title">
        <div className="recruitment-hero-inner">
          <div className="recruitment-pitch">
            <p className="recruitment-eyebrow">{t('driverRegister.recruitment.eyebrow')}</p>
            <h1 id="recruitment-title">{t('driverRegister.recruitment.headline1')}<br /><span>{t('driverRegister.recruitment.headline2')}</span></h1>
            <p className="recruitment-intro">{t('driverRegister.recruitment.intro')}</p>
            <p className="recruitment-earnings">{t('driverRegister.recruitment.earningsPrefix')} <strong>10 000 F CFA*</strong> <span>{t('driverRegister.recruitment.perDay')}</span></p>
            <a href="#driver-application" className="recruitment-cta" onClick={(event) => { event.preventDefault(); focusForm() }}>
              {t('driverRegister.recruitment.start')} <ArrowRightIcon size={20} />
            </a>
            <p className="recruitment-disclaimer">{t('driverRegister.recruitment.earningsDisclaimer')}</p>
          </div>
          <a className="recruitment-poster" href={recruitmentPoster} target="_blank" rel="noopener noreferrer" aria-label={t('driverRegister.recruitment.posterLink')}>
            <img src={recruitmentPoster} alt={t('driverRegister.recruitment.posterAlt')} width="1131" height="1600" fetchPriority="high" />
          </a>
        </div>
      </section>

      <div className="recruitment-benefits">
        <p><BikeIcon size={21} /><span>{t('driverRegister.benefit1Title')}</span></p>
        <p><PackageIcon size={21} /><span>{t('driverRegister.benefit2Title')}</span></p>
        <p><IdCardIcon size={21} /><span>{t('driverRegister.recruitment.independent')}</span></p>
      </div>

      <div className="recruitment-layout">
        <aside className="recruitment-guide" aria-label={t('driverRegister.recruitment.prepareTitle')}>
          <p className="recruitment-kicker">{t('driverRegister.recruitment.beforeStarting')}</p>
          <h2>{t('driverRegister.recruitment.prepareTitle')}</h2>
          <p className="recruitment-guide-intro">{t('driverRegister.recruitment.prepareIntro')}</p>
          <ul className="recruitment-checklist">
            <li><IdCardIcon size={20} /><span>{t('driverRegister.recruitment.prepareIdentity')}</span></li>
            <li><BikeIcon size={20} /><span>{t('driverRegister.recruitment.prepareVehicle')}</span></li>
            <li><FileTextIcon size={20} /><span>{t('driverRegister.recruitment.prepareContacts')}</span></li>
          </ul>
          <details className="recruitment-faq">
            <summary>{t('driverRegister.recruitment.faqDocuments')}</summary>
            <p>{t('driverRegister.recruitment.faqDocumentsAnswer')}</p>
          </details>
          <details className="recruitment-faq">
            <summary>{t('driverRegister.recruitment.faqNext')}</summary>
            <p>{t('driverRegister.recruitment.faqNextAnswer')}</p>
          </details>
          <AuthSupportFooter context="DriverRegister" />
        </aside>

        <main id="driver-application" className="recruitment-form">
          <p className="recruitment-kicker">{t('driverRegister.recruitment.application')}</p>
          <h2 ref={formHeadingRef} tabIndex={-1} className="recruitment-form-title">{t('driverRegister.formTitle')}</h2>
          <p className="text-body text-warm-500 mb-6">{t('driverRegister.formSubtitle')}</p>
          <ol className="recruitment-steps" aria-label={t('driverRegister.steps.aria', { step })}>
            {([1, 2] as const).map((s) => (
              <li key={s} aria-current={s === step ? 'step' : undefined} className={s <= step ? 'is-active' : ''}>
                <span className="recruitment-step-number">{s}</span>
                <span>{s === 1 ? t('driverRegister.steps.step1') : t('driverRegister.steps.step2')}</span>
              </li>
            ))}
          </ol>
          <p className="text-body-s text-warm-500 mb-4">{t('driverRegister.recruitment.requiredNote')}</p>
          {(serverError || fileError || (showTermsError && !acceptedTerms)) && (
            <div role="alert" className="recruitment-error">
              <AlertTriangleIcon size={20} />
              <span>{serverError || fileError || t('legal.checkbox.requiredError')}</span>
            </div>
          )}

          <form noValidate aria-busy={isSubmitting} onSubmit={(event) => {
            if (submitLock.current) {
              event.preventDefault()
              return
            }
            if (step === 1) {
              event.preventDefault()
              void goToStep2()
              return
            }
            void handleSubmit(onSubmit, (invalidFields) => {
              if (STEP1_FIELDS.some((field) => field in invalidFields)) setStep(1)
              setServerError(t('driverRegister.recruitment.correctFields'))
              focusForm()
            })(event)
          }} className="space-y-4">
            {referralCode && (
              <input type="hidden" {...register('referral_code')} />
            )}
            {/* ============ ÉTAPE 1 — Profil, compte & véhicule ============ */}
            <div className={cn(step !== 1 && 'hidden')}>
              <div className="space-y-4">
            {referralCode && (
              <div className="rounded-md border border-airmess-yellow/40 bg-airmess-yellow/10 px-4 py-3 text-body-s text-ink">
                {t('driverRegister.recruitment.referralApplied')} <strong>{referralCode}</strong>
              </div>
            )}
            {/* ====================== IDENTITÉ ====================== */}
            <FormSection icon={<IdCardIcon size={20} />} title={t('driverRegister.sectionIdentityTitle')} description={t('driverRegister.sectionIdentityDesc')}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label={t('driverRegister.firstName')}
                  autoComplete="given-name"
                  maxLength={100}
                  {...register('first_name', { required: t('driverRegister.firstNameRequired') })}
                  error={errors.first_name?.message ?? serverErr('first_name')}
                />
                <Input
                  label={t('driverRegister.lastName')}
                  autoComplete="family-name"
                  maxLength={100}
                  {...register('last_name', { required: t('driverRegister.lastNameRequired') })}
                  error={errors.last_name?.message ?? serverErr('last_name')}
                />
                <Field htmlFor="driver-gender" label={`${t('driverRegister.gender')} *`} error={errors.gender?.message ?? serverErr('gender')}>
                  <select
                    id="driver-gender"
                    aria-invalid={Boolean(errors.gender || serverErr('gender'))}
                    {...register('gender', { required: t('driverRegister.genderRequired') })}
                    className={selectClass}
                    defaultValue=""
                  >
                    <option value="" disabled>{t('driverRegister.selectPlaceholder')}</option>
                    <option value="M">{t('driverRegister.genderMale')}</option>
                    <option value="F">{t('driverRegister.genderFemale')}</option>
                    <option value="autre">{t('driverRegister.genderOther')}</option>
                  </select>
                </Field>
                <Input
                  type="date"
                  label={t('driverRegister.birthDate')}
                  helper={t('driverRegister.birthDateHelper')}
                  max={MAX_BIRTH_DATE}
                  {...register('birth_date', {
                    required: t('driverRegister.birthDateRequired'),
                    validate: (value) => value < MAX_BIRTH_DATE || t('driverRegister.recruitment.ageError'),
                  })}
                  error={errors.birth_date?.message ?? serverErr('birth_date')}
                />
              </div>
            </FormSection>

            {/* ====================== COMPTE ====================== */}
            <FormSection icon={<LockIcon size={20} />} title={t('driverRegister.sectionAccountTitle')} description={t('driverRegister.sectionAccountDesc')}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  type="email"
                  label={t('common.email')}
                  autoComplete="email"
                  {...register('email', {
                    required: t('driverRegister.emailRequired'),
                    setValueAs: (value: string) => value.trim(),
                    pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: t('driverRegister.recruitment.emailInvalid') },
                  })}
                  error={errors.email?.message ?? serverErr('email')}
                />
                <Input
                  type="tel"
                  label={t('driverRegister.phone')}
                  placeholder="+229 01 90 12 34 56"
                  maxLength={20}
                  inputMode="tel"
                  {...register('phone', { required: t('driverRegister.phoneRequired') })}
                  error={errors.phone?.message ?? serverErr('phone') ?? undefined}
                  autoComplete="tel"
                />
                <Input
                  type="password"
                  label={t('driverRegister.password')}
                  helper={t('driverRegister.passwordHelper')}
                  autoComplete="new-password"
                  {...register('password', {
                    required: t('driverRegister.passwordRequired'),
                    minLength: { value: 8, message: t('driverRegister.passwordMinLength') },
                  })}
                  error={errors.password?.message ?? serverErr('password')}
                />
                <Input
                  type="password"
                  label={t('driverRegister.passwordConfirm')}
                  autoComplete="new-password"
                  {...register('password_confirmation', {
                    required: t('driverRegister.confirmRequired'),
                    validate: (value) => value === getValues('password') || t('driverRegister.recruitment.passwordMismatch'),
                  })}
                  error={errors.password_confirmation?.message ?? serverErr('password_confirmation')}
                />
              </div>
            </FormSection>

            {/* ====================== VÉHICULE ====================== */}
            <FormSection icon={<BikeIcon size={20} />} title={t('driverRegister.sectionVehicleTitle')}>
              <VehicleTypeCards
                label={t('driverRegister.vehicleType')}
                registration={register('vehicle_type', { required: t('driverRegister.typeRequired') })}
                error={errors.vehicle_type?.message ?? serverErr('vehicle_type')}
                options={[
                  // Ordre croissant "taille de véhicule" : vélo → scooter → moto → voiture.
                  { value: 'velo',    label: t('driverRegister.vehicleTypeBikeLong'),    icon: <BikeIcon size={28} /> },
                  { value: 'scooter', label: t('driverRegister.vehicleTypeScooterLong'), icon: <ScooterIcon size={28} /> },
                  { value: 'moto',    label: t('driverRegister.vehicleTypeMotoLong'),    icon: <MotorcycleIcon size={28} /> },
                  { value: 'voiture', label: t('driverRegister.vehicleTypeCarLong'),     icon: <CarIcon size={28} /> },
                ]}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <Input
                  label={t('driverRegister.plate')}
                  maxLength={20}
                  {...register('vehicle_plate', { required: t('driverRegister.plateRequired') })}
                  error={errors.vehicle_plate?.message ?? serverErr('vehicle_plate')}
                />
                <div>
                  {/* Marque : suggestions selon le type (datalist), saisie libre possible */}
                  <Input
                    label={t('driverRegister.vehicleBrand')}
                    maxLength={50}
                    helper={t('driverRegister.brandHelper')}
                    placeholder={t('driverRegister.brandPlaceholder')}
                    list="vehicle-brand-suggestions"
                    autoComplete="off"
                    {...register('vehicle_brand')}
                    error={serverErr('vehicle_brand')}
                  />
                  <datalist id="vehicle-brand-suggestions">
                    {(VEHICLE_BRANDS[vehicleType ?? 'moto'] ?? []).map((brand) => (
                      <option key={brand} value={brand} />
                    ))}
                  </datalist>
                </div>
              </div>
            </FormSection>

            {/* Entrée et le bouton suivent la même validation de l'étape. */}
            <Card variant="default" padding="md" className="mt-6">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                pill
                fullWidth
                rightIcon={<ArrowRightIcon size={18} />}
              >
                {t('driverRegister.steps.next')}
              </Button>
              <p className="text-center text-body-s text-warm-500 mt-4">
                {t('driverRegister.alreadyRegistered')}{' '}
                <Link to="/login" className="text-ink font-semibold hover:text-airmess-red">
                  {t('driverRegister.loginLink')}
                </Link>
              </p>
            </Card>
              </div>
            </div>

            {/* ============ ÉTAPE 2 — Équipement, contacts & documents ============ */}
            <div className={cn(step !== 2 && 'hidden')}>
              <div className="space-y-4">
            {/* ====================== ÉQUIPEMENT ====================== */}
            <FormSection
              icon={<BagIcon size={20} />}
              title={t('driverRegister.sectionEquipmentTitle')}
              description={t('driverRegister.sectionEquipmentDesc')}
            >
              <div className="space-y-2">
                <CheckboxRow {...register('equipment_isothermal_bag')} icon={<BagIcon size={20} />} label={t('driverRegister.eqIsothermal')} />
                <CheckboxRow {...register('equipment_top_case')} icon={<PackageIcon size={20} />} label={t('driverRegister.eqTopCase')} />
                <CheckboxRow {...register('equipment_refrigerated_bag')} icon={<SnowflakeIcon size={20} />} label={t('driverRegister.eqRefrigerated')} />
              </div>
            </FormSection>

            {/* ====================== CONTACTS D'URGENCE (2) ====================== */}
            <FormSection
              icon={<AlertTriangleIcon size={20} />}
              title={t('driverRegister.sectionEmergencyTitle')}
              description={t('driverRegister.sectionEmergencyDesc')}
            >
              <p className="text-caption text-warm-600 font-semibold uppercase tracking-wide mb-2">
                {t('driverRegister.emergencyContact1')}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label={t('driverRegister.emergencyName')}
                  {...register('emergency_contact_name', { required: t('driverRegister.emergencyNameRequired') })}
                  error={errors.emergency_contact_name?.message ?? serverErr('emergency_contact_name')}
                />
                <Input
                  type="tel"
                  label={t('driverRegister.emergencyPhone')}
                  placeholder="+229 01 90 12 34 56"
                  maxLength={20}
                  inputMode="tel"
                  {...register('emergency_contact_phone', { required: t('driverRegister.emergencyPhoneRequired') })}
                  error={errors.emergency_contact_phone?.message ?? serverErr('emergency_contact_phone')}
                />
              </div>

              <p className="text-caption text-warm-600 font-semibold uppercase tracking-wide mb-2 mt-5">
                {t('driverRegister.emergencyContact2')}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label={t('driverRegister.emergencyName')}
                  {...register('emergency_contact2_name', { required: t('driverRegister.emergencyNameRequired') })}
                  error={errors.emergency_contact2_name?.message ?? serverErr('emergency_contact2_name')}
                />
                <Input
                  type="tel"
                  label={t('driverRegister.emergencyPhone')}
                  placeholder="+229 01 90 12 34 56"
                  maxLength={20}
                  inputMode="tel"
                  {...register('emergency_contact2_phone', {
                    required: t('driverRegister.emergencyPhoneRequired'),
                    validate: (value) =>
                      value.replace(/\D/g, '') !== (getValues('emergency_contact_phone') ?? '').replace(/\D/g, '') ||
                      t('driverRegister.emergencyPhonesMustDiffer'),
                  })}
                  error={errors.emergency_contact2_phone?.message ?? serverErr('emergency_contact2_phone')}
                />
              </div>
            </FormSection>

            {/* ====================== DOCUMENTS ====================== */}
            <FormSection
              icon={<FileTextIcon size={20} />}
              title={t('driverRegister.sectionDocumentsTitle')}
              description={isCar ? t('driverRegister.sectionDocumentsDesc') : t('driverRegister.sectionDocumentsDescNoLicense')}
            >
              <div className="space-y-3">
                <DocumentCapture
                  label={t('driverRegister.photoProfileLabel')}
                  helper={t('driverRegister.photoProfileHelper')}
                  captureMode="user"
                  minDimension={200}
                  file={photo}
                  onChange={setPhoto}
                  error={serverErr('photo')}
                />
                {/* Type de pièce d'identité — détermine le nombre de faces à fournir */}
                <fieldset>
                  <legend className="block mb-1.5 text-caption text-warm-600 font-medium">
                    {t('driverRegister.cniType.label')} <span className="text-airmess-red">*</span>
                  </legend>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    {([
                      { value: 'cnib',      title: t('driverRegister.cniType.cnib'),     desc: t('driverRegister.cniType.cnibDesc') },
                      { value: 'cip',       title: t('driverRegister.cniType.cip'),      desc: t('driverRegister.cniType.cipDesc') },
                      { value: 'passeport', title: t('driverRegister.cniType.passport'), desc: t('driverRegister.cniType.passportDesc') },
                    ] as const).map((option) => (
                      <label
                        key={option.value}
                        className="relative flex cursor-pointer flex-col gap-0.5 rounded-md border border-warm-300 bg-off-white px-3 py-2.5 transition-all duration-200 hover:border-warm-400 has-checked:border-airmess-yellow has-checked:bg-airmess-yellow/10 has-focus-visible:outline-2 has-focus-visible:outline-airmess-red"
                      >
                        <input
                          type="radio"
                          value={option.value}
                          className="peer sr-only"
                          {...register('cni_type', {
                            required: t('driverRegister.cniType.required'),
                            onChange: () => { setCni(null); setCniBack(null); setFileError(null) },
                          })}
                        />
                        <span className="text-body-s font-medium text-ink">{option.title}</span>
                        <span className="text-caption text-warm-500">{option.desc}</span>
                      </label>
                    ))}
                  </div>
                  {(errors.cni_type?.message ?? serverErr('cni_type')) && (
                    <p className="mt-1.5 text-caption text-airmess-red">
                      {errors.cni_type?.message ?? serverErr('cni_type')}
                    </p>
                  )}
                </fieldset>

                {/* Face(s) de la pièce — affichées une fois le type choisi */}
                {cniType && (
                  <DocumentCapture
                    label={
                      isCnib
                        ? t('driverRegister.cniFrontLabel')
                        : cniType === 'cip'
                          ? t('driverRegister.cipLabel')
                          : t('driverRegister.passportLabel')
                    }
                    required
                    helper={t('driverRegister.cniHelper')}
                    allowPdf
                    captureMode="environment"
                    minDimension={500}
                    file={cni}
                    onChange={setCni}
                    error={serverErr('cni')}
                  />
                )}
                {isCnib && (
                  <DocumentCapture
                    label={t('driverRegister.cniBackLabel')}
                    required
                    helper={t('driverRegister.cniHelper')}
                    allowPdf
                    captureMode="environment"
                    minDimension={500}
                    file={cniBack}
                    onChange={setCniBack}
                    error={serverErr('cni_back')}
                  />
                )}
                {/* Permis de conduire : demandé uniquement si le véhicule est une voiture. */}
                {isCar && (
                  <DocumentCapture
                    label={t('driverRegister.licenseLabel')}
                    required
                    helper={t('driverRegister.licenseHelper')}
                    allowPdf
                    captureMode="environment"
                    minDimension={500}
                    file={drivingLicense}
                    onChange={setDrivingLicense}
                    error={serverErr('driving_license')}
                  />
                )}
              </div>
            </FormSection>

            <TermsCheckbox
              checked={acceptedTerms}
              onChange={(accepted) => { setAcceptedTerms(accepted); setShowTermsError(false) }}
              error={showTermsError && !acceptedTerms ? t('legal.checkbox.requiredError') : undefined}
            />

            {/* ====================== RETOUR + SUBMIT ====================== */}
            <Card variant="default" padding="md" className="mt-6">
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  size="lg"
                  onClick={backToStep1}
                  disabled={isSubmitting}
                  leftIcon={<ArrowLeftIcon size={18} />}
                  className="sm:w-auto"
                >
                  {t('driverRegister.steps.back')}
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  pill
                  fullWidth
                  loading={isSubmitting}
                  rightIcon={!isSubmitting && <ArrowRightIcon size={18} />}
                  className="flex-1"
                >
                  {activationToken ? t('driverRegister.activationSubmitCta') : t('driverRegister.submitCta')}
                </Button>
              </div>
              <p className="text-center text-body-s text-warm-500 mt-4">
                {t('driverRegister.alreadyRegistered')}{' '}
                <Link to="/login" className="text-ink font-semibold hover:text-airmess-red">
                  {t('driverRegister.loginLink')}
                </Link>
              </p>
            </Card>
              </div>
            </div>
          </form>

          <p className="recruitment-privacy"><LockIcon size={16} />{t('driverRegister.recruitment.privacyNote')}</p>
        </main>
      </div>
    </div>
  )
}

/* ============================================================
   Sous-composant : CheckboxRow
   ============================================================ */
interface CheckboxRowProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  icon: React.ReactNode
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
        <span className="text-warm-600 shrink-0 flex" aria-hidden>{icon}</span>
        <span className="text-body text-ink">{label}</span>
      </label>
    )
  }
})()

// (l'ancien FileDropZone a été remplacé par components/driver/DocumentCapture :
// capture caméra directe, aperçu réel, consignes de clarté et compression.)
