import { useQuery } from '@tanstack/react-query'
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
} from './ui/icons'
import type { QuickNavItem } from './ui/QuickNav'

/**
 * Source de vérité unique de la navigation marchand/particulier.
 *
 * Reflète les liens visibles dans AppHeader. Tout changement de menu se
 * répercute automatiquement sur le FAB radial (ClientQuickNav).
 */
export function useClientNav(): { items: QuickNavItem[] } {
  const user = useAuthStore((s) => s.user)

  const { data: unread = 0 } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: fetchUnreadCount,
    refetchInterval: 30_000,
    enabled: !!user,
  })

  const items: QuickNavItem[] = [
    { to: '/dashboard', label: 'Tableau de bord', Icon: DashboardIcon },
    { to: '/courses', label: 'Mes courses', Icon: PackageIcon },
    { to: '/addresses', label: "Carnet d'adresses", Icon: UsersIcon },
    { to: '/wallet', label: 'Wallet', Icon: BankIcon },
    { to: '/dev', label: 'Mode dev', Icon: CodeIcon },
    { to: '/notifications', label: 'Notifications', Icon: BellIcon, badge: unread },
    { to: '/profile', label: 'Mon profil', Icon: UserIcon },
  ]

  return { items }
}
