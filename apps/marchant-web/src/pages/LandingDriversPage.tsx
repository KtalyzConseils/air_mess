import { useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { AxiosError } from 'axios'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import PageEyebrow from '../components/ui/PageEyebrow'
import SectionMarker from '../components/ui/SectionMarker'
import Highlight from '../components/Highlight'
import Input from '../components/ui/Input'
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BikeIcon,
  CheckIcon,
  ClockIcon,
  RouteIcon,
  ShareIcon,
  SparklesIcon,
  WhatsappIcon,
} from '../components/ui/icons'
import {
  submitDriverWaitlist,
  type DriverWaitlistPayload,
  type DriverWaitlistResponse,
} from '../api/waitlist'
import wordmarkWhite from '../assets/logo/airmess-wordmark-white.svg'

type FormState = {
  vehicle_type: string
  zone: string
  zone_other: string
  experience: string
  availability: string
  source: string
  source_other: string
  platforms_used: string[]
  platforms_used_other: string
  weekly_deliveries: string
  weekly_income: string
  problems: string[]
  problems_other: string
  worst_experience: string
  expected_payment_model: string
  expected_weekly_income: string
  mobile_money_trust: string
  interest_level: number
  launch_availability: string
  full_name: string
  email: string
  whatsapp: string
}

const INITIAL_FORM: FormState = {
  vehicle_type: '',
  zone: '',
  zone_other: '',
  experience: '',
  availability: '',
  source: '',
  source_other: '',
  platforms_used: [],
  platforms_used_other: '',
  weekly_deliveries: '',
  weekly_income: '',
  problems: [],
  problems_other: '',
  worst_experience: '',
  expected_payment_model: '',
  expected_weekly_income: '',
  mobile_money_trust: '',
  interest_level: 0,
  launch_availability: '',
  full_name: '',
  email: '',
  whatsapp: '',
}

const VEHICLE_TYPES = ['Vélo', 'Scooter', 'Moto', 'Voiture']

const ZONES = ['Cotonou', 'Abomey-Calavi', 'Autre']

const EXPERIENCE_OPTIONS = [
  'Je débute, aucune expérience',
  'Moins de 6 mois',
  '6 mois à 1 an',
  '1 à 3 ans',
  'Plus de 3 ans',
]

const AVAILABILITY_OPTIONS = [
  'À temps plein',
  'À temps partiel',
  'Soirs et week-ends uniquement',
  'Je déciderai selon les commandes',
]

const SOURCE_OPTIONS = [
  'WhatsApp',
  'Publicité Facebook',
  'Publicité Google',
  'Site web Airmess',
  'LinkedIn',
  'Autre',
]

const PLATFORM_OPTIONS = [
  'Aucune',
  'Gozem',
  'Une autre plateforme de livraison',
  'Une application de taxi',
  'Je travaille en direct avec des clients',
  'Autre',
]

const WEEKLY_DELIVERIES = ['Moins de 10', '10 à 30', '30 à 50', 'Plus de 50']

const WEEKLY_INCOME = [
  'Moins de 15 000 FCFA',
  '15 000 à 30 000 FCFA',
  '30 000 à 50 000 FCFA',
  '50 000 à 75 000 FCFA',
  'Plus de 75 000 FCFA',
]

const PROBLEMS = [
  'Pas assez de commandes stables',
  'Clients difficiles à joindre ou à localiser',
  'Encaissement cash risqué (vol, erreur de monnaie)',
  'Coût du carburant ou entretien du véhicule',
  'Pas de protection en cas d’accident',
  'Litiges fréquents avec les clients',
  'Aucun problème particulier',
  'Autre',
]

const PAYMENT_MODELS = [
  'Un montant fixe par course',
  'Un pourcentage du prix de la course',
  'Un mélange des deux',
  'Je ne sais pas',
]

const EXPECTED_INCOME = [
  'Moins de 20 000 FCFA',
  '20 000 à 40 000 FCFA',
  '40 000 à 60 000 FCFA',
  'Plus de 60 000 FCFA',
]

const MOBILE_MONEY_OPTIONS = [
  'Oui, totalement',
  'Oui, mais avec des réserves',
  'Non, je préfère le cash',
  "Je n'utilise pas le Mobile Money",
]

const LAUNCH_OPTIONS = [
  'Oui, dès le lancement',
  'Oui, sous quelques semaines',
  'Non, plus tard',
  "Je veux d'abord en savoir plus",
]

const WHATSAPP_PATTERN = /^(\+229)?[0-9]{8}$/
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type StepDefinition = {
  id: string
  marker: string
  short: string
  title: string
  description: string
}

const STEPS: StepDefinition[] = [
  {
    id: 'profil',
    marker: 'Votre profil',
    short: 'Profil',
    title: 'Parlons de votre profil de livreur',
    description:
      'Quelques informations pour comprendre votre expérience et votre disponibilité.',
  },
  {
    id: 'quotidien',
    marker: 'Votre quotidien',
    short: 'Quotidien',
    title: 'Comment se passe votre activité aujourd’hui ?',
    description:
      'Vos réponses nous aident à mesurer les difficultés et les habitudes des livreurs.',
  },
  {
    id: 'attentes',
    marker: 'Vos attentes',
    short: 'Attentes',
    title: 'Ce que vous attendez d’une plateforme',
    description:
      'Dites-nous ce qui rendrait votre travail de livreur plus simple et plus rémunérateur.',
  },
  {
    id: 'inscription',
    marker: 'Votre inscription',
    short: 'Inscription',
    title: 'Finalisons votre inscription',
    description:
      'Laissez vos coordonnées pour rejoindre la liste d’attente et être activé en priorité.',
  },
]

const textareaClass =
  'w-full rounded-md border border-warm-300 bg-off-white px-3.5 py-3 text-body-s text-ink placeholder:text-warm-400 focus:border-warm-500 focus:outline-none focus:shadow-glow-yellow'

interface SingleChoiceProps {
  name: string
  label: string
  number?: number
  options: string[]
  value: string
  onChange: (value: string) => void
  error?: string
  otherValue?: string
  onOtherChange?: (value: string) => void
  otherError?: string
  otherLabel?: string
  required?: boolean
}

function SingleChoice({
  name,
  label,
  number,
  options,
  value,
  onChange,
  error,
  otherValue,
  onOtherChange,
  otherError,
  otherLabel,
  required = true,
}: SingleChoiceProps) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-body-s font-bold text-ink">
        {number && <span className="mr-1.5 font-extrabold text-warm-500">{number}.</span>}
        {label}
        {required && <span className="text-airmess-red"> *</span>}
      </legend>

      <div className="grid gap-2 md:grid-cols-2">
        {options.map((option) => {
          const selected = value === option
          return (
            <label
              key={option}
              className={`flex cursor-pointer items-center gap-3 rounded-lg border bg-off-white px-4 py-3 text-body-s text-ink transition-all ${
                selected
                  ? 'border-ink shadow-sm'
                  : 'border-warm-200 hover:border-warm-400'
              }`}
            >
              <input
                type="radio"
                name={name}
                className="sr-only"
                checked={selected}
                onChange={() => onChange(option)}
              />
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                  selected
                    ? 'border-ink bg-ink text-cream'
                    : 'border-warm-300 text-transparent'
                }`}
              >
                <CheckIcon size={12} />
              </span>
              <span className={selected ? 'font-bold' : ''}>{option}</span>
            </label>
          )
        })}
      </div>

      {value === 'Autre' && onOtherChange && (
        <Input
          label={otherLabel ?? 'Précisez votre réponse'}
          value={otherValue ?? ''}
          onChange={(event) => onOtherChange(event.target.value)}
          error={otherError}
          placeholder="Écrivez ici..."
        />
      )}

      {error && <p className="text-caption text-airmess-red">{error}</p>}
    </fieldset>
  )
}

interface MultiChoiceProps {
  label: string
  number?: number
  options: string[]
  values: string[]
  onToggle: (option: string) => void
  error?: string
  otherValue?: string
  onOtherChange?: (value: string) => void
  otherError?: string
  required?: boolean
}

function MultiChoice({
  label,
  number,
  options,
  values,
  onToggle,
  error,
  otherValue,
  onOtherChange,
  otherError,
  required = true,
}: MultiChoiceProps) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-body-s font-bold text-ink">
        {number && <span className="mr-1.5 font-extrabold text-warm-500">{number}.</span>}
        {label}
        {required && <span className="text-airmess-red"> *</span>}
      </legend>

      <div className="grid gap-2 md:grid-cols-2">
        {options.map((option) => {
          const selected = values.includes(option)
          return (
            <label
              key={option}
              className={`flex cursor-pointer items-center gap-3 rounded-lg border bg-off-white px-4 py-3 text-body-s text-ink transition-all ${
                selected
                  ? 'border-ink shadow-sm'
                  : 'border-warm-200 hover:border-warm-400'
              }`}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={selected}
                onChange={() => onToggle(option)}
              />
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                  selected
                    ? 'border-ink bg-ink text-cream'
                    : 'border-warm-300 text-transparent'
                }`}
              >
                <CheckIcon size={12} />
              </span>
              <span className={selected ? 'font-bold' : ''}>{option}</span>
            </label>
          )
        })}
      </div>

      {values.includes('Autre') && onOtherChange && (
        <Input
          label="Précisez votre réponse"
          value={otherValue ?? ''}
          onChange={(event) => onOtherChange(event.target.value)}
          error={otherError}
          placeholder="Écrivez ici..."
        />
      )}

      {error && <p className="text-caption text-airmess-red">{error}</p>}
    </fieldset>
  )
}

function TextAreaField({
  label,
  number,
  value,
  onChange,
  error,
  helper,
  placeholder,
  rows = 4,
  required = true,
}: {
  label: string
  number?: number
  value: string
  onChange: (value: string) => void
  error?: string
  helper?: string
  placeholder?: string
  rows?: number
  required?: boolean
}) {
  return (
    <div>
      <label className="mb-2.5 block text-body-s font-bold text-ink">
        {number && <span className="mr-1.5 font-extrabold text-warm-500">{number}.</span>}
        {label}
        {required && <span className="text-airmess-red"> *</span>}
      </label>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={rows}
        className={textareaClass}
      />
      {error ? (
        <p className="mt-1.5 text-caption text-airmess-red">{error}</p>
      ) : helper ? (
        <p className="mt-1.5 text-caption text-warm-500">{helper}</p>
      ) : null}
    </div>
  )
}

function InterestScale({
  number,
  value,
  onChange,
  error,
}: {
  number?: number
  value: number
  onChange: (value: number) => void
  error?: string
}) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-body-s font-bold text-ink">
        {number && <span className="mr-1.5 font-extrabold text-warm-500">{number}.</span>}
        Sur une échelle de 1 à 5, quel est votre niveau d'intérêt pour rejoindre une
        plateforme qui vous propose des courses stables, un suivi en temps réel et un
        paiement sécurisé ?
        <span className="text-airmess-red"> *</span>
      </legend>
      <div className="flex flex-wrap items-center gap-2.5">
        {[1, 2, 3, 4, 5].map((number) => {
          const selected = value === number
          return (
            <button
              key={number}
              type="button"
              onClick={() => onChange(number)}
              aria-pressed={selected}
              className={`h-11 w-11 rounded-full border text-body font-bold transition-colors ${
                selected
                  ? 'border-ink bg-ink text-cream'
                  : 'border-warm-300 bg-off-white text-warm-600 hover:border-warm-500'
              }`}
            >
              {number}
            </button>
          )
        })}
      </div>
      <div className="flex justify-between text-caption text-warm-500">
        <span>Pas du tout intéressé</span>
        <span>Très intéressé</span>
      </div>
      {error && <p className="text-caption text-airmess-red">{error}</p>}
    </fieldset>
  )
}

function ProgressBar({ step, total }: { step: number; total: number }) {
  const percentage = Math.round(((step + 1) / total) * 100)
  return (
    <div className="flex items-center gap-3">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-warm-100">
        <div
          className="h-full rounded-full bg-airmess-yellow transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-caption font-bold tabular-nums text-warm-600">
        {step + 1}/{total}
      </span>
    </div>
  )
}

function SummaryRow({
  label,
  value,
  onEdit,
}: {
  label: string
  value: ReactNode
  onEdit: () => void
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-warm-200 py-3 last:border-0">
      <div>
        <p className="text-caption font-bold uppercase tracking-wide text-warm-500">
          {label}
        </p>
        <p className="mt-1 text-body-s text-ink">{value || '—'}</p>
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="shrink-0 text-caption font-bold text-airmess-red hover:underline"
      >
        Modifier
      </button>
    </div>
  )
}

export default function LandingDriversPage() {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState('')
  const [response, setResponse] = useState<DriverWaitlistResponse | null>(null)

  const totalSteps = STEPS.length
  const isLastStep = step === totalSteps - 1
  const currentStep = STEPS[step]

  const update = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((previous) => ({ ...previous, [field]: value }))
    setErrors((previous) => {
      if (!previous[field]) return previous
      const next = { ...previous }
      delete next[field]
      return next
    })
  }

  const toggleValue = (field: 'platforms_used' | 'problems', value: string) => {
    setForm((previous) => {
      const current = previous[field]
      const next = current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value]
      return { ...previous, [field]: next }
    })
    setErrors((previous) => {
      if (!previous[field]) return previous
      const next = { ...previous }
      delete next[field]
      return next
    })
  }

  const validateStep = (stepIndex: number): Record<string, string> => {
    const nextErrors: Record<string, string> = {}

    if (stepIndex === 0) {
      if (!form.vehicle_type) nextErrors.vehicle_type = 'Sélectionnez votre type de véhicule.'
      if (!form.zone) nextErrors.zone = 'Sélectionnez votre zone.'
      if (form.zone === 'Autre' && !form.zone_other.trim()) {
        nextErrors.zone_other = 'Précisez votre zone.'
      }
      if (!form.experience) nextErrors.experience = 'Sélectionnez une réponse.'
      if (!form.availability) nextErrors.availability = 'Sélectionnez une réponse.'
    }

    if (stepIndex === 1) {
      if (form.platforms_used.length === 0) {
        nextErrors.platforms_used = 'Sélectionnez au moins une réponse.'
      }
      if (form.platforms_used.includes('Autre') && !form.platforms_used_other.trim()) {
        nextErrors.platforms_used_other = 'Précisez la plateforme utilisée.'
      }
      if (!form.weekly_deliveries) nextErrors.weekly_deliveries = 'Sélectionnez une réponse.'
      if (!form.weekly_income) nextErrors.weekly_income = 'Sélectionnez une réponse.'
      if (form.problems.length === 0) {
        nextErrors.problems = 'Sélectionnez au moins une réponse.'
      }
      if (form.problems.includes('Autre') && !form.problems_other.trim()) {
        nextErrors.problems_other = 'Précisez le problème rencontré.'
      }
      if (!form.worst_experience.trim()) {
        nextErrors.worst_experience = 'Partagez une courte réponse, même en quelques mots.'
      }
    }

    if (stepIndex === 2) {
      if (!form.expected_payment_model) {
        nextErrors.expected_payment_model = 'Sélectionnez une réponse.'
      }
      if (!form.expected_weekly_income) {
        nextErrors.expected_weekly_income = 'Sélectionnez une réponse.'
      }
      if (!form.mobile_money_trust) {
        nextErrors.mobile_money_trust = 'Sélectionnez une réponse.'
      }
      if (form.interest_level === 0) {
        nextErrors.interest_level = 'Sélectionnez une note.'
      }
      if (!form.launch_availability) {
        nextErrors.launch_availability = 'Sélectionnez une réponse.'
      }
    }

    if (stepIndex === 3) {
      if (!form.full_name.trim()) nextErrors.full_name = 'Indiquez votre nom et prénom.'
      if (!form.email.trim()) {
        nextErrors.email = 'Indiquez votre adresse email.'
      } else if (!EMAIL_PATTERN.test(form.email.trim())) {
        nextErrors.email = 'Format attendu : nom@exemple.com.'
      }
      if (!form.whatsapp.trim()) {
        nextErrors.whatsapp = 'Indiquez votre numéro WhatsApp.'
      } else if (!WHATSAPP_PATTERN.test(form.whatsapp.trim())) {
        nextErrors.whatsapp = 'Format attendu : 8 chiffres, avec ou sans +229.'
      }
    }

    return nextErrors
  }

  const goToStep = (nextStep: number) => {
    setStep(nextStep)
    setServerError('')
    document.getElementById('formulaire')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const handleNext = () => {
    const nextErrors = validateStep(step)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length === 0) {
      goToStep(step + 1)
    }
  }

  const handleBack = () => {
    setServerError('')
    goToStep(Math.max(0, step - 1))
  }

  const buildPayload = (): DriverWaitlistPayload => ({
    vehicle_type: form.vehicle_type,
    zone: form.zone,
    zone_other: form.zone === 'Autre' ? form.zone_other.trim() : undefined,
    experience: form.experience,
    availability: form.availability,
    source: form.source || undefined,
    source_other: form.source === 'Autre' ? form.source_other.trim() : undefined,
    platforms_used: form.platforms_used,
    platforms_used_other: form.platforms_used.includes('Autre')
      ? form.platforms_used_other.trim()
      : undefined,
    weekly_deliveries: form.weekly_deliveries,
    weekly_income: form.weekly_income,
    problems: form.problems,
    problems_other: form.problems.includes('Autre') ? form.problems_other.trim() : undefined,
    worst_experience: form.worst_experience.trim(),
    expected_payment_model: form.expected_payment_model,
    expected_weekly_income: form.expected_weekly_income,
    mobile_money_trust: form.mobile_money_trust,
    interest_level: form.interest_level,
    launch_availability: form.launch_availability,
    full_name: form.full_name.trim(),
    email: form.email.trim(),
    whatsapp: form.whatsapp.trim(),
  })

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextErrors = validateStep(step)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setLoading(true)
    setServerError('')
    try {
      const data = await submitDriverWaitlist(buildPayload())
      setResponse(data)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (error) {
      if (error instanceof AxiosError) {
        const payload = error.response?.data as { message?: string } | undefined
        setServerError(
          payload?.message ??
            "Une erreur est survenue pendant l'envoi. Vérifiez vos informations puis réessayez.",
        )
      } else {
        setServerError("Une erreur est survenue pendant l'envoi. Veuillez réessayer.")
      }
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setForm(INITIAL_FORM)
    setErrors({})
    setStep(0)
    setServerError('')
    setResponse(null)
  }

  const shareOnWhatsApp = () => {
    const text =
      `Je viens de rejoindre la liste d'attente des livreurs Airmess. ` +
      `Rejoins-moi sur https://airmess-logistics.com/landing/drivers_learn`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="min-h-screen bg-cream text-ink">
      <Header />

      <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        {response ? (
          <SuccessPanel response={response} onShare={shareOnWhatsApp} onReset={resetForm} />
        ) : (
          <>
            <Hero />
            <Benefits />
            <section id="formulaire" className="scroll-mt-8">
              <Card variant="signature" padding="none" className="overflow-hidden">
                <div className="border-b border-warm-200 bg-airmess-dark px-6 py-6 text-cream sm:px-8 lg:px-10">
                  <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div>
                      <PageEyebrow
                        label="Enquête + liste d’attente"
                        accent="yellow"
                        className="mb-3 text-cream"
                      />
                      <h2 className="text-h2">Une seule réponse, tout est réglé</h2>
                      <p className="mt-2 max-w-2xl text-body-s text-cream/70">
                        Répondez aux questions et votre inscription sur la liste d’attente
                        des livreurs est automatique.
                      </p>
                    </div>
                    <span className="inline-flex w-fit items-center gap-2 rounded-full bg-airmess-yellow px-4 py-2 text-caption font-bold text-ink">
                      <ClockIcon size={15} />
                      Environ 5 minutes
                    </span>
                  </div>
                </div>

                <div className="p-6 sm:p-8 lg:p-10">
                  <div className="mb-8">
                    <div className="mb-3 flex items-center justify-between">
                      <SectionMarker
                        number={step + 1}
                        label={`Étape ${step + 1} — ${currentStep.short}`}
                      />
                      <span className="hidden text-caption font-medium text-warm-500 sm:block">
                        {STEPS[totalSteps - 1] !== currentStep
                          ? `Prochaine étape : ${STEPS[step + 1]?.short}`
                          : 'Dernière étape'}
                      </span>
                    </div>
                    <ProgressBar step={step} total={totalSteps} />
                  </div>

                  <form onSubmit={handleSubmit} noValidate>
                    {serverError && (
                      <div className="mb-6 rounded-lg border border-airmess-red/30 bg-airmess-red/5 px-4 py-3 text-body-s text-airmess-red">
                        {serverError}
                      </div>
                    )}

                    <div className="mb-8">
                      <h3 className="text-h3 text-ink">{currentStep.title}</h3>
                      <p className="mt-2 max-w-3xl text-body text-warm-500">
                        {currentStep.description}
                      </p>
                    </div>

                    <div className="space-y-7">
                      {step === 0 && (
                        <>
                          <SingleChoice
                            name="vehicle_type"
                            number={1}
                            label="Quel type de véhicule utilisez-vous pour livrer ?"
                            options={VEHICLE_TYPES}
                            value={form.vehicle_type}
                            onChange={(value) => update('vehicle_type', value)}
                            error={errors.vehicle_type}
                          />
                          <SingleChoice
                            name="zone"
                            number={2}
                            label="Dans quelle zone souhaitez-vous principalement travailler ?"
                            options={ZONES}
                            value={form.zone}
                            onChange={(value) => update('zone', value)}
                            error={errors.zone}
                            otherValue={form.zone_other}
                            onOtherChange={(value) => update('zone_other', value)}
                            otherError={errors.zone_other}
                          />
                          <SingleChoice
                            name="experience"
                            number={3}
                            label="Depuis combien de temps exercez-vous comme livreur ?"
                            options={EXPERIENCE_OPTIONS}
                            value={form.experience}
                            onChange={(value) => update('experience', value)}
                            error={errors.experience}
                          />
                          <SingleChoice
                            name="availability"
                            number={4}
                            label="Quelle serait votre disponibilité pour livrer ?"
                            options={AVAILABILITY_OPTIONS}
                            value={form.availability}
                            onChange={(value) => update('availability', value)}
                            error={errors.availability}
                          />
                          <SingleChoice
                            name="source"
                            number={5}
                            label="Comment avez-vous connu ce questionnaire ?"
                            options={SOURCE_OPTIONS}
                            value={form.source}
                            onChange={(value) => update('source', value)}
                            required={false}
                            otherValue={form.source_other}
                            onOtherChange={(value) => update('source_other', value)}
                          />
                        </>
                      )}

                      {step === 1 && (
                        <>
                          <MultiChoice
                            label="Quelles applications ou plateformes utilisez-vous aujourd’hui pour livrer ?"
                            options={PLATFORM_OPTIONS}
                            values={form.platforms_used}
                            number={6}
                            onToggle={(value) => toggleValue('platforms_used', value)}
                            error={errors.platforms_used}
                            otherValue={form.platforms_used_other}
                            onOtherChange={(value) => update('platforms_used_other', value)}
                            otherError={errors.platforms_used_other}
                          />
                          <SingleChoice
                            name="weekly_deliveries"
                            number={7}
                            label="Combien de courses effectuez-vous en moyenne par semaine ?"
                            options={WEEKLY_DELIVERIES}
                            value={form.weekly_deliveries}
                            onChange={(value) => update('weekly_deliveries', value)}
                            error={errors.weekly_deliveries}
                          />
                          <SingleChoice
                            name="weekly_income"
                            number={8}
                            label="Combien gagnez-vous en moyenne par semaine avec la livraison ?"
                            options={WEEKLY_INCOME}
                            value={form.weekly_income}
                            onChange={(value) => update('weekly_income', value)}
                            error={errors.weekly_income}
                          />
                          <MultiChoice
                            label="Quels sont les principaux problèmes que vous rencontrez dans votre activité de livreur ?"
                            options={PROBLEMS}
                            values={form.problems}
                            number={9}
                            onToggle={(value) => toggleValue('problems', value)}
                            error={errors.problems}
                            otherValue={form.problems_other}
                            onOtherChange={(value) => update('problems_other', value)}
                            otherError={errors.problems_other}
                          />
                          <TextAreaField
                            label="Racontez-nous la pire expérience que vous avez vécue pendant une livraison."
                            value={form.worst_experience}
                            number={10}
                            onChange={(value) => update('worst_experience', value)}
                            error={errors.worst_experience}
                            placeholder="Décrivez brièvement ce qui s'est passé..."
                            rows={5}
                          />
                        </>
                      )}

                      {step === 2 && (
                        <>
                          <SingleChoice
                            name="expected_payment_model"
                            number={11}
                            label="Quel mode de rémunération préférez-vous ?"
                            options={PAYMENT_MODELS}
                            value={form.expected_payment_model}
                            onChange={(value) => update('expected_payment_model', value)}
                            error={errors.expected_payment_model}
                          />
                          <SingleChoice
                            name="expected_weekly_income"
                            number={12}
                            label="Quel revenu hebdomadaire souhaiteriez-vous atteindre avec Airmess ?"
                            options={EXPECTED_INCOME}
                            value={form.expected_weekly_income}
                            onChange={(value) => update('expected_weekly_income', value)}
                            error={errors.expected_weekly_income}
                          />
                          <SingleChoice
                            name="mobile_money_trust"
                            number={13}
                            label="Faites-vous confiance au Mobile Money (MTN MoMo / Moov Money) pour recevoir vos gains ?"
                            options={MOBILE_MONEY_OPTIONS}
                            value={form.mobile_money_trust}
                            onChange={(value) => update('mobile_money_trust', value)}
                            error={errors.mobile_money_trust}
                          />
                          <InterestScale
                            value={form.interest_level}
                            number={14}
                            onChange={(value) => update('interest_level', value)}
                            error={errors.interest_level}
                          />
                          <SingleChoice
                            name="launch_availability"
                            number={15}
                            label="Seriez-vous disponible pour commencer à livrer au lancement du service ?"
                            options={LAUNCH_OPTIONS}
                            value={form.launch_availability}
                            onChange={(value) => update('launch_availability', value)}
                            error={errors.launch_availability}
                          />
                        </>
                      )}

                      {step === 3 && (
                        <>
                          <Input
                            label="16. Nom et prénom"
                            value={form.full_name}
                            onChange={(event) => update('full_name', event.target.value)}
                            error={errors.full_name}
                            placeholder="Votre nom et prénom"
                          />
                          <Input
                            label="17. Adresse email"
                            type="email"
                            value={form.email}
                            onChange={(event) => update('email', event.target.value)}
                            error={errors.email}
                            helper="Ex. nom@exemple.com"
                            placeholder="nom@exemple.com"
                            autoComplete="email"
                            inputMode="email"
                          />
                          <Input
                            label="18. Numéro WhatsApp"
                            value={form.whatsapp}
                            onChange={(event) => update('whatsapp', event.target.value)}
                            error={errors.whatsapp}
                            helper="8 chiffres, avec ou sans indicatif +229 (ex. 90123456 ou +22990123456)."
                            placeholder="90123456 ou +22990123456"
                            leftIcon={<WhatsappIcon size={17} />}
                            inputMode="tel"
                          />

                          <Card variant="default" padding="md" className="border-warm-200">
                            <div className="mb-2 flex items-center gap-2">
                              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-success-bg text-success">
                                <CheckIcon size={13} />
                              </span>
                              <h4 className="text-body-l font-bold text-ink">
                                Récapitulatif de votre inscription
                              </h4>
                            </div>
                            <p className="mb-4 text-caption text-warm-500">
                              Vérifiez ces informations avant d’envoyer votre réponse. Vous
                              serez automatiquement ajouté à la liste d’attente.
                            </p>
                            <SummaryRow
                              label="Véhicule"
                              value={form.vehicle_type}
                              onEdit={() => goToStep(0)}
                            />
                            <SummaryRow
                              label="Zone"
                              value={form.zone === 'Autre' ? form.zone_other : form.zone}
                              onEdit={() => goToStep(0)}
                            />
                            <SummaryRow
                              label="Expérience"
                              value={form.experience}
                              onEdit={() => goToStep(0)}
                            />
                            <SummaryRow
                              label="Plateformes utilisées"
                              value={form.platforms_used.join(', ')}
                              onEdit={() => goToStep(1)}
                            />
                            <SummaryRow
                              label="Niveau d’intérêt"
                              value={form.interest_level ? `${form.interest_level}/5` : '—'}
                              onEdit={() => goToStep(2)}
                            />
                            <SummaryRow
                              label="Contact"
                              value={`${form.full_name} · ${form.email} · ${form.whatsapp}`}
                              onEdit={() => goToStep(3)}
                            />
                          </Card>

                          <div className="rounded-xl border border-airmess-yellow/50 bg-airmess-yellow/10 p-5">
                            <div className="flex items-start gap-3">
                              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-airmess-yellow text-ink">
                                <SparklesIcon size={17} />
                              </span>
                              <div>
                                <p className="text-body font-bold text-ink">
                                  Inscription prioritaire confirmée
                                </p>
                                <p className="mt-1 text-body-s text-warm-600">
                                  Les livreurs inscrits sur la liste d’attente seront
                                  contactés en priorité pour leur activation au lancement.
                                </p>
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="mt-10 flex flex-col-reverse gap-3 border-t border-warm-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
                      {step > 0 ? (
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={handleBack}
                          leftIcon={<ArrowLeftIcon size={18} />}
                        >
                          Précédent
                        </Button>
                      ) : (
                        <span />
                      )}

                      {isLastStep ? (
                        <Button
                          type="submit"
                          size="lg"
                          fullWidth
                          loading={loading}
                          rightIcon={<SparklesIcon size={18} />}
                          className="sm:w-auto sm:min-w-[280px]"
                        >
                          Rejoindre la liste d’attente
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          size="lg"
                          onClick={handleNext}
                          rightIcon={<ArrowRightIcon size={18} />}
                          className="sm:w-auto sm:min-w-[200px]"
                        >
                          Continuer
                        </Button>
                      )}
                    </div>
                  </form>
                </div>
              </Card>
            </section>
          </>
        )}
      </main>

      <Footer />
    </div>
  )
}

function Header() {
  return (
    <header className="bg-airmess-dark text-cream">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link to="/" aria-label="Airmess — retour à l'accueil" className="inline-flex">
          <img
            src={wordmarkWhite}
            alt="Airmess"
            className="h-8 w-auto"
          />
        </Link>
        <Link
          to="/register/driver"
          className="text-caption font-bold text-cream/80 transition-colors hover:text-cream"
        >
          Devenir livreur
        </Link>
      </div>
    </header>
  )
}

function Hero() {
  return (
    <section className="grid items-center gap-10 py-8 md:grid-cols-2 md:py-12">
      <div>
        <PageEyebrow label="Étude de marché livreurs" className="mb-5" />
        <h1 className="text-h1 text-ink">
          Votre avis compte. Votre{' '}
          <Highlight>activité</Highlight>{' '}
          aussi.
        </h1>
        <p className="mt-5 max-w-xl text-body-l text-warm-600">
          Répondez à notre enquête en 5 minutes. Votre réponse vous inscrit
          automatiquement sur la liste d’attente des livreurs pour être activé en
          priorité au lancement du service.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button
            type="button"
            size="lg"
            pill
            onClick={() =>
              document.getElementById('formulaire')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }
            rightIcon={<ArrowRightIcon size={18} />}
          >
            Commencer l’enquête
          </Button>
          <Link to="/">
            <Button type="button" variant="secondary" size="lg">
              Découvrir Air Mess
            </Button>
          </Link>
        </div>

        <p className="mt-5 text-caption text-warm-500">
          Vos réponses restent confidentielles et servent uniquement à construire un
          service adapté aux livreurs.
        </p>
      </div>

      <div className="relative">
        <div className="overflow-hidden rounded-2xl border border-warm-200 shadow-md">
          <img
            src="/images/landingpage-commercants.png"
            alt="Illustration de la solution de livraison Airmess pour livreurs"
            className="h-auto w-full object-cover"
          />
        </div>
        <div className="absolute -bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full bg-airmess-yellow px-4 py-2 text-caption font-bold text-ink shadow-md">
          <SparklesIcon size={15} />
          Activation prioritaire au lancement
        </div>
      </div>
    </section>
  )
}

function Benefits() {
  const benefits = [
    {
      icon: <BikeIcon size={20} />,
      title: 'Inscription prioritaire',
      text: 'Votre place sur la liste d’attente est réservée pour l’activation au lancement.',
    },
    {
      icon: <ClockIcon size={20} />,
      title: '5 minutes seulement',
      text: 'Des questions simples pour comprendre votre quotidien de livreur.',
    },
    {
      icon: <RouteIcon size={20} />,
      title: 'Des courses mieux organisées',
      text: 'Vos réponses nous aident à bâtir une plateforme qui répond à vos attentes.',
    },
  ]

  return (
    <section className="mb-12 grid gap-4 md:grid-cols-3">
      {benefits.map((benefit) => (
        <Card key={benefit.title} variant="elevated" padding="md" className="text-center">
          <span className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-airmess-yellow/20 text-ink">
            {benefit.icon}
          </span>
          <h3 className="text-body-l font-bold text-ink">{benefit.title}</h3>
          <p className="mt-2 text-body-s text-warm-500">{benefit.text}</p>
        </Card>
      ))}
    </section>
  )
}

function SuccessPanel({
  response,
  onShare,
  onReset,
}: {
  response: DriverWaitlistResponse
  onShare: () => void
  onReset: () => void
}) {
  return (
    <section className="mx-auto max-w-2xl">
      <Card variant="signature" padding="none" className="overflow-hidden text-center">
        <div className="p-6 sm:p-10">
          <span className="mx-auto mb-5 inline-flex h-16 w-16 items-center justify-center rounded-full bg-success-bg text-success">
            <CheckIcon size={30} />
          </span>
          <PageEyebrow label="Inscription confirmée" className="mb-4" />
          <h2 className="text-h2 text-ink">Vous êtes sur la liste d’attente !</h2>
          <p className="mx-auto mt-3 max-w-xl text-body text-warm-500">
            Merci pour vos réponses. Elles nous aident à construire un service qui répond
            vraiment aux besoins des livreurs.
          </p>

          <div className="mx-auto mt-8 max-w-md rounded-xl border border-warm-200 bg-off-white p-6">
            <p className="text-caption font-bold uppercase tracking-wide text-warm-500">
              Votre statut
            </p>
            <p className="mt-2 text-body font-bold text-ink">
              Inscription prioritaire
            </p>
            <p className="mt-1 text-caption text-warm-500">
              Vous serez contacté pour votre activation au lancement du service.
            </p>
            <div className="mt-5 rounded-lg bg-airmess-yellow px-4 py-4">
              <p className="text-caption font-bold uppercase tracking-wider text-ink/70">
                Référence d’inscription
              </p>
              <p className="mt-1 text-h3 font-bold tracking-wide text-ink">
                #{response.waitlist.id}
              </p>
            </div>
          </div>

          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Button type="button" variant="dark" onClick={onShare} leftIcon={<ShareIcon size={17} />}>
              Partager sur WhatsApp
            </Button>
          </div>

          <button
            type="button"
            onClick={onReset}
            className="mt-8 text-body-s font-bold text-airmess-red hover:underline"
          >
            Remplir un autre formulaire
          </button>
        </div>
      </Card>
    </section>
  )
}

function Footer() {
  return (
    <footer className="border-t border-warm-200 py-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 text-center sm:px-6 lg:px-8">
        <p className="text-caption text-warm-500">
          © {new Date().getFullYear()} Air Mess — Étude de marché auprès des livreurs.
        </p>
        <p className="text-caption text-warm-400">
          Les premiers livreurs inscrits seront contactés en priorité pour leur activation
          au lancement du service.
        </p>
      </div>
    </footer>
  )
}
