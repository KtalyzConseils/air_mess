import { useTranslation } from 'react-i18next'
import Badge from './ui/Badge'

interface Props {
  status: string
}

type StatusVariant = 'live' | 'success' | 'warning' | 'info' | 'danger' | 'neutral' | 'brand'

/**
 * Source de vérité unique de l'affichage d'un statut de course.
 *
 * Le style est entièrement délégué à `ui/Badge` (variants sémantiques du design
 * system) : ne jamais restyler un statut ailleurs (tableau, carte, admin).
 *
 * Conventions :
 * - `live` (pastille qui pulse) est réservé aux courses physiquement en cours ;
 * - le variant n'est jamais le seul porteur d'information, le libellé est
 *   toujours affiché à côté (règle « color-not-only »).
 */
const STATUS_VARIANTS: Record<string, StatusVariant> = {
  pending_preparation: 'warning',
  awaiting_assignment: 'info',
  assigned: 'brand',
  driver_to_pickup: 'live',
  at_pickup: 'live',
  picked_up: 'live',
  at_dropoff: 'live',
  delivered: 'success',
  cancelled: 'neutral',
  failed: 'danger',
  disputed: 'danger',
}

export default function StatusBadge({ status }: Props) {
  const { t } = useTranslation()
  const variant = STATUS_VARIANTS[status] ?? 'neutral'
  const label = t(`courseStatusBadge.${status}`, status)

  return (
    <Badge variant={variant} size="md" dot={variant === 'live'} uppercase={false}>
      {label}
    </Badge>
  )
}
