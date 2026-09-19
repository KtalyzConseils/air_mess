import { useTranslation } from 'react-i18next'
import type { CourseStatusHistoryItem } from '../api/courses'

interface Props {
  items: CourseStatusHistoryItem[]
}

function isAbandonment(item: CourseStatusHistoryItem) {
  return item.metadata?.event === 'driver_abandoned' || item.metadata?.abandoned_by_driver_id != null || !!item.reason?.startsWith('Abandon ')
}

export default function Timeline({ items }: Props) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language === 'en' ? 'en-US' : 'fr-FR'

  if (items.length === 0) {
    return <p className="text-sm text-gray-500">{t('courseTimeline.empty')}</p>
  }

  return (
    <ol className="relative border-l-2 border-gray-200 ml-3">
      {items.map((item, idx) => (
        <li key={item.id} className="mb-6 ml-6">
          <span className={`absolute -left-2 flex items-center justify-center w-4 h-4 rounded-full
            ${isAbandonment(item) ? 'bg-airmess-red ring-4 ring-red-100' : idx === items.length - 1 ? 'bg-airmess-yellow' : 'bg-gray-300'}`}
          />
          <p className={isAbandonment(item) ? 'font-bold text-airmess-red' : 'font-medium text-airmess-dark'}>
            {isAbandonment(item)
              ? (i18n.language === 'en' ? 'Driver abandonment reported' : 'Abandon signalé')
              : t(`courseStatus.${item.to_status}`, item.to_status)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {new Date(item.created_at).toLocaleString(locale, {
              day: '2-digit', month: '2-digit', year: 'numeric',
              hour: '2-digit', minute: '2-digit',
            })}
            {item.changed_by && <> · {t('courseTimeline.by')} {item.changed_by.name}</>}
          </p>
          {item.reason && (
            <p className="text-sm text-gray-600 mt-1 italic">{item.reason}</p>
          )}
        </li>
      ))}
    </ol>
  )
}
