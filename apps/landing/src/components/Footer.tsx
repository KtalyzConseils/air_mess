import { useContent } from '../content'
import { links, contact } from '../config'
import Logo from './Logo'
import LanguageToggle from './LanguageToggle'

export default function Footer() {
  const c = useContent()
  const year = 2026

  return (
    <footer className="bg-ink text-paper">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr]">
          <div className="max-w-xs">
            <Logo light />
            <p className="mt-4 leading-relaxed text-white/60">{c.footer.tagline}</p>
            <p className="data-label mt-4 text-white/50">{c.footer.momo}</p>
            <div className="mt-6">
              <LanguageToggle light />
            </div>
          </div>

          <div>
            <h4 className="data-label text-white/40">{c.footer.product}</h4>
            <ul className="mt-4 space-y-3 text-sm">
              <FootLink href="#how">{c.footer.links.howItWorks}</FootLink>
              <FootLink href="#features">{c.footer.links.features}</FootLink>
              <FootLink href="#drivers">{c.footer.links.drivers}</FootLink>
              <FootLink href={links.registerSender}>{c.footer.links.sender}</FootLink>
            </ul>
          </div>

          <div>
            <h4 className="data-label text-white/40">{c.footer.company}</h4>
            <ul className="mt-4 space-y-3 text-sm">
              <FootLink href={`mailto:${contact.email}`}>{c.footer.links.contact}</FootLink>
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-2 border-t border-white/10 pt-6 text-sm text-white/50 sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} AirMess. {c.footer.rights}</p>
          <p className="data-label">{c.footer.madeBy}</p>
        </div>
      </div>
    </footer>
  )
}

function FootLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <a href={href} className="text-white/70 transition-colors hover:text-yellow">
        {children}
      </a>
    </li>
  )
}
