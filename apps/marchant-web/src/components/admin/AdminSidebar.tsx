import { useEffect, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import mark from '../../assets/logo/airmess-mark.svg'
import wordmark from '../../assets/logo/airmess-wordmark.svg'
import {
  LogOutIcon,
  CloseIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '../ui/icons'
import { useAdminNav } from './adminNav'

interface AdminSidebarProps {
  mobileOpen: boolean
  onMobileClose: () => void
}

const COLLAPSED_KEY = 'admin.sidebar.collapsed'

export default function AdminSidebar({ mobileOpen, onMobileClose }: AdminSidebarProps) {
  const { user, logout } = useAuthStore()

  // Persistance du collapsed state. Sur mobile, ignoré (drawer plein).
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem(COLLAPSED_KEY) === '1'
  })
  useEffect(() => {
    window.localStorage.setItem(COLLAPSED_KEY, collapsed ? '1' : '0')
  }, [collapsed])

  // Source unique de la nav, partagée avec AdminQuickNav (radial menu).
  const { sections } = useAdminNav()

  const widthClasses = collapsed ? 'lg:w-16' : 'lg:w-60'

  return (
    <>
      {/* Backdrop mobile */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
          onClick={onMobileClose}
          aria-hidden
        />
      )}

      {/* Sidebar */}
      <aside
        className={[
          'fixed inset-y-0 left-0 z-50 bg-airmess-dark text-white flex flex-col',
          'transition-all duration-200 ease-out',
          // Mobile : drawer plein largeur 260px, slide depuis la gauche
          'w-64',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
          // Desktop : toujours visible, largeur variable
          'lg:translate-x-0 lg:sticky lg:top-0 lg:h-screen',
          widthClasses,
        ].join(' ')}
      >
        {/* Brand row */}
        <div className="h-16 shrink-0 flex items-center justify-between px-4 border-b border-white/8">
          <Link
            to="/admin/dashboard"
            className="flex items-center gap-2 min-w-0"
            onClick={onMobileClose}
          >
            {collapsed ? (
              <img src={mark} alt="Air Mess" className="h-7 w-7" />
            ) : (
              <img src={wordmark} alt="Air Mess" className="h-6 w-auto" />
            )}
          </Link>

          {/* Mobile close */}
          <button
            onClick={onMobileClose}
            className="lg:hidden p-2 rounded-md text-white/70 hover:text-white hover:bg-white/8"
            aria-label="Fermer la navigation"
          >
            <CloseIcon size={18} />
          </button>
        </div>

        {/* Nav scroll zone */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4 scrollbar-thin">
          {sections.map((section) => (
              <div key={section.title}>
                {!collapsed && (
                  <p className="px-3 mb-1.5 text-[10px] uppercase tracking-wider font-bold text-white/40">
                    {section.title}
                  </p>
                )}
                <ul className="space-y-0.5">
                  {section.items.map((item) => (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        onClick={onMobileClose}
                        end={item.to === '/admin/dashboard'}
                        title={collapsed ? item.label : undefined}
                        className={({ isActive }) =>
                          [
                            'flex items-center gap-3 rounded-md text-body-s font-medium transition-colors relative',
                            collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2',
                            isActive
                              ? 'bg-airmess-yellow/15 text-airmess-yellow before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-0.5 before:bg-airmess-yellow before:rounded-r'
                              : 'text-white/70 hover:text-white hover:bg-white/8',
                          ].join(' ')
                        }
                      >
                        <span className="shrink-0 relative">
                          <item.Icon size={18} />
                          {item.badge !== undefined && item.badge > 0 && (
                            <span className="absolute -top-1 -right-1.5 bg-airmess-red text-white text-[9px] leading-none rounded-full px-1 py-0.5 font-bold min-w-[14px] text-center">
                              {item.badge > 9 ? '9+' : item.badge}
                            </span>
                          )}
                        </span>
                        {!collapsed && <span className="truncate">{item.label}</span>}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </div>
          ))}
        </nav>

        {/* Footer : identité + collapse + logout */}
        <div className="shrink-0 border-t border-white/8 px-2 py-3 space-y-1">
          {!collapsed && (
            <div className="px-3 py-2 mb-1">
              <p className="text-body-s font-semibold text-white truncate">
                {user?.admin?.first_name ?? user?.name}
              </p>
              <p className="text-caption text-white/50 truncate capitalize">
                {user?.admin?.sub_role ?? 'admin'}
              </p>
            </div>
          )}

          <button
            onClick={() => logout()}
            title={collapsed ? 'Déconnexion' : undefined}
            className={[
              'w-full flex items-center gap-3 rounded-md text-body-s font-medium text-white/70 hover:text-airmess-red hover:bg-white/8 transition-colors',
              collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2',
            ].join(' ')}
          >
            <LogOutIcon size={18} />
            {!collapsed && <span>Déconnexion</span>}
          </button>

          {/* Collapse toggle — desktop only */}
          <button
            onClick={() => setCollapsed((v) => !v)}
            className="hidden lg:flex w-full items-center justify-center gap-1.5 px-2 py-2 rounded-md text-caption text-white/50 hover:text-white hover:bg-white/8 transition-colors"
            aria-label={collapsed ? 'Étendre la navigation' : 'Réduire la navigation'}
          >
            {collapsed ? <ChevronRightIcon size={16} /> : (
              <>
                <ChevronLeftIcon size={16} />
                <span>Réduire</span>
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  )
}
