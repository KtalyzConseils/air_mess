import { useEffect, useRef } from 'react'
import { animate, utils } from 'animejs'
import { useContent } from '../content'
import { SectionHead } from './HowItWorks'

// Per-card resting state: slightly different shape + a touch of disorder.
const shapes = [
  '22px 12px 20px 14px',
  '12px 22px 14px 20px',
  '20px 16px 12px 22px',
  '14px 20px 22px 12px',
  '22px 14px 18px 20px',
  '16px 22px 12px 18px',
]
// Final state is aligned (per audit §3.8): the intro still scatters in, but the
// cards settle into a clean, readable, aligned grid.
const restX = [0, 0, 0, 0, 0, 0]
const restY = [0, 0, 0, 0, 0, 0]
const restRotate = [0, 0, 0, 0, 0, 0]

export default function Features() {
  const c = useContent()
  const gridRef = useRef<HTMLDivElement>(null)
  const played = useRef(false)

  useEffect(() => {
    const root = gridRef.current
    if (!root) return

    const intro = () => {
      const cards = root.querySelectorAll<HTMLElement>('.feature-card')
      // Cards start scattered (random offset / rotation / scale) and settle
      // elastically back into their real grid position — readable at the end.
      animate(cards, {
        opacity: [0, 1],
        x: [() => utils.random(-140, 140), (_: HTMLElement, i: number) => restX[i] ?? 0],
        y: [() => utils.random(-110, 110), (_: HTMLElement, i: number) => restY[i] ?? 0],
        rotate: [() => utils.random(-55, 55), (_: HTMLElement, i: number) => restRotate[i] ?? 0],
        scale: [() => utils.random(0.5, 0.85), 1],
        duration: () => utils.random(900, 1500),
        delay: () => utils.random(0, 350),
        ease: 'outElastic(1, .6)',
      } as Parameters<typeof animate>[1])
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && !played.current) {
            played.current = true
            intro()
          }
        }
      },
      { threshold: 0.3 },
    )
    io.observe(root)
    return () => io.disconnect()
  }, [])

  return (
    <section id="features" className="overflow-hidden py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <SectionHead eyebrow={c.features.eyebrow} title={c.features.title} />

        <div ref={gridRef} className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {c.features.items.map((item, i) => (
            <div
              key={item.title}
              style={{ opacity: 0, willChange: 'transform', borderRadius: shapes[i] }}
              className="feature-card flex items-center gap-4 border border-faint bg-paper p-6"
            >
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ink text-yellow">
                <FeatureIcon index={i} />
              </span>
              <h3 className="font-display text-lg font-bold">{item.title}</h3>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function FeatureIcon({ index }: { index: number }) {
  const common = {
    width: 22,
    height: 22,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.7,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }

  switch (index) {
    case 0: // real-time tracking — pin
      return (
        <svg {...common}>
          <path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11Z" />
          <circle cx="12" cy="10" r="2.6" />
        </svg>
      )
    case 1: // notifications — bell
      return (
        <svg {...common}>
          <path d="M6 9a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" />
          <path d="M10.5 20a1.5 1.5 0 0 0 3 0" />
        </svg>
      )
    case 2: // secure payments — card
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="M3 10h18" />
        </svg>
      )
    case 3: // saved addresses — bookmark
      return (
        <svg {...common}>
          <path d="M7 4h10a1 1 0 0 1 1 1v15l-6-3-6 3V5a1 1 0 0 1 1-1Z" />
        </svg>
      )
    case 4: // dashboard — grid
      return (
        <svg {...common}>
          <path d="M4 4h7v7H4V4Z M13 4h7v4h-7V4Z M13 11h7v9h-7v-9Z M4 13h7v7H4v-7Z" />
        </svg>
      )
    default: // verified couriers — shield check
      return (
        <svg {...common}>
          <path d="M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6l-8-3Z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
      )
  }
}
