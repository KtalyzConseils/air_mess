import { useContent } from '../content'
import { links } from '../config'
import TrackingCard from './TrackingCard'

export default function Hero() {
  const c = useContent()

  return (
    <section id="top" className="relative overflow-hidden pt-28 pb-24 sm:pt-32">
      {/* ambient yellow glow */}
      <div
        className="pointer-events-none absolute -top-24 right-0 h-96 w-96 rounded-full bg-yellow/20 blur-3xl"
        aria-hidden="true"
      />

      <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:gap-10">
        {/* Copy */}
        <div className="relative">
          <span className="data-label inline-flex items-center gap-2 rounded-full border border-ink/10 bg-paper px-3 py-1.5 text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-red" />
            {c.hero.eyebrow}
          </span>

          <h1 className="mt-6 font-display text-5xl font-extrabold leading-[0.98] tracking-tight sm:text-6xl lg:text-7xl">
            {c.hero.titleLine1}
            <br />
            <span className="relative inline-block">
              <span className="relative z-10">{c.hero.titleHighlight}</span>
              <span
                className="absolute inset-x-0 bottom-1 z-0 h-4 -skew-x-6 bg-yellow sm:h-5"
                aria-hidden="true"
              />
            </span>
            {c.hero.titleLine2 ? ` ${c.hero.titleLine2}` : null}
          </h1>

          <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted">{c.hero.subtitle}</p>

          {/* CTAs — merchant primary, courier secondary (toned down) */}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <a
              href={links.registerSender}
              className="group inline-flex items-center justify-center gap-2 rounded-full bg-logo-yellow px-6 py-3.5 text-base font-semibold text-ink transition-transform duration-200 hover:-translate-y-0.5 hover:bg-logo-yellow-bright"
            >
              {c.hero.ctaSender}
              <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
            </a>
            <a
              href={links.registerDriver}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-ink/20 px-6 py-3.5 text-base font-semibold text-ink/70 transition-colors duration-200 hover:border-ink/40 hover:text-ink"
            >
              {c.hero.ctaDriver}
            </a>
          </div>

          {/* Price marker (out of FAQ) */}
          <p className="data-label mt-5 inline-flex items-center gap-2 text-ink">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-logo-yellow text-[11px] font-bold text-ink">
              ₣
            </span>
            {c.hero.price}
          </p>

          {/* Concrete merchant example — fills the column + reinforces the pitch */}
          <div className="mt-8 max-w-md rounded-2xl border border-faint bg-paper p-4">
            <p className="text-sm leading-relaxed text-muted">{c.hero.example}</p>
          </div>
        </div>

        {/* Live tracking visual */}
        <div className="relative mb-8 lg:mb-0">
          <TrackingCard />
        </div>
      </div>
    </section>
  )
}
