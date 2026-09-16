import { useTranslation } from 'react-i18next'

interface Props {
  status: string
}

const STATUS_CLASSES: Record<string, string> = {
  trial: 'bg-amber-100 text-amber-800',
  active: 'bg-green-100 text-green-800',
  suspended: 'bg-red-100 text-red-800',
  churned: 'bg-gray-200 text-gray-700',
}

export default function MarchantStatusBadge({ status }: Props) {
  const { t } = useTranslation()
  const classes = STATUS_CLASSES[status] ?? 'bg-gray-100 text-gray-700'
  const label = t(`marchantStatusBadge.${status}`, status)
  return (
    <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${classes}`}>
      {label}
    </span>
  )
}
