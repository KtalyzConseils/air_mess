import QuickNav from './ui/QuickNav'
import { useClientNav } from './clientNav'
import { useAuthStore } from '../stores/authStore'
import { useUiPrefsStore } from '../stores/uiPrefsStore'

/**
 * ClientQuickNav — monté globalement dans App.tsx.
 * Ne s'affiche QUE si :
 *  - l'utilisateur est authentifié et n'est pas admin
 *  - la préférence clientNavMode est 'fab'
 *
 * (Ce gating ici évite d'avoir à toucher à App.tsx à chaque changement de
 * condition d'affichage.)
 */
export default function ClientQuickNav() {
  const user = useAuthStore((s) => s.user)
  const mode = useUiPrefsStore((s) => s.clientNavMode)
  const { items } = useClientNav()

  if (!user) return null
  if (user.type === 'admin') return null
  if (mode !== 'fab') return null

  return <QuickNav items={items} positionKey="client.quicknav.position" />
}
