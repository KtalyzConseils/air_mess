import { useContent } from '../content'
import { useReveal } from '../hooks/useReveal'
import { SectionHead } from './HowItWorks'
import mtnLogo from '../assets/payments/mtn.png'
import moovLogo from '../assets/payments/moov.png'

const stepIcons = [
  // collect — banknote
  <path key="s0" d="M3 7h18v10H3V7Z M12 12a2 2 0 1 0 0-1 2 2 0 0 0 0 1Z" />,
  // wallet credited — wallet
  <path key="s1" d="M3 7a2 2 0 0 1 2-2h12v4 M3 7v10a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1H6 M16 12h.01" />,
  // withdraw — arrow out
  <path key="s2" d="M12 3v12 M8 11l4 4 4-4 M5 21h14" />,
]

export default function WalletSection() {
  const c = useContent()
  const { ref, className } = useReveal<HTMLDivElement>()

  return (
    <section id="wallet" className="py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <SectionHead eyebrow={c.wallet.eyebrow} title={c.wallet.title} />
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">{c.wallet.body}</p>

        <div ref={ref} className={`${className} mt-12`}>
          {/* 3-step cash-in flow */}
          <ol className="grid gap-4 sm:grid-cols-3">
            {c.wallet.steps.map((step, i) => (
              <li
                key={step}
                className="relative flex flex-col gap-4 rounded-2xl border border-faint bg-paper p-6"
              >
                <div className="flex items-center justify-between">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-ink text-yellow">
                    <svg
                      width="22"
                      height="22"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      {stepIcons[i]}
                    </svg>
                  </span>
                  <span className="font-mono text-sm font-bold text-muted">0{i + 1}</span>
                </div>
                <p className="font-display text-lg font-bold leading-tight">{step}</p>
                {i < c.wallet.steps.length - 1 && (
                  <span
                    className="pointer-events-none absolute -right-3 top-1/2 hidden -translate-y-1/2 text-2xl text-logo-yellow sm:block"
                    aria-hidden="true"
                  >
                    →
                  </span>
                )}
              </li>
            ))}
          </ol>

          {/* protection callout + Mobile Money */}
          <div className="mt-4 flex flex-col gap-4 rounded-2xl bg-ink p-6 text-paper sm:flex-row sm:items-center sm:justify-between">
            <p className="font-display text-xl font-bold">
              <span className="text-logo-yellow">“</span>
              {c.wallet.protect}
              <span className="text-logo-yellow">”</span>
            </p>

            <div className="flex items-center gap-4">
              <span className="data-label text-white/60">{c.wallet.momo}</span>
              <div className="flex items-center gap-2">
                <img src={mtnLogo} alt="MTN Mobile Money" className="h-9 w-auto rounded-md bg-white p-1" />
                <img src={moovLogo} alt="Moov Money" className="h-9 w-auto rounded-md bg-white p-1" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
