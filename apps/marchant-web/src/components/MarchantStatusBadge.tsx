interface Props {
  status: string
}

const STATUS_LABELS: Record<string, { label: string; classes: string }> = {
  trial:     { label: 'Essai',     classes: 'bg-amber-100 text-amber-800' },
  active:    { label: 'Actif',     classes: 'bg-green-100 text-green-800' },
  suspended: { label: 'Suspendu',  classes: 'bg-red-100 text-red-800' },
  churned:   { label: 'Résilié',   classes: 'bg-gray-200 text-gray-700' },
}

export default function MarchantStatusBadge({ status }: Props) {
  const meta = STATUS_LABELS[status] ?? { label: status, classes: 'bg-gray-100 text-gray-700' }
  return (
    <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${meta.classes}`}>
      {meta.label}
    </span>
  )
}
