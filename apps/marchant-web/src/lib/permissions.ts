import type { User } from '../types/auth'

export type AdminSubRole = 'super' | 'ops' | 'commercial' | 'support'

/**
 * Reflète la logique du middleware backend `EnsureUserIsAdmin` :
 * - faux si l'utilisateur n'est pas un admin ;
 * - le rôle `super` passe toujours ;
 * - sinon, le sous-rôle doit figurer dans la liste exigée.
 *
 * Sans rôle exigé, renvoie vrai pour n'importe quel admin.
 */
export function hasAdminRole(user: User | null, ...roles: AdminSubRole[]): boolean {
  if (!user || user.type !== 'admin' || !user.admin) {
    return false
  }

  if (user.admin.sub_role === 'super') {
    return true
  }

  if (roles.length === 0) {
    return true
  }

  return roles.includes(user.admin.sub_role)
}
