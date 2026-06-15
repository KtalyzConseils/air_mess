import type { CourseStatusHistoryItem } from '../api/courses'

interface Props {
  items: CourseStatusHistoryItem[]
}

const STATUS_FR: Record<string, string> = {
  pending_preparation:  'À préparer',
  awaiting_assignment:  'En attribution',
  assigned:             'Acceptée par un livreur',
  driver_to_pickup:     'Livreur en route vers l\'origine',
  at_pickup:            'Livreur sur place (pickup)',
  picked_up:            'Colis récupéré',
  at_dropoff:           'Livreur arrivé à destination',
  delivered:            'Livrée',
  cancelled:            'Annulée',
  failed:               'Échouée',
  disputed:             'En litige',
}

export default function Timeline({ items }: Props) {
  if (items.length === 0) {
    return <p className="text-sm text-gray-500">Aucun événement enregistré.</p>
  }

  return (
    <ol className="relative border-l-2 border-gray-200 ml-3">
      {items.map((item, idx) => (
        <li key={item.id} className="mb-6 ml-6">
          <span className={`absolute -left-2 flex items-center justify-center w-4 h-4 rounded-full
            ${idx === items.length - 1 ? 'bg-airmess-yellow' : 'bg-gray-300'}`}
          />
          <p className="font-medium text-airmess-dark">
            {STATUS_FR[item.to_status] ?? item.to_status}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {new Date(item.created_at).toLocaleString('fr-FR', {
              day: '2-digit', month: '2-digit', year: 'numeric',
              hour: '2-digit', minute: '2-digit',
            })}
            {item.changed_by && <> · par {item.changed_by.name}</>}
          </p>
          {item.reason && (
            <p className="text-sm text-gray-600 mt-1 italic">{item.reason}</p>
          )}
        </li>
      ))}
    </ol>
  )
}
