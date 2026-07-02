import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../stores/authStore'
import { fetchUnreadCount } from '../api/notifications'
import {
  DashboardIcon,
  PackageIcon,
  UsersIcon,
  BellIcon,
  UserIcon,
  BankIcon,
  CodeIcon,
  LogOutIcon,
} from './ui/icons'
import type { QuickNavItem } from './ui/QuickNav'

/**
 * Source de vérité unique de la navigation marchand/particulier.
 *
 * Reflète les liens visibles dans AppHeader. Tout changement de menu se
 * répercute automatiquement sur le FAB radial (ClientQuickNav).
 */
export function useClientNav(): { items: QuickNavItem[] } {
  const { t } = useTranslation()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

  const { data: unread = 0 } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: fetchUnreadCount,
    refetchInterval: 30_000,
    enabled: !!user,
  })

  const items: QuickNavItem[] = [
    { to: '/dashboard', label: t('nav.dashboard'), Icon: DashboardIcon },
    { to: '/courses', label: t('nav.myCourses'), Icon: PackageIcon },
    { to: '/addresses', label: t('nav.addressBook'), Icon: UsersIcon },
    { to: '/wallet', label: t('nav.wallet'), Icon: BankIcon },
    { to: '/dev', label: t('nav.devMode'), Icon: CodeIcon },
    { to: '/notifications', label: t('nav.notifications'), Icon: BellIcon, badge: unread },
    { to: '/profile', label: t('nav.profile'), Icon: UserIcon },
    {
      to: '#logout',
      label: t('nav.logout'),
      Icon: LogOutIcon,
      tone: 'danger',
      onClick: () => { void logout() },
    },
  ]

  return { items }
}
