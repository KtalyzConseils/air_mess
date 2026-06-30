interface Tab<K extends string> {
  key: K
  label: string
  count?: number
}

interface AdminTabsProps<K extends string> {
  tabs: readonly Tab<K>[]
  value: K
  onChange: (key: K) => void
}

/**
 * Segmented control admin — onglets compacts pour filtrer une liste.
 * Active = fond dark, repos = warm-600 sur transparent.
 */
export default function AdminTabs<K extends string>({ tabs, value, onChange }: AdminTabsProps<K>) {
  return (
    <div className="inline-flex items-center bg-warm-100 border border-warm-200 rounded-md p-0.5">
      {tabs.map((t) => {
        const active = value === t.key
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => onChange(t.key)}
            className={[
              'inline-flex items-center gap-1.5 h-8 px-3 rounded text-body-s font-medium transition-colors',
              active
                ? 'bg-airmess-dark text-white shadow-sm'
                : 'text-warm-600 hover:text-ink',
            ].join(' ')}
          >
            {t.label}
            {t.count !== undefined && (
              <span
                className={[
                  'tabular-nums text-caption font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center',
                  active ? 'bg-white/15 text-white' : 'bg-warm-200 text-warm-600',
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
