import { useContent } from '../content'
import { links } from '../config'
import { useReveal } from '../hooks/useReveal'

export default function DriverCta() {
  const c = useContent()
  const { ref, className } = useReveal<HTMLDivElement>()

  return (
    <section id="drivers" className="py-10 sm:py-16">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div
          ref={ref}
          className={`${className} relative overflow-hidden rounded-[2rem] bg-ink px-6 py-14 text-center text-paper sm:px-12 sm:py-20`}
        >
          {/* animated route across the band */}
          <svg
            viewBox="0 0 1000 200"
            preserveAspectRatio="none"
            className="pointer-events-none absolute inset-0 h-full w-full opacity-50"
            aria-hidden="true"
          >
            <path
              d="M-20 150 C 200 60, 400 60, 520 110 S 850 170, 1020 60"
              fill="none"
              stroke="#FFC300"
              strokeWidth="2"
              className="route-dash"
            />
          </svg>

          <div className="relative">
            <span className="data-label text-yellow">{c.driverCta.eyebrow}</span>
            <h2 className="mx-auto mt-4 max-w-2xl font-display text-3xl font-extrabold tracking-tight sm:text-5xl">
              {c.driverCta.title}
            </h2>
            <p className="mx-auto mt-4 max-w-xl leading-relaxed text-white/70">
              {c.driverCta.subtitle}
            </p>

            <dl className="mx-auto mt-10 grid max-w-xl grid-cols-3 gap-4">
              {c.driverCta.stats.map((s) => (
                <div key={s.label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <dt className="font-display text-lg font-extrabold text-yellow sm:text-xl">{s.value}</dt>
                  <dd className="data-label mt-1 text-white/60">{s.label}</dd>
                </div>
              ))}
            </dl>

            <a
              href={links.registerDriver}
              className="mt-10 inline-flex items-center gap-2 rounded-full bg-logo-yellow px-7 py-4 text-base font-bold text-white transition-transform duration-200 hover:-translate-y-0.5 hover:bg-logo-red-deep"
            >
              {c.driverCta.cta} <span aria-hidden="true">→</span>
            </a>
            <p className="data-label mt-5 text-white/50">{c.driverCta.note}</p>
          </div>
        </div>
      </div>
    </section>
  )
}
