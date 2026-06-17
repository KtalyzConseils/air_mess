import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../stores/authStore'
import { hasAdminRole } from '../lib/permissions'
import { fetchUnreadCount } from '../api/notifications'

export default function AdminHeader() {
  const { user, logout } = useAuthStore()
  const canManageMarchants = hasAdminRole(user, 'commercial')
  const canManageOps = hasAdminRole(user, 'ops')
  const isSuperAdmin = hasAdminRole(user, 'super')
  const [mobileOpen, setMobileOpen] = useState(false)

  const { data: unread = 0 } = useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: fetchUnreadCount,
    refetchInterval: 20_000,
  })

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-2 rounded text-sm ${isActive ? 'bg-airmess-yellow text-airmess-dark font-semibold' : 'text-gray-300 hover:text-white'}`

  // Variante pour le drawer mobile : liens plus larges, fermeture au clic
  const mobileLinkClass = ({ isActive }: { isActive: boolean }) =>
    `block px-4 py-3 rounded-lg text-base ${isActive ? 'bg-airmess-yellow text-airmess-dark font-semibold' : 'text-gray-200 hover:bg-white/10'}`

  // Liste des liens (DRY pour desktop + mobile)
  const navLinks = (
    <>
      <NavLink to="/admin/dashboard" className={linkClass}>Tableau de bord</NavLink>
      {canManageMarchants && <NavLink to="/admin/marchants" className={linkClass}>Marchands</NavLink>}
      {canManageMarchants && <NavLink to="/admin/individuals" className={linkClass}>Particuliers</NavLink>}
      {canManageOps && <NavLink to="/admin/courses" className={linkClass}>Courses</NavLink>}
      {canManageOps && <NavLink to="/admin/drivers" className={linkClass}>Livreurs</NavLink>}
      {canManageOps && <NavLink to="/admin/incidents" className={linkClass}>Incidents</NavLink>}
      {canManageOps && <NavLink to="/admin/payouts" className={linkClass}>💸 Versements</NavLink>}
      {isSuperAdmin && <NavLink to="/admin/settings" className={linkClass}>⚙️ Paramètres</NavLink>}
    </>
  )

  const mobileNavLinks = (
    <>
      <NavLink to="/admin/dashboard" className={mobileLinkClass} onClick={() => setMobileOpen(false)}>Tableau de bord</NavLink>
      {canManageMarchants && <NavLink to="/admin/marchants" className={mobileLinkClass} onClick={() => setMobileOpen(false)}>Marchands</NavLink>}
      {canManageMarchants && <NavLink to="/admin/individuals" className={mobileLinkClass} onClick={() => setMobileOpen(false)}>Particuliers</NavLink>}
      {canManageOps && <NavLink to="/admin/courses" className={mobileLinkClass} onClick={() => setMobileOpen(false)}>Courses</NavLink>}
      {canManageOps && <NavLink to="/admin/drivers" className={mobileLinkClass} onClick={() => setMobileOpen(false)}>Livreurs</NavLink>}
      {canManageOps && <NavLink to="/admin/incidents" className={mobileLinkClass} onClick={() => setMobileOpen(false)}>Incidents</NavLink>}
      {canManageOps && <NavLink to="/admin/payouts" className={mobileLinkClass} onClick={() => setMobileOpen(false)}>💸 Versements</NavLink>}
      {isSuperAdmin && <NavLink to="/admin/settings" className={mobileLinkClass} onClick={() => setMobileOpen(false)}>⚙️ Paramètres</NavLink>}
    </>
  )

  return (
    <header className="bg-airmess-dark text-white px-4 md:px-6 py-3 md:py-4 flex justify-between items-center relative">
      <Link to="/admin/dashboard" className="flex items-center gap-2 md:gap-3 min-w-0">
        <div className="w-9 h-9 md:w-10 md:h-10 bg-airmess-red rounded-lg flex items-center justify-center font-bold shrink-0">
          A
        </div>
        <div className="min-w-0">
          <h1 className="text-base md:text-lg font-bold leading-none truncate">Air Mess</h1>
          <p className="text-xs text-gray-400 truncate">Administration KTALYZ</p>
        </div>
      </Link>

      {/* Nav desktop (hidden sous lg) */}
      <nav className="hidden lg:flex items-center gap-1 flex-wrap">
        {navLinks}
      </nav>

      <div className="flex items-center gap-2 md:gap-4">
        <NavLink to="/admin/notifications" className="relative text-gray-300 hover:text-white" title="Notifications">
          <span className="text-xl">🔔</span>
          {unread > 0 && (
            <span className="absolute -top-1.5 -right-2 bg-airmess-red text-white text-[10px] leading-none rounded-full px-1.5 py-0.5 font-bold">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </NavLink>

        {/* Identité + déconnexion : visible à partir de md */}
        <div className="hidden md:block text-right">
          <p className="text-sm font-medium truncate max-w-[120px]">{user?.admin?.first_name ?? user?.name}</p>
          <p className="text-xs text-gray-400">{user?.admin?.sub_role}</p>
        </div>
        <button onClick={() => logout()} className="hidden md:block text-sm text-gray-300 hover:text-white">
          Déconnexion
        </button>

        {/* Burger menu mobile (hidden à partir de lg) */}
        <button
          onClick={() => setMobileOpen((v) => !v)}
          className="lg:hidden p-2 rounded text-gray-300 hover:text-white hover:bg-white/10"
          aria-label="Menu"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {mobileOpen ? (
              <path d="M18 6 6 18M6 6l12 12" />
            ) : (
              <path d="M3 6h18M3 12h18M3 18h18" />
            )}
          </svg>
        </button>
      </div>

      {/* Drawer mobile */}
      {mobileOpen && (
        <>
          <div className="lg:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setMobileOpen(false)} />
          <div className="lg:hidden absolute top-full left-0 right-0 bg-airmess-dark border-t border-white/10 p-4 z-50 shadow-xl">
            <div className="mb-3 pb-3 border-b border-white/10">
              <p className="text-sm font-medium">{user?.admin?.first_name ?? user?.name}</p>
              <p className="text-xs text-gray-400">{user?.admin?.sub_role}</p>
            </div>
            <nav className="flex flex-col gap-1">
              {mobileNavLinks}
            </nav>
            <button
              onClick={() => {
                setMobileOpen(false)
                logout()
              }}
              className="w-full mt-4 px-4 py-3 rounded-lg text-base text-airmess-red hover:bg-white/10 text-left"
            >
              ↪ Déconnexion
            </button>
          </div>
        </>
      )}
    </header>
  )
}
