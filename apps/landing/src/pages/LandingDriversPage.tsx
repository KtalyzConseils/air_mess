import { useEffect, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
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
  WhatsappIcon,
} from '../components/ui/icons'
import {
  DRIVER_DEMO_MODE,
  DEMO_SMS_CODE,
  sendDriverOtp,
  submitDriverSurvey,
  verifyDriverOtp,
  type DriverAccountPayload,
  type DriverSurveyPayload,
  type DriverSurveyResponse,
} from '../api/driverSurvey'
import wordmarkWhite from '../assets/logo/airmess-wordmark-white.svg'

type SurveyForm = {
  zone: string
  zone_other: string
  moto_usage: string
  intention: string
  permis: string
  telephone_type: string
  mobile_money: string[]
  mobile_money_other: string
  langue: string
  jours_par_semaine: string
  moments: string[]
  experience_livraison: string
  anciennete: string
  reunion_moment: string
  reunion_lieu: string
  formation_preferee: string
}

type AccountForm = {
  prenom: string
  nom: string
  operateur: string
  telephone: string
  majeur: boolean
  cgu: boolean
  confidentialite: boolean
}

type Stage = 'form' | 'sending' | 'confirmation' | 'thanks' | 'early_stop'

const INITIAL_SURVEY: SurveyForm = {
  zone: '',
  zone_other: '',
  moto_usage: '',
  intention: '',
  permis: '',
  telephone_type: '',
  mobile_money: [],
  mobile_money_other: '',
  langue: '',
  jours_par_semaine: '',
  moments: [],
  experience_livraison: '',
  anciennete: '',
  reunion_moment: '',
  reunion_lieu: '',
  formation_preferee: '',
}

const INITIAL_ACCOUNT: AccountForm = {
  prenom: '',
  nom: '',
  operateur: '',
  telephone: '',
  majeur: false,
  cgu: false,
  confidentialite: false,
}

const ZONES = ['Cotonou', 'Abomey-Calavi', 'Godomey', 'Autre']
const MOTO_USAGE = ['Oui', 'Non']
const INTENTION_OPTIONS = ['Oui', 'Non', 'Peut-être']
const PERMIS_OPTIONS = ['Oui, valide', 'Oui, en cours', 'Non']
const TELEPHONE_TYPES = ['Smartphone Android', 'iPhone', 'Téléphone simple', 'Autre']
const MOBILE_MONEY_OPTIONS = ['MTN MoMo', 'Moov Money', 'Celtiis Cash', 'Autre']
const OPERATEUR_OPTIONS = ['MTN MoMo', 'Moov Money', 'Celtiis Cash']
const LANGUE_OPTIONS = ['Français', 'Fon', 'Yoruba', 'Goun', 'Autre']
const JOURS_OPTIONS = ['1 à 2 jours', '3 à 4 jours', '5 à 6 jours', 'Tous les jours']
const MOMENTS_OPTIONS = ['Matin', 'Midi', 'Soir', 'Nuit']
const EXPERIENCE_OPTIONS = ['Oui, régulièrement', 'Oui, de temps en temps', 'Non']
const ANCIENNETE_OPTIONS = ['Moins de 6 mois', '6 mois à 1 an', '1 à 3 ans', 'Plus de 3 ans']
const REUNION_MOMENTS = ['Dimanche', 'En semaine', 'Le soir', 'Peu importe']
const FORMATION_OPTIONS = [
  'Démonstration en groupe',
  'Vidéo sur téléphone',
  'Explication individuelle',
  'Autre',
]

const PHONE_PATTERN = /^(\+229)?[0-9]{8}$/

function normalizeBeninPhone(value: string): string {
  const digits = value.replace(/\D/g, '')
  if (digits.length === 8) return `+229${digits}`
  if (digits.length === 11 && digits.startsWith('229')) return `+${digits}`
  return value
}

function isValidBeninPhone(value: string): boolean {
  const compact = value.replace(/[\s.-]/g, '')
  return PHONE_PATTERN.test(compact)
}

function createResponseId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `response-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function buildHoraires(moments: string[]): { debut: string; fin: string } {
  const ranges: Record<string, { debut: string; fin: string }> = {
    Matin: { debut: '07:00', fin: '12:00' },
    Midi: { debut: '12:00', fin: '17:00' },
    Soir: { debut: '17:00', fin: '22:00' },
    Nuit: { debut: '22:00', fin: '06:00' },
  }

  const selected = moments.map((moment) => ranges[moment]).filter(Boolean)
  if (selected.length === 0) return { debut: '', fin: '' }
  return { debut: selected[0].debut, fin: selected[selected.length - 1].fin }
}

function getMobileMoneyList(survey: SurveyForm): string[] {
  const items = survey.mobile_money.filter((item) => item !== 'Autre')
  if (survey.mobile_money.includes('Autre') && survey.mobile_money_other.trim()) {
    items.push(survey.mobile_money_other.trim())
  }
  return items
}

interface ChoiceFieldProps {
  name: string
  label: string
  number?: number
  options: string[]
  value: string
  onChange: (value: string) => void
  error?: string
  required?: boolean
}

function ChoiceField({
  name,
  label,
  number,
  options,
  value,
  onChange,
  error,
  required = true,
}: ChoiceFieldProps) {
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
                selected ? 'border-ink shadow-sm' : 'border-warm-200 hover:border-warm-400'
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
                  selected ? 'border-ink bg-ink text-cream' : 'border-warm-300 text-transparent'
                }`}
              >
                <CheckIcon size={12} />
              </span>
              <span className={selected ? 'font-bold' : ''}>{option}</span>
            </label>
          )
        })}
      </div>

      {error && <p className="text-caption text-airmess-red">{error}</p>}
    </fieldset>
  )
}

interface MultiChoiceFieldProps {
  label: string
  number?: number
  options: string[]
  values: string[]
  onToggle: (option: string) => void
  error?: string
  required?: boolean
}

function MultiChoiceField({
  label,
  number,
  options,
  values,
  onToggle,
  error,
  required = true,
}: MultiChoiceFieldProps) {
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
                selected ? 'border-ink shadow-sm' : 'border-warm-200 hover:border-warm-400'
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
                  selected ? 'border-ink bg-ink text-cream' : 'border-warm-300 text-transparent'
                }`}
              >
                <CheckIcon size={12} />
              </span>
              <span className={selected ? 'font-bold' : ''}>{option}</span>
            </label>
          )
        })}
      </div>

      {error && <p className="text-caption text-airmess-red">{error}</p>}
    </fieldset>
  )
}

interface ConsentCheckboxProps {
  checked: boolean
  onChange: (checked: boolean) => void
  children: ReactNode
}

function ConsentCheckbox({ checked, onChange, children }: ConsentCheckboxProps) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-warm-200 bg-off-white px-4 py-3 text-body-s text-ink transition-all hover:border-warm-400">
      <input
        type="checkbox"
        className="sr-only"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
          checked ? 'border-ink bg-ink text-cream' : 'border-warm-300 text-transparent'
        }`}
      >
        <CheckIcon size={12} />
      </span>
      <span>{children}</span>
    </label>
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

function SectionTitle({
  number,
  title,
  text,
}: {
  number: number | string
  title: string
  text: string
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <SectionMarker number={number} className="mb-4" />
      <h2 className="text-h2 text-ink">{title}</h2>
      <p className="mt-3 text-body text-warm-500">{text}</p>
    </div>
  )
}

function Header() {
  return (
    <header className="bg-airmess-dark text-cream">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <a href="/" aria-label="Airmess — retour à l'accueil" className="inline-flex">
          <img src={wordmarkWhite} alt="Airmess" className="h-8 w-auto" />
        </a>
        <a
          href="https://app.airmess-logistics.com/login"
          className="text-caption font-bold text-cream/80 transition-colors hover:text-cream"
        >
          Espace commerçant
        </a>
      </div>
    </header>
  )
}

function Hero({ onStart }: { onStart: () => void }) {
  return (
    <section className="grid items-center gap-10 py-8 md:grid-cols-2 md:py-12">
      <div>
        <PageEyebrow label="Enquête livreurs AirMess" className="mb-5" />
        <h1 className="text-h1 text-ink">
          Répondez à l’enquête et ouvrez votre{' '}
          <Highlight>compte livreur</Highlight>.
        </h1>
        <p className="mt-5 max-w-xl text-body-l text-warm-600">
          Environ <strong className="font-bold text-ink">12 minutes</strong> de questions, une
          vérification par SMS, puis votre compte est ouvert au statut{' '}
          <strong className="font-bold text-ink">En liste d’attente</strong>.
        </p>

        <div className="mt-6 space-y-3">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-airmess-yellow text-ink">
              <SparklesIcon size={16} />
            </span>
            <p className="text-body-s text-warm-600">
              <strong className="font-bold text-ink">500 FCFA</strong> crédités dès l’ouverture,
              bloqués jusqu’à l’activation de votre compte.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-airmess-yellow text-ink">
              <ClockIcon size={16} />
            </span>
            <p className="text-body-s text-warm-600">
              Un compte en liste d’attente ne donne accès à aucune course pour le moment.
            </p>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button type="button" size="lg" pill onClick={onStart} rightIcon={<ArrowRightIcon size={18} />}>
            Commencer l’enquête
          </Button>
          <a href="/">
            <Button type="button" variant="secondary" size="lg">
              Découvrir Air Mess
            </Button>
          </a>
        </div>

        <p className="mt-5 text-caption text-warm-500">
          Vos réponses sont analysées sans votre nom et enregistrées à part de votre compte.
        </p>
      </div>

      <div className="relative">
        <div className="overflow-hidden rounded-2xl border border-warm-200 shadow-md">
          <img
            src="/images/recrutement-livreurs.jpg"
            alt="Livreurs AirMess sur leur moto"
            className="h-auto w-full object-cover"
          />
        </div>
        <div className="absolute -bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full bg-airmess-yellow px-4 py-2 text-caption font-bold text-ink shadow-md">
          <SparklesIcon size={15} />
          500 FCFA crédités, débloqués après activation
        </div>
      </div>
    </section>
  )
}

function Benefits() {
  const benefits = [
    {
      icon: <ClockIcon size={20} />,
      title: 'Environ 12 minutes',
      text: 'Une série de questions simples sur votre profil et vos disponibilités.',
    },
    {
      icon: <WhatsappIcon size={20} />,
      title: 'Compte ouvert après SMS',
      text: 'Un code de vérification protège l’ouverture de votre compte à votre nom.',
    },
    {
      icon: <SparklesIcon size={20} />,
      title: '500 FCFA visibles, bloqués',
      text: 'Le bonus est crédité immédiatement et reste bloqué jusqu’à l’activation.',
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

function Process() {
  const steps = [
    {
      title: 'Questionnaire',
      text: 'Répondez aux questions sur votre profil et vos préférences.',
    },
    {
      title: 'Identité et Mobile Money',
      text: 'Renseignez votre nom, votre numéro et acceptez les conditions.',
    },
    {
      title: 'Code SMS',
      text: 'Confirmez que le numéro vous appartient avant l’ouverture.',
    },
    {
      title: 'Ouverture du compte',
      text: 'Le compte est créé à votre nom, en liste d’attente.',
    },
    {
      title: 'Confirmation',
      text: 'Vous voyez votre statut, votre zone et l’état de votre bonus.',
    },
  ]

  return (
    <section className="mb-14">
      <SectionTitle
        number={1}
        title="Un parcours simple et transparent"
        text="Tout se fait dans le même formulaire, sans promesse d’embauche."
      />
      <div className="mt-8 grid gap-3 md:grid-cols-5">
        {steps.map((item, index) => (
          <Card key={item.title} padding="md" className="relative">
            <span className="text-caption font-bold text-warm-400">Étape {index + 1}</span>
            <h3 className="mt-3 text-body font-bold text-ink">{item.title}</h3>
            <p className="mt-1 text-body-s text-warm-500">{item.text}</p>
          </Card>
        ))}
      </div>
    </section>
  )
}

function Activation() {
  const requirements = [
    {
      title: 'Pièce d’identité vérifiée',
      text: 'Elle est contrôlée à l’activation, pas à l’ouverture du compte.',
    },
    {
      title: 'Séance d’orientation suivie',
      text: 'Vous recevrez une invitation quand une séance sera organisée dans votre zone.',
    },
    {
      title: 'Zone ouverte',
      text: 'Les zones ouvrent progressivement, selon l’activité des commerçants.',
    },
  ]

  return (
    <section className="mb-14">
      <SectionTitle
        number={2}
        title="Ce qu’il faut pour activer votre compte"
        text="La liste d’attente ne donne droit à aucune course. L’activation dépend de trois conditions."
      />
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {requirements.map((item) => (
          <Card key={item.title} variant="elevated" padding="md">
            <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-success-bg text-success">
              <CheckIcon size={20} />
            </span>
            <h3 className="text-body-l font-bold text-ink">{item.title}</h3>
            <p className="mt-2 text-body-s text-warm-500">{item.text}</p>
          </Card>
        ))}
      </div>
    </section>
  )
}

function Faq() {
  const items = [
    {
      question: 'Quand mon compte sera-t-il activé ?',
      answer:
        'Après l’ouverture de votre zone, vous recevrez une invitation pour suivre une séance d’orientation et présenter votre pièce d’identité.',
    },
    {
      question: 'À quoi correspond le bonus de 500 FCFA ?',
      answer:
        'C’est un bonus de démarrage crédité sur votre compte dès son ouverture. Il reste bloqué tant que votre compte n’est pas activé.',
    },
    {
      question: 'Quand le bonus devient-il retirable ?',
      answer:
        'Le bonus est débloqué après l’activation de votre compte, c’est-à-dire pièce d’identité vérifiée et séance d’orientation suivie.',
    },
    {
      question: 'Que peut-on faire avec un compte en liste d’attente ?',
      answer:
        'Vous pouvez consulter votre compte et votre bonus bloqué. Aucune course n’est accessible avant l’activation.',
    },
    {
      question: 'Comment mes réponses sont-elles utilisées ?',
      answer:
        'Vos réponses sont analysées sans votre nom et enregistrées à part de votre compte. Seul le profil opérationnel utile est copié sur votre compte.',
    },
  ]

  return (
    <section className="mb-14">
      <SectionTitle number={3} title="Questions fréquentes" text="L’essentiel à savoir avant de participer." />
      <div className="mx-auto mt-8 max-w-3xl space-y-3">
        {items.map((item) => (
          <Card key={item.question} padding="md">
            <h3 className="text-body-l font-bold text-ink">{item.question}</h3>
            <p className="mt-2 text-body-s text-warm-500">{item.answer}</p>
          </Card>
        ))}
      </div>
    </section>
  )
}

function DemoNotice() {
  if (!DRIVER_DEMO_MODE) return null
  return (
    <div className="mb-6 rounded-lg border border-airmess-yellow/50 bg-airmess-yellow/10 px-4 py-3 text-body-s text-warm-600">
      Mode démonstration : aucune donnée n’est envoyée. Le code SMS de test est{' '}
      <strong className="font-bold text-ink">{DEMO_SMS_CODE}</strong>.
    </div>
  )
}

function ThanksPanel({
  message,
  onReset,
}: {
  message: string
  onReset: () => void
}) {
  return (
    <section className="mx-auto max-w-2xl">
      <Card variant="signature" padding="none" className="overflow-hidden text-center">
        <div className="p-6 sm:p-10">
          <span className="mx-auto mb-5 inline-flex h-16 w-16 items-center justify-center rounded-full bg-success-bg text-success">
            <CheckIcon size={30} />
          </span>
          <PageEyebrow label="Participation enregistrée" className="mb-4" />
          <h2 className="text-h2 text-ink">Merci pour vos réponses</h2>
          <p className="mx-auto mt-3 max-w-xl text-body text-warm-500">{message}</p>
          <Button type="button" variant="secondary" className="mt-7" onClick={onReset}>
            Retour au début
          </Button>
        </div>
      </Card>
    </section>
  )
}

function EarlyStopPanel({ onReset }: { onReset: () => void }) {
  return (
    <section className="mx-auto max-w-2xl">
      <Card variant="signature" padding="none" className="overflow-hidden text-center">
        <div className="p-6 sm:p-10">
          <span className="mx-auto mb-5 inline-flex h-16 w-16 items-center justify-center rounded-full bg-warning-bg text-ink">
            <ClockIcon size={30} />
          </span>
          <PageEyebrow label="Fin de l’enquête" accent="red" className="mb-4" />
          <h2 className="text-h2 text-ink">Aucun compte n’a été ouvert</h2>
          <p className="mx-auto mt-3 max-w-xl text-body text-warm-500">
            Merci pour votre participation. Les conditions de l’enquête ne permettent pas
            d’ouvrir un compte dans votre situation.
          </p>
          <Button type="button" variant="secondary" className="mt-7" onClick={onReset}>
            Recommencer
          </Button>
        </div>
      </Card>
    </section>
  )
}

function ConfirmationPanel({
  response,
  onShare,
  onReset,
}: {
  response: DriverSurveyResponse
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
          <PageEyebrow label="Compte ouvert" className="mb-4" />
          <h2 className="text-h2 text-ink">Votre compte est en liste d’attente</h2>
          <p className="mx-auto mt-3 max-w-xl text-body text-warm-500">
            Votre compte livreur AirMess est ouvert à votre nom. Il devient actif après la
            vérification de votre pièce d’identité, la séance d’orientation et l’ouverture de
            votre zone.
          </p>

          <div className="mx-auto mt-8 grid gap-4 text-left sm:grid-cols-2">
            <Card padding="md">
              <p className="text-caption font-bold uppercase tracking-wide text-warm-500">Statut</p>
              <p className="mt-1 text-body font-bold text-ink">En liste d’attente</p>
            </Card>
            <Card padding="md">
              <p className="text-caption font-bold uppercase tracking-wide text-warm-500">Compte</p>
              <p className="mt-1 text-body font-bold text-ink">{response.compte.id}</p>
            </Card>
            <Card padding="md">
              <p className="text-caption font-bold uppercase tracking-wide text-warm-500">Zone</p>
              <p className="mt-1 text-body font-bold text-ink">{response.liste_attente.zone || 'À confirmer'}</p>
            </Card>
            <Card padding="md">
              <p className="text-caption font-bold uppercase tracking-wide text-warm-500">Bonus</p>
              <p className="mt-1 text-body font-bold text-ink">500 FCFA crédités · bloqués</p>
            </Card>
          </div>

          <div className="mx-auto mt-7 max-w-md rounded-xl bg-airmess-yellow/20 p-5 text-left">
            <p className="text-caption font-bold uppercase tracking-wide text-warm-600">
              Prochaines étapes
            </p>
            <ul className="mt-3 space-y-2 text-body-s text-warm-600">
              <li className="flex gap-2">
                <CheckIcon size={16} className="mt-1 shrink-0 text-success" />
                Votre pièce d’identité sera vérifiée à l’activation.
              </li>
              <li className="flex gap-2">
                <CheckIcon size={16} className="mt-1 shrink-0 text-success" />
                Vous recevrez une invitation pour une séance d’orientation.
              </li>
              <li className="flex gap-2">
                <CheckIcon size={16} className="mt-1 shrink-0 text-success" />
                Votre bonus sera débloqué une fois votre compte activé.
              </li>
            </ul>
          </div>

          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Button type="button" variant="dark" onClick={onShare} leftIcon={<ShareIcon size={17} />}>
              Partager avec un collègue
            </Button>
          </div>

          {DRIVER_DEMO_MODE && (
            <p className="mt-5 text-caption text-warm-500">
              Mode démonstration : le compte affiché est un exemple, aucune donnée n’a été envoyée.
            </p>
          )}

          <button type="button" onClick={onReset} className="mt-8 text-body-s font-bold text-airmess-red hover:underline">
            Remplir un autre formulaire
          </button>
        </div>
      </Card>
    </section>
  )
}

function SendingPanel() {
  return (
    <section className="mx-auto max-w-xl">
      <Card variant="signature" padding="lg" className="text-center">
        <svg className="mx-auto animate-spin h-10 w-10 text-airmess-yellow" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
          <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
        <h2 className="mt-5 text-h2 text-ink">Ouverture de votre compte…</h2>
        <p className="mt-3 text-body text-warm-500">
          Nous enregistrons vos réponses et préparons votre compte. Ne fermez pas cette page.
        </p>
      </Card>
    </section>
  )
}

function Footer() {
  return (
    <footer className="border-t border-warm-200 py-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 text-center sm:px-6 lg:px-8">
        <p className="text-caption text-warm-500">
          © {new Date().getFullYear()} Air Mess — Enquête livreurs et ouverture de compte en liste d’attente.
        </p>
        <p className="text-caption text-warm-400">
          Cette page ne constitue ni une offre d’emploi ni une promesse d’embauche. Un compte en
          liste d’attente ne donne droit à aucune course et le bonus de 500 FCFA reste bloqué
          jusqu’à l’activation.
        </p>
      </div>
    </footer>
  )
}

export default function LandingDriversPage() {
  const [step, setStep] = useState(0)
  const [stage, setStage] = useState<Stage>('form')
  const [survey, setSurvey] = useState<SurveyForm>(INITIAL_SURVEY)
  const [account, setAccount] = useState<AccountForm>(INITIAL_ACCOUNT)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState('')
  const [response, setResponse] = useState<DriverSurveyResponse | null>(null)
  const [thanksMessage, setThanksMessage] = useState('')
  const [verificationToken, setVerificationToken] = useState('')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(60)
  const [startedAt] = useState(() => Date.now())

  useEffect(() => {
    const previousTitle = document.title
    document.title = 'Livreurs AirMess — Enquête et ouverture de compte'
    return () => {
      document.title = previousTitle
    }
  }, [])

  useEffect(() => {
    if (!otpSent || secondsLeft <= 0) return
    const timer = window.setTimeout(() => {
      setSecondsLeft((previous) => Math.max(0, previous - 1))
    }, 1000)
    return () => window.clearTimeout(timer)
  }, [otpSent, secondsLeft])

  const updateSurvey = <K extends keyof SurveyForm>(field: K, value: SurveyForm[K]) => {
    setSurvey((previous) => ({ ...previous, [field]: value }))
    setErrors((previous) => {
      if (!previous[field]) return previous
      const next = { ...previous }
      delete next[field]
      return next
    })
  }

  const toggleSurveyValue = (field: 'mobile_money' | 'moments', value: string) => {
    setSurvey((previous) => {
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

  const updateAccount = <K extends keyof AccountForm>(field: K, value: AccountForm[K]) => {
    setAccount((previous) => ({ ...previous, [field]: value }))
    setErrors((previous) => {
      if (!previous[field]) return previous
      const next = { ...previous }
      delete next[field]
      return next
    })
  }

  const validateSurvey = (): Record<string, string> => {
    const nextErrors: Record<string, string> = {}
    if (!survey.zone) nextErrors.zone = 'Sélectionnez votre zone.'
    if (survey.zone === 'Autre' && !survey.zone_other.trim()) nextErrors.zone_other = 'Précisez votre zone.'
    if (!survey.moto_usage) nextErrors.moto_usage = 'Sélectionnez une réponse.'
    if (!survey.intention) nextErrors.intention = 'Sélectionnez une réponse.'
    if (!survey.permis) nextErrors.permis = 'Sélectionnez une réponse.'
    if (!survey.telephone_type) nextErrors.telephone_type = 'Sélectionnez une réponse.'
    if (survey.mobile_money.length === 0) nextErrors.mobile_money = 'Sélectionnez au moins un compte Mobile Money.'
    if (survey.mobile_money.includes('Autre') && !survey.mobile_money_other.trim()) {
      nextErrors.mobile_money_other = 'Précisez votre compte Mobile Money.'
    }
    if (!survey.langue) nextErrors.langue = 'Sélectionnez une réponse.'
    if (!survey.jours_par_semaine) nextErrors.jours_par_semaine = 'Sélectionnez une réponse.'
    if (survey.moments.length === 0) nextErrors.moments = 'Sélectionnez au moins une disponibilité.'
    if (!survey.experience_livraison) nextErrors.experience_livraison = 'Sélectionnez une réponse.'
    if (survey.experience_livraison !== 'Non' && !survey.anciennete) nextErrors.anciennete = 'Sélectionnez une réponse.'
    if (!survey.reunion_moment) nextErrors.reunion_moment = 'Sélectionnez une réponse.'
    if (!survey.formation_preferee) nextErrors.formation_preferee = 'Sélectionnez une réponse.'
    return nextErrors
  }

  const validateAccount = (): Record<string, string> => {
    const nextErrors: Record<string, string> = {}
    if (!account.prenom.trim()) nextErrors.prenom = 'Indiquez votre prénom.'
    if (!account.nom.trim()) nextErrors.nom = 'Indiquez votre nom.'
    if (!account.operateur) nextErrors.operateur = 'Sélectionnez votre réseau Mobile Money.'
    if (!account.telephone.trim()) {
      nextErrors.telephone = 'Indiquez votre numéro Mobile Money.'
    } else if (!isValidBeninPhone(account.telephone)) {
      nextErrors.telephone = 'Format attendu : 8 chiffres, avec ou sans +229.'
    }
    if (!account.majeur) {
      nextErrors.majeur = 'Vous devez certifier avoir 18 ans ou plus pour ouvrir un compte.'
    }
    if (!account.cgu) nextErrors.cgu = 'Vous devez accepter les Conditions d’utilisation Livreur.'
    if (!account.confidentialite) nextErrors.confidentialite = 'Vous devez accepter la Politique de confidentialité.'
    return nextErrors
  }

  const isEarlyStop = survey.moto_usage === 'Non' && survey.intention === 'Non'
  const accountZone = survey.zone === 'Autre' ? survey.zone_other.trim() : survey.zone
  const src = new URLSearchParams(window.location.search).get('src') ?? 'site_web'

  const buildPayload = (withAccount: boolean): DriverSurveyPayload => {
    const submittedAt = new Date().toISOString()
    const duration = Math.max(0, Math.floor((Date.now() - startedAt) / 1000))
    const mobileMoney = getMobileMoneyList(survey)

    const accountPayload: DriverAccountPayload | null = withAccount
      ? {
          prenom: account.prenom.trim(),
          nom: account.nom.trim().toUpperCase(),
          telephone: normalizeBeninPhone(account.telephone),
          operateur: account.operateur,
          zone: accountZone,
          majeur: account.majeur,
          consentements: {
            cgu_version: '2026-09',
            cgu_at: submittedAt,
            confidentialite_at: submittedAt,
          },
          verification_token: verificationToken,
          profil_operationnel: {
            moto: survey.moto_usage === 'Oui' ? "M'appartient" : 'Non renseigné',
            permis: survey.permis,
            telephone_type: survey.telephone_type,
            mobile_money: mobileMoney,
            langue: survey.langue,
            jours_par_semaine: survey.jours_par_semaine,
            horaires: buildHoraires(survey.moments),
            moments: survey.moments,
            experience_livraison: survey.experience_livraison,
            anciennete: survey.anciennete,
            reunion: { moment: survey.reunion_moment, lieu: survey.reunion_lieu.trim() },
            formation_preferee: survey.formation_preferee,
          },
          bonus_demande: true,
          source: 'enquete_web',
          src,
        }
      : null

    return {
      survey: 'airmess_livreurs',
      version: '2.0',
      mode: 'web',
      response: {
        response_id: createResponseId(),
        started_at: new Date(startedAt).toISOString(),
        submitted_at: submittedAt,
        duration_s: duration,
        suspect: duration < 240,
        src,
        completed: true,
        stop_reason: null,
        answers: {
          A1: accountZone,
          A2: survey.moto_usage,
          A4: survey.permis,
          A5: survey.telephone_type,
          A7: mobileMoney,
          A10: survey.langue,
          B1: survey.jours_par_semaine,
          B2: survey.moments,
          S4: survey.experience_livraison,
          S5: survey.anciennete,
          H3: survey.reunion_moment,
          H4: survey.reunion_lieu,
          H5: survey.formation_preferee,
          Z1: survey.intention,
        },
      },
      account: accountPayload,
    }
  }

  const handleSurveyContinue = () => {
    const nextErrors = validateSurvey()
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    if (isEarlyStop) {
      setStage('early_stop')
      return
    }
    setStep(1)
  }

  const handleSendCode = async () => {
    const nextErrors = validateAccount()
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setLoading(true)
    setServerError('')
    try {
      await sendDriverOtp(account.telephone)
      setOtp('')
      setOtpSent(true)
      setSecondsLeft(60)
      setStep(2)
    } catch (error) {
      setServerError(error instanceof Error ? error.message : 'Impossible d’envoyer le code SMS.')
    } finally {
      setLoading(false)
    }
  }

  const handleResendCode = async () => {
    if (secondsLeft > 0 || loading) return
    setLoading(true)
    setServerError('')
    try {
      await sendDriverOtp(account.telephone)
      setOtp('')
      setSecondsLeft(60)
    } catch (error) {
      setServerError(error instanceof Error ? error.message : 'Impossible de renvoyer le code SMS.')
    } finally {
      setLoading(false)
    }
  }

  const handleSmsSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextErrors: Record<string, string> = {}
    if (!/^[0-9]{6}$/.test(otp.trim())) {
      nextErrors.otp = 'Le code contient 6 chiffres.'
    }
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setLoading(true)
    setServerError('')
    try {
      const result = await verifyDriverOtp(account.telephone, otp.trim())
      setVerificationToken(result.verification_token)
    } catch (error) {
      setServerError(error instanceof Error ? error.message : 'Ce code n’est pas valide.')
      setLoading(false)
      return
    }

    setStage('sending')
    try {
      const payload = buildPayload(true)
      const data = await submitDriverSurvey(payload)
      setResponse(data)
      setStage('confirmation')
    } catch (error) {
      const status = (error as Error & { status?: number }).status
      if (status && status >= 400 && status < 500) {
        setThanksMessage('Vos réponses sont enregistrées, mais votre compte n’a pas pu être ouvert.')
        setStage('thanks')
      } else {
        setStage('form')
        setStep(2)
        setServerError(
          error instanceof Error
            ? `${error.message} Votre demande est conservée sur cet appareil ; réessayez à la prochaine visite.`
            : 'Votre demande est conservée sur cet appareil ; réessayez à la prochaine visite.',
        )
      }
    } finally {
      setLoading(false)
    }
  }

  const handleWithoutAccount = async () => {
    setLoading(true)
    setServerError('')
    setStage('sending')
    try {
      await submitDriverSurvey(buildPayload(false))
      setThanksMessage('Vos réponses sont enregistrées. Aucun compte n’a été ouvert.')
      setStage('thanks')
    } catch (error) {
      setStage('form')
      setServerError(error instanceof Error ? error.message : 'Vos réponses n’ont pas pu être envoyées.')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setSurvey(INITIAL_SURVEY)
    setAccount(INITIAL_ACCOUNT)
    setErrors({})
    setStep(0)
    setStage('form')
    setServerError('')
    setResponse(null)
    setThanksMessage('')
    setVerificationToken('')
    setOtp('')
    setOtpSent(false)
    setSecondsLeft(60)
  }

  const shareOnWhatsApp = () => {
    const zone = response?.liste_attente.zone || 'ma zone'
    const text =
      `Je viens d'ouvrir mon compte livreur AirMess. Il est en liste d'attente pour ${zone}. ` +
      `500 FCFA sont crédités et seront débloqués après activation. ` +
      `https://airmess-logistics.com/landing/drivers_learn`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer')
  }

  const scrollToForm = () => {
    document.getElementById('formulaire')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  if (stage === 'confirmation' && response) {
    return (
      <div className="min-h-screen bg-cream text-ink">
        <Header />
        <main className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          <ConfirmationPanel response={response} onShare={shareOnWhatsApp} onReset={resetForm} />
        </main>
        <Footer />
      </div>
    )
  }

  if (stage === 'thanks') {
    return (
      <div className="min-h-screen bg-cream text-ink">
        <Header />
        <main className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          <ThanksPanel message={thanksMessage} onReset={resetForm} />
        </main>
        <Footer />
      </div>
    )
  }

  if (stage === 'early_stop') {
    return (
      <div className="min-h-screen bg-cream text-ink">
        <Header />
        <main className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          <EarlyStopPanel onReset={resetForm} />
        </main>
        <Footer />
      </div>
    )
  }

  if (stage === 'sending') {
    return (
      <div className="min-h-screen bg-cream text-ink">
        <Header />
        <main className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          <SendingPanel />
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream text-ink">
      <Header />

      <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        <Hero onStart={scrollToForm} />
        <Benefits />
        <Process />
        <Activation />
        <Faq />

        <section id="formulaire" className="scroll-mt-8">
          <Card variant="signature" padding="none" className="overflow-hidden">
            <div className="border-b border-warm-200 bg-airmess-dark px-6 py-6 text-cream sm:px-8 lg:px-10">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <PageEyebrow label="Enquête + compte livreur" accent="yellow" className="mb-3" />
                  <h2 className="text-h2">Une seule participation, tout est réglé</h2>
                  <p className="mt-2 max-w-2xl text-body-s text-cream/70">
                    Répondez aux questions, confirmez votre numéro par SMS et votre compte est
                    ouvert en liste d’attente.
                  </p>
                </div>
                <span className="inline-flex w-fit items-center gap-2 rounded-full bg-airmess-yellow px-4 py-2 text-caption font-bold text-ink">
                  <ClockIcon size={15} />
                  Environ 12 minutes
                </span>
              </div>
            </div>

            <div className="p-6 sm:p-8 lg:p-10">
              <div className="mb-8">
                <div className="mb-3 flex items-center justify-between">
                  <SectionMarker number={step + 1} label={step === 0 ? 'Questions' : step === 1 ? 'Identité et Mobile Money' : 'Code SMS'} />
                  <span className="hidden text-caption font-medium text-warm-500 sm:block">
                    {step === 0 ? 'Prochaine étape : Identité et Mobile Money' : step === 1 ? 'Prochaine étape : Code SMS' : 'Dernière étape'}
                  </span>
                </div>
                <ProgressBar step={step} total={3} />
              </div>

              <form onSubmit={handleSmsSubmit} noValidate>
                {serverError && (
                  <div className="mb-6 rounded-lg border border-airmess-red/30 bg-airmess-red/5 px-4 py-3 text-body-s text-airmess-red">
                    {serverError}
                  </div>
                )}

                <div className="mb-8">
                  <h3 className="text-h3 text-ink">
                    {step === 0
                      ? 'Parlons de votre profil de livreur'
                      : step === 1
                        ? 'Ouvrez votre compte livreur AirMess'
                        : 'Entrez le code reçu par SMS'}
                  </h3>
                  <p className="mt-2 max-w-3xl text-body text-warm-500">
                    {step === 0
                      ? 'Ces réponses servent à préparer la liste d’attente et les futures invitations.'
                      : step === 1
                        ? 'Renseignez les informations exactes de votre pièce d’identité et de votre Mobile Money.'
                        : 'Saisissez le code à 6 chiffres envoyé par SMS pour confirmer que ce numéro vous appartient.'}
                  </p>
                </div>

                {step === 0 && (
                  <div className="space-y-7">
                    <ChoiceField
                      name="zone"
                      number={1}
                      label="Dans quelle zone habitez-vous ou travaillez-vous ?"
                      options={ZONES}
                      value={survey.zone}
                      onChange={(value) => updateSurvey('zone', value)}
                      error={errors.zone}
                    />
                    {survey.zone === 'Autre' && (
                      <Input
                        label="Précisez votre zone"
                        value={survey.zone_other}
                        onChange={(event: ChangeEvent<HTMLInputElement>) => updateSurvey('zone_other', event.target.value)}
                        error={errors.zone_other}
                        placeholder="Ex. : Calavi, Godomey, Fidjrossè..."
                      />
                    )}
                    <ChoiceField
                      name="moto_usage"
                      number={2}
                      label="Utilisez-vous une moto pour travailler ou vous déplacer ?"
                      options={MOTO_USAGE}
                      value={survey.moto_usage}
                      onChange={(value) => updateSurvey('moto_usage', value)}
                      error={errors.moto_usage}
                    />
                    <ChoiceField
                      name="permis"
                      number={3}
                      label="Avez-vous un permis moto ?"
                      options={PERMIS_OPTIONS}
                      value={survey.permis}
                      onChange={(value) => updateSurvey('permis', value)}
                      error={errors.permis}
                    />
                    <ChoiceField
                      name="telephone_type"
                      number={4}
                      label="Quel type de téléphone utilisez-vous ?"
                      options={TELEPHONE_TYPES}
                      value={survey.telephone_type}
                      onChange={(value) => updateSurvey('telephone_type', value)}
                      error={errors.telephone_type}
                    />
                    <MultiChoiceField
                      label="Quels comptes Mobile Money utilisez-vous ?"
                      number={5}
                      options={MOBILE_MONEY_OPTIONS}
                      values={survey.mobile_money}
                      onToggle={(value) => toggleSurveyValue('mobile_money', value)}
                      error={errors.mobile_money}
                    />
                    {survey.mobile_money.includes('Autre') && (
                      <Input
                        label="Précisez votre compte Mobile Money"
                        value={survey.mobile_money_other}
                        onChange={(event: ChangeEvent<HTMLInputElement>) => updateSurvey('mobile_money_other', event.target.value)}
                        error={errors.mobile_money_other}
                        placeholder="Nom du service Mobile Money"
                      />
                    )}
                    <ChoiceField
                      name="langue"
                      number={6}
                      label="Quelle langue préférez-vous ?"
                      options={LANGUE_OPTIONS}
                      value={survey.langue}
                      onChange={(value) => updateSurvey('langue', value)}
                      error={errors.langue}
                    />
                    <ChoiceField
                      name="jours_par_semaine"
                      number={7}
                      label="Combien de jours par semaine pouvez-vous travailler ?"
                      options={JOURS_OPTIONS}
                      value={survey.jours_par_semaine}
                      onChange={(value) => updateSurvey('jours_par_semaine', value)}
                      error={errors.jours_par_semaine}
                    />
                    <MultiChoiceField
                      label="À quels moments de la journée êtes-vous disponible ?"
                      number={8}
                      options={MOMENTS_OPTIONS}
                      values={survey.moments}
                      onToggle={(value) => toggleSurveyValue('moments', value)}
                      error={errors.moments}
                    />
                    <ChoiceField
                      name="experience_livraison"
                      number={9}
                      label="Avez-vous déjà fait de la livraison ?"
                      options={EXPERIENCE_OPTIONS}
                      value={survey.experience_livraison}
                      onChange={(value) => updateSurvey('experience_livraison', value)}
                      error={errors.experience_livraison}
                    />
                    {survey.experience_livraison !== 'Non' && (
                      <ChoiceField
                        name="anciennete"
                        number={10}
                        label="Depuis combien de temps faites-vous de la livraison ?"
                        options={ANCIENNETE_OPTIONS}
                        value={survey.anciennete}
                        onChange={(value) => updateSurvey('anciennete', value)}
                        error={errors.anciennete}
                      />
                    )}
                    <ChoiceField
                      name="reunion_moment"
                      number={11}
                      label="Quel moment préférez-vous pour une réunion d’information ?"
                      options={REUNION_MOMENTS}
                      value={survey.reunion_moment}
                      onChange={(value) => updateSurvey('reunion_moment', value)}
                      error={errors.reunion_moment}
                    />
                    <Input
                      label="Où préférez-vous participer à cette réunion ?"
                      helper="Facultatif — par exemple un quartier ou une commune."
                      value={survey.reunion_lieu}
                      onChange={(event: ChangeEvent<HTMLInputElement>) => updateSurvey('reunion_lieu', event.target.value)}
                      placeholder="Ex. : Godomey"
                    />
                    <ChoiceField
                      name="formation_preferee"
                      number={12}
                      label="Quel format de formation préférez-vous ?"
                      options={FORMATION_OPTIONS}
                      value={survey.formation_preferee}
                      onChange={(value) => updateSurvey('formation_preferee', value)}
                      error={errors.formation_preferee}
                    />
                    <ChoiceField
                      name="intention"
                      number={13}
                      label="Quand votre zone ouvrira, souhaitez-vous livrer avec AirMess ?"
                      options={INTENTION_OPTIONS}
                      value={survey.intention}
                      onChange={(value) => updateSurvey('intention', value)}
                      error={errors.intention}
                    />
                  </div>
                )}

                {step === 1 && (
                  <div className="space-y-6">
                    <DemoNotice />
                    <div className="grid gap-4 md:grid-cols-2">
                      <Input
                        label="Prénom"
                        value={account.prenom}
                        onChange={(event: ChangeEvent<HTMLInputElement>) => updateAccount('prenom', event.target.value)}
                        error={errors.prenom}
                        placeholder="Koffi"
                      />
                      <Input
                        label="Nom"
                        value={account.nom}
                        onChange={(event: ChangeEvent<HTMLInputElement>) => updateAccount('nom', event.target.value)}
                        error={errors.nom}
                        placeholder="AHOUANSOU"
                      />
                    </div>
                    <ChoiceField
                      name="operateur"
                      label="Réseau Mobile Money"
                      options={OPERATEUR_OPTIONS}
                      value={account.operateur}
                      onChange={(value) => updateAccount('operateur', value)}
                      error={errors.operateur}
                    />
                    <Input
                      label="Numéro Mobile Money à votre nom"
                      helper="Le code SMS sera envoyé à ce numéro."
                      value={account.telephone}
                      onChange={(event: ChangeEvent<HTMLInputElement>) => updateAccount('telephone', event.target.value)}
                      error={errors.telephone}
                      inputMode="tel"
                      placeholder="01 96 00 00 00"
                    />
                    <div className="rounded-xl border border-warm-200 bg-off-white p-4">
                      <p className="text-caption font-bold uppercase tracking-wide text-warm-500">Zone</p>
                      <p className="mt-1 text-body font-bold text-ink">{accountZone || 'Non renseignée'}</p>
                      <button type="button" onClick={() => setStep(0)} className="mt-1 text-caption font-bold text-airmess-red hover:underline">
                        Modifier
                      </button>
                    </div>

                    <div className="space-y-3">
                      <ConsentCheckbox checked={account.majeur} onChange={(checked) => updateAccount('majeur', checked)}>
                        Je certifie avoir <strong className="font-bold">18 ans ou plus</strong>.
                      </ConsentCheckbox>
                      <ConsentCheckbox checked={account.cgu} onChange={(checked) => updateAccount('cgu', checked)}>
                        J’accepte les <strong className="font-bold">Conditions d’utilisation Livreur</strong>.
                      </ConsentCheckbox>
                      <ConsentCheckbox
                        checked={account.confidentialite}
                        onChange={(checked) => updateAccount('confidentialite', checked)}
                      >
                        J’accepte la <strong className="font-bold">Politique de confidentialité</strong>.
                      </ConsentCheckbox>
                    </div>
                    {errors.majeur && <p className="text-caption text-airmess-red">{errors.majeur}</p>}
                    {errors.cgu && <p className="text-caption text-airmess-red">{errors.cgu}</p>}
                    {errors.confidentialite && <p className="text-caption text-airmess-red">{errors.confidentialite}</p>}
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-6">
                    <DemoNotice />
                    <Input
                      label="Code SMS à 6 chiffres"
                      value={otp}
                      onChange={(event: ChangeEvent<HTMLInputElement>) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
                      error={errors.otp}
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="123456"
                    />
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <Button type="button" variant="secondary" onClick={handleResendCode} disabled={secondsLeft > 0 || loading}>
                        {secondsLeft > 0 ? `Renvoyer le code (${secondsLeft}s)` : 'Renvoyer le code'}
                      </Button>
                      <button type="button" onClick={() => { setStep(1); setOtp(''); setOtpSent(false); setSecondsLeft(60); }} className="text-body-s font-bold text-airmess-red hover:underline">
                        Modifier mon numéro
                      </button>
                    </div>
                  </div>
                )}

                <div className="mt-10 flex flex-col-reverse gap-3 border-t border-warm-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
                  {step > 0 ? (
                    <Button type="button" variant="secondary" onClick={() => setStep((previous) => Math.max(0, previous - 1))} leftIcon={<ArrowLeftIcon size={18} />}>
                      Précédent
                    </Button>
                  ) : (
                    <span />
                  )}

                  {step === 0 && (
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <Button type="button" variant="ghost" onClick={() => setStage('early_stop')}>
                        Refuser de participer
                      </Button>
                      <Button type="button" size="lg" onClick={handleSurveyContinue} rightIcon={<ArrowRightIcon size={18} />}>
                        Continuer
                      </Button>
                    </div>
                  )}

                  {step === 1 && (
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <button type="button" onClick={handleWithoutAccount} className="text-body-s font-bold text-airmess-red hover:underline">
                        Envoyer sans ouvrir de compte
                      </button>
                      <Button type="button" size="lg" loading={loading} onClick={handleSendCode} rightIcon={<ArrowRightIcon size={18} />}>
                        Recevoir mon code par SMS
                      </Button>
                    </div>
                  )}

                  {step === 2 && (
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <button type="button" onClick={handleWithoutAccount} className="text-body-s font-bold text-airmess-red hover:underline">
                        Envoyer sans ouvrir de compte
                      </button>
                      <Button type="submit" size="lg" loading={loading} rightIcon={<CheckIcon size={18} />}>
                        Ouvrir mon compte et envoyer
                      </Button>
                    </div>
                  )}
                </div>
              </form>
            </div>
          </Card>
        </section>
      </main>

      <Footer />
    </div>
  )
}
