import { useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { AxiosError } from 'axios'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import PageEyebrow from '../../components/ui/PageEyebrow'
import SectionMarker from '../../components/ui/SectionMarker'
import Highlight from '../../components/Highlight'
import Input from '../../components/ui/Input'
import {
  ArrowRightIcon,
  CheckIcon,
  ClockIcon,
  ShareIcon,
  SparklesIcon,
  StoreIcon,
  WhatsappIcon,
} from '../../components/ui/icons'
import {
  submitMerchantWaitlist,
  type MerchantWaitlistPayload,
  type MerchantWaitlistResponse,
} from '../../api/waitlist'
import wordmarkWhite from '../../assets/logo/airmess-wordmark-white.svg'

type FormState = {
  commerce_type: string
  commerce_type_other: string
  nda_partner: string
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
  whatsapp: string
}

const INITIAL_FORM: FormState = {
  commerce_type: '',
  commerce_type_other: '',
  nda_partner: '',
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
  whatsapp: '',
}

const COMMERCE_TYPES = [
  'Restauration rapide / plats préparés',
  'Épicerie / supermarché',
  'Produits frais (fruits, légumes, viande, poisson)',
  'Autre commerce de détail',
  'Autre',
]

const NDA_OPTIONS = [
  'Oui',
  'Non',
  "Je ne sais pas ce qu'est NDA",
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

const WHATSAPP_PATTERN = /^(\+229)?[0-9]{8}$/

const textareaClass =
  'w-full rounded-md border border-warm-300 bg-off-white px-3.5 py-3 text-body-s text-ink placeholder:text-warm-400 focus:border-warm-500 focus:outline-none focus:shadow-glow-yellow'

interface SingleChoiceProps {
  name: string
  label: string
  options: string[]
  value: string
  onChange: (value: string) => void
  error?: string
  otherValue?: string
  onOtherChange?: (value: string) => void
  otherLabel?: string
  required?: boolean
}

function SingleChoice({
  name,
  label,
  options,
  value,
  onChange,
  error,
  otherValue,
  onOtherChange,
  otherLabel,
  required = false,
}: SingleChoiceProps) {
  return (
    <fieldset>
      <legend className="text-body-s font-bold text-ink mb-2.5">
        {label}
        {required && <span className="text-airmess-red"> *</span>}
      </legend>
      <div className="grid grid-cols-1 gap-2.5">
        {options.map((option) => {
          const selected = value === option
          return (
            <label
              key={option}
              className={`flex items-center gap-3 rounded-md border px-3.5 py-3 text-body-s cursor-pointer transition-colors ${
                selected
                  ? 'border-ink bg-airmess-yellow/20'
                  : 'border-warm-300 bg-off-white hover:border-warm-400'
              }`}
            >
              <input
                type="radio"
                name={name}
                value={option}
                checked={selected}
                onChange={() => onChange(option)}
                className="sr-only"
              />
              <span
                aria-hidden="true"
                className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                  selected ? 'border-ink' : 'border-warm-400'
                }`}
              >
                {selected && <span className="h-2 w-2 rounded-full bg-ink" />}
              </span>
              <span>{option}</span>
            </label>
          )
        })}
      </div>
      {value === 'Autre' && otherValue !== undefined && onOtherChange && (
        <textarea
          value={otherValue}
          onChange={(e) => onOtherChange(e.target.value)}
          placeholder={otherLabel ?? 'Précisez…'}
          rows={2}
          className={`${textareaClass} mt-2.5`}
        />
      )}
      {error && <p className="mt-1.5 text-caption text-airmess-red">{error}</p>}
    </fieldset>
  )
}

interface MultiChoiceProps {
  label: string
  options: string[]
  values: string[]
  onToggle: (value: string) => void
  error?: string
  otherValue?: string
  onOtherChange?: (value: string) => void
  required?: boolean
}

function MultiChoice({
  label,
  options,
  values,
  onToggle,
  error,
  otherValue,
  onOtherChange,
  required = false,
}: MultiChoiceProps) {
  return (
    <fieldset>
      <legend className="text-body-s font-bold text-ink mb-2.5">
        {label}
        {required && <span className="text-airmess-red"> *</span>}
      </legend>
      <div className="grid grid-cols-1 gap-2.5">
        {options.map((option) => {
          const selected = values.includes(option)
          return (
            <label
              key={option}
              className={`flex items-start gap-3 rounded-md border px-3.5 py-3 text-body-s cursor-pointer transition-colors ${
                selected
                  ? 'border-ink bg-airmess-yellow/20'
                  : 'border-warm-300 bg-off-white hover:border-warm-400'
              }`}
            >
              <input
                type="checkbox"
                value={option}
                checked={selected}
                onChange={() => onToggle(option)}
                className="sr-only"
              />
              <span
                aria-hidden="true"
                className={`mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                  selected ? 'border-ink bg-ink text-cream' : 'border-warm-400'
                }`}
              >
                {selected && <CheckIcon size={11} />}
              </span>
              <span>{option}</span>
            </label>
          )
        })}
      </div>
      {values.includes('Autre') && otherValue !== undefined && onOtherChange && (
        <textarea
          value={otherValue}
          onChange={(e) => onOtherChange(e.target.value)}
          placeholder="Précisez…"
          rows={2}
          className={`${textareaClass} mt-2.5`}
        />
      )}
      {error && <p className="mt-1.5 text-caption text-airmess-red">{error}</p>}
    </fieldset>
  )
}

function SectionTitle({
  number,
  label,
  description,
}: {
  number: number
  label: string
  description?: string
}) {
  return (
    <div className="mb-6">
      <SectionMarker number={number} label={label} />
      {description && <p className="mt-3 text-body-s text-warm-500">{description}</p>}
    </div>
  )
}

export default function LandingCommercantsPage() {
  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [apiError, setApiError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState<MerchantWaitlistResponse | null>(null)
  const [linkCopied, setLinkCopied] = useState(false)

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((previous) => ({ ...previous, [key]: value }) as FormState)
    setErrors((previous) => ({ ...previous, [key]: '' }) as Record<string, string>)
    setApiError(null)
  }

  function toggleArray(key: 'delivery_methods' | 'problems', value: string) {
    setForm((previous) => {
      const current = previous[key]
      const next = current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value]
      return { ...previous, [key]: next }
    })
    setErrors((previous) => ({ ...previous, [key]: '' }) as Record<string, string>)
  }

  function handleReset() {
    setForm(INITIAL_FORM)
    setErrors({})
    setApiError(null)
    setSuccess(null)
  }

  async function copyLandingLink() {
    const landingUrl = `${window.location.origin}/landing/merchants`
    try {
      await navigator.clipboard.writeText(landingUrl)
      setLinkCopied(true)
      window.setTimeout(() => setLinkCopied(false), 2000)
    } catch {
      alert(`Impossible de copier le lien. Copiez-le manuellement : ${landingUrl}`)
    }
  }

  function validate(): boolean {
    const nextErrors: Record<string, string> = {}

    if (!form.commerce_type) nextErrors.commerce_type = 'Sélectionnez votre type de commerce.'
    if (!form.nda_partner) nextErrors.nda_partner = 'Veuillez répondre.'
    if (!form.zone) nextErrors.zone = 'Indiquez votre zone.'
    if (!form.weekly_orders) nextErrors.weekly_orders = 'Sélectionnez une tranche.'
    if (form.delivery_methods.length === 0) nextErrors.delivery_methods = 'Cochez au moins une réponse.'
    if (form.problems.length === 0) nextErrors.problems = 'Cochez au moins un problème.'
    if (!form.worst_experience.trim()) nextErrors.worst_experience = 'Décrivez votre expérience.'
    if (!form.cash_collection_issue) nextErrors.cash_collection_issue = 'Veuillez répondre.'
    if (!form.time_lost_weekly) nextErrors.time_lost_weekly = 'Veuillez choisir une durée.'
    if (!form.orders_lost_weekly) nextErrors.orders_lost_weekly = 'Veuillez choisir une tranche.'
    if (!form.expected_benefit.trim()) nextErrors.expected_benefit = 'Indiquez ce qui vous ferait gagner du temps.'
    if (!form.commission_acceptance) nextErrors.commission_acceptance = 'Veuillez répondre.'
    if (!form.reasonable_fee) nextErrors.reasonable_fee = 'Choisissez un montant.'
    if (!form.mobile_money_trust) nextErrors.mobile_money_trust = 'Veuillez répondre.'
    if (!form.interest_level) nextErrors.interest_level = 'Choisissez une note de 1 à 5.'
    if (!form.trial_interest) nextErrors.trial_interest = 'Veuillez répondre.'
    if (form.whatsapp.trim() && !WHATSAPP_PATTERN.test(form.whatsapp.trim())) {
      nextErrors.whatsapp = 'Format attendu : 8 chiffres, avec ou sans indicatif +229.'
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setApiError(null)

    if (!validate()) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    const payload: MerchantWaitlistPayload = {
      commerce_type: form.commerce_type,
      ...(form.commerce_type === 'Autre' && form.commerce_type_other.trim()
        ? { commerce_type_other: form.commerce_type_other.trim() }
        : {}),
      nda_partner: form.nda_partner,
      zone: form.zone,
      ...(form.zone === 'Autre' && form.zone_other.trim()
        ? { zone_other: form.zone_other.trim() }
        : {}),
      weekly_orders: form.weekly_orders,
      ...(form.source ? { source: form.source } : {}),
      ...(form.source === 'Autre' && form.source_other.trim()
        ? { source_other: form.source_other.trim() }
        : {}),
      delivery_methods: form.delivery_methods,
      ...(form.delivery_methods.includes('Autre') && form.delivery_methods_other.trim()
        ? { delivery_methods_other: form.delivery_methods_other.trim() }
        : {}),
      problems: form.problems,
      ...(form.problems.includes('Autre') && form.problems_other.trim()
        ? { problems_other: form.problems_other.trim() }
        : {}),
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
      ...(form.shop_name.trim() ? { shop_name: form.shop_name.trim() } : {}),
      ...(form.contact_name.trim() ? { contact_name: form.contact_name.trim() } : {}),
      ...(form.whatsapp.trim() ? { whatsapp: form.whatsapp.trim() } : {}),
    }

    setLoading(true)
    try {
      const response = await submitMerchantWaitlist(payload)
      setSuccess(response)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (error) {
      let message = 'Une erreur est survenue. Merci de réessayer.'
      if (error instanceof AxiosError) {
        const data = error.response?.data as { message?: string } | undefined
        if (typeof data?.message === 'string' && data.message.trim()) {
          message = data.message
        }
      }
      setApiError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-cream">
      <header className="bg-airmess-dark text-cream px-4 md:px-6 py-3 md:py-4 border-b border-warm-600/20">
        <Link to="/" className="inline-flex items-center gap-3">
          <img src={wordmarkWhite} alt="Air Mess" className="h-6" />
        </Link>
      </header>

      <main className="max-w-6xl mx-auto px-4 md:px-6 py-8 md:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-8 lg:gap-12 items-center mb-10 md:mb-14">
          <div>
            <PageEyebrow label="Étude de marché · Commerçants" className="mb-4" />
            <h1 className="text-h1 md:text-display-2 text-ink leading-tight mb-3">
              Votre avis peut améliorer la <Highlight>livraison</Highlight> de vos commandes.
            </h1>
            <p className="text-body-l text-warm-500 mb-5">
              Aidez-nous à construire un service fiable pour les commerçants de
              Cotonou et Abomey-Calavi. En remplissant ce formulaire, vous êtes
              automatiquement inscrit sur la liste d'attente.
            </p>

            <div className="inline-flex items-center gap-2.5 rounded-full bg-airmess-yellow px-4 py-2 text-body-s font-bold text-ink shadow-sm">
              <SparklesIcon size={16} />
              500 F CFA offerts sur votre première commande de livraison
            </div>

            <div className="mt-4">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                leftIcon={<ShareIcon size={15} />}
                onClick={copyLandingLink}
              >
                {linkCopied ? 'Lien copie !' : 'Partager le lien'}
              </Button>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-3 text-body-s text-warm-600">
              <span className="inline-flex items-center gap-2">
                <ClockIcon size={15} className="text-airmess-red" />
                3 minutes environ
              </span>
              <span className="inline-flex items-center gap-2">
                <CheckIcon size={15} className="text-airmess-red" />
                Inscription automatique sur la liste d'attente
              </span>
            </div>
          </div>

          <div className="rounded-2xl overflow-hidden border border-warm-200 bg-off-white shadow-md">
            <img
              src="/images/landingpage-commercants.png"
              alt="Commerçants et livraison Air Mess"
              className="w-full h-auto object-cover"
            />
          </div>
        </div>

        {success ? (
          <SuccessPanel response={success} onReset={handleReset} />
        ) : (
          <Card variant="signature" padding="none" className="overflow-hidden">
            <div className="p-5 md:p-8">
              <div className="flex items-center gap-3 mb-6">
                <StoreIcon size={20} className="text-airmess-red" />
                <h2 className="text-h2 text-ink">Questionnaire commerçants</h2>
              </div>

              {apiError && (
                <div
                  role="alert"
                  className="bg-danger-bg border border-airmess-red/30 text-airmess-red px-4 py-3 rounded-md text-body-s mb-6"
                >
                  {apiError}
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate className="space-y-10">
                <section>
                  <SectionTitle
                    number={1}
                    label="Qui répond"
                    description="Ces réponses nous aident à segmenter les besoins des commerçants."
                  />
                  <div className="space-y-6">
                    <SingleChoice
                      name="commerce_type"
                      label="Quel type de commerce gérez-vous ?"
                      options={COMMERCE_TYPES}
                      value={form.commerce_type}
                      onChange={(value) => setField('commerce_type', value)}
                      error={errors.commerce_type}
                      otherValue={form.commerce_type_other}
                      onOtherChange={(value) => setField('commerce_type_other', value)}
                      otherLabel="Précisez votre type de commerce"
                      required
                    />

                    <SingleChoice
                      name="nda_partner"
                      label="Êtes-vous déjà partenaire d'une enseigne NDA (Bénin SuperMarché, Cotonou Pizza, Cotonou Poulet Frit, gbandj00.com, VamiaDoo, etc.) ?"
                      options={NDA_OPTIONS}
                      value={form.nda_partner}
                      onChange={(value) => setField('nda_partner', value)}
                      error={errors.nda_partner}
                      required
                    />

                    <SingleChoice
                      name="zone"
                      label="Dans quelle zone se trouve votre commerce ?"
                      options={ZONES}
                      value={form.zone}
                      onChange={(value) => setField('zone', value)}
                      error={errors.zone}
                      otherValue={form.zone_other}
                      onOtherChange={(value) => setField('zone_other', value)}
                      otherLabel="Précisez votre zone"
                      required
                    />

                    <SingleChoice
                      name="weekly_orders"
                      label="Combien de commandes traitez-vous en moyenne par semaine ?"
                      options={WEEKLY_ORDERS}
                      value={form.weekly_orders}
                      onChange={(value) => setField('weekly_orders', value)}
                      error={errors.weekly_orders}
                      required
                    />

                    <SingleChoice
                      name="source"
                      label="Comment avez-vous connu ce questionnaire ?"
                      options={SOURCE_OPTIONS}
                      value={form.source}
                      onChange={(value) => setField('source', value)}
                      otherValue={form.source_other}
                      onOtherChange={(value) => setField('source_other', value)}
                      otherLabel="Précisez"
                    />
                  </div>
                </section>

                <section>
                  <SectionTitle
                    number={2}
                    label="Comment ça se passe aujourd'hui"
                    description="Parlez-nous de votre expérience actuelle de la livraison."
                  />
                  <div className="space-y-6">
                    <MultiChoice
                      label="Comment livrez-vous actuellement vos commandes ?"
                      options={DELIVERY_METHODS}
                      values={form.delivery_methods}
                      onToggle={(value) => toggleArray('delivery_methods', value)}
                      error={errors.delivery_methods}
                      otherValue={form.delivery_methods_other}
                      onOtherChange={(value) => setField('delivery_methods_other', value)}
                      required
                    />

                    <MultiChoice
                      label="Quels sont les principaux problèmes que vous rencontrez avec la livraison de vos commandes ?"
                      options={PROBLEMS}
                      values={form.problems}
                      onToggle={(value) => toggleArray('problems', value)}
                      error={errors.problems}
                      otherValue={form.problems_other}
                      onOtherChange={(value) => setField('problems_other', value)}
                      required
                    />

                    <TextField
                      label="Racontez, avec vos propres mots, la pire expérience de livraison que vous avez vécue récemment."
                      value={form.worst_experience}
                      onChange={(value) => setField('worst_experience', value)}
                      error={errors.worst_experience}
                      placeholder="Décrivez ce qui s'est passé…"
                      rows={4}
                      required
                    />

                    <SingleChoice
                      name="cash_collection_issue"
                      label="Vous est-il déjà arrivé qu'un livreur reparte avec l'argent d'une commande sans vous le remettre, ou avec un montant incorrect ?"
                      options={CASH_ISSUES}
                      value={form.cash_collection_issue}
                      onChange={(value) => setField('cash_collection_issue', value)}
                      error={errors.cash_collection_issue}
                      required
                    />

                    <SingleChoice
                      name="time_lost_weekly"
                      label="Combien de temps par semaine estimez-vous perdre à gérer les soucis de livraison (chercher un livreur, suivre une commande, gérer une réclamation client) ?"
                      options={TIME_LOST}
                      value={form.time_lost_weekly}
                      onChange={(value) => setField('time_lost_weekly', value)}
                      error={errors.time_lost_weekly}
                      required
                    />

                    <SingleChoice
                      name="orders_lost_weekly"
                      label="Combien de commandes perdez-vous ou annulez-vous par semaine à cause d'un problème de livraison ?"
                      options={ORDERS_LOST}
                      value={form.orders_lost_weekly}
                      onChange={(value) => setField('orders_lost_weekly', value)}
                      error={errors.orders_lost_weekly}
                      required
                    />
                  </div>
                </section>

                <section>
                  <SectionTitle
                    number={3}
                    label="Ce qui changerait la donne"
                    description="Votre perception du service et du prix attendu."
                  />
                  <div className="space-y-6">
                    <TextField
                      label="Qu'est-ce qui vous ferait gagner le plus de temps ou de tranquillité d'esprit dans la gestion de vos livraisons ?"
                      value={form.expected_benefit}
                      onChange={(value) => setField('expected_benefit', value)}
                      error={errors.expected_benefit}
                      placeholder="Votre réponse…"
                      rows={4}
                      required
                    />

                    <SingleChoice
                      name="commission_acceptance"
                      label="Accepteriez-vous de payer une commission par livraison pour qu'un tiers gère à votre place tout le processus ?"
                      options={COMMISSION_OPTIONS}
                      value={form.commission_acceptance}
                      onChange={(value) => setField('commission_acceptance', value)}
                      error={errors.commission_acceptance}
                      required
                    />

                    <SingleChoice
                      name="reasonable_fee"
                      label="Quel montant par livraison vous semblerait raisonnable pour un tel service ?"
                      options={FEE_OPTIONS}
                      value={form.reasonable_fee}
                      onChange={(value) => setField('reasonable_fee', value)}
                      error={errors.reasonable_fee}
                      required
                    />

                    <SingleChoice
                      name="mobile_money_trust"
                      label="Faites-vous confiance au Mobile Money (MTN MoMo / Moov Money) pour recevoir le paiement de vos ventes livrées ?"
                      options={MOBILE_MONEY_OPTIONS}
                      value={form.mobile_money_trust}
                      onChange={(value) => setField('mobile_money_trust', value)}
                      error={errors.mobile_money_trust}
                      required
                    />

                    <InterestScale
                      value={form.interest_level}
                      onChange={(value) => setField('interest_level', value)}
                      error={errors.interest_level}
                    />

                    <SingleChoice
                      name="trial_interest"
                      label="Seriez-vous intéressé pour tester ce service gratuitement pendant une période d'essai, dès son lancement ?"
                      options={TRIAL_OPTIONS}
                      value={form.trial_interest}
                      onChange={(value) => setField('trial_interest', value)}
                      error={errors.trial_interest}
                      required
                    />
                  </div>
                </section>

                <section>
                  <SectionTitle
                    number={4}
                    label="Pour vous recontacter"
                    description="Facultatif : ces informations nous permettent de vous envoyer votre bonus et de vous prévenir du lancement."
                  />
                  <div className="space-y-5">
                    <Input
                      type="text"
                      label="Nom du commerce"
                      value={form.shop_name}
                      onChange={(e) => setField('shop_name', e.target.value)}
                      placeholder="Ex. Chez Clarisse"
                    />
                    <Input
                      type="text"
                      label="Nom du contact"
                      value={form.contact_name}
                      onChange={(e) => setField('contact_name', e.target.value)}
                      placeholder="Votre nom"
                    />
                    <Input
                      type="tel"
                      label="Numéro WhatsApp"
                      value={form.whatsapp}
                      onChange={(e) => setField('whatsapp', e.target.value)}
                      error={errors.whatsapp}
                      helper="Format attendu : 8 chiffres, avec ou sans indicatif +229 (ex. 90123456 ou +22990123456)."
                      placeholder="+22990123456"
                      leftIcon={<WhatsappIcon size={16} className="text-warm-400" />}
                    />
                  </div>
                </section>

                <div className="border-t border-warm-200 pt-6">
                  <p className="text-caption text-warm-500 mb-4">
                    En envoyant ce formulaire, vous validez votre inscription
                    automatique sur la liste d'attente Air Mess.
                  </p>
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    pill
                    fullWidth
                    loading={loading}
                    rightIcon={<ArrowRightIcon size={18} />}
                  >
                    M'inscrire et obtenir mon bonus
                  </Button>
                </div>
              </form>
            </div>
          </Card>
        )}

        <footer className="text-center text-caption text-warm-500 mt-10">
          © {new Date().getFullYear()} Air Mess — Étude de marché auprès des commerçants.
        </footer>
      </main>
    </div>
  )
}

function TextField({
  label,
  value,
  onChange,
  error,
  helper,
  placeholder,
  rows = 3,
  required = false,
  leftIcon,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
  helper?: string
  placeholder?: string
  rows?: number
  required?: boolean
  leftIcon?: ReactNode
}) {
  return (
    <div>
      <label className="block text-body-s font-bold text-ink mb-2.5">
        {label}
        {required && <span className="text-airmess-red"> *</span>}
      </label>
      <div className="relative">
        {leftIcon && (
          <span className="pointer-events-none absolute left-3 top-3.5">{leftIcon}</span>
        )}
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className={`${textareaClass} ${leftIcon ? 'pl-10' : ''}`}
        />
      </div>
      {error ? (
        <p className="mt-1.5 text-caption text-airmess-red">{error}</p>
      ) : helper ? (
        <p className="mt-1.5 text-caption text-warm-500">{helper}</p>
      ) : null}
    </div>
  )
}

function InterestScale({
  value,
  onChange,
  error,
}: {
  value: number
  onChange: (value: number) => void
  error?: string
}) {
  return (
    <fieldset>
      <legend className="text-body-s font-bold text-ink mb-2.5">
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
      <div className="mt-2 flex justify-between text-caption text-warm-500">
        <span>Pas du tout intéressé</span>
        <span>Très intéressé</span>
      </div>
      {error && <p className="mt-1.5 text-caption text-airmess-red">{error}</p>}
    </fieldset>
  )
}

function SuccessPanel({
  response,
  onReset,
}: {
  response: MerchantWaitlistResponse
  onReset: () => void
}) {
  return (
    <Card variant="signature" padding="none" className="overflow-hidden text-center">
      <div className="p-6 md:p-10">
        <span className="mx-auto mb-5 inline-flex h-14 w-14 items-center justify-center rounded-full bg-success-bg text-success">
          <CheckIcon size={26} />
        </span>
        <h2 className="text-h2 text-ink mb-2">Vous êtes sur la liste d'attente !</h2>
        <p className="text-body text-warm-500 max-w-xl mx-auto mb-6">
          Merci pour votre participation. Vos réponses nous aident à construire un
          service qui répond vraiment aux besoins des commerçants.
        </p>

        <div className="max-w-md mx-auto rounded-xl border border-warm-200 bg-off-white p-5 mb-6">
          <p className="text-caption text-warm-500 uppercase tracking-wide mb-2">
            Votre bonus de bienvenue
          </p>
          <p className="text-body-s text-warm-600 mb-1">500 F CFA offerts sur votre première commande</p>
          <p className="text-caption text-warm-500 mb-4">À présenter dès le lancement du service</p>
          <div className="rounded-lg bg-airmess-yellow px-4 py-3">
            <p className="text-caption text-ink/70 font-bold uppercase tracking-wider">Code bonus</p>
            <p className="text-h3 font-bold text-ink tracking-wide">
              {response.waitlist.bonus_code}
            </p>
          </div>
        </div>

        <p className="text-body-s text-warm-500 mb-6">
          {response.message}
        </p>

        <Button variant="secondary" onClick={onReset}>
          Remplir un autre formulaire
        </Button>
      </div>
    </Card>
  )
}
