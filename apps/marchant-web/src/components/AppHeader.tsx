import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchUnreadCount } from '../api/notifications'
import UserMenu from './UserMenu'
import { useDesktopNotifications } from '../hooks/useDesktopNotifications'
import EnableNotificationsButton from './EnableNotificationsButton'


export default function AppHeader() {
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: fetchUnreadCount,
    refetchInterval: 30_000,
  })

  useDesktopNotifications()

  const [mobileOpen, setMobileOpen] = useState(false)

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-2 rounded text-sm ${isActive ? 'bg-white/10 text-white' : 'text-gray-300 hover:text-white'}`

  const mobileLinkClass = ({ isActive }: { isActive: boolean }) =>
    `block px-4 py-3 rounded-lg text-base ${isActive ? 'bg-white/15 text-white font-semibold' : 'text-gray-200 hover:bg-white/10'}`

  return (
    <header className="bg-airmess-dark text-white px-4 md:px-6 py-3 md:py-4 flex justify-between items-center relative">
      <Link to="/dashboard" className="flex items-center gap-2 md:gap-3 min-w-0">
        <div className="w-9 h-9 md:w-10 md:h-10 bg-airmess-yellow rounded-lg flex items-center justify-center text-airmess-dark font-bold shrink-0">
          AM
        </div>
        <div className="min-w-0">
          <h1 className="text-base md:text-lg font-bold leading-none truncate">Air Mess</h1>
          <p className="text-xs text-gray-400 truncate">Espace marchand</p>
        </div>
      </Link>

      {/* Nav desktop (hidden sous md) */}
      <nav className="hidden md:flex items-center gap-1">
        <NavLink to="/dashboard" className={linkClass}>Tableau de bord</NavLink>
        <NavLink to="/addresses" className={linkClass}>Carnet</NavLink>
      </nav>

      <div className="flex items-center gap-2 md:gap-4">
        {/* Activer alertes : masqué sur mobile (place limitée) */}
        <div className="hidden md:block">
          <EnableNotificationsButton />
        </div>

        <NavLink
          to="/notifications"
          className={({ isActive }) =>
            `relative w-10 h-10 rounded-full flex items-center justify-center transition ${
              isActive ? 'bg-white/15' : 'hover:bg-white/10'
            }`
          }
          title="Notifications"
        >
          <span className="text-xl leading-none">🔔</span>
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-airmess-red text-white text-[10px] font-bold flex items-center justify-center">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </NavLink>

        <UserMenu />

        {/* Burger mobile (juste pour la nav, le UserMenu reste accessible) */}
        <button
          onClick={() => setMobileOpen((v) => !v)}
          className="md:hidden p-2 rounded text-gray-300 hover:text-white hover:bg-white/10"
          aria-label="Menu"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {mobileOpen ? <path d="M18 6 6 18M6 6l12 12" /> : <path d="M3 6h18M3 12h18M3 18h18" />}
          </svg>
        </button>
      </div>

      {/* Drawer mobile */}
      {mobileOpen && (
        <>
          <div className="md:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setMobileOpen(false)} />
          <div className="md:hidden absolute top-full left-0 right-0 bg-airmess-dark border-t border-white/10 p-4 z-50 shadow-xl">
            <nav className="flex flex-col gap-1">
              <NavLink to="/dashboard" className={mobileLinkClass} onClick={() => setMobileOpen(false)}>Tableau de bord</NavLink>
              <NavLink to="/addresses" className={mobileLinkClass} onClick={() => setMobileOpen(false)}>Carnet d'adresses</NavLink>
              <NavLink to="/courses/new" className={mobileLinkClass} onClick={() => setMobileOpen(false)}>+ Nouvelle livraison</NavLink>
              <NavLink to="/wallet" className={mobileLinkClass} onClick={() => setMobileOpen(false)}>💰 Mon wallet</NavLink>
              <NavLink to="/profile" className={mobileLinkClass} onClick={() => setMobileOpen(false)}>👤 Mon profil</NavLink>
            </nav>
            <div className="mt-3 pt-3 border-t border-white/10">
              <EnableNotificationsButton />
            </div>
          </div>
        </>
      )}
    </header>
  )
}
