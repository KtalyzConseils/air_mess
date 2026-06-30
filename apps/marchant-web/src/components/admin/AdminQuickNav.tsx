import QuickNav from '../ui/QuickNav'
import { useAdminNav } from './adminNav'

/**
 * AdminQuickNav — wrapper qui injecte la nav admin dans le composant générique
 * QuickNav. Les items sont filtrés par rôle dans `useAdminNav`.
 */
export default function AdminQuickNav() {
  const { flat } = useAdminNav()
  return <QuickNav items={flat} positionKey="admin.quicknav.position" />
}
