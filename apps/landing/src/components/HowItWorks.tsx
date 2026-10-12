import { useContent } from '../content'
import { useReveal } from '../hooks/useReveal'

export default function HowItWorks() {
  const c = useContent()
  const { ref, className } = useReveal<HTMLDivElement>()

  return (
    <section id="how" className="py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <SectionHead eyebrow={c.how.eyebrow} title={c.how.title} />

        <div ref={ref} className={`${className} relative mt-14`}>
          {/* connecting dashed route */}
          <div
            className="absolute left-0 right-0 top-7 hidden border-t-2 border-dashed border-yellow-deep/50 md:block"
            aria-hidden="true"
          />

          <ol className="grid gap-10 md:grid-cols-3 md:gap-8">
            {c.how.steps.map((step, i) => (
              <li key={step.title} className="relative">
                <div className="flex items-center gap-4 md:block">
                  <span className="relative z-10 inline-flex h-14 w-14 items-center justify-center rounded-full border-2 border-ink bg-bg font-mono text-lg font-bold">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                </div>
                <h3 className="mt-5 font-display text-xl font-bold">{step.title}</h3>
                <p className="mt-2 max-w-xs leading-relaxed text-muted">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}

export function SectionHead({
  eyebrow,
  title,
  light = false,
}: {
  eyebrow: string
  title: string
  light?: boolean
}) {
  return (
    <div className="max-w-2xl">
      <span className={`data-label inline-flex items-center gap-2 ${light ? 'text-yellow' : 'text-yellow-deep'}`}>
        <span className="inline-block h-px w-6 bg-current" />
        {eyebrow}
      </span>
      <h2
        className={`mt-4 font-display text-3xl font-extrabold tracking-tight sm:text-4xl ${
          light ? 'text-paper' : 'text-ink'
        }`}
      >
        {title}
      </h2>
    </div>
  )
}
