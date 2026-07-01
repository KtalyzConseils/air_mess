import type { ComponentType } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../../stores/authStore'
import { hasAdminRole } from '../../lib/permissions'
import { fetchUnreadCount } from '../../api/notifications'
import {
  DashboardIcon,
  StoreIcon,
  UsersIcon,
  PackageIcon,
  BikeIcon,
  AlertTriangleIcon,
  BankIcon,
  BarChartIcon,
  SettingsIcon,
  BellIcon,
  CodeIcon,
  type IconProps,
} from '../ui/icons'

export interface AdminNavItem {
  to: string
  label: string
  Icon: ComponentType<IconProps>
  badge?: number
}

export interface AdminNavSection {
  title: string
  items: AdminNavItem[]
}

/**
 * Source de vérité unique pour la nav admin.
 * Consommée par :
 *  - AdminSidebar (rendu groupé par section, sombre, vertical)
 *  - AdminQuickNav (rendu radial autour d'un FAB déplaçable)
 *
 * Le filtrage par rôle se fait ici une seule fois — pas de duplication.
 */
export function useAdminNav() {
  const user = useAuthStore((s) => s.user)
  const canBrowseEntities = hasAdminRole(user, 'commercial', 'ops', 'support')
  const isSuperAdmin = hasAdminRole(user, 'super')
  const canOps = hasAdminRole(user, 'ops')

  const { data: unread = 0 } = useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: fetchUnreadCount,
    refetchInterval: 20_000,
  })

  const sections: AdminNavSection[] = [
    {
      title: 'Pilotage',
      items: filterItems([
        { to: '/admin/dashboard', label: "Vue d'ensemble", Icon: DashboardIcon, visible: true },
        { to: '/admin/courses', label: 'Courses', Icon: PackageIcon, visible: canBrowseEntities },
        { to: '/admin/incidents', label: 'Incidents', Icon: AlertTriangleIcon, visible: canOps },
      ]),
    },
    {
      title: 'Comptes',
      items: filterItems([
        { to: '/admin/marchants', label: 'Marchands', Icon: StoreIcon, visible: canBrowseEntities },
        { to: '/admin/individuals', label: 'Particuliers', Icon: UsersIcon, visible: canBrowseEntities },
        { to: '/admin/drivers', label: 'Livreurs', Icon: BikeIcon, visible: canBrowseEntities },
        { to: '/admin/api-apps', label: 'Apps dev', Icon: CodeIcon, visible: canBrowseEntities },
      ]),
    },
    {
      title: 'Finance',
      items: filterItems([
        { to: '/admin/withdraw-requests', label: 'Retraits', Icon: BankIcon, visible: isSuperAdmin },
        { to: '/admin/reconciliation', label: 'Comptabilité', Icon: BarChartIcon, visible: isSuperAdmin },
      ]),
    },
    {
      title: 'Système',
      items: filterItems([
        {
          to: '/admin/notifications',
          label: 'Notifications',
          Icon: BellIcon,
          visible: true,
          badge: unread,
        },
        { to: '/admin/settings', label: 'Paramètres', Icon: SettingsIcon, visible: isSuperAdmin },
      ]),
    },
  ].filter((s) => s.items.length > 0)

  return {
    sections,
    /** Liste plate (utile pour le radial où la notion de section n'a pas de sens). */
    flat: sections.flatMap((s) => s.items),
  }
}

/* ============================================================
   Helper interne
   ============================================================ */

interface RawItem extends AdminNavItem {
  visible: boolean
}

function filterItems(items: RawItem[]): AdminNavItem[] {
  return items
    .filter((i) => i.visible)
    .map(({ visible: _v, ...rest }) => rest)
}
