import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { hasAdminRole, type AdminSubRole } from '../lib/permissions'

interface Props {
  allowedTypes?: ('marchant' | 'individual' | 'driver' | 'admin')[]
  /** Restreint l'accès à certains sous-rôles admin (super passe toujours). */
  allowedAdminRoles?: AdminSubRole[]
}

export default function ProtectedRoute({ allowedTypes, allowedAdminRoles }: Props) {
  const { user, isAuthenticated } = useAuthStore()

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />
  }

  if (allowedTypes && !allowedTypes.includes(user.type)) {
    return <Navigate to="/unauthorized" replace />
  }

  // Garde par sous-rôle : on renvoie vers le tableau de bord admin (accessible à tous les admins)
  if (allowedAdminRoles && !hasAdminRole(user, ...allowedAdminRoles)) {
    return <Navigate to="/admin/dashboard" replace />
  }

  return <Outlet />
}
