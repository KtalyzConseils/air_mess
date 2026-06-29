import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import PageEyebrow from '../components/ui/PageEyebrow'
import { useAuthStore } from '../stores/authStore'
import type { Marchant } from '../types/auth'

const SECTEUR_LABEL: Record<Marchant['secteur_activite'], string> = {
  supermarche: '🛒 Supermarché',
  restaurant:  '🍽️ Restaurant',
  boutique:    '🛍️ Boutique',
  pharmacie:   '💊 Pharmacie',
  ecommerce:   '📦 E-commerce',
  autre:       '🏷️ Autre',
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
  const { user, fetchMe } = useAuthStore()

  useEffect(() => {
    fetchMe()
  }, [fetchMe])

  if (!user) {
    return (
      <div className="min-h-screen bg-cream">
        <AppHeader />
        <main className="max-w-4xl mx-auto px-4 md:px-6 py-12 text-center text-warm-500">
          Chargement du profil…
        </main>
      </div>
    )
  }

  const marchant = user.marchant
  const secteur = marchant ? SECTEUR_LABEL[marchant.secteur_activite] : null
  const displayName = marchant?.raison_sociale || user.name
  const initials = initialsOf(displayName)

  return (
    <div className="min-h-screen bg-cream">
      <AppHeader />
      <main className="max-w-4xl mx-auto px-4 md:px-6 py-8 md:py-12">
        <PageEyebrow label="Mon profil" className="mb-4" />
        <h1 className="text-h1 md:text-display-2 text-ink leading-tight mb-2">
          {displayName}.
        </h1>
        <p className="text-body-l text-warm-500 mb-10">
          Informations de votre compte Air Mess.
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
          <h3 className="text-h3 text-ink font-bold mb-5">Compte</h3>
          <dl className="grid grid-cols-[140px_1fr] md:grid-cols-[180px_1fr] gap-y-3 items-center text-body-s">
            <dt className="text-warm-500 font-medium">Nom complet</dt>
            <dd className="text-ink">{user.name}</dd>

            <dt className="text-warm-500 font-medium">Email</dt>
            <dd className="text-ink flex items-center gap-2 flex-wrap">
              <span>{user.email}</span>
              {user.email_verified_at ? (
                <Badge variant="success" size="sm">✓ Vérifié</Badge>
              ) : (
                <Badge variant="warning" size="sm">⚠ Non vérifié</Badge>
              )}
            </dd>

            <dt className="text-warm-500 font-medium">Téléphone</dt>
            <dd className="text-ink">{user.phone ?? '—'}</dd>

            <dt className="text-warm-500 font-medium">Dernière connexion</dt>
            <dd className="text-warm-600">{formatDateTime(user.last_login_at)}</dd>
          </dl>

          <div className="mt-6 pt-5 border-t border-warm-100 flex flex-wrap gap-3">
            <Link to="/forgot-password">
              <Button variant="secondary" size="sm">Changer mon mot de passe</Button>
            </Link>
          </div>
        </Card>

        {/* ============================================================
            ENTREPRISE (marchand uniquement)
            ============================================================ */}
        {marchant && (
          <Card variant="default" padding="lg">
            <h3 className="text-h3 text-ink font-bold mb-5">Entreprise</h3>
            <dl className="grid grid-cols-[140px_1fr] md:grid-cols-[180px_1fr] gap-y-3 items-center text-body-s">
              <dt className="text-warm-500 font-medium">Raison sociale</dt>
              <dd className="text-ink font-medium">{marchant.raison_sociale}</dd>

              <dt className="text-warm-500 font-medium">Secteur</dt>
              <dd className="text-ink">{secteur}</dd>

              <dt className="text-warm-500 font-medium">IFU / RCCM</dt>
              <dd className="text-ink">{marchant.ifu_rccm || '—'}</dd>

              <dt className="text-warm-500 font-medium">Validation</dt>
              <dd className="flex items-center gap-2 flex-wrap">
                {marchant.validated_at ? (
                  <>
                    <span className="text-ink">{formatDate(marchant.validated_at)}</span>
                    <Badge variant="success" size="sm">✓ Validé</Badge>
                  </>
                ) : (
                  <Badge variant="warning" size="sm">⏳ En attente</Badge>
                )}
              </dd>
            </dl>
          </Card>
        )}
      </main>
    </div>
  )
}
