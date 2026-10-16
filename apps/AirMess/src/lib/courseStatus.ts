import type { AppLanguage } from '../stores/languageStore'

/**
 * Source unique des libellés de statut de course dans l'app marchand.
 *
 * Les écrans (liste, accueil, détail) affichaient auparavant chacun leur propre
 * libellé, ou le code brut de l'API en anglais : `returning_to_sender` sortait
 * tel quel. Toute évolution de statut se fait ici, et nulle part ailleurs.
 *
 * La couverture correspond aux constantes `Course::STATUS_*` de l'API.
 */
const COURSE_STATUS_LABELS: Record<AppLanguage, Record<string, string>> = {
  fr: {
    pending_preparation: 'Preparation',
    awaiting_assignment: 'En attribution',
    assigned: 'Assignee',
    driver_to_pickup: 'Livreur en route',
    at_pickup: 'Au retrait',
    picked_up: 'Recuperee',
    at_dropoff: 'En livraison',
    returning_to_sender: 'Retour expediteur',
    delivered: 'Livree',
    cancelled: 'Annulee',
    failed: 'Echec',
    disputed: 'Litige',
  },
  en: {
    pending_preparation: 'Preparation',
    awaiting_assignment: 'Awaiting assignment',
    assigned: 'Assigned',
    driver_to_pickup: 'Driver on the way',
    at_pickup: 'At pickup',
    picked_up: 'Picked up',
    at_dropoff: 'Out for delivery',
    returning_to_sender: 'Returning to sender',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
    failed: 'Failed',
    disputed: 'Disputed',
  },
}

/**
 * Libellé lisible d'un statut. Un statut inconnu (nouveau côté API) retombe sur
 * le français puis sur le code humanisé, jamais sur le code brut souligné.
 */
export function courseStatusLabel(status: string, language: AppLanguage = 'fr'): string {
  return (
    COURSE_STATUS_LABELS[language]?.[status] ??
    COURSE_STATUS_LABELS.fr[status] ??
    status.replaceAll('_', ' ')
  )
}
