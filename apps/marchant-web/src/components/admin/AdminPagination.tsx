import { ChevronLeftIcon, ChevronRightIcon } from '../ui/icons'
import { AdminButton } from './AdminToolbar'

interface AdminPaginationProps {
  currentPage: number
  lastPage: number
  total: number
  /** Singulier de l'entité ("marchand", "course"…) — sert au label total. */
  itemLabel: string
  onChange: (page: number) => void
  isFetching?: boolean
}

export default function AdminPagination({
  currentPage,
  lastPage,
  total,
  itemLabel,
  onChange,
  isFetching,
}: AdminPaginationProps) {
  if (lastPage <= 1) return null

  return (
    <div className="flex items-center justify-between mt-4 text-body-s text-warm-600 flex-wrap gap-2">
      <span className="tabular-nums">
        Page <span className="font-bold text-ink">{currentPage}</span> / {lastPage} —{' '}
        <span className="font-bold text-ink">{total}</span> {itemLabel}
        {total > 1 ? 's' : ''}
        {isFetching && <span className="ml-2 text-warm-400">·  …</span>}
      </span>
      <div className="flex gap-1.5">
        <AdminButton
          variant="secondary"
          size="sm"
          onClick={() => onChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
          leftIcon={<ChevronLeftIcon size={14} />}
        >
          Précédent
        </AdminButton>
        <AdminButton
          variant="secondary"
          size="sm"
          onClick={() => onChange(currentPage + 1)}
          disabled={currentPage >= lastPage}
          rightIcon={<ChevronRightIcon size={14} />}
        >
          Suivant
        </AdminButton>
      </div>
    </div>
  )
}
