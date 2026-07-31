import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { AxiosError } from 'axios'
import { useAuthStore } from '../stores/authStore'
import { addMarchantRole, type AddMarchantRolePayload } from '../api/profileRole'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import { ArrowRightIcon, CheckIcon } from '../components/ui/icons'
import mark from '../assets/logo/airmess-mark.svg'

/**
 * Page d'ajout du profil MARCHAND à un compte existant (déclenchée depuis le
 * bouton "Ouvrir aussi un commerce" de la driver-app).
 *
 * Auth cross-app : la driver-app pousse le token Sanctum en fragment URL
 * (`#t=…`). Le fragment n'est PAS envoyé au serveur (donc ni logs, ni referrer),
 * seul le JS de la page le lit. On l'installe dans le store + localStorage
 * puis on efface immédiatement le hash de la barre d'adresse.
 *
 * Le formulaire ne demande QUE les champs propres à Marchant (les infos user
 * — nom, email, phone, password — sont déjà connues et inchangées).
 */
export default function MarchantFromDriverPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const fetchMe = useAuthStore((s) => s.fetchMe)
  const setUser = useAuthStore((s) => s.setUser)

  type Phase = 'loading' | 'form' | 'success' | 'blocked'
  const [phase, setPhase] = useState<Phase>('loading')
  const [blockedReason, setBlockedReason] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [serverFieldErrors, setServerFieldErrors] = useState<
    Record<string, string[]>
  >({})

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AddMarchantRolePayload>()

  // ── Hydratation cross-app : lit le token du hash, l'installe, charge le user.
  useEffect(() => {
    async function hydrate() {
      const hash = window.location.hash || ''
      const params = new URLSearchParams(
        hash.startsWith('#') ? hash.slice(1) : hash,
      )
      const tokenFromHash = params.get('t')

      if (tokenFromHash) {
        localStorage.setItem('airmess_token', tokenFromHash)
        useAuthStore.setState({ token: tokenFromHash, isAuthenticated: true })
        // Nettoie le hash tout de suite (ne le laisse pas traîner en barre
        // d'adresse — même si un fragment n'est pas envoyé au serveur).
        window.history.replaceState(
          null,
          '',
          window.location.pathname + window.location.search,
        )
      }

      const hasToken =
        localStorage.getItem('airmess_token') ??
        useAuthStore.getState().token
      if (!hasToken) {
        navigate('/login', { replace: true })
        return
      }

      await fetchMe()
      const u = useAuthStore.getState().user

      if (!u) {
        navigate('/login', { replace: true })
        return
      }
      if (u.marchant) {
        setBlockedReason(
          "Tu as déjà un compte marchand associé à cet email. Rien à faire ici.",
        )
        setPhase('blocked')
        return
      }
      if (u.type === 'admin') {
        setBlockedReason(
          "Ce compte est un compte admin et ne peut pas ouvrir de commerce.",
        )
        setPhase('blocked')
        return
      }
      setPhase('form')
    }
    void hydrate()
  }, [fetchMe, navigate])

  const serverErr = (field: string): string | undefined =>
    serverFieldErrors[field]?.[0]

  async function onSubmit(values: AddMarchantRolePayload) {
    setError(null)
    setServerFieldErrors({})
    try {
      const res = await addMarchantRole({
        raison_sociale: values.raison_sociale.trim(),
        secteur_activite: values.secteur_activite,
        ifu_rccm: values.ifu_rccm?.trim() || null,
      })
      // Met à jour le user local pour que la prochaine visite bloque proprement
      // (le back a persisté le row Marchant en base).
      setUser(res.user)
      setPhase('success')
    } catch (err) {
      const ax = err as AxiosError<{
        message?: string
        errors?: Record<string, string[]>
      }>
      if (ax.response?.status === 422 && ax.response.data?.errors) {
        setServerFieldErrors(ax.response.data.errors)
      } else if (ax.response?.status === 409) {
        setBlockedReason(
          ax.response.data?.message ??
            "Tu as déjà un compte marchand associé à cet email.",
        )
        setPhase('blocked')
      } else {
        setError(
          ax.response?.data?.message ??
            "Une erreur est survenue. Réessaie dans un instant.",
        )
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Rendus par phase

  const displayName = useMemo(() => {
    if (!user) return ''
    if (user.driver) return `${user.driver.first_name} ${user.driver.last_name}`
    return user.name
  }, [user])

  if (phase === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <p className="text-warm-600 text-body">Chargement…</p>
      </div>
    )
  }

  if (phase === 'blocked') {
    return (
      <PageShell>
        <div className="max-w-lg mx-auto bg-off-white border border-warm-200 rounded-lg p-6 md:p-8 text-center">
          <h1 className="text-h2 text-ink mb-2">Impossible d'ouvrir un commerce</h1>
          <p className="text-body text-warm-600 mb-6">{blockedReason}</p>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 rounded-full bg-airmess-dark text-cream px-5 py-2.5 text-body font-medium hover:bg-ink transition-colors"
          >
            Retour à la connexion
            <ArrowRightIcon size={16} />
          </Link>
        </div>
      </PageShell>
    )
  }

  if (phase === 'success') {
    return (
      <PageShell>
        <div className="max-w-lg mx-auto bg-off-white border border-warm-200 rounded-lg p-6 md:p-8 text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-success/15 text-success mb-4">
            <CheckIcon size={28} />
          </div>
          <h1 className="text-h2 text-ink mb-2">Demande envoyée</h1>
          <p className="text-body text-warm-600 mb-2">
            Ton profil marchand est en attente de validation par un administrateur
            (généralement sous 24h).
          </p>
          <p className="text-body-s text-warm-500 mb-6">
            Ton compte livreur reste actif normalement pendant ce temps —
            tu peux continuer à recevoir des courses.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 rounded-full bg-airmess-dark text-cream px-5 py-2.5 text-body font-medium hover:bg-ink transition-colors"
          >
            Retour à la connexion
            <ArrowRightIcon size={16} />
          </Link>
        </div>
      </PageShell>
    )
  }

  // phase === 'form'
  return (
    <PageShell>
      <div className="max-w-lg mx-auto">
        <div className="bg-off-white border border-warm-200 rounded-lg p-6 md:p-8">
          <h1 className="text-h2 text-ink mb-1">Ouvrir aussi un commerce</h1>
          <p className="text-body-s text-warm-500 mb-6">
            {displayName ? (
              <>
                Connecté en tant que <strong>{displayName}</strong>. Renseigne les
                informations de ton commerce ci-dessous.
              </>
            ) : (
              'Renseigne les informations de ton commerce ci-dessous.'
            )}
          </p>

          {error && (
            <div className="mb-4 rounded-md bg-danger-bg border border-airmess-red/30 px-4 py-3">
              <p className="text-body-s text-airmess-red font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Raison sociale"
              placeholder="Ex : Boutique La Paix Sarl"
              {...register('raison_sociale', {
                required: 'Raison sociale obligatoire',
              })}
              error={errors.raison_sociale?.message ?? serverErr('raison_sociale')}
            />

            <div>
              <label className="block mb-1.5 text-caption text-warm-600 font-medium">
                Secteur d'activité <span className="text-airmess-red">*</span>
              </label>
              <select
                {...register('secteur_activite', {
                  required: 'Choisis un secteur',
                })}
                className="w-full bg-off-white border border-warm-300 rounded-md px-3 py-2.5 text-body text-ink transition-all duration-200 focus:outline-none focus:border-airmess-yellow focus:shadow-glow-yellow"
                defaultValue=""
              >
                <option value="" disabled>Choisis un secteur…</option>
                <option value="supermarche">Supermarché</option>
                <option value="restaurant">Restaurant</option>
                <option value="boutique">Boutique</option>
                <option value="pharmacie">Pharmacie</option>
                <option value="ecommerce">E-commerce</option>
                <option value="autre">Autre</option>
              </select>
              {(errors.secteur_activite?.message || serverErr('secteur_activite')) && (
                <p className="mt-1.5 text-caption text-airmess-red">
                  {errors.secteur_activite?.message ?? serverErr('secteur_activite')}
                </p>
              )}
            </div>

            <Input
              label="IFU / RCCM"
              helper="Optionnel — tu peux l'ajouter plus tard depuis ton dashboard."
              placeholder="Ex : 0123456789012"
              {...register('ifu_rccm')}
              error={serverErr('ifu_rccm')}
            />

            <div className="pt-2">
              <Button type="submit" loading={isSubmitting} className="w-full">
                Envoyer ma demande
              </Button>
            </div>
          </form>
        </div>

        <p className="text-body-s text-warm-500 text-center mt-4">
          Ton compte livreur n'est pas modifié : il reste actif pendant la
          validation.
        </p>
      </div>
    </PageShell>
  )
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <header className="border-b border-warm-200 bg-off-white">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-2">
          <img src={mark} alt="Air Mess" className="h-7 w-7" />
          <span className="text-body font-semibold text-ink">Air Mess</span>
        </div>
      </header>
      <main className="flex-1 px-4 py-8 md:py-12">{children}</main>
    </div>
  )
}
