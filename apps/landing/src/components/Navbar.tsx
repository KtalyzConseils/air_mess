import { useEffect, useState } from 'react'
import { useContent } from '../content'
import { links } from '../config'
import Logo from './Logo'
import LanguageToggle from './LanguageToggle'

const navItems = [
  { key: 'howItWorks', href: '#how' },
  { key: 'features', href: '#features' },
  { key: 'drivers', href: '#drivers' },
  { key: 'faq', href: '#faq' },
] as const

export default function Navbar() {
  const c = useContent()
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        scrolled ? 'border-b border-faint bg-bg/85 backdrop-blur-md' : 'border-b border-transparent'
      }`}
    >
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
        <span className="inline-flex items-center rounded-xl bg-ink px-3 py-1.5 ring-1 ring-white/10">
          <Logo />
        </span>

        <div className="hidden items-center gap-8 md:flex">
          {navItems.map((item) => (
            <a
              key={item.key}
              href={item.href}
              className="text-sm font-medium text-muted transition-colors hover:text-ink"
            >
              {c.nav[item.key]}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <LanguageToggle />      
          <a
            href={links.registerSender}
            className="rounded-full bg-logo-yellow px-4 py-2 text-sm font-semibold text-ink transition-transform duration-200 hover:-translate-y-0.5 hover:bg-logo-yellow-bright"
          >
            {c.nav.cta}
          </a>
        </div>

        {/* Mobile */}
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center md:hidden"
          aria-expanded={open}
          aria-label="Menu"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="relative block h-4 w-6">
            <span
              className={`absolute left-0 block h-0.5 w-6 bg-ink transition-transform duration-300 ${
                open ? 'top-1.5 rotate-45' : 'top-0'
              }`}
            />
            <span
              className={`absolute left-0 top-1.5 block h-0.5 w-6 bg-ink transition-opacity duration-200 ${
                open ? 'opacity-0' : 'opacity-100'
              }`}
            />
            <span
              className={`absolute left-0 block h-0.5 w-6 bg-ink transition-transform duration-300 ${
                open ? 'top-1.5 -rotate-45' : 'top-3'
              }`}
            />
          </span>
        </button>
      </nav>

      {/* Mobile drawer */}
      {open && (
        <div className="border-t border-faint bg-bg px-5 pb-6 pt-2 md:hidden">
          <div className="flex flex-col gap-1">
            {navItems.map((item) => (
              <a
                key={item.key}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-2 py-3 text-base font-medium text-ink hover:bg-ink/5"
              >
                {c.nav[item.key]}
              </a>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between gap-3">
            <LanguageToggle />
            <a href={links.login} className="text-sm font-semibold text-ink">
              {c.nav.login}
            </a>
          </div>
          <a
            href={links.registerSender}
            className="mt-4 block rounded-full bg-logo-yellow px-4 py-3 text-center text-sm font-semibold text-ink"
          >
            {c.nav.cta}
          </a>
        </div>
      )}
    </header>
  )
}
