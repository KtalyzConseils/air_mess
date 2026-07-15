import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, Link } from 'react-router-dom'
import { AxiosError } from 'axios'
import { useTranslation } from 'react-i18next'
import { useAuthStore, type RegisterDriverPayload } from '../stores/authStore'
import FormSection from '../components/FormSection'
import Field from '../components/Field'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Card from '../components/ui/Card'
import Highlight from '../components/Highlight'
import {
  BagIcon, PackageIcon, SnowflakeIcon, IdCardIcon, LockIcon, BikeIcon, AlertTriangleIcon,
  MotorcycleIcon, ScooterIcon, CarIcon, FileTextIcon,
} from '../components/ui/icons'
import AuthSupportFooter from '../components/AuthSupportFooter'
import TermsCheckbox from '../components/TermsCheckbox'
import VehicleTypeCards from '../components/driver/VehicleTypeCards'
import AppDownloadBanner from '../components/driver/AppDownloadBanner'
import DocumentCapture from '../components/driver/DocumentCapture'
import PhoneOtpField from '../components/driver/PhoneOtpField'
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

type FormValues = Omit<RegisterDriverPayload, 'photo' | 'cni' | 'cni_back' | 'driving_license' | 'firebase_id_token'>

export default function DriverRegisterPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const registerDriver = useAuthStore((s) => s.registerDriver)

  const [photo, setPhoto] = useState<File | null>(null)
  const [cni, setCni] = useState<File | null>(null)
  const [cniBack, setCniBack] = useState<File | null>(null)
  const [drivingLicense, setDrivingLicense] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  // ID token Firebase une fois le numéro vérifié par SMS (null = pas encore vérifié).
  const [phoneToken, setPhoneToken] = useState<string | null>(null)
  const [phoneTokenError, setPhoneTokenError] = useState<string | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const [serverFieldErrors, setServerFieldErrors] = useState<Record<string, string[]>>({})
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [showTermsError, setShowTermsError] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>()

  // Le permis de conduire n'est demandé que pour une voiture.
  const isCar = watch('vehicle_type') === 'voiture'
  // Type de pièce d'identité : la CNIB a un verso, CIP/passeport une seule face.
  const cniType = watch('cni_type')
  const isCnib = cniType === 'cnib'

  // Si on quitte la CNIB, le verso déjà capturé n'a plus de sens : on le retire.
  useEffect(() => {
    if (cniType !== 'cnib') setCniBack(null)
  }, [cniType])

  async function onSubmit(values: FormValues) {
    setServerError(null)
    setFileError(null)
    setPhoneTokenError(null)
    setServerFieldErrors({})

    // Le numéro doit avoir été vérifié par SMS (Firebase) avant soumission.
    if (!phoneToken) {
      setPhoneTokenError(t('driverRegister.otp.requiredBeforeSubmit'))
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    const carSelected = values.vehicle_type === 'voiture'
    const cnibSelected = values.cni_type === 'cnib'
    if (!cni || (cnibSelected && !cniBack) || (carSelected && !drivingLicense)) {
      setFileError(
        cnibSelected && cni && !cniBack
          ? t('driverRegister.cniBackRequired')
          : t('driverRegister.cniLicenseRequired'),
      )
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
      return
    }

    if (!acceptedTerms) {
      setShowTermsError(true)
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
      return
    }

    try {
      const { token } = await registerDriver({
        ...values,
        firebase_id_token: phoneToken,
        photo,
        cni,
        // Verso pris en compte uniquement pour une CNIB.
        cni_back: cnibSelected ? cniBack : null,
        // Permis pris en compte uniquement pour une voiture.
        driving_license: carSelected ? drivingLicense : null,
        accepted_terms: true,
      })
      // Le token Sanctum permet à la page succès d'enregistrer le canal de
      // réponse préféré (navigation state uniquement, jamais localStorage).
      navigate('/register/driver/success', { state: { registrationToken: token } })
    } catch (err) {
      // Messages toujours en FR : cohérence avec les messages Laravel côté API.
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
            {t('driverRegister.sideTaglineLine1')}
            <br />
            {t('driverRegister.sideTaglineLine2Prefix')}{' '}
            <Highlight>{t('driverRegister.sideTaglineLine2Highlight')}</Highlight>.
          </h2>
          <p className="text-body-l text-warm-300 mb-10">
            {t('driverRegister.sideSubtext')}
          </p>

          {/* 3 bénéfices numérotés — légitime ici, séquence d'arguments */}
          <div className="space-y-5">
            <Benefit number={1} title={t('driverRegister.benefit1Title')}>
              {t('driverRegister.benefit1Body')}
            </Benefit>
            <Benefit number={2} title={t('driverRegister.benefit2Title')}>
              {t('driverRegister.benefit2Body')}
            </Benefit>
            <Benefit number={3} title={t('driverRegister.benefit3Title')}>
              {t('driverRegister.benefit3Body')}
            </Benefit>
          </div>

          {/* Petit mark décoratif en bas */}
          <div className="mt-12 pt-8 border-t border-warm-600/30 flex items-center gap-3 opacity-50">
            <img src={mark} alt="" aria-hidden className="h-6 w-auto" />
            <span className="text-caption text-warm-400">{t('driverRegister.sideFooter')}</span>
          </div>
        </div>
      </aside>

      {/* ============================================================
          DROITE — Formulaire d'inscription
          Sur lg+ : zone scrollable autonome (la page ne scrolle pas).
          ============================================================ */}
      <div className="flex-1 px-4 md:px-8 lg:px-12 py-8 md:py-12 lg:h-screen lg:overflow-y-auto">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-h1 text-ink mb-2">{t('driverRegister.formTitle')}</h1>
          <p className="text-body-l text-warm-500 mb-8">
            {t('driverRegister.formSubtitle')}
          </p>

          {/* Canal privilégié : l'inscription directement dans l'app livreur */}
          <AppDownloadBanner />

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* ====================== IDENTITÉ ====================== */}
            <FormSection icon={<IdCardIcon size={20} />} title={t('driverRegister.sectionIdentityTitle')} description={t('driverRegister.sectionIdentityDesc')}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label={t('driverRegister.firstName')}
                  {...register('first_name', { required: t('driverRegister.firstNameRequired') })}
                  error={errors.first_name?.message ?? serverErr('first_name')}
                />
                <Input
                  label={t('driverRegister.lastName')}
                  {...register('last_name', { required: t('driverRegister.lastNameRequired') })}
                  error={errors.last_name?.message ?? serverErr('last_name')}
                />
                <Field label={`${t('driverRegister.gender')} *`} error={errors.gender?.message ?? serverErr('gender')}>
                  <select
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
                  {...register('birth_date', { required: t('driverRegister.birthDateRequired') })}
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
                  {...register('email', { required: t('driverRegister.emailRequired') })}
                  error={errors.email?.message ?? serverErr('email')}
                />
                <PhoneOtpField
                  label={t('driverRegister.phone')}
                  registration={register('phone', { required: t('driverRegister.phoneRequired') })}
                  phoneValue={watch('phone') ?? ''}
                  error={errors.phone?.message ?? serverErr('phone') ?? phoneTokenError ?? undefined}
                  onTokenChange={(token) => {
                    setPhoneToken(token)
                    if (token) setPhoneTokenError(null)
                  }}
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
                  {...register('password_confirmation', { required: t('driverRegister.confirmRequired') })}
                  error={errors.password_confirmation?.message}
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
                  { value: 'moto',    label: t('driverRegister.vehicleTypeMotoLong'),    icon: <MotorcycleIcon size={28} /> },
                  { value: 'scooter', label: t('driverRegister.vehicleTypeScooterLong'), icon: <ScooterIcon size={28} /> },
                  { value: 'voiture', label: t('driverRegister.vehicleTypeCarLong'),     icon: <CarIcon size={28} /> },
                  { value: 'velo',    label: t('driverRegister.vehicleTypeBikeLong'),    icon: <BikeIcon size={28} /> },
                ]}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <Input
                  label={t('driverRegister.plate')}
                  {...register('vehicle_plate', { required: t('driverRegister.plateRequired') })}
                  error={errors.vehicle_plate?.message ?? serverErr('vehicle_plate')}
                />
                <Input
                  label={t('driverRegister.vehicleColor')}
                  helper={t('driverRegister.colorOptional')}
                  placeholder={t('driverRegister.colorPlaceholder')}
                  {...register('vehicle_color')}
                />
              </div>
            </FormSection>

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
                  {...register('emergency_contact2_phone', {
                    required: t('driverRegister.emergencyPhoneRequired'),
                    validate: (value) =>
                      value.replace(/\D/g, '') !== (watch('emergency_contact_phone') ?? '').replace(/\D/g, '') ||
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
                        className="relative flex cursor-pointer flex-col gap-0.5 rounded-md border border-warm-300 bg-off-white px-3 py-2.5 transition-all duration-200 hover:border-warm-400 has-checked:border-airmess-yellow has-checked:bg-airmess-yellow/10"
                      >
                        <input
                          type="radio"
                          value={option.value}
                          className="peer sr-only"
                          {...register('cni_type', { required: t('driverRegister.cniType.required') })}
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
              {fileError && (
                <p className="mt-4 text-body-s text-airmess-red bg-danger-bg border border-airmess-red/30 px-3 py-2 rounded-md inline-flex items-start gap-2">
                  <AlertTriangleIcon size={16} />
                  <span>{fileError}</span>
                </p>
              )}
            </FormSection>

            {/* ====================== ERREUR GLOBALE ====================== */}
            {serverError && (
              <div
                role="alert"
                className="bg-danger-bg border border-airmess-red/30 text-airmess-red px-4 py-3 rounded-md text-body-s flex items-start gap-2"
              >
                <AlertTriangleIcon size={18} />
                <span>{serverError}</span>
              </div>
            )}

            <TermsCheckbox
              checked={acceptedTerms}
              onChange={setAcceptedTerms}
              error={showTermsError && !acceptedTerms ? t('legal.checkbox.requiredError') : undefined}
            />

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
                {t('driverRegister.submitCta')}
              </Button>
              <p className="text-center text-body-s text-warm-500 mt-4">
                {t('driverRegister.alreadyRegistered')}{' '}
                <Link to="/login" className="text-ink font-semibold hover:text-airmess-red">
                  {t('driverRegister.loginLink')}
                </Link>
              </p>
            </Card>
          </form>

          <AuthSupportFooter context="DriverRegister" />
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
