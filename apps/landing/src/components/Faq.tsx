import { useState } from 'react'
import { useContent } from '../content'
import { SectionHead } from './HowItWorks'

export default function Faq() {
  const c = useContent()
  const [open, setOpen] = useState<number | null>(0)

  return (
    <section id="faq" className="py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-5 sm:px-8">
        <SectionHead eyebrow={c.faq.eyebrow} title={c.faq.title} />

        <div className="mt-12 divide-y divide-faint border-y border-faint">
          {c.faq.items.map((item, i) => {
            const isOpen = open === i
            return (
              <div key={item.q}>
                <h3>
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : i)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center justify-between gap-4 py-5 text-left"
                  >
                    <span className="font-display text-lg font-bold">{item.q}</span>
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-ink/15 text-lg leading-none transition-transform duration-300 ${
                        isOpen ? 'rotate-45 bg-yellow' : ''
                      }`}
                      aria-hidden="true"
                    >
                      +
                    </span>
                  </button>
                </h3>
                <div
                  className="grid transition-all duration-300 ease-out"
                  style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}
                >
                  <div className="overflow-hidden">
                    <p className="pb-5 pr-10 leading-relaxed text-muted">{item.a}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
