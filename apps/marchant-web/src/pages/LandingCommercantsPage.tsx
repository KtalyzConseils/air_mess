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
  CheckIcon,
  ClockIcon,
  ShareIcon,
  SparklesIcon,
  StoreIcon,
  WhatsappIcon,
} from '../components/ui/icons'
import {
  submitMerchantWaitlist,
  type MerchantWaitlistPayload,
  type MerchantWaitlistResponse,
} from '../api/waitlist'
import wordmarkWhite from '../assets/logo/airmess-wordmark-white.svg'

type FormState = {
  commerce_type: string
  commerce_type_other: string
  zone: string
  zone_other: string
  weekly_orders: string
  source: string
  source_other: string
  delivery_methods: string[]
  delivery_methods_other: string
  problems: string[]
  problems_other: string
  worst_experience: string
  cash_collection_issue: string
  time_lost_weekly: string
  orders_lost_weekly: string
  expected_benefit: string
  commission_acceptance: string
  reasonable_fee: string
  mobile_money_trust: string
  interest_level: number
  trial_interest: string
  shop_name: string
  contact_name: string
  email: string
  whatsapp: string
}

const INITIAL_FORM: FormState = {
  commerce_type: '',
  commerce_type_other: '',
  zone: '',
  zone_other: '',
  weekly_orders: '',
  source: '',
  source_other: '',
  delivery_methods: [],
  delivery_methods_other: '',
  problems: [],
  problems_other: '',
  worst_experience: '',
  cash_collection_issue: '',
  time_lost_weekly: '',
  orders_lost_weekly: '',
  expected_benefit: '',
  commission_acceptance: '',
  reasonable_fee: '',
  mobile_money_trust: '',
  interest_level: 0,
  trial_interest: '',
  shop_name: '',
  contact_name: '',
  email: '',
  whatsapp: '',
}

const COMMERCE_TYPES = [
  'Restauration rapide / plats préparés',
  'Épicerie / supermarché',
  'Produits frais (fruits, légumes, viande, poisson)',
  'Autre commerce de détail',
  'Autre',
]

const ZONES = ['Cotonou', 'Abomey-Calavi', 'Autre']

const WEEKLY_ORDERS = ['Moins de 10', '10 à 30', '30 à 70', 'Plus de 70']

const SOURCE_OPTIONS = [
  'WhatsApp',
  'Publicité Facebook',
  'Publicité Google',
  'Site web Airmess',
  'LinkedIn',
  'Autre',
]

const DELIVERY_METHODS = [
  'Je ne livre pas, vente sur place uniquement',
  'Moi-même ou un employé du commerce',
  'Un ou des zémidjans sollicités au cas par cas',
  "Un livreur que j'emploie à temps plein",
  'Une plateforme de livraison existante',
  'Autre',
]

const PROBLEMS = [
  'Coût trop élevé',
  'Livreurs non fiables / en retard',
  'Pas de livreur disponible aux heures de pointe',
  'Difficile de trouver un livreur de confiance',
  "Problèmes avec l'argent collecté par le livreur (retard, montant incorrect, disparition)",
  'Clients mécontents des délais',
  'Produits endommagés ou renversés en route',
  'Communication difficile avec le client pendant la livraison',
  'Aucun problème particulier',
  'Autre',
]

const CASH_ISSUES = [
  'Oui, plusieurs fois',
  'Oui, une fois',
  'Non, jamais',
  "Je ne fais pas encaisser mes livreurs (paiement à l'avance ou sur place)",
]

const TIME_LOST = ["Moins d'1 heure", '1 à 3 heures', '3 à 6 heures', 'Plus de 6 heures']

const ORDERS_LOST = ['Aucune', '1 à 3', '4 à 10', 'Plus de 10']

const COMMISSION_OPTIONS = [
  'Oui, sans hésiter',
  'Oui, si le prix est raisonnable',
  'Non, je préfère gérer moi-même',
  'Je ne sais pas',
]

const FEE_OPTIONS = [
  'Moins de 300 FCFA',
  '300 à 500 FCFA',
  '500 à 750 FCFA',
  '750 à 1000 FCFA',
  'Plus de 1000 FCFA',
  'Je ne sais pas',
]

const MOBILE_MONEY_OPTIONS = [
  'Oui, totalement',
  'Oui, mais avec des réserves',
  'Non, je préfère le cash',
  "Je n'utilise pas le Mobile Money",
]

const TRIAL_OPTIONS = ['Oui', 'Non', "Peut-être, j'ai besoin d'en savoir plus"]

const WHATSAPP_PATTERN = /^(?:\+229\s?)?01(?:\s?\d{2}){4}$/
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
    id: 'commerce',
    marker: 'Votre commerce',
    short: 'Commerce',
    title: 'Parlons de votre commerce',
    description:
      'Quelques informations pour mieux comprendre qui vous êtes et d’où vous venez.',
  },
  {
    id: 'livraison',
    marker: 'Votre quotidien',
    short: 'Livraison',
    title: 'Comment se passe la livraison aujourd’hui ?',
    description:
      'Vos réponses nous permettent d’identifier les vrais blocages des commerçants.',
  },
  {
    id: 'solution',
    marker: 'Votre avis',
    short: 'Solution',
    title: 'Ce qui changerait la donne',
    description:
      'Dites-nous ce que vous attendez d’un service de livraison pensé pour les commerçants.',
  },
  {
    id: 'inscription',
    marker: 'Votre inscription',
    short: 'Inscription',
    title: 'Finalisons votre inscription',
    description:
      'Laissez vos coordonnées pour rejoindre la liste d’attente et recevoir votre bonus de 500 F.',
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
        Sur une échelle de 1 à 5, quel est votre niveau d'intérêt pour un service qui
        recrute des livreurs fiables, suit chaque commande en temps réel, et encaisse
        l'argent client en toute sécurité pour vous ?
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

export default function LandingCommercantsPage() {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState('')
  const [response, setResponse] = useState<MerchantWaitlistResponse | null>(null)

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

  const toggleValue = (field: 'delivery_methods' | 'problems', value: string) => {
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
      if (!form.commerce_type) nextErrors.commerce_type = 'Sélectionnez votre type de commerce.'
      if (form.commerce_type === 'Autre' && !form.commerce_type_other.trim()) {
        nextErrors.commerce_type_other = 'Précisez votre type de commerce.'
      }
      if (!form.zone) nextErrors.zone = 'Sélectionnez votre zone.'
      if (form.zone === 'Autre' && !form.zone_other.trim()) {
        nextErrors.zone_other = 'Précisez votre zone.'
      }
      if (!form.weekly_orders) nextErrors.weekly_orders = 'Sélectionnez une réponse.'
    }

    if (stepIndex === 1) {
      if (form.delivery_methods.length === 0) {
        nextErrors.delivery_methods = 'Sélectionnez au moins une réponse.'
      }
      if (
        form.delivery_methods.includes('Autre') &&
        !form.delivery_methods_other.trim()
      ) {
        nextErrors.delivery_methods_other = 'Précisez votre mode de livraison.'
      }
      if (form.problems.length === 0) {
        nextErrors.problems = 'Sélectionnez au moins une réponse.'
      }
      if (form.problems.includes('Autre') && !form.problems_other.trim()) {
        nextErrors.problems_other = 'Précisez le problème rencontré.'
      }
      if (!form.worst_experience.trim()) {
        nextErrors.worst_experience = 'Partagez une courte réponse, même en quelques mots.'
      }
      if (!form.cash_collection_issue) nextErrors.cash_collection_issue = 'Sélectionnez une réponse.'
      if (!form.time_lost_weekly) nextErrors.time_lost_weekly = 'Sélectionnez une réponse.'
      if (!form.orders_lost_weekly) nextErrors.orders_lost_weekly = 'Sélectionnez une réponse.'
    }

    if (stepIndex === 2) {
      if (!form.expected_benefit.trim()) {
        nextErrors.expected_benefit = 'Partagez votre réponse.'
      }
      if (!form.commission_acceptance) nextErrors.commission_acceptance = 'Sélectionnez une réponse.'
      if (!form.reasonable_fee) nextErrors.reasonable_fee = 'Sélectionnez une réponse.'
      if (!form.mobile_money_trust) nextErrors.mobile_money_trust = 'Sélectionnez une réponse.'
      if (form.interest_level === 0) nextErrors.interest_level = 'Sélectionnez une note.'
      if (!form.trial_interest) nextErrors.trial_interest = 'Sélectionnez une réponse.'
    }

    if (stepIndex === 3) {
      if (!form.shop_name.trim()) nextErrors.shop_name = 'Indiquez le nom du commerce.'
      if (!form.contact_name.trim()) nextErrors.contact_name = 'Indiquez le nom du contact.'
      if (!form.email.trim()) {
        nextErrors.email = 'Indiquez votre adresse email.'
      } else if (!EMAIL_PATTERN.test(form.email.trim())) {
        nextErrors.email = 'Format attendu : nom@exemple.com.'
      }
      if (!form.whatsapp.trim()) {
        nextErrors.whatsapp = 'Indiquez votre numéro WhatsApp.'
      } else if (!WHATSAPP_PATTERN.test(form.whatsapp.trim())) {
        nextErrors.whatsapp = 'Format attendu : 10 chiffres commençant par 01, ou +229 suivi de 01 et 8 chiffres.'
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

  const buildPayload = (): MerchantWaitlistPayload => ({
    commerce_type: form.commerce_type,
    commerce_type_other: form.commerce_type === 'Autre' ? form.commerce_type_other.trim() : undefined,
    zone: form.zone,
    zone_other: form.zone === 'Autre' ? form.zone_other.trim() : undefined,
    weekly_orders: form.weekly_orders,
    source: form.source || undefined,
    source_other: form.source === 'Autre' ? form.source_other.trim() : undefined,
    delivery_methods: form.delivery_methods,
    delivery_methods_other: form.delivery_methods.includes('Autre')
      ? form.delivery_methods_other.trim()
      : undefined,
    problems: form.problems,
    problems_other: form.problems.includes('Autre') ? form.problems_other.trim() : undefined,
    worst_experience: form.worst_experience.trim(),
    cash_collection_issue: form.cash_collection_issue,
    time_lost_weekly: form.time_lost_weekly,
    orders_lost_weekly: form.orders_lost_weekly,
    expected_benefit: form.expected_benefit.trim(),
    commission_acceptance: form.commission_acceptance,
    reasonable_fee: form.reasonable_fee,
    mobile_money_trust: form.mobile_money_trust,
    interest_level: form.interest_level,
    trial_interest: form.trial_interest,
    shop_name: form.shop_name.trim(),
    contact_name: form.contact_name.trim(),
    email: form.email.trim(),
    whatsapp: form.whatsapp.trim().replace(/\s+/g, ''),
  })

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextErrors = validateStep(step)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setLoading(true)
    setServerError('')
    try {
      const data = await submitMerchantWaitlist(buildPayload())
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
    if (!response) return
    const text =
      `Je viens de rejoindre la liste d'attente Airmess et j'ai débloqué ${response.waitlist.bonus_amount} F CFA ` +
      `sur ma première commande, appliqués automatiquement avec mon futur compte. ` +
      `https://airmess-logistics.com/landing/merchants_learn`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="min-h-screen bg-cream text-ink">
      <Header />

      <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        {response ? (
          <SuccessPanel
            response={response}
            onShare={shareOnWhatsApp}
            onReset={resetForm}
          />
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
                        commerçants est automatique. Bonus de 500 F débloqué immédiatement.
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
                            name="commerce_type"
                            number={1}
                            label="Quel type de commerce gérez-vous ?"
                            options={COMMERCE_TYPES}
                            value={form.commerce_type}
                            onChange={(value) => update('commerce_type', value)}
                            error={errors.commerce_type}
                            otherValue={form.commerce_type_other}
                            onOtherChange={(value) => update('commerce_type_other', value)}
                            otherError={errors.commerce_type_other}
                          />
                          <SingleChoice
                            name="zone"
                            number={2}
                            label="Dans quelle zone se trouve votre commerce ?"
                            options={ZONES}
                            value={form.zone}
                            onChange={(value) => update('zone', value)}
                            error={errors.zone}
                            otherValue={form.zone_other}
                            onOtherChange={(value) => update('zone_other', value)}
                            otherError={errors.zone_other}
                          />
                          <SingleChoice
                            name="weekly_orders"
                            number={3}
                            label="Combien de commandes traitez-vous en moyenne par semaine ?"
                            options={WEEKLY_ORDERS}
                            value={form.weekly_orders}
                            onChange={(value) => update('weekly_orders', value)}
                            error={errors.weekly_orders}
                          />
                          <SingleChoice
                            name="source"
                            number={4}
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
                            label="Comment livrez-vous actuellement vos commandes ?"
                            options={DELIVERY_METHODS}
                            values={form.delivery_methods}
                            number={5}
                            onToggle={(value) => toggleValue('delivery_methods', value)}
                            error={errors.delivery_methods}
                            otherValue={form.delivery_methods_other}
                            onOtherChange={(value) => update('delivery_methods_other', value)}
                            otherError={errors.delivery_methods_other}
                          />
                          <MultiChoice
                            label="Quels sont les principaux problèmes que vous rencontrez avec la livraison ?"
                            options={PROBLEMS}
                            values={form.problems}
                            number={6}
                            onToggle={(value) => toggleValue('problems', value)}
                            error={errors.problems}
                            otherValue={form.problems_other}
                            onOtherChange={(value) => update('problems_other', value)}
                            otherError={errors.problems_other}
                          />
                          <TextAreaField
                            label="Racontez-nous la pire expérience de livraison que vous ayez vécue avec un client, un livreur ou une plateforme."
                            value={form.worst_experience}
                            number={7}
                            onChange={(value) => update('worst_experience', value)}
                            error={errors.worst_experience}
                            placeholder="Décrivez brièvement ce qui s'est passé..."
                            rows={5}
                          />
                          <SingleChoice
                            name="cash_collection_issue"
                            number={8}
                            label="Vous est-il déjà arrivé de perdre de l'argent ou d'avoir un litige avec un livreur chargé d'encaisser un client ?"
                            options={CASH_ISSUES}
                            value={form.cash_collection_issue}
                            onChange={(value) => update('cash_collection_issue', value)}
                            error={errors.cash_collection_issue}
                          />
                          <SingleChoice
                            name="time_lost_weekly"
                            number={9}
                            label="Combien de temps par semaine estimez-vous perdre à gérer les soucis de livraison (chercher un livreur, suivre une commande, gérer une réclamation client) ?"
                            options={TIME_LOST}
                            value={form.time_lost_weekly}
                            onChange={(value) => update('time_lost_weekly', value)}
                            error={errors.time_lost_weekly}
                          />
                          <SingleChoice
                            name="orders_lost_weekly"
                            number={10}
                            label="Combien de commandes perdez-vous ou annulez-vous par semaine à cause d'un problème de livraison (pas de livreur disponible, client qui abandonne, etc.) ?"
                            options={ORDERS_LOST}
                            value={form.orders_lost_weekly}
                            onChange={(value) => update('orders_lost_weekly', value)}
                            error={errors.orders_lost_weekly}
                          />
                        </>
                      )}

                      {step === 2 && (
                        <>
                          <TextAreaField
                            label="Qu'est-ce qui vous ferait gagner le plus de temps ou de tranquillité d'esprit dans la gestion de vos livraisons ?"
                            value={form.expected_benefit}
                            number={11}
                            onChange={(value) => update('expected_benefit', value)}
                            error={errors.expected_benefit}
                            placeholder="Ex. trouver un livreur fiable en quelques minutes..."
                            rows={5}
                          />
                          <SingleChoice
                            name="commission_acceptance"
                            number={12}
                            label="Accepteriez-vous de payer une commission par livraison pour qu'un tiers gère à votre place tout le processus (recherche du livreur, suivi de la commande, encaissement sécurisé de l'argent client) ?"
                            options={COMMISSION_OPTIONS}
                            value={form.commission_acceptance}
                            onChange={(value) => update('commission_acceptance', value)}
                            error={errors.commission_acceptance}
                          />
                          <SingleChoice
                            name="reasonable_fee"
                            number={13}
                            label="Quel montant par livraison vous semblerait raisonnable pour un tel service ?"
                            options={FEE_OPTIONS}
                            value={form.reasonable_fee}
                            onChange={(value) => update('reasonable_fee', value)}
                            error={errors.reasonable_fee}
                          />
                          <SingleChoice
                            name="mobile_money_trust"
                            number={14}
                            label="Faites-vous confiance au Mobile Money (MTN MoMo / Moov Money) pour recevoir le paiement de vos ventes livrées ?"
                            options={MOBILE_MONEY_OPTIONS}
                            value={form.mobile_money_trust}
                            onChange={(value) => update('mobile_money_trust', value)}
                            error={errors.mobile_money_trust}
                          />
                          <InterestScale
                            value={form.interest_level}
                            number={15}
                            onChange={(value) => update('interest_level', value)}
                            error={errors.interest_level}
                          />
                          <SingleChoice
                            name="trial_interest"
                            number={16}
                            label="Seriez-vous intéressé pour tester ce service gratuitement pendant une période d'essai, dès son lancement ?"
                            options={TRIAL_OPTIONS}
                            value={form.trial_interest}
                            onChange={(value) => update('trial_interest', value)}
                            error={errors.trial_interest}
                          />
                        </>
                      )}

                      {step === 3 && (
                        <>
                          <div className="grid gap-5 md:grid-cols-2">
                            <Input
                              label="17. Nom du commerce"
                              value={form.shop_name}
                              onChange={(event) => update('shop_name', event.target.value)}
                              error={errors.shop_name}
                              placeholder="Ex. Chez Aïcha"
                              leftIcon={<StoreIcon size={17} />}
                            />
                            <Input
                              label="18. Nom du contact"
                              value={form.contact_name}
                              onChange={(event) => update('contact_name', event.target.value)}
                              error={errors.contact_name}
                              placeholder="Votre nom et prénom"
                            />
                          </div>
                          <Input
                            label="19. Adresse email"
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
                            label="20. Numéro WhatsApp"
                            value={form.whatsapp}
                            onChange={(event) => update('whatsapp', event.target.value)}
                            error={errors.whatsapp}
                            helper="Ex. 0190123456 ou +229 01 90 12 34 56."
                            placeholder="0190123456 ou +229 01 90 12 34 56"
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
                              label="Commerce"
                              value={form.commerce_type === 'Autre' ? form.commerce_type_other : form.commerce_type}
                              onEdit={() => goToStep(0)}
                            />
                            <SummaryRow
                              label="Zone"
                              value={form.zone === 'Autre' ? form.zone_other : form.zone}
                              onEdit={() => goToStep(0)}
                            />
                            <SummaryRow
                              label="Livraison actuelle"
                              value={form.delivery_methods.join(', ')}
                              onEdit={() => goToStep(1)}
                            />
                            <SummaryRow
                              label="Problèmes principaux"
                              value={form.problems.join(', ')}
                              onEdit={() => goToStep(1)}
                            />
                            <SummaryRow
                              label="Niveau d’intérêt"
                              value={form.interest_level ? `${form.interest_level}/5` : '—'}
                              onEdit={() => goToStep(2)}
                            />
                            <SummaryRow
                              label="Contact"
                              value={`${form.contact_name} · ${form.shop_name} · ${form.whatsapp}`}
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
                                  Votre bonus de 500 F CFA est prêt
                                </p>
                                <p className="mt-1 text-body-s text-warm-600">
                                  Il sera offert sur votre première commande de livraison dès
                                  le lancement du service. Votre code unique s’affichera après
                                  l’envoi.
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
                          M'inscrire et obtenir mon bonus
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
          to="/login"
          className="text-caption font-bold text-cream/80 transition-colors hover:text-cream"
        >
          Espace commerçant
        </Link>
      </div>
    </header>
  )
}

function Hero() {
  return (
    <section className="grid items-center gap-10 py-8 md:grid-cols-2 md:py-12">
      <div>
        <PageEyebrow label="Étude de marché commerçants" className="mb-5" />
        <h1 className="text-h1 text-ink">
          Votre avis compte. Votre{' '}
          <Highlight>livraison</Highlight>{' '}
          aussi.
        </h1>
        <p className="mt-5 max-w-xl text-body-l text-warm-600">
          Répondez à notre enquête en 5 minutes. Votre réponse vous inscrit
          automatiquement sur la liste d’attente et débloque{' '}
          <strong className="font-bold text-ink">500 F CFA offerts</strong> sur votre
          première commande dès le lancement du service.
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
          service adapté aux commerçants.
        </p>
      </div>

      <div className="relative">
        <div className="overflow-hidden rounded-2xl border border-warm-200 shadow-md">
          <img
            src="/images/recrutement-commercants.png"
            alt="Illustration des problèmes de livraison rencontrés par les commerçants"
            className="h-auto w-full object-contain"
          />
        </div>
        <div className="absolute -bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full bg-airmess-yellow px-4 py-2 text-caption font-bold text-ink shadow-md">
          <SparklesIcon size={15} />
          500 F CFA offerts sur votre 1ère commande
        </div>
      </div>
    </section>
  )
}

function Benefits() {
  const benefits = [
    {
      icon: <SparklesIcon size={20} />,
      title: 'Bonus de 500 F CFA',
      text: 'Débloqué immédiatement dès que votre réponse est envoyée.',
    },
    {
      icon: <ClockIcon size={20} />,
      title: '5 minutes seulement',
      text: 'Des questions simples pour comprendre votre quotidien de commerçant.',
    },
    {
      icon: <StoreIcon size={20} />,
      title: 'Inscription automatique',
      text: 'Une seule soumission : réponse à l’enquête et place sur la liste d’attente.',
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
  response: MerchantWaitlistResponse
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
            vraiment aux besoins des commerçants.
          </p>

          <div className="mx-auto mt-8 max-w-md rounded-xl border border-warm-200 bg-off-white p-6">
            <p className="text-caption font-bold uppercase tracking-wide text-warm-500">
              Votre bonus de bienvenue
            </p>
            <p className="mt-2 text-body font-bold text-ink">
              {response.waitlist.bonus_amount} F CFA offerts sur votre première commande
            </p>
            <p className="mt-1 text-caption text-warm-500">
              Appliqués automatiquement sur votre première course avec le compte associé à vos coordonnées.
            </p>
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
          © {new Date().getFullYear()} Air Mess — Étude de marché auprès des commerçants.
        </p>
        <p className="text-caption text-warm-400">
          Le bonus de 500 F CFA sera applicable sur la première commande de livraison après
          le lancement du service.
        </p>
      </div>
    </footer>
  )
}
