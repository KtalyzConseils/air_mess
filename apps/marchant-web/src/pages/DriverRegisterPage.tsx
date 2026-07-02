import { useState } from 'react'
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
  const { t } = useTranslation()
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
      setFileError(t('driverRegister.cniLicenseRequired'))
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
        setServerError(data?.message ?? t('driverRegister.registerError'))
        setServerFieldErrors(data?.errors ?? {})
      } else {
        setServerError(t('common.unexpectedError'))
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

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* ====================== IDENTITÉ ====================== */}
            <FormSection title={t('driverRegister.sectionIdentityTitle')} description={t('driverRegister.sectionIdentityDesc')}>
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
            <FormSection title={t('driverRegister.sectionAccountTitle')} description={t('driverRegister.sectionAccountDesc')}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  type="email"
                  label={t('common.email')}
                  autoComplete="email"
                  {...register('email', { required: t('driverRegister.emailRequired') })}
                  error={errors.email?.message ?? serverErr('email')}
                />
                <Input
                  type="tel"
                  label={t('driverRegister.phone')}
                  placeholder="+229 90 12 34 56"
                  autoComplete="tel"
                  {...register('phone', { required: t('driverRegister.phoneRequired') })}
                  error={errors.phone?.message ?? serverErr('phone')}
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
            <FormSection title={t('driverRegister.sectionVehicleTitle')}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Field label={`${t('driverRegister.vehicleType')} *`} error={errors.vehicle_type?.message ?? serverErr('vehicle_type')}>
                  <select
                    {...register('vehicle_type', { required: t('driverRegister.typeRequired') })}
                    className={selectClass}
                    defaultValue=""
                  >
                    <option value="" disabled>{t('driverRegister.selectPlaceholder')}</option>
                    <option value="moto">{t('driverRegister.vehicleTypeMotoLong')}</option>
                    <option value="scooter">{t('driverRegister.vehicleTypeScooterLong')}</option>
                    <option value="voiture">{t('driverRegister.vehicleTypeCarLong')}</option>
                    <option value="velo">{t('driverRegister.vehicleTypeBikeLong')}</option>
                  </select>
                </Field>
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
              title={t('driverRegister.sectionEquipmentTitle')}
              description={t('driverRegister.sectionEquipmentDesc')}
            >
              <div className="space-y-2">
                <CheckboxRow {...register('equipment_isothermal_bag')} icon="🍱" label={t('driverRegister.eqIsothermal')} />
                <CheckboxRow {...register('equipment_top_case')} icon="📦" label={t('driverRegister.eqTopCase')} />
                <CheckboxRow {...register('equipment_refrigerated_bag')} icon="❄️" label={t('driverRegister.eqRefrigerated')} />
              </div>
            </FormSection>

            {/* ====================== CONTACT D'URGENCE ====================== */}
            <FormSection
              title={t('driverRegister.sectionEmergencyTitle')}
              description={t('driverRegister.sectionEmergencyDesc')}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label={t('driverRegister.emergencyName')}
                  {...register('emergency_contact_name', { required: t('driverRegister.emergencyNameRequired') })}
                  error={errors.emergency_contact_name?.message ?? serverErr('emergency_contact_name')}
                />
                <Input
                  type="tel"
                  label={t('driverRegister.emergencyPhone')}
                  placeholder="+229 90 12 34 56"
                  {...register('emergency_contact_phone', { required: t('driverRegister.emergencyPhoneRequired') })}
                  error={errors.emergency_contact_phone?.message ?? serverErr('emergency_contact_phone')}
                />
              </div>
            </FormSection>

            {/* ====================== DOCUMENTS ====================== */}
            <FormSection
              title={t('driverRegister.sectionDocumentsTitle')}
              description={t('driverRegister.sectionDocumentsDesc')}
            >
              <div className="space-y-3">
                <FileDropZone
                  label={t('driverRegister.photoProfileLabel')}
                  helper={t('driverRegister.photoProfileHelper')}
                  accept="image/jpeg,image/png"
                  file={photo}
                  onChange={setPhoto}
                  error={serverErr('photo')}
                  clickReplaceLabel={t('driverRegister.fileClickReplace')}
                  clickSelectLabel={t('driverRegister.fileClickSelect')}
                  removeAriaLabel={t('driverRegister.fileRemoveAria')}
                />
                <FileDropZone
                  label={t('driverRegister.cniShort')}
                  required
                  helper={t('driverRegister.cniHelper')}
                  accept="image/jpeg,image/png,application/pdf"
                  file={cni}
                  onChange={setCni}
                  error={serverErr('cni')}
                  clickReplaceLabel={t('driverRegister.fileClickReplace')}
                  clickSelectLabel={t('driverRegister.fileClickSelect')}
                  removeAriaLabel={t('driverRegister.fileRemoveAria')}
                />
                <FileDropZone
                  label={t('driverRegister.licenseLabel')}
                  required
                  helper={t('driverRegister.licenseHelper')}
                  accept="image/jpeg,image/png,application/pdf"
                  file={drivingLicense}
                  onChange={setDrivingLicense}
                  error={serverErr('driving_license')}
                  clickReplaceLabel={t('driverRegister.fileClickReplace')}
                  clickSelectLabel={t('driverRegister.fileClickSelect')}
                  removeAriaLabel={t('driverRegister.fileRemoveAria')}
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
  clickReplaceLabel: string
  clickSelectLabel: string
  removeAriaLabel: string
}

function FileDropZone({
  label,
  helper,
  required,
  accept,
  file,
  onChange,
  error,
  clickReplaceLabel,
  clickSelectLabel,
  removeAriaLabel,
}: FileDropZoneProps) {
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
                {(file.size / 1024).toFixed(0)} Ko · {clickReplaceLabel}
              </p>
            </>
          ) : (
            <>
              <p className="text-body-s font-medium text-ink">{clickSelectLabel}</p>
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
            aria-label={removeAriaLabel}
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
