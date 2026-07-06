import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import Card from '../ui/Card'
import Button from '../ui/Button'
import Badge from '../ui/Badge'
import {
  ADJUSTMENT_REASON_CODES,
  arbitrateIncident,
  noShowPartial,
  type AdjustmentReasonCode,
} from '../../api/adminIncidents'
import type { Course, CourseIncident } from '../../api/courses'

/**
 * Panneau d'arbitrage ops pour un incident ouvert sur une course.
 * Contient :
 *  - description de l'incident (type, qui l'a signalé, description, photo)
 *  - deux blocs "Ajustement marchand" et "Ajustement livreur", chacun optionnel
 *  - texte de résolution obligatoire
 *  - bouton "Arbitrer" qui envoie tout au back en une seule transaction
 *
 * Le back rollback si un des ajustements échoue (solde insuffisant, etc.) —
 * l'incident reste OPEN et l'ops peut ajuster.
 */
export default function IncidentArbitrationPanel({
  course,
  incident,
}: {
  course: Course
  incident: CourseIncident
}) {
  const queryClient = useQueryClient()

  const [resolutionNote, setResolutionNote] = useState('')
  const [reasonCodeMarchand, setReasonCodeMarchand] = useState<AdjustmentReasonCode | ''>('')
  const [amountMarchand, setAmountMarchand] = useState<string>('')
  const [reasonCodeDriver, setReasonCodeDriver] = useState<AdjustmentReasonCode | ''>('')
  const [amountDriver, setAmountDriver] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () => {
      const signedMarchand = reasonCodeMarchand
        ? normalizeSign(reasonCodeMarchand, parseInt(amountMarchand, 10) || 0)
        : null
      const signedDriver = reasonCodeDriver
        ? normalizeSign(reasonCodeDriver, parseInt(amountDriver, 10) || 0)
        : null

      return arbitrateIncident(incident.id, {
        resolution_note: resolutionNote.trim(),
        reason_code_marchand: reasonCodeMarchand || null,
        amount_marchand: signedMarchand,
        reason_code_driver: reasonCodeDriver || null,
        amount_driver: signedDriver,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course', course.id] })
      queryClient.invalidateQueries({ queryKey: ['course', String(course.id)] })
    },
    onError: (err) => {
      const msg =
        err instanceof AxiosError
          ? err.response?.data?.message ?? "Erreur lors de l'arbitrage."
          : 'Erreur inattendue.'
      setError(msg)
    },
  })

  // Cas 3 — no-show partiel confirmé (preset 1 clic)
  const noShowMutation = useMutation({
    mutationFn: () => noShowPartial(incident.id, resolutionNote.trim()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course', course.id] })
      queryClient.invalidateQueries({ queryKey: ['course', String(course.id)] })
    },
    onError: (err) => {
      const msg =
        err instanceof AxiosError
          ? err.response?.data?.message ?? "Erreur lors du preset no-show."
          : 'Erreur inattendue.'
      setError(msg)
    },
  })

  function submitNoShow() {
    setError(null)
    if (resolutionNote.trim().length < 5) {
      setError('La note de résolution est requise (5 caractères minimum).')
      return
    }
    if (
      !window.confirm(
        "Confirmer un no-show partiel ? Applique les % configurés dans les paramètres — "
        + 'capture partielle du hold marchand + crédit partiel de la caution livreur, '
        + 'course passée en failed, incident résolu.',
      )
    ) return
    noShowMutation.mutate()
  }

  function submit() {
    setError(null)
    if (resolutionNote.trim().length < 5) {
      setError('La note de résolution est requise (5 caractères minimum).')
      return
    }
    if (!reasonCodeMarchand && !reasonCodeDriver) {
      setError('Au moins un ajustement (marchand OU livreur) doit être renseigné.')
      return
    }
    if (reasonCodeMarchand) {
      const n = parseInt(amountMarchand, 10)
      if (!n || n <= 0) {
        setError('Le montant marchand doit être un entier positif (le signe est déduit du motif).')
        return
      }
    }
    if (reasonCodeDriver) {
      const n = parseInt(amountDriver, 10)
      if (!n || n <= 0) {
        setError('Le montant livreur doit être un entier positif (le signe est déduit du motif).')
        return
      }
    }
    mutation.mutate()
  }

  const marchandOptions = Object.entries(ADJUSTMENT_REASON_CODES)
    .filter(([, meta]) => meta.side === 'marchand' || meta.side === 'both')
  const driverOptions = Object.entries(ADJUSTMENT_REASON_CODES)
    .filter(([, meta]) => meta.side === 'driver' || meta.side === 'both')

  return (
    <Card variant="signature" padding="lg" className="mb-6 border-l-4 border-l-airmess-red!">
      <div className="flex items-start justify-between mb-4 gap-3">
        <div>
          <Badge variant="danger" size="sm" className="mb-2">⚖️ Incident ouvert — arbitrage requis</Badge>
          <h3 className="text-h3 text-ink font-bold">{humanIncidentType(incident.type)}</h3>
          <p className="text-caption text-warm-500 mt-1">
            Signalé par {incident.reporter_type}
            {incident.reported_by_user && ` (${incident.reported_by_user.name})`}
            {' · '}
            {new Date(incident.created_at).toLocaleString('fr-FR', {
              day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
            })}
          </p>
        </div>
      </div>

      {incident.description && (
        <p className="text-body-s text-warm-600 mb-4 whitespace-pre-line bg-cream/50 p-3 rounded-md border border-warm-100">
          {incident.description}
        </p>
      )}

      {/* Hint contextuel selon le type d'incident — aide l'ops à choisir le bon barème. */}
      {(incident.type === 'package_lost' || incident.type === 'package_damaged') && (
        <div className="mb-4 bg-info-bg border border-info/30 rounded-md p-3 text-body-s text-info">
          <p className="font-bold">💡 Barème indicatif</p>
          <p className="mt-1">
            <strong>Valeur déclarée du colis :</strong>{' '}
            {typeof course.package_declared_value === 'number'
              ? course.package_declared_value.toLocaleString('fr-FR') + ' FCFA'
              : 'non renseignée'}
            {' '}·{' '}
            <strong>Frais de livraison :</strong> {course.delivery_fee.toLocaleString('fr-FR')} FCFA
          </p>
          <p className="mt-1 text-caption">
            Pour un colis perdu, le débit livreur est typiquement basé sur la valeur déclarée × %resp.
            Pour un colis endommagé, sur les frais × %resp.
          </p>
        </div>
      )}

      {incident.photo_url && (
        <a
          href={incident.photo_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mb-4 text-caption text-info underline"
        >
          📸 Voir la photo jointe
        </a>
      )}

      {/* ============ Preset 1-clic : No-show partiel confirmé (Cas 3) ============ */}
      {incident.type === 'recipient_unreachable' && (
        <div className="mb-4 bg-airmess-yellow/10 border border-airmess-yellow rounded-md p-4">
          <p className="font-bold text-ink mb-1">⚡ Préréglage — No-show partiel confirmé</p>
          <p className="text-body-s text-warm-600 mb-3">
            Applique automatiquement les % configurés dans <em>Paramètres → Arbitrage des incidents</em> :
            capture d'une part des frais côté marchand + crédit partiel de la caution livreur pour le trajet effectué.
            La course passe en <strong>failed</strong> et l'incident est résolu — pas besoin de saisir les motifs et montants ci-dessous.
          </p>
          <p className="text-caption text-warm-500 mb-3">
            💡 Nécessite quand même la note de résolution ci-dessous (envoyée au marchand et au livreur).
          </p>
          <Button
            variant="secondary"
            size="sm"
            pill
            onClick={submitNoShow}
            loading={noShowMutation.isPending}
            disabled={mutation.isPending}
          >
            Appliquer no-show partiel (1 clic)
          </Button>
        </div>
      )}

      {/* ============ Bloc marchand ============ */}
      <div className="border-t border-warm-100 pt-4 mb-4">
        <p className="text-eyebrow uppercase text-warm-500 font-bold mb-2">
          🏢 Ajustement marchand
          <span className="normal-case font-normal text-warm-400 ml-2">
            ({course.sender?.name ?? '—'})
          </span>
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <select
            value={reasonCodeMarchand}
            onChange={(e) => setReasonCodeMarchand(e.target.value as AdjustmentReasonCode | '')}
            className="w-full bg-off-white border-2 border-warm-200 rounded-md px-3 py-2 text-body-s focus:outline-none focus:border-airmess-yellow"
          >
            <option value="">— Aucun ajustement marchand —</option>
            {marchandOptions.map(([code, meta]) => (
              <option key={code} value={code}>
                {meta.label} ({meta.sign === 'credit' ? '+' : '−'})
              </option>
            ))}
          </select>
          <div className="relative">
            <input
              type="number"
              min={1}
              value={amountMarchand}
              onChange={(e) => setAmountMarchand(e.target.value)}
              placeholder="Montant (FCFA)"
              disabled={!reasonCodeMarchand}
              className="w-full bg-off-white border-2 border-warm-200 rounded-md px-3 py-2 pr-16 text-body-s focus:outline-none focus:border-airmess-yellow disabled:opacity-50"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-caption text-warm-500">
              FCFA
            </span>
          </div>
        </div>
        {reasonCodeMarchand && (
          <p className="text-caption text-warm-500 mt-2">
            {ADJUSTMENT_REASON_CODES[reasonCodeMarchand].sign === 'credit'
              ? '💰 Le wallet marchand sera CRÉDITÉ de ce montant.'
              : '⚠️ Le wallet marchand sera DÉBITÉ de ce montant.'}
          </p>
        )}
      </div>

      {/* ============ Bloc livreur ============ */}
      <div className="border-t border-warm-100 pt-4 mb-4">
        <p className="text-eyebrow uppercase text-warm-500 font-bold mb-2">
          🛵 Ajustement livreur
          <span className="normal-case font-normal text-warm-400 ml-2">
            ({course.driver?.user.name ?? '—'})
          </span>
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <select
            value={reasonCodeDriver}
            onChange={(e) => setReasonCodeDriver(e.target.value as AdjustmentReasonCode | '')}
            className="w-full bg-off-white border-2 border-warm-200 rounded-md px-3 py-2 text-body-s focus:outline-none focus:border-airmess-yellow"
            disabled={!course.driver}
          >
            <option value="">— Aucun ajustement livreur —</option>
            {driverOptions.map(([code, meta]) => (
              <option key={code} value={code}>
                {meta.label} ({meta.sign === 'credit' ? '+' : '−'})
              </option>
            ))}
          </select>
          <div className="relative">
            <input
              type="number"
              min={1}
              value={amountDriver}
              onChange={(e) => setAmountDriver(e.target.value)}
              placeholder="Montant (FCFA)"
              disabled={!reasonCodeDriver || !course.driver}
              className="w-full bg-off-white border-2 border-warm-200 rounded-md px-3 py-2 pr-16 text-body-s focus:outline-none focus:border-airmess-yellow disabled:opacity-50"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-caption text-warm-500">
              FCFA
            </span>
          </div>
        </div>
        {reasonCodeDriver && (
          <p className="text-caption text-warm-500 mt-2">
            {ADJUSTMENT_REASON_CODES[reasonCodeDriver].sign === 'credit' ? (
              '💰 La caution livreur sera CRÉDITÉE de ce montant.'
            ) : reasonCodeDriver === 'incident_debit' || reasonCodeDriver === 'caution_seizure' ? (
              <>
                ⚠️ La caution livreur sera <strong>DÉBITÉE</strong> de ce montant.
                Si la caution est insuffisante, le solde disponible sera capé et le livreur
                sera <strong className="text-airmess-red">automatiquement suspendu</strong> jusqu'à rechargement.
              </>
            ) : (
              '⚠️ La caution livreur sera DÉBITÉE de ce montant. Refuse si insuffisant.'
            )}
          </p>
        )}
      </div>

      {/* ============ Note de résolution ============ */}
      <div className="border-t border-warm-100 pt-4 mb-4">
        <label className="block text-caption uppercase text-warm-500 tracking-widest font-bold mb-1.5">
          Note de résolution <span className="text-airmess-red">*</span>
        </label>
        <textarea
          value={resolutionNote}
          onChange={(e) => setResolutionNote(e.target.value)}
          rows={3}
          placeholder="Explique brièvement la décision. Elle sera envoyée au marchand et au livreur."
          className="w-full bg-off-white border-2 border-warm-200 rounded-md px-3 py-2 text-body-s focus:outline-none focus:border-airmess-yellow"
        />
      </div>

      {error && (
        <div
          role="alert"
          className="mb-4 bg-danger-bg border border-airmess-red/30 text-airmess-red px-3 py-2 rounded-md text-body-s"
        >
          {error}
        </div>
      )}

      <Button
        variant="primary"
        size="md"
        fullWidth
        pill
        onClick={submit}
        loading={mutation.isPending}
      >
        Arbitrer l'incident et appliquer les ajustements
      </Button>
    </Card>
  )
}

/**
 * Le back attend l'amount SIGNÉ mais l'UI saisit toujours un nombre positif ;
 * on déduit le signe du motif choisi (les motifs `credit` gardent le +,
 * les motifs `debit` reçoivent un −).
 */
function normalizeSign(code: AdjustmentReasonCode, rawAmount: number): number {
  const positive = Math.abs(rawAmount)
  return ADJUSTMENT_REASON_CODES[code].sign === 'credit' ? positive : -positive
}

/**
 * Label lisible pour un type d'incident — mirror de CourseIncident::TYPE_*.
 * Volontairement en dur ici, pas critique pour un panneau ops interne.
 */
function humanIncidentType(type: string): string {
  const map: Record<string, string> = {
    recipient_absent:      'Destinataire absent',
    recipient_unreachable: 'Destinataire injoignable',
    wrong_address:         'Adresse erronée',
    recipient_refused:     'Colis refusé',
    package_damaged:       'Colis endommagé',
    package_lost:          'Colis perdu',
    vehicle_breakdown:     'Panne véhicule',
    accident:              'Accident',
    payment_issue:         "Problème d'encaissement",
    other:                 'Autre',
  }
  return map[type] ?? type
}
