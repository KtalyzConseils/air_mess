import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import AppHeader from '../components/AppHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Highlight from '../components/Highlight'
import PageEyebrow from '../components/ui/PageEyebrow'
import ConfirmModal from '../components/ConfirmModal'
import { cn } from '../lib/cn'
import {
  fetchApiPlans,
  fetchMyApiApps,
  createApiApp,
  deleteApiApp,
  fetchApiAppKeys,
  createApiAppKey,
  revokeApiAppKey,
  configureWebhook,
  disableWebhook,
  fetchDeliveries,
  retryDelivery,
  subscribeToPlan,
  type ApiApp,
  type ApiPlan,
  type ApiKey,
  type WebhookDelivery,
} from '../api/apiApps'

/**
 * DevPage — hub "mode développeur" du marchand ou particulier.
 *
 *   1. Liste des apps existantes avec gauge de quota
 *   2. Modal création (choix du plan API)
 *   3. Modal gestion des clés (génération, révocation)
 *   4. Modal "clé générée" — affiche la valeur en clair une seule fois
 *
 * Toutes les données côté back : /api-plans + /me/api-apps + /me/api-apps/{id}/keys
 */

function formatFcfa(n: number): string {
  if (n === 0) return 'Gratuit'
  return n.toLocaleString('fr-FR') + ' FCFA'
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function extractMessage(err: unknown, fallback: string): string {
  return err instanceof AxiosError
    ? err.response?.data?.message ?? fallback
    : fallback
}

export default function DevPage() {
  const queryClient = useQueryClient()

  const [newAppOpen, setNewAppOpen] = useState(false)
  const [keysAppId, setKeysAppId] = useState<number | null>(null)
  const [webhookAppId, setWebhookAppId] = useState<number | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [freshKey, setFreshKey] = useState<{ appName: string; key: string; label: string } | null>(null)

  const appsQ = useQuery({ queryKey: ['api-apps'], queryFn: fetchMyApiApps })
  const plansQ = useQuery({ queryKey: ['api-plans'], queryFn: fetchApiPlans })

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteApiApp(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-apps'] })
      setConfirmDeleteId(null)
    },
    onError: (err) => window.alert(extractMessage(err, 'Suppression impossible.')),
  })

  const subscribeMut = useMutation({
    mutationFn: ({ appId, planCode }: { appId: number; planCode: string }) =>
      subscribeToPlan(appId, planCode, `${window.location.origin}/billing/return`),
    onSuccess: (res) => {
      if (res.checkout_url) {
        window.location.href = res.checkout_url
      } else {
        queryClient.invalidateQueries({ queryKey: ['api-apps'] })
      }
    },
    onError: (err) => window.alert(extractMessage(err, 'Renouvellement impossible.')),
  })

  const currentKeysApp = useMemo(
    () => appsQ.data?.find((a) => a.id === keysAppId) ?? null,
    [appsQ.data, keysAppId],
  )

  const currentWebhookApp = useMemo(
    () => appsQ.data?.find((a) => a.id === webhookAppId) ?? null,
    [appsQ.data, webhookAppId],
  )

  return (
    <div className="min-h-screen bg-cream">
      <AppHeader />
      <main className="max-w-4xl mx-auto px-4 md:px-6 py-8 md:py-12">
        <PageEyebrow label="Mode développeur" className="mb-4" />
        <h1 className="text-h1 md:text-display-2 text-ink leading-tight mb-2">
          Ton accès <Highlight>API</Highlight>.
        </h1>
        <p className="text-body-l text-warm-500 mb-2">
          Utilise Air Mess depuis ton propre site : ton e-commerce crée une commande, la course
          part chez nous. Choisis un plan, génère une clé, lance ta première requête.
        </p>
        <p className="text-body-s text-warm-500 mb-8">
          Doc API :{' '}
          <a
            href="https://github.com/ktalyzconseils/air-mess/blob/main/docs/API_INTEGRATION.md"
            target="_blank"
            rel="noopener noreferrer"
            className="text-ink font-semibold underline hover:text-airmess-red"
          >
            docs/API_INTEGRATION.md
          </a>
        </p>

        {appsQ.isLoading && (
          <p className="text-warm-500 text-center py-12">Chargement…</p>
        )}

        {!appsQ.isLoading && appsQ.data?.length === 0 && (
          <EmptyState onCreate={() => setNewAppOpen(true)} />
        )}

        {!appsQ.isLoading && appsQ.data && appsQ.data.length > 0 && (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-h3 font-bold text-ink">
                Mes apps ({appsQ.data.length})
              </h2>
              <Button
                variant="primary"
                size="md"
                onClick={() => setNewAppOpen(true)}
                leftIcon={<span className="text-lg leading-none">+</span>}
              >
                Nouvelle app
              </Button>
            </div>
            <div className="space-y-4">
              {appsQ.data.map((app) => (
                <AppCard
                  key={app.id}
                  app={app}
                  onOpenKeys={() => setKeysAppId(app.id)}
                  onOpenWebhook={() => setWebhookAppId(app.id)}
                  onDelete={() => setConfirmDeleteId(app.id)}
                  onRenew={() =>
                    app.plan && subscribeMut.mutate({ appId: app.id, planCode: app.plan.code })
                  }
                  isRenewing={
                    subscribeMut.isPending && subscribeMut.variables?.appId === app.id
                  }
                />
              ))}
            </div>
          </>
        )}
      </main>

      {/* Modal nouvelle app */}
      <NewAppModal
        visible={newAppOpen}
        plans={plansQ.data ?? []}
        onClose={() => setNewAppOpen(false)}
        onCreated={(app) => {
          setNewAppOpen(false)
          setKeysAppId(app.id)
        }}
      />

      {/* Modal gestion des clés */}
      <KeysModal
        app={currentKeysApp}
        onClose={() => setKeysAppId(null)}
        onKeyCreated={(key) =>
          currentKeysApp && setFreshKey({ appName: currentKeysApp.name, key, label: 'Clé' })
        }
      />

      {/* Modal webhook + deliveries */}
      <WebhookModal
        app={currentWebhookApp}
        onClose={() => setWebhookAppId(null)}
        onSecretCreated={(secret) =>
          currentWebhookApp && setFreshKey({ appName: currentWebhookApp.name, key: secret, label: 'Secret webhook' })
        }
      />

      {/* Modal clé/secret généré (one-shot) */}
      <FreshKeyModal
        payload={freshKey}
        onClose={() => setFreshKey(null)}
      />

      {/* Confirm suppression */}
      <ConfirmModal
        visible={confirmDeleteId !== null}
        title="Supprimer cette app ?"
        description="Toutes ses clés seront révoquées immédiatement. Les courses déjà créées restent inchangées. Action définitive."
        confirmLabel="Supprimer"
        confirmVariant="danger"
        isPending={deleteMut.isPending}
        onConfirm={() => confirmDeleteId && deleteMut.mutate(confirmDeleteId)}
        onClose={() => setConfirmDeleteId(null)}
      />
    </div>
  )
}

// ─── Empty state ────────────────────────────────────────────────────────

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <Card variant="signature" padding="lg" className="text-center">
      <p className="text-caption uppercase text-warm-500 tracking-widest font-bold mb-3">
        Aucune app pour l'instant
      </p>
      <h2 className="text-h2 text-ink font-bold mb-3">
        Air Mess depuis ton système
      </h2>
      <p className="text-body text-warm-600 max-w-md mx-auto mb-6">
        Crée une app pour obtenir une clé, choisis ton plan (15, 100 ou 500 requêtes / mois)
        et lance des courses depuis ton propre back-office.
      </p>
      <Button variant="primary" size="lg" onClick={onCreate} pill>
        Créer ma première app
      </Button>
    </Card>
  )
}

// ─── App card ───────────────────────────────────────────────────────────

function AppCard({
  app,
  onOpenKeys,
  onOpenWebhook,
  onDelete,
  onRenew,
  isRenewing,
}: {
  app: ApiApp
  onOpenKeys: () => void
  onOpenWebhook: () => void
  onDelete: () => void
  onRenew: () => void
  isRenewing: boolean
}) {
  const unlimited = app.quota_limit === 0
  const usedPct = unlimited ? 0 : Math.min(100, Math.round((app.quota_used / app.quota_limit) * 100))
  const nearLimit = !unlimited && usedPct >= 80
  const atLimit = !unlimited && app.quota_used >= app.quota_limit
  const paid = app.plan?.monthly_price_fcfa && app.plan.monthly_price_fcfa > 0
  const showRenew = paid && !!app.plan  // seuls les plans payants affichent Renouveler

  return (
    <Card variant="elevated" padding="md">
      {/* Bandeau expiration si concerné */}
      {app.is_expired && (
        <div className="mb-3 bg-danger-bg border border-airmess-red/30 rounded-md px-3 py-2 flex items-center gap-3">
          <span className="text-airmess-red font-bold text-body-s">Abonnement expiré</span>
          <span className="text-body-s text-warm-600 flex-1">
            L'app est suspendue. Renouvelle pour reprendre les requêtes.
          </span>
        </div>
      )}
      {!app.is_expired && app.paid_until && (
        <div className="mb-3 text-caption text-warm-500">
          Abonnement actif jusqu'au{' '}
          <strong className="text-ink">
            {new Date(app.paid_until).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
          </strong>
        </div>
      )}

      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-h3 text-ink font-bold truncate">{app.name}</h3>
            {app.status === 'suspended' ? (
              <Badge variant="danger" size="sm">Suspendue</Badge>
            ) : (
              <Badge variant="success" size="sm" dot>Active</Badge>
            )}
          </div>
          {app.description && (
            <p className="text-body-s text-warm-500 line-clamp-2">{app.description}</p>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="text-caption uppercase text-warm-500 tracking-widest font-bold">Plan</p>
          <p className="text-body font-bold text-ink">{app.plan?.name ?? '—'}</p>
          {app.plan && (
            <p className="text-body-s text-warm-500">
              {formatFcfa(app.plan.monthly_price_fcfa)}/mois
            </p>
          )}
        </div>
      </div>

      {/* Quota */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-caption uppercase text-warm-500 tracking-widest font-bold">
            Quota ce mois
          </span>
          <span className={cn(
            'text-body-s font-bold',
            atLimit ? 'text-airmess-red' : nearLimit ? 'text-warning' : 'text-ink',
          )}>
            {unlimited ? 'Illimité' : `${app.quota_used} / ${app.quota_limit}`}
          </span>
        </div>
        {!unlimited && (
          <div className="h-2 bg-warm-100 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                atLimit ? 'bg-airmess-red' : nearLimit ? 'bg-warning' : 'bg-airmess-yellow',
              )}
              style={{ width: `${usedPct}%` }}
            />
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 pt-3 border-t border-warm-100">
        <Button variant="secondary" size="sm" onClick={onOpenKeys}>
          Clés
        </Button>
        <Button variant="secondary" size="sm" onClick={onOpenWebhook}>
          Webhook{app.has_webhook ? ' ●' : ''}
        </Button>
        {showRenew && (
          <Button
            variant={app.is_expired ? 'primary' : 'ghost'}
            size="sm"
            onClick={onRenew}
            loading={isRenewing}
          >
            {app.is_expired ? 'Renouveler' : 'Prolonger 30 j'}
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={onDelete} className="text-airmess-red! ml-auto">
          Supprimer
        </Button>
      </div>
    </Card>
  )
}

// ─── Modal nouvelle app ─────────────────────────────────────────────────

function NewAppModal({
  visible,
  plans,
  onClose,
  onCreated,
}: {
  visible: boolean
  plans: ApiPlan[]
  onClose: () => void
  onCreated: (app: ApiApp) => void
}) {
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [planId, setPlanId] = useState<number | null>(null)

  const mutation = useMutation({
    mutationFn: () =>
      createApiApp({
        name: name.trim(),
        description: description.trim() || undefined,
        subscription_plan_id: planId!,
      }),
    onSuccess: (app) => {
      queryClient.invalidateQueries({ queryKey: ['api-apps'] })
      setName('')
      setDescription('')
      setPlanId(null)
      onCreated(app)
    },
    onError: (err) => window.alert(extractMessage(err, 'Création impossible.')),
  })

  if (!visible) return null

  const canSubmit = name.trim().length >= 2 && planId !== null && !mutation.isPending

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-off-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 my-6">
        <h3 className="text-h2 text-ink font-bold mb-1">Créer une app dev</h3>
        <p className="text-body-s text-warm-500 mb-5">
          Un nom pour t'y retrouver, une description optionnelle, et le plan API à consommer.
        </p>

        <label className="block text-caption uppercase text-warm-500 tracking-widest font-bold mb-1.5">
          Nom
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex : Mon shop Shopify"
          className="w-full px-4 py-2.5 border-2 border-warm-200 rounded-md text-body focus:outline-none focus:border-airmess-yellow mb-4"
        />

        <label className="block text-caption uppercase text-warm-500 tracking-widest font-bold mb-1.5">
          Description <span className="normal-case text-warm-400 tracking-normal">(optionnel)</span>
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="À quoi servira cette app ?"
          rows={2}
          className="w-full px-4 py-2.5 border-2 border-warm-200 rounded-md text-body focus:outline-none focus:border-airmess-yellow mb-5"
        />

        <label className="block text-caption uppercase text-warm-500 tracking-widest font-bold mb-2">
          Plan API
        </label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          {plans.map((p) => (
            <PlanCard
              key={p.id}
              plan={p}
              selected={planId === p.id}
              onSelect={() => setPlanId(p.id)}
            />
          ))}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="md" onClick={onClose} disabled={mutation.isPending}>
            Annuler
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={() => mutation.mutate()}
            disabled={!canSubmit}
            loading={mutation.isPending}
          >
            Créer l'app
          </Button>
        </div>
      </div>
    </div>
  )
}

function PlanCard({
  plan,
  selected,
  onSelect,
}: {
  plan: ApiPlan
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'text-left rounded-lg border-2 p-4 transition-all',
        selected
          ? 'border-airmess-yellow bg-airmess-yellow/10'
          : 'border-warm-200 bg-off-white hover:border-warm-400',
      )}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-body font-bold text-ink">{plan.name}</span>
        {selected && (
          <span className="w-5 h-5 rounded-full bg-ink text-airmess-yellow flex items-center justify-center text-xs font-bold">✓</span>
        )}
      </div>
      <p className="text-h3 font-bold text-ink mb-1">
        {plan.api_requests_monthly === 0 ? '∞' : plan.api_requests_monthly}
        <span className="text-body-s font-medium text-warm-500"> req/mois</span>
      </p>
      <p className="text-caption text-warm-600 font-semibold">{formatFcfa(plan.monthly_price_fcfa)}</p>
    </button>
  )
}

// ─── Modal gestion des clés ─────────────────────────────────────────────

function KeysModal({
  app,
  onClose,
  onKeyCreated,
}: {
  app: ApiApp | null
  onClose: () => void
  onKeyCreated: (key: string) => void
}) {
  const queryClient = useQueryClient()

  const keysQ = useQuery({
    queryKey: ['api-app-keys', app?.id],
    queryFn: () => fetchApiAppKeys(app!.id),
    enabled: app !== null,
  })

  const createMut = useMutation({
    mutationFn: () => createApiAppKey(app!.id),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['api-app-keys', app!.id] })
      onKeyCreated(res.key)
    },
    onError: (err) => window.alert(extractMessage(err, 'Génération impossible.')),
  })

  const revokeMut = useMutation({
    mutationFn: (keyId: number) => revokeApiAppKey(app!.id, keyId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['api-app-keys', app!.id] }),
    onError: (err) => window.alert(extractMessage(err, 'Révocation impossible.')),
  })

  if (!app) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-off-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 my-6">
        <div className="flex items-start justify-between mb-1">
          <h3 className="text-h2 text-ink font-bold">Clés de « {app.name} »</h3>
          <button
            onClick={onClose}
            className="text-warm-500 hover:text-ink text-2xl leading-none"
            aria-label="Fermer"
          >
            ×
          </button>
        </div>
        <p className="text-body-s text-warm-500 mb-5">
          Chaque clé a la même ability. La valeur en clair n'apparaît qu'à la création.
        </p>

        {keysQ.isLoading && <p className="text-warm-500 text-center py-6">Chargement…</p>}

        {!keysQ.isLoading && keysQ.data?.length === 0 && (
          <Card padding="sm" className="text-center mb-4">
            <p className="text-body text-warm-500">Aucune clé pour l'instant.</p>
          </Card>
        )}

        {!keysQ.isLoading && keysQ.data && keysQ.data.length > 0 && (
          <div className="space-y-2 mb-4">
            {keysQ.data.map((k) => (
              <KeyRow key={k.id} keyItem={k} onRevoke={() => revokeMut.mutate(k.id)} />
            ))}
          </div>
        )}

        <div className="flex justify-between gap-2 pt-4 border-t border-warm-100">
          <Button variant="secondary" size="md" onClick={onClose}>
            Fermer
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={() => createMut.mutate()}
            loading={createMut.isPending}
          >
            Générer une nouvelle clé
          </Button>
        </div>
      </div>
    </div>
  )
}

function KeyRow({
  keyItem,
  onRevoke,
}: {
  keyItem: ApiKey
  onRevoke: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 border border-warm-200 rounded-md bg-off-white">
      <div className="min-w-0">
        <p className="text-body font-semibold text-ink">Clé #{keyItem.id}</p>
        <p className="text-caption text-warm-500">
          Créée le {formatDate(keyItem.created_at)}
          {keyItem.last_used_at && ` · Dernière utilisation ${formatDate(keyItem.last_used_at)}`}
        </p>
      </div>
      <Button variant="ghost" size="sm" onClick={onRevoke} className="text-airmess-red!">
        Révoquer
      </Button>
    </div>
  )
}

// ─── Modal clé générée (one-shot) ───────────────────────────────────────

function FreshKeyModal({
  payload,
  onClose,
}: {
  payload: { appName: string; key: string; label: string } | null
  onClose: () => void
}) {
  const [copied, setCopied] = useState(false)

  if (!payload) return null

  function copy() {
    navigator.clipboard.writeText(payload!.key).then(
      () => setCopied(true),
      () => window.alert('Impossible de copier. Sélectionne le texte manuellement.'),
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-off-white rounded-2xl shadow-2xl max-w-lg w-full p-6">
        <Badge variant="warning" size="sm" className="mb-3">Une seule fois</Badge>
        <h3 className="text-h2 text-ink font-bold mb-2">
          {payload.label} pour « {payload.appName} »
        </h3>
        <p className="text-body-s text-warm-600 mb-4">
          Copie {payload.label.toLowerCase()} immédiatement. Elle ne sera <strong>plus jamais</strong>{' '}
          affichée. Si tu la perds, régénère-la et remplace côté client.
        </p>

        <div className="bg-ink text-cream rounded-md p-4 font-mono text-body-s break-all mb-3">
          {payload.key}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="md" onClick={onClose}>
            Fermer
          </Button>
          <Button
            variant={copied ? 'secondary' : 'primary'}
            size="md"
            onClick={copy}
          >
            {copied ? '✓ Copié' : 'Copier'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Modal webhook (config + historique deliveries) ─────────────────────

function WebhookModal({
  app,
  onClose,
  onSecretCreated,
}: {
  app: ApiApp | null
  onClose: () => void
  onSecretCreated: (secret: string) => void
}) {
  const queryClient = useQueryClient()
  const [url, setUrl] = useState('')

  // Synchro de l'input avec l'URL courante quand l'app change
  useMemo(() => {
    if (app) setUrl(app.webhook_url ?? '')
  }, [app?.id, app?.webhook_url]) // eslint-disable-line react-hooks/exhaustive-deps

  const deliveriesQ = useQuery({
    queryKey: ['api-app-deliveries', app?.id],
    queryFn: () => fetchDeliveries(app!.id),
    enabled: app !== null,
  })

  const configureMut = useMutation({
    mutationFn: () => configureWebhook(app!.id, url.trim()),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['api-apps'] })
      queryClient.invalidateQueries({ queryKey: ['api-app-deliveries', app!.id] })
      onSecretCreated(res.secret)
    },
    onError: (err) => window.alert(extractMessage(err, 'Config impossible.')),
  })

  const disableMut = useMutation({
    mutationFn: () => disableWebhook(app!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-apps'] })
    },
    onError: (err) => window.alert(extractMessage(err, 'Désactivation impossible.')),
  })

  const retryMut = useMutation({
    mutationFn: (deliveryId: number) => retryDelivery(app!.id, deliveryId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['api-app-deliveries', app!.id] }),
    onError: (err) => window.alert(extractMessage(err, 'Retry impossible.')),
  })

  if (!app) return null

  const canConfigure = url.trim().startsWith('https://') && !configureMut.isPending

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-off-white rounded-2xl shadow-2xl max-w-3xl w-full p-6 my-6">
        <div className="flex items-start justify-between mb-1">
          <h3 className="text-h2 text-ink font-bold">Webhook · « {app.name} »</h3>
          <button
            onClick={onClose}
            className="text-warm-500 hover:text-ink text-2xl leading-none"
            aria-label="Fermer"
          >
            ×
          </button>
        </div>
        <p className="text-body-s text-warm-500 mb-5">
          On te notifie sur ton endpoint HTTPS à chaque étape (créé, assigné, retiré, livré, annulé, échoué).
          Vérifie la signature avec <code className="bg-warm-100 px-1 rounded">HMAC-SHA256(secret, body)</code>
          reçue dans <code className="bg-warm-100 px-1 rounded">X-AirMess-Signature</code>.
        </p>

        {/* Config */}
        <Card padding="md" className="mb-5">
          <label className="block text-caption uppercase text-warm-500 tracking-widest font-bold mb-1.5">
            URL du webhook
          </label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://mon-shop.com/webhooks/airmess"
            className="w-full px-4 py-2.5 border-2 border-warm-200 rounded-md text-body-s focus:outline-none focus:border-airmess-yellow mb-3 font-mono"
          />
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => configureMut.mutate()}
              disabled={!canConfigure}
              loading={configureMut.isPending}
            >
              {app.has_webhook ? 'Mettre à jour + régénérer secret' : 'Enregistrer + générer secret'}
            </Button>
            {app.has_webhook && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => disableMut.mutate()}
                disabled={disableMut.isPending}
                className="text-airmess-red!"
              >
                Désactiver
              </Button>
            )}
          </div>
        </Card>

        {/* Historique */}
        <h4 className="text-h3 font-bold text-ink mb-2">Historique récent</h4>

        {deliveriesQ.isLoading && (
          <p className="text-warm-500 text-body-s text-center py-6">Chargement…</p>
        )}

        {!deliveriesQ.isLoading && deliveriesQ.data?.data.length === 0 && (
          <Card padding="sm" className="text-center">
            <p className="text-body-s text-warm-500">Aucun envoi pour l'instant.</p>
          </Card>
        )}

        {!deliveriesQ.isLoading && deliveriesQ.data && deliveriesQ.data.data.length > 0 && (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {deliveriesQ.data.data.map((d) => (
              <DeliveryRow
                key={d.id}
                delivery={d}
                onRetry={() => retryMut.mutate(d.id)}
                isRetrying={retryMut.isPending}
              />
            ))}
          </div>
        )}

        <div className="flex justify-end mt-5 pt-4 border-t border-warm-100">
          <Button variant="secondary" size="md" onClick={onClose}>
            Fermer
          </Button>
        </div>
      </div>
    </div>
  )
}

function DeliveryRow({
  delivery,
  onRetry,
  isRetrying,
}: {
  delivery: WebhookDelivery
  onRetry: () => void
  isRetrying: boolean
}) {
  const badge =
    delivery.status === 'delivered' ? { v: 'success' as const, label: 'Livré' } :
    delivery.status === 'failed'    ? { v: 'danger' as const,  label: 'Échoué' } :
    { v: 'neutral' as const, label: 'En attente' }

  return (
    <div className="flex items-start justify-between gap-3 px-3 py-2.5 border border-warm-200 rounded-md bg-off-white">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-0.5">
          <Badge variant={badge.v} size="sm">{badge.label}</Badge>
          <span className="text-body-s font-mono text-ink">{delivery.event_type}</span>
          {delivery.last_http_status && (
            <span className="text-caption text-warm-500">HTTP {delivery.last_http_status}</span>
          )}
        </div>
        <p className="text-caption text-warm-500 truncate">
          {formatDate(delivery.created_at)} · {delivery.attempts} tentative{delivery.attempts > 1 ? 's' : ''}
          {delivery.last_error && ` · ${delivery.last_error.slice(0, 60)}${delivery.last_error.length > 60 ? '…' : ''}`}
        </p>
      </div>
      {delivery.status !== 'delivered' && (
        <Button variant="ghost" size="sm" onClick={onRetry} disabled={isRetrying}>
          Rejouer
        </Button>
      )}
    </div>
  )
}
