interface Props {
    label: string
    value: string | number
    hint?: string
    accent?: 'yellow' | 'red' | 'dark' | 'gray'
  }
  
  const ACCENT: Record<NonNullable<Props['accent']>, string> = {
    yellow: 'border-l-airmess-yellow',
    red:    'border-l-airmess-red',
    dark:   'border-l-airmess-dark',
    gray:   'border-l-gray-300',
  }
  
  export default function KpiCard({ label, value, hint, accent = 'gray' }: Props) {
    return (
      <div className={`bg-white rounded-xl shadow-sm p-5 border-l-4 ${ACCENT[accent]}`}>
        <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold">{label}</p>
        <p className="mt-2 text-3xl font-bold text-airmess-dark">{value}</p>
        {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
      </div>
    )
  }
  