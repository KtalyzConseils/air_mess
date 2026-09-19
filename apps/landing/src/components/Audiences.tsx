import { useContent } from '../content'
import { links } from '../config'
import { useReveal } from '../hooks/useReveal'

export default function Audiences() {
  const c = useContent()
  const { ref, className } = useReveal<HTMLDivElement>()

  return (
    <section className="py-20 sm:py-28">
      <div ref={ref} className={`${className} mx-auto max-w-6xl px-5 sm:px-8`}>
        <div className="grid overflow-hidden rounded-3xl border border-ink/10 md:grid-cols-2">
          {/* Senders — light */}
          <div className="flex flex-col bg-paper p-8 sm:p-10">
            <span className="data-label text-yellow-deep">{c.audiences.senders.tag}</span>
            <h3 className="mt-3 font-display text-2xl font-extrabold sm:text-3xl">
              {c.audiences.senders.title}
            </h3>
            <p className="mt-3 leading-relaxed text-muted">{c.audiences.senders.body}</p>
            <ul className="mt-6 space-y-3">
              {c.audiences.senders.bullets.map((b) => (
                <Bullet key={b} text={b} />
              ))}
            </ul>
            <a
              href={links.registerSender}
              className="mt-8 inline-flex w-fit items-center gap-2 rounded-full bg-logo-red px-5 py-3 text-sm font-semibold text-ink transition-transform duration-200 hover:-translate-y-0.5 hover:bg-logo-yellow-bright"
            >
              {c.audiences.senders.cta} <span aria-hidden="true">→</span>
            </a>
          </div>

          {/* Drivers — asphalt */}
          <div className="relative flex flex-col overflow-hidden bg-ink p-8 text-paper sm:p-10">
            <div
              className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-yellow/10 blur-2xl"
              aria-hidden="true"
            />
            <span className="data-label text-yellow">{c.audiences.drivers.tag}</span>
            <h3 className="mt-3 font-display text-2xl font-extrabold sm:text-3xl">
              {c.audiences.drivers.title}
            </h3>
            <p className="mt-3 leading-relaxed text-white/70">{c.audiences.drivers.body}</p>
            <ul className="mt-6 space-y-3">
              {c.audiences.drivers.bullets.map((b) => (
                <Bullet key={b} text={b} light />
              ))}
            </ul>
            <a
              href={links.registerDriver}
              className="mt-8 inline-flex w-fit items-center gap-2 rounded-full bg-logo-yellow px-5 py-3 text-sm font-semibold text-white transition-transform duration-200 hover:-translate-y-0.5 hover:bg-logo-red-deep"
            >
              {c.audiences.drivers.cta} <span aria-hidden="true">→</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}

function Bullet({ text, light = false }: { text: string; light?: boolean }) {
  return (
    <li className="flex items-start gap-3">
      <svg
        className={light ? 'mt-0.5 text-yellow' : 'mt-0.5 text-yellow-deep'}
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="m5 12 5 5L20 7" />
      </svg>
      <span className={light ? 'text-white/85' : 'text-ink/80'}>{text}</span>
    </li>
  )
}
