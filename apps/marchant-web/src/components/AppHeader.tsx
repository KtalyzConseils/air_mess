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

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-2 rounded text-sm ${isActive ? 'bg-white/10 text-white' : 'text-gray-300 hover:text-white'}`

  return (
    <header className="bg-airmess-dark text-white px-6 py-4 flex justify-between items-center">
      <Link to="/dashboard" className="flex items-center gap-3">
        <div className="w-10 h-10 bg-airmess-yellow rounded-lg flex items-center justify-center text-airmess-dark font-bold">
          AM
        </div>
        <div>
          <h1 className="text-lg font-bold leading-none">Air Mess</h1>
          <p className="text-xs text-gray-400">Espace marchand</p>
        </div>
      </Link>

      <nav className="flex items-center gap-1">
        <NavLink to="/dashboard" className={linkClass}>Tableau de bord</NavLink>
        <NavLink to="/addresses" className={linkClass}>Carnet</NavLink>
      </nav>

      <div className="flex items-center gap-4">
        <EnableNotificationsButton />
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
      </div>
    </header>
  )
}
