interface Tab<K extends string> {
  key: K
  label: string
  count?: number
}

interface AdminTabsProps<K extends string> {
  tabs: readonly Tab<K>[]
  value: K
  onChange: (key: K) => void
  variant?: 'segmented' | 'pills'
}

/**
 * Segmented control admin — onglets compacts pour filtrer une liste.
 * Active = fond dark, repos = warm-600 sur transparent.
 */
export default function AdminTabs<K extends string>({
  tabs,
  value,
  onChange,
  variant = 'segmented',
}: AdminTabsProps<K>) {
  const isPills = variant === 'pills'

  return (
    <div
      className={
        isPills
          ? 'flex flex-wrap items-center gap-2'
          : 'inline-flex items-center bg-warm-100 border border-warm-200 rounded-md p-0.5'
      }
    >
      {tabs.map((t) => {
        const active = value === t.key
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => onChange(t.key)}
            className={[
              'inline-flex shrink-0 items-center gap-2 whitespace-nowrap transition-colors',
              isPills
                ? 'min-h-10 rounded-full border px-4 py-2 text-body-s font-bold'
                : 'h-8 rounded px-3 text-body-s font-medium',
              active && isPills
                ? 'border-airmess-dark bg-airmess-dark text-white shadow-card'
                : active
                  ? 'bg-airmess-dark text-white shadow-sm'
                  : isPills
                    ? 'border-warm-200 bg-off-white text-warm-700 hover:border-airmess-yellow hover:text-ink'
                    : 'text-warm-600 hover:text-ink',
            ].join(' ')}
          >
            {t.label}
            {t.count !== undefined && (
              <span
                className={[
                  'tabular-nums text-caption font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center',
                  active
                    ? 'bg-white/15 text-white'
                    : isPills
                      ? 'bg-warm-100 text-warm-600'
                      : 'bg-warm-200 text-warm-600',
                ].join(' ')}
              >
                {t.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
