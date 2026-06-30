import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import AdminSidebar from './AdminSidebar'
import AdminQuickNav from './AdminQuickNav'
import { MenuIcon } from '../ui/icons'
import mark from '../../assets/logo/airmess-mark.svg'
import { useUiPrefsStore } from '../../stores/uiPrefsStore'

interface AdminPageShellProps {
  children: ReactNode
}

/**
 * Layout root pour toutes les pages /admin.
 *
 * Selon la préférence `navMode` (paramètres) :
 *  - 'both'    : sidebar + FAB radial   (défaut)
 *  - 'sidebar' : sidebar uniquement
 *  - 'fab'     : FAB uniquement (cache aussi le burger mobile)
 */
export default function AdminPageShell({ children }: AdminPageShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const navMode = useUiPrefsStore((s) => s.navMode)

  const showSidebar = navMode !== 'fab'
  const showFab = navMode !== 'sidebar'
  // En mode 'fab' on cache aussi le burger mobile — la nav passe exclusivement
  // par le FAB (qui marche aussi bien au doigt).
  const showMobileBurger = showSidebar

  return (
    <div className="min-h-screen bg-off-white lg:flex">
      {showSidebar && (
        <AdminSidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Topbar mobile (lg-) : burger + logo mark — masquée en mode 'fab' */}
        {showMobileBurger && (
          <div className="lg:hidden sticky top-0 z-30 bg-off-white/95 backdrop-blur border-b border-warm-200 px-4 h-14 flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="p-2 -ml-2 rounded-md text-warm-600 hover:text-ink hover:bg-warm-100"
              aria-label="Ouvrir la navigation"
            >
              <MenuIcon size={20} />
            </button>
            <Link to="/admin/dashboard" className="flex items-center gap-2">
              <img src={mark} alt="" className="h-7 w-7" />
              <span className="text-body-s font-bold text-ink">Admin</span>
            </Link>
          </div>
        )}

        <main className="flex-1 min-w-0">{children}</main>
      </div>

      {showFab && <AdminQuickNav />}
    </div>
  )
}
