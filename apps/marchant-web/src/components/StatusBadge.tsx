import { useTranslation } from 'react-i18next'

interface Props {
  status: string
}

const STATUS_CLASSES: Record<string, string> = {
  pending_preparation: 'bg-amber-100 text-amber-800',
  awaiting_assignment: 'bg-blue-100 text-blue-800',
  assigned: 'bg-indigo-100 text-indigo-800',
  driver_to_pickup: 'bg-purple-100 text-purple-800',
  at_pickup: 'bg-purple-100 text-purple-800',
  picked_up: 'bg-cyan-100 text-cyan-800',
  at_dropoff: 'bg-cyan-100 text-cyan-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-200 text-gray-700',
  failed: 'bg-red-100 text-red-800',
  disputed: 'bg-red-200 text-red-900',
}

export default function StatusBadge({ status }: Props) {
  const { t } = useTranslation()
  const classes = STATUS_CLASSES[status] ?? 'bg-gray-100 text-gray-700'
  const label = t(`courseStatusBadge.${status}`, status)
  return (
    <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${classes}`}>
      {label}
    </span>
  )
}
