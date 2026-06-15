interface Props {
    status: string
  }
  
  const STATUS_LABELS: Record<string, { label: string; classes: string }> = {
    pending_preparation:  { label: 'À préparer',      classes: 'bg-amber-100 text-amber-800' },
    awaiting_assignment:  { label: 'En attribution',  classes: 'bg-blue-100 text-blue-800' },
    assigned:             { label: 'Acceptée',        classes: 'bg-indigo-100 text-indigo-800' },
    driver_to_pickup:     { label: 'Livreur en route',classes: 'bg-purple-100 text-purple-800' },
    at_pickup:            { label: 'Sur place',       classes: 'bg-purple-100 text-purple-800' },
    picked_up:            { label: 'En cours',        classes: 'bg-cyan-100 text-cyan-800' },
    at_dropoff:           { label: 'Arrivé',          classes: 'bg-cyan-100 text-cyan-800' },
    delivered:            { label: 'Livrée',          classes: 'bg-green-100 text-green-800' },
    cancelled:            { label: 'Annulée',         classes: 'bg-gray-200 text-gray-700' },
    failed:               { label: 'Échec',           classes: 'bg-red-100 text-red-800' },
    disputed:             { label: 'Litige',          classes: 'bg-red-200 text-red-900' },
  }
  
  export default function StatusBadge({ status }: Props) {
    const meta = STATUS_LABELS[status] ?? { label: status, classes: 'bg-gray-100 text-gray-700' }
    return (
      <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${meta.classes}`}>
        {meta.label}
      </span>
    )
  }
  