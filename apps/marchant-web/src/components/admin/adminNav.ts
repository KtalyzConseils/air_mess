import type { ComponentType } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()
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
      title: t('admin.nav.pilotage'),
      items: filterItems([
        { to: '/admin/dashboard', label: t('admin.nav.overview'), Icon: DashboardIcon, visible: true },
        { to: '/admin/courses', label: t('admin.nav.courses'), Icon: PackageIcon, visible: canBrowseEntities },
        { to: '/admin/incidents', label: t('admin.nav.incidents'), Icon: AlertTriangleIcon, visible: canOps },
      ]),
    },
    {
      title: t('admin.nav.accounts'),
      items: filterItems([
        { to: '/admin/marchants', label: t('admin.nav.marchants'), Icon: StoreIcon, visible: canBrowseEntities },
        { to: '/admin/individuals', label: t('admin.nav.individuals'), Icon: UsersIcon, visible: canBrowseEntities },
        { to: '/admin/drivers', label: t('admin.nav.drivers'), Icon: BikeIcon, visible: canBrowseEntities },
        { to: '/admin/api-apps', label: t('admin.nav.apiApps'), Icon: CodeIcon, visible: canBrowseEntities },
      ]),
    },
    {
      title: t('admin.nav.finance'),
      items: filterItems([
        { to: '/admin/withdraw-requests', label: t('admin.nav.withdraws'), Icon: BankIcon, visible: isSuperAdmin },
        { to: '/admin/reconciliation', label: t('admin.nav.reconciliation'), Icon: BarChartIcon, visible: isSuperAdmin },
      ]),
    },
    {
      title: t('admin.nav.system'),
      items: filterItems([
        {
          to: '/admin/notifications',
          label: t('admin.nav.notifications'),
          Icon: BellIcon,
          visible: true,
          badge: unread,
        },
        { to: '/admin/settings', label: t('admin.nav.settings'), Icon: SettingsIcon, visible: isSuperAdmin },
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
