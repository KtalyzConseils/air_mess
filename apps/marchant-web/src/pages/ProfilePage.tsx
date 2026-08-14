import { useEffect, useState, type ReactElement } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AxiosError } from 'axios'
import AppHeader from '../components/AppHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import PageEyebrow from '../components/ui/PageEyebrow'
import { useAuthStore } from '../stores/authStore'
import type { Marchant } from '../types/auth'
import { useUiPrefsStore, type ClientNavMode } from '../stores/uiPrefsStore'
import Input from '../components/ui/Input'
import { addDriverRole, type AddDriverRolePayload } from '../api/profileRole'

const SECTEUR_KEY: Record<Marchant['secteur_activite'], string> = {
  supermarche: 'profile.sectorSupermarche',
  restaurant:  'profile.sectorRestaurant',
  boutique:    'profile.sectorBoutique',
  pharmacie:   'profile.sectorPharmacie',
  ecommerce:   'profile.sectorEcommerce',
  autre:       'profile.sectorAutre',
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function initialsOf(name: string): string {
  return name
    .split(' ')
    .filter((w) => w.length > 0)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

export default function ProfilePage() {
  const { t } = useTranslation()
  const { user, fetchMe, setUser } = useAuthStore()
  const [driverRoleSuccess, setDriverRoleSuccess] = useState<string | null>(null)
  const [driverRoleError, setDriverRoleError] = useState<string | null>(null)
  const [serverFieldErrors, setServerFieldErrors] = useState<Record<string, string[]>>({})
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AddDriverRolePayload>({
    defaultValues: {
      vehicle_type: 'moto',
      preferred_response_channel: 'whatsapp',
      equipment: {
        isothermal_bag: false,
        top_case: false,
        refrigerated_bag: false,
      },
    },
  })

  useEffect(() => {
    fetchMe()
  }, [fetchMe])

  const serverErr = (field: string): string | undefined => serverFieldErrors[field]?.[0]

  async function onAddDriverRole(values: AddDriverRolePayload) {
    setDriverRoleError(null)
    setDriverRoleSuccess(null)
    setServerFieldErrors({})
    try {
      const res = await addDriverRole({
        ...values,
        first_name: values.first_name.trim(),
        last_name: values.last_name.trim(),
        gender: values.gender || undefined,
        birth_date: values.birth_date || undefined,
        vehicle_plate: values.vehicle_plate.trim(),
        vehicle_brand: values.vehicle_brand?.trim() || null,
        emergency_contact_name: values.emergency_contact_name.trim(),
        emergency_contact_phone: values.emergency_contact_phone.trim(),
        emergency_contact2_name: values.emergency_contact2_name?.trim() || null,
        emergency_contact2_phone: values.emergency_contact2_phone?.trim() || null,
        preferred_response_channel: values.preferred_response_channel ?? 'whatsapp',
      })
      setUser(res.user)
      setDriverRoleSuccess(res.message)
    } catch (err) {
      const ax = err as AxiosError<{ message?: string; errors?: Record<string, string[]> }>
      if (ax.response?.status === 422 && ax.response.data?.errors) {
        setServerFieldErrors(ax.response.data.errors)
      }
      setDriverRoleError(
        ax.response?.data?.message ??
          "Impossible d'envoyer la demande livreur. Réessaie dans un instant.",
      )
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-cream">
        <AppHeader />
        <main className="max-w-4xl mx-auto px-4 md:px-6 py-12 text-center text-warm-500">
          {t('profile.loadingProfile')}
        </main>
      </div>
    )
  }

  const marchant = user.marchant
  const secteur = marchant ? t(SECTEUR_KEY[marchant.secteur_activite]) : null
  const displayName = marchant?.raison_sociale || user.name
  const initials = initialsOf(displayName)

  return (
    <div className="min-h-screen bg-cream">
      <AppHeader />
      <main className="max-w-4xl mx-auto px-4 md:px-6 py-8 md:py-12">
        <PageEyebrow label={t('profile.eyebrow')} className="mb-4" />
        <h1 className="text-h1 md:text-display-2 text-ink leading-tight mb-2">
          {displayName}.
        </h1>
        <p className="text-body-l text-warm-500 mb-10">
          {t('profile.subtitleAccount')}
        </p>

        {/* ============================================================
            CARTE IDENTITÉ
            ============================================================ */}
        <Card variant="signature" padding="lg" className="mb-6 flex items-center gap-5 md:gap-6">
          <div className="w-20 h-20 md:w-24 md:h-24 flex items-center justify-center rounded-full bg-airmess-yellow text-h2 md:text-h1 font-bold text-ink select-none shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-h2 text-ink truncate">{displayName}</h2>
            <p className="text-body text-warm-600">{user.name}</p>
            <p className="text-body-s text-warm-500 mt-1 truncate">
              {user.email}
              {user.phone && <span className="text-warm-400"> · {user.phone}</span>}
            </p>
          </div>
        </Card>

        {/* ============================================================
            COMPTE
            ============================================================ */}
        <Card variant="default" padding="lg" className="mb-6">
          <h3 className="text-h3 text-ink font-bold mb-5">{t('profile.account')}</h3>
          <dl className="grid grid-cols-[140px_1fr] md:grid-cols-[180px_1fr] gap-y-3 items-center text-body-s">
            <dt className="text-warm-500 font-medium">{t('profile.fullName')}</dt>
            <dd className="text-ink">{user.name}</dd>

            <dt className="text-warm-500 font-medium">{t('common.email')}</dt>
            <dd className="text-ink flex items-center gap-2 flex-wrap">
              <span>{user.email}</span>
              {user.email_verified_at ? (
                <Badge variant="success" size="sm">{t('profile.verified')}</Badge>
              ) : (
                <Badge variant="warning" size="sm">{t('profile.notVerified')}</Badge>
              )}
            </dd>

            <dt className="text-warm-500 font-medium">{t('common.phone')}</dt>
            <dd className="text-ink">{user.phone ?? '—'}</dd>

            <dt className="text-warm-500 font-medium">{t('profile.lastLogin')}</dt>
            <dd className="text-warm-600">{formatDateTime(user.last_login_at)}</dd>
          </dl>

          <div className="mt-6 pt-5 border-t border-warm-100 flex flex-wrap gap-3">
            <Link to="/forgot-password">
              <Button variant="secondary" size="sm">{t('profile.changePasswordShort')}</Button>
            </Link>
          </div>
        </Card>

        {/* ============================================================
            ENTREPRISE (marchand uniquement)
            ============================================================ */}
        {marchant && (
          <Card variant="default" padding="lg">
            <h3 className="text-h3 text-ink font-bold mb-5">{t('profile.company')}</h3>
            <dl className="grid grid-cols-[140px_1fr] md:grid-cols-[180px_1fr] gap-y-3 items-center text-body-s">
              <dt className="text-warm-500 font-medium">{t('profile.legalName')}</dt>
              <dd className="text-ink font-medium">{marchant.raison_sociale}</dd>

              <dt className="text-warm-500 font-medium">{t('profile.sectorLabel')}</dt>
              <dd className="text-ink">{secteur}</dd>

              <dt className="text-warm-500 font-medium">{t('profile.ifuRccm')}</dt>
              <dd className="text-ink">{marchant.ifu_rccm || '—'}</dd>

              <dt className="text-warm-500 font-medium">{t('profile.validation')}</dt>
              <dd className="flex items-center gap-2 flex-wrap">
                {marchant.validated_at ? (
                  <>
                    <span className="text-ink">{formatDate(marchant.validated_at)}</span>
                    <Badge variant="success" size="sm">{t('profile.validated')}</Badge>
                  </>
                ) : (
                  <Badge variant="warning" size="sm">{t('profile.pendingValidation')}</Badge>
                )}
              </dd>
            </dl>
          </Card>
        )}

        {/* ============================================================
            MULTI-RÔLE : MARCHAND → LIVREUR
            ============================================================ */}
        <div className="mt-6">
          <Card variant="default" padding="lg">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-5">
              <div>
                <h3 className="text-h3 text-ink font-bold">Devenir aussi livreur</h3>
                <p className="text-body-s text-warm-500 mt-1">
                  Ajoute un profil livreur à ce compte. Ton espace marchand reste inchangé.
                </p>
              </div>
              {user.driver && (
                <Badge
                  variant={user.driver.activation_status === 'active' ? 'success' : 'warning'}
                  size="sm"
                >
                  {user.driver.activation_status === 'active'
                    ? 'Livreur actif'
                    : 'Validation livreur en attente'}
                </Badge>
              )}
            </div>

            {user.driver ? (
              <p className="text-body-s text-warm-600">
                Un profil livreur est déjà associé à ce compte. Une fois validé,
                tu pourras te connecter à l'app Driver avec les mêmes identifiants.
              </p>
            ) : (
              <form onSubmit={handleSubmit(onAddDriverRole)} className="space-y-4">
                {driverRoleSuccess && (
                  <div className="rounded-md bg-success-bg border border-success/30 px-4 py-3">
                    <p className="text-body-s text-success font-medium">{driverRoleSuccess}</p>
                  </div>
                )}
                {driverRoleError && (
                  <div className="rounded-md bg-danger-bg border border-airmess-red/30 px-4 py-3">
                    <p className="text-body-s text-airmess-red font-medium">{driverRoleError}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Prénom"
                    defaultValue={user.name.split(' ')[0] ?? ''}
                    {...register('first_name', { required: 'Prénom obligatoire' })}
                    error={errors.first_name?.message ?? serverErr('first_name')}
                  />
                  <Input
                    label="Nom"
                    defaultValue={user.name.split(' ').slice(1).join(' ')}
                    {...register('last_name', { required: 'Nom obligatoire' })}
                    error={errors.last_name?.message ?? serverErr('last_name')}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-1.5 text-caption text-warm-600 font-medium">
                      Genre
                    </label>
                    <select
                      {...register('gender')}
                      className="w-full bg-off-white border border-warm-300 rounded-md px-3 py-2.5 text-body text-ink focus:outline-none focus:border-airmess-yellow focus:shadow-glow-yellow"
                      defaultValue=""
                    >
                      <option value="">Non précisé</option>
                      <option value="M">Homme</option>
                      <option value="F">Femme</option>
                      <option value="autre">Autre</option>
                    </select>
                    {serverErr('gender') && (
                      <p className="mt-1.5 text-caption text-airmess-red">{serverErr('gender')}</p>
                    )}
                  </div>
                  <Input
                    label="Date de naissance"
                    type="date"
                    {...register('birth_date')}
                    error={serverErr('birth_date')}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block mb-1.5 text-caption text-warm-600 font-medium">
                      Véhicule
                    </label>
                    <select
                      {...register('vehicle_type', { required: 'Véhicule obligatoire' })}
                      className="w-full bg-off-white border border-warm-300 rounded-md px-3 py-2.5 text-body text-ink focus:outline-none focus:border-airmess-yellow focus:shadow-glow-yellow"
                    >
                      <option value="moto">Moto</option>
                      <option value="scooter">Scooter</option>
                      <option value="voiture">Voiture</option>
                      <option value="velo">Vélo</option>
                    </select>
                    {(errors.vehicle_type?.message || serverErr('vehicle_type')) && (
                      <p className="mt-1.5 text-caption text-airmess-red">
                        {errors.vehicle_type?.message ?? serverErr('vehicle_type')}
                      </p>
                    )}
                  </div>
                  <Input
                    label="Plaque"
                    placeholder="BJ-0001-AM"
                    {...register('vehicle_plate', { required: 'Plaque obligatoire' })}
                    error={errors.vehicle_plate?.message ?? serverErr('vehicle_plate')}
                  />
                  <Input
                    label="Marque"
                    placeholder="Bajaj, TVS..."
                    {...register('vehicle_brand')}
                    error={serverErr('vehicle_brand')}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Contact d'urgence"
                    {...register('emergency_contact_name', {
                      required: "Nom du contact d'urgence obligatoire",
                    })}
                    error={errors.emergency_contact_name?.message ?? serverErr('emergency_contact_name')}
                  />
                  <Input
                    label="Téléphone urgence"
                    {...register('emergency_contact_phone', {
                      required: "Téléphone du contact d'urgence obligatoire",
                    })}
                    error={errors.emergency_contact_phone?.message ?? serverErr('emergency_contact_phone')}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Second contact"
                    helper="Optionnel"
                    {...register('emergency_contact2_name')}
                    error={serverErr('emergency_contact2_name')}
                  />
                  <Input
                    label="Téléphone second contact"
                    helper="Optionnel"
                    {...register('emergency_contact2_phone')}
                    error={serverErr('emergency_contact2_phone')}
                  />
                </div>

                <div>
                  <label className="block mb-1.5 text-caption text-warm-600 font-medium">
                    Canal préféré pour la réponse admin
                  </label>
                  <select
                    {...register('preferred_response_channel')}
                    className="w-full bg-off-white border border-warm-300 rounded-md px-3 py-2.5 text-body text-ink focus:outline-none focus:border-airmess-yellow focus:shadow-glow-yellow"
                  >
                    <option value="whatsapp">WhatsApp</option>
                    <option value="sms">SMS</option>
                    <option value="email">Email</option>
                  </select>
                </div>

                <fieldset className="border border-warm-200 rounded-md p-4">
                  <legend className="px-1 text-caption text-warm-600 font-medium">
                    Équipement
                  </legend>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <label className="flex items-center gap-2 text-body-s text-ink">
                      <input type="checkbox" {...register('equipment.isothermal_bag')} />
                      Sac isotherme
                    </label>
                    <label className="flex items-center gap-2 text-body-s text-ink">
                      <input type="checkbox" {...register('equipment.top_case')} />
                      Top case
                    </label>
                    <label className="flex items-center gap-2 text-body-s text-ink">
                      <input type="checkbox" {...register('equipment.refrigerated_bag')} />
                      Sac réfrigéré
                    </label>
                  </div>
                </fieldset>

                <div className="pt-2 flex flex-col md:flex-row md:items-center gap-3">
                  <Button type="submit" loading={isSubmitting}>
                    Envoyer ma demande livreur
                  </Button>
                  <p className="text-body-s text-warm-500">
                    Un admin devra valider le profil avant réception des courses.
                  </p>
                </div>
              </form>
            )}
          </Card>
        </div>

        {/* ============================================================
            Préférences d'affichage — navigation
            ============================================================ */}
        <div className="mt-10">
          <PageEyebrow label={t('profile.displayPrefs')} className="mb-4" />
          <h2 className="text-h2 md:text-h1 text-ink font-bold leading-tight">
            {t('profile.navStyle')}
          </h2>
          <p className="text-body-l text-warm-500 mt-2 mb-6">
            {t('profile.navStyleHint')}{' '}
            <span className="text-warm-400 text-body-s">
              {t('profile.navStyleHintSaved')}
            </span>
          </p>

          <NavModeCards />
        </div>
      </main>
    </div>
  )
}

/* ============================================================
   Sélecteur "Style de navigation"
   ------------------------------------------------------------
   Deux cartes mockup côte à côte — la sélection se voit en un coup d'œil
   via une bordure jaune + ombre, et chaque carte montre une mini-représentation
   visuelle du mode (header barre + items vs FAB + arc).
   ============================================================ */
interface NavModeOption {
  value: ClientNavMode
  titleKey: string
  descriptionKey: string
  preview: () => ReactElement
}

function HorizontalPreview() {
  return (
    <div className="bg-airmess-dark rounded-md p-2 space-y-2">
      {/* Mini header */}
      <div className="flex items-center gap-1.5">
        <div className="w-3 h-3 rounded-sm bg-airmess-yellow" />
        <div className="flex gap-1 ml-auto">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={`h-1.5 w-5 rounded-full ${
                i === 1 ? 'bg-airmess-yellow' : 'bg-white/30'
              }`}
            />
          ))}
        </div>
      </div>
      {/* Faux contenu */}
      <div className="bg-cream/90 rounded-sm h-12" />
    </div>
  )
}

function FabPreview() {
  return (
    <div className="bg-cream rounded-md p-2 h-[64px] relative overflow-hidden">
      {/* Arc d'items derrière */}
      <div className="absolute right-3 bottom-3 w-8 h-8 rounded-full bg-airmess-yellow shadow-md z-10" />
      {[-50, -25, 0, 25, 50].map((dy, i) => (
        <div
          key={i}
          className="absolute w-4 h-4 rounded-full bg-airmess-dark shadow-sm"
          style={{
            right: 9 + Math.abs(dy) * 0.5 + 18,
            bottom: 16 + dy / 2 + 16,
          }}
        />
      ))}
    </div>
  )
}

const NAV_OPTIONS: NavModeOption[] = [
  {
    value: 'horizontal',
    titleKey: 'profile.navHorizontal',
    descriptionKey: 'profile.navHorizontalDesc',
    preview: HorizontalPreview,
  },
  {
    value: 'fab',
    titleKey: 'profile.navFab',
    descriptionKey: 'profile.navFabDesc',
    preview: FabPreview,
  },
]

function NavModeCards() {
  const { t } = useTranslation()
  const mode = useUiPrefsStore((s) => s.clientNavMode)
  const setMode = useUiPrefsStore((s) => s.setClientNavMode)

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
      {NAV_OPTIONS.map((opt) => {
        const active = mode === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => setMode(opt.value)}
            aria-pressed={active}
            className={[
              'relative text-left rounded-lg border-2 p-4 transition-all',
              'focus:outline-none focus:ring-2 focus:ring-airmess-yellow/50',
              active
                ? 'border-airmess-yellow bg-off-white shadow-md'
                : 'border-warm-200 bg-off-white hover:border-warm-400 hover:shadow-sm',
            ].join(' ')}
          >
            {/* Coche actif */}
            {active && (
              <span className="absolute top-3 right-3 w-6 h-6 rounded-full bg-airmess-yellow text-ink flex items-center justify-center font-bold text-body-s shadow">
                ✓
              </span>
            )}

            {/* Mini illustration */}
            <div className="mb-4">
              <opt.preview />
            </div>

            <h3 className="text-body font-bold text-ink">{t(opt.titleKey)}</h3>
            <p className="text-body-s text-warm-500 mt-1">{t(opt.descriptionKey)}</p>
          </button>
        )
      })}
    </div>
  )
}
