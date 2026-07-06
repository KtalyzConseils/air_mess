import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import Card from './ui/Card'
import Button from './ui/Button'
import {
  MARCHAND_INCIDENT_TYPES,
  reportCourseIncident,
  type MarchandIncidentType,
} from '../api/courses'

/**
 * Modal permettant à un marchand/particulier de signaler un incident sur SA course.
 * Restreint à 5 types (vs. 10 côté driver). Description obligatoire — c'est ce
 * qui aide l'ops à arbitrer sans avoir à retéléphoner.
 */
export default function ReportIncidentModal({
  courseId,
  courseReference,
  onClose,
}: {
  courseId: number
  courseReference: string
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [type, setType] = useState<MarchandIncidentType | ''>('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () =>
      reportCourseIncident(courseId, { type: type as MarchandIncidentType, description: description.trim() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course', courseId] })
      queryClient.invalidateQueries({ queryKey: ['course', String(courseId)] })
      onClose()
    },
    onError: (err) => {
      const msg =
        err instanceof AxiosError
          ? err.response?.data?.message ?? 'Erreur lors du signalement.'
          : 'Erreur inattendue.'
      setError(msg)
    },
  })

  function submit() {
    setError(null)
    if (!type) {
      setError('Choisissez un type d\'incident.')
      return
    }
    if (description.trim().length < 10) {
      setError('La description doit contenir au moins 10 caractères.')
      return
    }
    mutation.mutate()
  }

  return (
    <div className="fixed inset-0 bg-ink/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 ams-anim-fade-in">
      <Card variant="signature" padding="lg" className="max-w-md w-full ams-anim-scale-in">
        <h3 className="text-h2 text-ink font-bold">Signaler un incident</h3>
        <p className="text-body-s text-warm-500 mt-1 mb-5">
          Sur la course <span className="font-mono text-ink">{courseReference}</span>.
          L'équipe ops recevra votre signalement immédiatement.
        </p>

        <label className="block text-caption uppercase text-warm-500 tracking-widest font-bold mb-1.5">
          Type d'incident <span className="text-airmess-red">*</span>
        </label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as MarchandIncidentType | '')}
          className="w-full mb-4 bg-off-white border-2 border-warm-200 rounded-md px-3 py-2.5 text-body focus:outline-none focus:border-airmess-yellow"
        >
          <option value="">— Choisir —</option>
          {MARCHAND_INCIDENT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>

        <label className="block text-caption uppercase text-warm-500 tracking-widest font-bold mb-1.5">
          Décrivez ce qui s'est passé <span className="text-airmess-red">*</span>
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          placeholder="Ex : le destinataire a reçu son colis avec l'écran cassé, il refuse de le garder. Photo en pièce jointe par WhatsApp."
          className="w-full mb-2 bg-off-white border-2 border-warm-200 rounded-md px-3 py-2.5 text-body-s focus:outline-none focus:border-airmess-yellow"
        />
        <p className="text-caption text-warm-500 mb-4">
          Plus la description est précise, plus l'arbitrage est rapide.
        </p>

        {error && (
          <div
            role="alert"
            className="mb-4 bg-danger-bg border border-airmess-red/30 text-airmess-red px-3 py-2 rounded-md text-body-s"
          >
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Button variant="secondary" size="md" onClick={onClose} disabled={mutation.isPending}>
            Annuler
          </Button>
          <Button
            variant="primary"
            size="md"
            pill
            onClick={submit}
            loading={mutation.isPending}
          >
            Envoyer le signalement
          </Button>
        </div>
      </Card>
    </div>
  )
}
