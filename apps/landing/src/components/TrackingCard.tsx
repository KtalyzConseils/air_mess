import { useContent } from '../content'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'

// Route drawn once, reused by the dashed line and the moving courier dot.
const ROUTE = 'M44 196 C 110 150, 150 120, 196 132 S 300 150, 348 70'

export default function TrackingCard() {
  const c = useContent()
  const reduced = usePrefersReducedMotion()

  return (
    <div className="relative">
      {/* Map panel */}
      <div className="relative overflow-hidden rounded-3xl border border-ink/10 bg-ink shadow-2xl shadow-ink/20">
        <svg viewBox="0 0 400 260" className="block h-auto w-full" role="img" aria-label="Live delivery route">
          {/* asphalt */}
          <rect width="400" height="260" fill="#1b1a18" />

          {/* faint city grid */}
          <g stroke="#2b2924" strokeWidth="1">
            {[52, 104, 156, 208, 260, 312, 364].map((x) => (
              <line key={`v${x}`} x1={x} y1="0" x2={x} y2="260" />
            ))}
            {[52, 104, 156, 208].map((y) => (
              <line key={`h${y}`} x1="0" y1={y} x2="400" y2={y} />
            ))}
          </g>

          {/* base route shadow */}
          <path d={ROUTE} fill="none" stroke="#3a3833" strokeWidth="6" strokeLinecap="round" />
          {/* animated dashed route (road markings) */}
          <path d={ROUTE} fill="none" stroke="#FFC300" strokeWidth="3" className="route-dash" />

          {/* pickup */}
          <circle cx="44" cy="196" r="8" fill="#FFC300" />
          <circle cx="44" cy="196" r="3.5" fill="#161514" />
          {/* dropoff */}
          <circle cx="348" cy="70" r="8" fill="#CC0000" />
          <circle cx="348" cy="70" r="3.5" fill="#fff" />

          {/* moving courier dot */}
          <g>
            <circle r="6" fill="#fff" stroke="#FFC300" strokeWidth="3">
              {!reduced && (
                <animateMotion dur="7s" repeatCount="indefinite" rotate="auto" path={ROUTE} />
              )}
            </circle>
            {reduced && <circle cx="196" cy="132" r="6" fill="#fff" stroke="#FFC300" strokeWidth="3" />}
          </g>
        </svg>

        {/* live badge */}
        <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-ink/70 px-3 py-1.5 backdrop-blur">
          <span className="live-pulse inline-block h-2 w-2 rounded-full bg-red" />
          <span className="data-label text-white">{c.hero.live.tag}</span>
        </div>
      </div>

      {/* Floating course detail card */}
      <div className="absolute -bottom-6 left-1/2 w-[88%] -translate-x-1/2 rounded-2xl border border-faint bg-paper p-4 shadow-xl shadow-ink/10 sm:-right-6 sm:left-auto sm:w-72 sm:translate-x-0">
        <div className="flex items-center justify-between">
          <span className="data-label text-muted">{c.hero.live.courier}</span>
          <span className="font-mono text-xs font-bold text-red">● LIVE</span>
        </div>

        <div className="mt-3 space-y-2.5">
          <Row dot="bg-yellow" label={c.hero.live.pickup} value={c.hero.live.pickupValue} />
          <Row dot="bg-red" label={c.hero.live.dropoff} value={c.hero.live.dropoffValue} />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 border-t border-faint pt-3">
          <Metric label={c.hero.live.eta} value={c.hero.live.etaValue} />
          <Metric label={c.hero.live.distance} value={c.hero.live.distanceValue} />
        </div>
      </div>
    </div>
  )
}

function Row({ dot, label, value }: { dot: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${dot}`} />
      <div className="min-w-0">
        <div className="data-label text-muted">{label}</div>
        <div className="truncate text-sm font-semibold text-ink">{value}</div>
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="data-label text-muted">{label}</div>
      <div className="font-mono text-base font-bold text-ink">{value}</div>
    </div>
  )
}
