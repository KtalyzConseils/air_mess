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

  const { data: unread = 0 } = useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: fetchUnreadCount,
    refetchInterval: 20_000,
  })

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-2 rounded text-sm ${isActive ? 'bg-airmess-yellow text-airmess-dark font-semibold' : 'text-gray-300 hover:text-white'}`

  return (
    <header className="bg-airmess-dark text-white px-6 py-4 flex justify-between items-center">
      <Link to="/admin/dashboard" className="flex items-center gap-3">
        <div className="w-10 h-10 bg-airmess-red rounded-lg flex items-center justify-center font-bold">
          A
        </div>
        <div>
          <h1 className="text-lg font-bold leading-none">Air Mess</h1>
          <p className="text-xs text-gray-400">Administration KTALYZ</p>
        </div>
      </Link>

      <nav className="flex items-center gap-1">
        <NavLink to="/admin/dashboard" className={linkClass}>Tableau de bord</NavLink>
        {canManageMarchants && (
          <NavLink to="/admin/marchants" className={linkClass}>Marchands</NavLink>
        )}
        {canManageOps && (
          <NavLink to="/admin/courses" className={linkClass}>Courses</NavLink>
        )}
        {canManageOps && (
          <NavLink to="/admin/drivers" className={linkClass}>Livreurs</NavLink>
        )}
        {canManageOps && (
          <NavLink to="/admin/incidents" className={linkClass}>Incidents</NavLink>
        )}
        {canManageOps && (
          <NavLink to="/admin/payouts" className={linkClass}>💸 Versements</NavLink>
        )}
        {isSuperAdmin && (
          <NavLink to="/admin/settings" className={linkClass}>⚙️ Paramètres</NavLink>
        )}
      </nav>

      <div className="flex items-center gap-4">
        <NavLink to="/admin/notifications" className="relative text-gray-300 hover:text-white" title="Notifications">
          <span className="text-xl">🔔</span>
          {unread > 0 && (
            <span className="absolute -top-1.5 -right-2 bg-airmess-red text-white text-[10px] leading-none rounded-full px-1.5 py-0.5 font-bold">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </NavLink>
        <div className="text-right">
          <p className="text-sm font-medium">{user?.admin?.first_name ?? user?.name}</p>
          <p className="text-xs text-gray-400">{user?.admin?.sub_role}</p>
        </div>
        <button onClick={() => logout()} className="text-sm text-gray-300 hover:text-white">
          Déconnexion
        </button>
      </div>
    </header>
  )
}
