import { useEffect } from 'react'
import AppHeader from '../components/AppHeader'
import { useAuthStore } from '../stores/authStore'
import type { Marchant } from '../types/auth'

const PLAN_LABEL: Record<Marchant['subscription_plan'], { label: string; color: string }> = {
  trial:    { label: 'Essai',    color: 'bg-gray-100 text-gray-700' },
  starter:  { label: 'Starter',  color: 'bg-blue-100 text-blue-700' },
  pro:      { label: 'Pro',      color: 'bg-airmess-yellow text-airmess-dark' },
  business: { label: 'Business', color: 'bg-purple-100 text-purple-700' },
}

const SECTEUR_LABEL: Record<Marchant['secteur_activite'], string> = {
  supermarche: '🛒 Supermarché',
  restaurant:  '🍽️ Restaurant',
  boutique:    '🛍️ Boutique',
  pharmacie:   '💊 Pharmacie',
  ecommerce:   '📦 E-commerce',
  autre:       '🏷️ Autre',
}

const STATUS_LABEL: Record<Marchant['subscription_status'], { label: string; color: string }> = {
  trial:     { label: 'Période d\'essai', color: 'bg-yellow-100 text-yellow-800' },
  active:    { label: 'Actif',            color: 'bg-green-100 text-green-700' },
  expired:   { label: 'Expiré',           color: 'bg-amber-100 text-amber-800' },
  suspended: { label: 'Suspendu',         color: 'bg-red-100 text-red-700' },
  churned:   { label: 'Résilié',          color: 'bg-gray-100 text-gray-600' },
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

export default function ProfilePage() {
  const { user, fetchMe } = useAuthStore()

  useEffect(() => { fetchMe() }, [fetchMe])

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppHeader />
        <main className="max-w-4xl mx-auto p-6 text-center text-gray-500">
          Chargement du profil...
        </main>
      </div>
    )
  }

  const marchant = user.marchant
  const plan = marchant ? PLAN_LABEL[marchant.subscription_plan] : null
  const status = marchant ? STATUS_LABEL[marchant.subscription_status] : null
  const secteur = marchant ? SECTEUR_LABEL[marchant.secteur_activite] : null

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader />
      <main className="max-w-4xl mx-auto p-6 space-y-6">

        <section className="bg-white rounded-2xl shadow-sm p-6 flex items-center gap-6">
          {/* Avatar initiales */}
          <div className="w-20 h-20 flex items-center justify-center rounded-full bg-airmess-yellow text-2xl font-bold text-airmess-dark uppercase select-none">
            {marchant?.raison_sociale
              ? marchant.raison_sociale.split(' ')
                  .filter(w => w.length > 0)
                  .slice(0,2)
                  .map(w => w[0])
                  .join('')
              : user.name.split(' ')
                  .filter(w => w.length > 0)
                  .slice(0,2)
                  .map(w => w[0])
                  .join('')}
          </div>
          {/* Right Info */}
          <div className="flex-1 min-w-0 flex flex-col gap-1">
            {/* Raison sociale */}
            <h1 className="text-2xl font-bold text-airmess-dark truncate">
              {marchant?.raison_sociale || user.name}
            </h1>
            {/* Nom complet */}
            <p className="text-gray-700 font-medium">{user.name}</p>
            {/* Email + phone */}
            <p className="text-sm text-gray-500">
              {user.email}
              {user.phone && (
                <> &middot; <span>{user.phone}</span></>
              )}
            </p>
            {/* Badges */}
            <div className="flex gap-2 mt-4">
              {plan && (
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${plan.color}`}>
                  {plan.label}
                </span>
              )}
              {status && (
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${status.color}`}>
                  {status.label}
                </span>
              )}
            </div>
          </div>
        </section>
   

        {/* ────────────────────────────────────────────────────
            SECTION "Compte" : infos User
        ──────────────────────────────────────────────────── */}
        <section className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4 text-airmess-dark">Compte</h2>
          <div className="grid grid-cols-[160px_1fr] gap-y-3 items-center">
            <div className="text-gray-500 font-medium">Nom complet</div>
            <div className="text-airmess-dark">{user.name}</div>

            <div className="text-gray-500 font-medium">Email</div>
            <div className="flex items-center gap-2">
              <span>{user.email}</span>
              {user.email_verified_at ? (
                <span title="Email vérifié" className="text-green-600 text-lg">✅</span>
              ) : (
                <span title="Email non vérifié" className="text-yellow-500 text-lg">⚠️</span>
              )}
            </div>

            <div className="text-gray-500 font-medium">Téléphone</div>
            <div className="text-airmess-dark">{user.phone ? user.phone : '—'}</div>

            <div className="text-gray-500 font-medium">Dernière connexion</div>
            <div className="text-airmess-dark">{formatDateTime(user.last_login_at)}</div>
          </div>
        </section>
   


        {/* ────────────────────────────────────────────────────
            SECTION "Entreprise" : infos Marchant
        ──────────────────────────────────────────────────── */}
        {marchant && (
          <section className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4 text-airmess-dark">Entreprise</h2>
            <div className="grid grid-cols-[160px_1fr] gap-y-3 items-center">
              <div className="text-gray-500 font-medium">Raison sociale</div>
              <div className="text-airmess-dark">{marchant.raison_sociale}</div>

              <div className="text-gray-500 font-medium">Secteur</div>    
              <div className="text-airmess-dark">{secteur}</div> 

              <div className="text-gray-500 font-medium">IFU / RCCM</div>
              <div className="text-airmess-dark">{marchant.ifu_rccm || '—'}</div>

              <div className="text-gray-500 font-medium">Validé le</div>
              <div className="text-airmess-dark flex items-center gap-2">
                {marchant.validated_at ? (
                  <>
                    {formatDate(marchant.validated_at)}
                    <span className="rounded-full bg-green-100 text-green-700 px-2 py-0.5 text-xs font-semibold flex items-center gap-1">
                      ✅ Validé
                    </span>
                  </>
                ) : (
                  <>
                    —
                    <span className="rounded-full bg-yellow-100 text-yellow-700 px-2 py-0.5 text-xs font-semibold flex items-center gap-1">
                      ⏳ En attente
                    </span>
                  </>
                )}
              </div>
            </div>
          </section>
        )}
   

        {/* ──────────────────────────────────────────────
          SECTION "Abonnement"
          ────────────────────────────────────────────── */}
        {marchant && (
          <section className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4 text-airmess-dark">Abonnement</h2>
            <div className="grid grid-cols-[160px_1fr] gap-y-3 items-center">
              <div className="text-gray-500 font-medium">Formule</div>
              <div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${plan?.color ?? 'bg-gray-100 text-gray-600'}`}>
                  {plan?.label ?? '—'}
                </span>
              </div>

              <div className="text-gray-500 font-medium">Statut</div>
              <div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${status?.color ?? 'bg-gray-100 text-gray-600'}`}>
                  {status?.label ?? '—'}
                </span>
              </div>

              <div className="text-gray-500 font-medium">Date de début</div>
              <div className="text-airmess-dark">{formatDate(marchant.subscription_started_at)}</div>

              <div className="text-gray-500 font-medium">Prochaine échéance</div>
              <div className="text-airmess-dark">{formatDate(marchant.subscription_next_billing_at)}</div>
            </div>
          </section>
        )}
   
      </main>
    </div>
  )
}
