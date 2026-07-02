import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { fetchUnreadCount } from '../api/notifications'
import UserMenu from './UserMenu'
import { useDesktopNotifications } from '../hooks/useDesktopNotifications'
import EnableNotificationsButton from './EnableNotificationsButton'
import markWhite from '../assets/logo/airmess-mark-white.svg'
import mark from '../assets/logo/airmess-mark.svg'
import { useUiPrefsStore } from '../stores/uiPrefsStore'

/**
 * Header global de l'app marchand/particulier.
 * - Fond sombre (airmess-dark) pour contraste max
 * - Logo mark (les 2 formes signature) + wordmark texte
 * - Nav desktop : Tableau · Courses · Carnet
 * - À droite : notifs + UserMenu + burger mobile
 */
export default function AppHeader() {
  const { t } = useTranslation()
  const clientNavMode = useUiPrefsStore((s) => s.clientNavMode)

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: fetchUnreadCount,
    refetchInterval: 30_000,
  })

  useDesktopNotifications()

  const [mobileOpen, setMobileOpen] = useState(false)

  // Mode 'fab' : le header est entièrement remplacé par le FAB radial
  // (rendu globalement dans App.tsx). On retourne null sans casser le layout
  // — les pages utilisent `min-h-screen` autour de leur main, le header n'a
  // jamais été stretch.
  if (clientNavMode === 'fab') return null

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    [
      'px-3 py-2 rounded-md text-body-s font-medium transition-colors',
      isActive
        ? 'text-airmess-yellow'
        : 'text-warm-300 hover:text-cream',
    ].join(' ')

  const mobileLinkClass = ({ isActive }: { isActive: boolean }) =>
    [
      'block px-4 py-3 rounded-md text-body font-medium transition-colors',
      isActive
        ? 'bg-warm-600/30 text-airmess-yellow'
        : 'text-warm-200 hover:bg-warm-600/20',
    ].join(' ')

  return (
    <header className="bg-airmess-dark text-cream px-4 md:px-6 py-3 md:py-4 flex justify-between items-center relative border-b border-warm-600/20">
      {/* ============ LOGO ============ */}
      <Link to="/dashboard" className="flex items-center gap-3 min-w-0 shrink-0">
        {/* Mark = les 2 formes signature, dimension contrôlée */}
        <img
          src={mark}
          alt=""
          aria-hidden="true"
          className="h-9 w-auto md:h-10 shrink-0"
        />
        <div className="min-w-0 hidden sm:block">
          <h1 className="text-body font-bold leading-none truncate">Air Mess</h1>
          <p className="text-caption text-warm-400 truncate mt-0.5">{t('header.workspace')}</p>
        </div>
      </Link>

      {/* ============ NAV DESKTOP ============ */}
      <nav className="hidden md:flex items-center gap-1">
        <NavLink to="/dashboard" className={linkClass}>{t('nav.dashboard')}</NavLink>
        <NavLink to="/courses" end className={linkClass}>{t('nav.courses')}</NavLink>
        <NavLink to="/addresses" className={linkClass}>{t('nav.addresses')}</NavLink>
        <NavLink to="/wallet" className={linkClass}>{t('nav.wallet')}</NavLink>
        <NavLink to="/dev" className={linkClass}>{t('nav.devMode')}</NavLink>
      </nav>

      {/* ============ DROITE ============ */}
      <div className="flex items-center gap-2 md:gap-3">
        <div className="hidden md:block">
          <EnableNotificationsButton />
        </div>

        <NavLink
          to="/notifications"
          className={({ isActive }) =>
            `relative w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
              isActive ? 'bg-warm-600/30' : 'hover:bg-warm-600/20'
            }`
          }
          title={t('header.notificationsTitle')}
        >
          <span className="text-lg leading-none" aria-hidden>🔔</span>
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-airmess-red text-cream text-[10px] font-bold flex items-center justify-center tabular-nums">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </NavLink>

        <UserMenu />

        {/* Burger mobile */}
        <button
          onClick={() => setMobileOpen((v) => !v)}
          className="md:hidden p-2 rounded-md text-warm-300 hover:text-cream hover:bg-warm-600/20"
          aria-label={t('header.menu')}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {mobileOpen ? <path d="M18 6 6 18M6 6l12 12" /> : <path d="M3 6h18M3 12h18M3 18h18" />}
          </svg>
        </button>
      </div>

      {/* ============ DRAWER MOBILE ============ */}
      {mobileOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 bg-ink/60 backdrop-blur-sm z-40 ams-anim-fade-in"
            onClick={() => setMobileOpen(false)}
          />
          <div className="md:hidden absolute top-full left-0 right-0 bg-airmess-dark border-t border-warm-600/20 p-4 z-50 shadow-lg ams-anim-slide-up">
            <nav className="flex flex-col gap-1">
              <NavLink to="/dashboard" className={mobileLinkClass} onClick={() => setMobileOpen(false)}>
                {t('nav.dashboard')}
              </NavLink>
              <NavLink to="/courses" end className={mobileLinkClass} onClick={() => setMobileOpen(false)}>
                {t('nav.myCourses')}
              </NavLink>
              <NavLink to="/courses/new" className={mobileLinkClass} onClick={() => setMobileOpen(false)}>
                + {t('nav.newDelivery')}
              </NavLink>
              <NavLink to="/addresses" className={mobileLinkClass} onClick={() => setMobileOpen(false)}>
                {t('nav.addressBook')}
              </NavLink>
              <NavLink to="/wallet" className={mobileLinkClass} onClick={() => setMobileOpen(false)}>
                💰 {t('userMenu.myWallet')}
              </NavLink>
              <NavLink to="/dev" className={mobileLinkClass} onClick={() => setMobileOpen(false)}>
                {t('nav.devMode')}
              </NavLink>
              <NavLink to="/profile" className={mobileLinkClass} onClick={() => setMobileOpen(false)}>
                👤 {t('nav.profile')}
              </NavLink>
            </nav>
            <div className="mt-4 pt-4 border-t border-warm-600/20">
              <EnableNotificationsButton />
            </div>

            {/* Petit mark décoratif en bas du drawer mobile */}
            <div className="mt-6 pt-4 border-t border-warm-600/20 flex items-center justify-center gap-2 opacity-30">
              <img src={markWhite} alt="" aria-hidden className="h-6 w-auto" />
              <span className="text-caption text-warm-400">© 2026 KTALYZ</span>
            </div>
          </div>
        </>
      )}
    </header>
  )
}
