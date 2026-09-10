import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import ProtectedRoute from './components/ProtectedRoute'
import NewCoursePage from './pages/NewCoursePage'
import MyCoursesPage from './pages/MyCoursesPage'
import CourseDetailPage from './pages/CourseDetailPage'
import AddressesPage from './pages/AddressesPage'
import AdminDashboardPage from './pages/admin/AdminDashboardPage'
import AdminCoursesPage from './pages/admin/AdminCoursesPage'
import AdminUnassignedCoursesPage from './pages/admin/AdminUnassignedCoursesPage'
import AdminArchivedCoursesPage from './pages/admin/AdminArchivedCoursesPage'
import AdminMarchantsPage from './pages/admin/AdminMarchantsPage'
import AdminIndividualsPage from './pages/admin/AdminIndividualsPage'
import AdminWaitlistPage from './pages/admin/AdminWaitlistPage'
import AdminIndividualDetailPage from './pages/admin/AdminIndividualDetailPage'
import TrackingPage from './pages/TrackingPage'
import NotificationsPage from './pages/NotificationsPage'
import ProfilePage from './pages/ProfilePage'
import MarchantDetailPage from './pages/admin/MarchantDetailPage'
import RegisterPage from './pages/RegisterPage'
import RegisterSuccessPage from './pages/RegisterSuccessPage'
import DriverRegisterPage from './pages/DriverRegisterPage'
import DriverRegisterSuccessPage from './pages/DriverRegisterSuccessPage'
import MarchantFromDriverPage from './pages/MarchantFromDriverPage'
import AdminDriversPage from './pages/admin/AdminDriversPage'
import AdminDriverDetailPage from './pages/admin/AdminDriverDetailPage'
import AdminIncidentsPage from './pages/admin/AdminIncidentsPage'
import AdminApiApplicationsPage from './pages/admin/AdminApiApplicationsPage'
import AdminNotificationsPage from './pages/admin/AdminNotificationsPage'
import BillingReturnPage from './pages/BillingReturnPage'
import MyWalletPage from './pages/MyWalletPage'
import DevPage from './pages/DevPage'
import AdminSettingsPage from './pages/admin/AdminSettingsPage'
import AdminUsersPage from './pages/admin/AdminUsersPage'
import AdminWithdrawRequestsPage from './pages/admin/AdminWithdrawRequestsPage'
import AdminWithdrawRequestDetailPage from './pages/admin/AdminWithdrawRequestDetailPage'
import AdminWalletReportingPage from './pages/admin/AdminWalletReportingPage'
import AdminReconciliationPage from './pages/admin/AdminReconciliationPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import TermsPage from './pages/legal/TermsPage'
import PrivacyPage from './pages/legal/PrivacyPage'
import ClientQuickNav from './components/ClientQuickNav'
import PwaReloadPrompt from './components/PwaReloadPrompt'
import api from './api/client'
import { useAuthStore } from './stores/authStore'


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

function AuthProfileRefresher() {
  const userId = useAuthStore((state) => state.user?.id)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const setUser = useAuthStore((state) => state.setUser)

  useEffect(() => {
    if (!isAuthenticated || !userId) return

    let stopped = false
    const refresh = async () => {
      try {
        const { data } = await api.get('/auth/me')
        if (!stopped && data.user) setUser(data.user)
      } catch {
        // Une panne réseau temporaire ne doit pas déconnecter l'utilisateur.
      }
    }

    void refresh()
    const interval = window.setInterval(refresh, 15_000)
    const onFocus = () => void refresh()
    window.addEventListener('focus', onFocus)

    return () => {
      stopped = true
      window.clearInterval(interval)
      window.removeEventListener('focus', onFocus)
    }
  }, [isAuthenticated, userId, setUser])

  return null
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProfileRefresher />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/register/success" element={<RegisterSuccessPage />} />
          <Route path="/register/driver" element={<DriverRegisterPage />} />
          <Route path="/register/driver/success" element={<DriverRegisterSuccessPage />} />
          {/* Ajout d'un profil marchand à un compte existant. Ouverte via deep-link
              depuis la driver-app (token Sanctum passé en fragment URL). La page
              se protège elle-même — pas de ProtectedRoute car le user est un driver. */}
          <Route path="/register/marchant/from-driver" element={<MarchantFromDriverPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/legal/terms" element={<TermsPage />} />
          <Route path="/legal/privacy" element={<PrivacyPage />} />
          <Route path="/t/:token" element={<TrackingPage />} />  {/* PUBLIQUE POUR LE TRACKING */}
          <Route path="/billing/return" element={<BillingReturnPage />} />  {/* PUBLIQUE : retour Fedapay, le webhook fait foi */}

          {/* Routes protégées */}
          <Route element={<ProtectedRoute allowedTypes={['marchant', 'individual']} allowPendingMarchant />}>
            <Route path="/dashboard" element={<DashboardPage />} />
          </Route>
          <Route element={<ProtectedRoute allowedTypes={['marchant', 'individual']} />}>
            <Route path="/courses" element={<MyCoursesPage />} />
            <Route path="/courses/new" element={<NewCoursePage />} />
            <Route path="/addresses" element={<AddressesPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/wallet" element={<MyWalletPage />} />
            <Route path="/dev" element={<DevPage />} />
          </Route>

          {/* Détail d'une course : le marchand/particulier (la sienne) ET l'admin (supervision).
              Le backend filtre déjà l'accès (propriétaire ou admin). */}
          <Route element={<ProtectedRoute allowedTypes={['marchant', 'individual', 'admin']} />}>
            <Route path="/courses/:id" element={<CourseDetailPage />} />
          </Route>

          {/* admin — accessible à tout admin authentifié */}
          <Route element={<ProtectedRoute allowedTypes={['admin']} />}>
            <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
            <Route path="/admin/notifications" element={<AdminNotificationsPage />} />
          </Route>

          {/* admin — paramètres + retraits caution réservés au super-admin */}
          <Route element={<ProtectedRoute allowedTypes={['admin']} allowedAdminRoles={['super']} />}>
            <Route path="/admin/settings" element={<AdminSettingsPage />} />
            <Route path="/admin/admins" element={<AdminUsersPage />} />
            <Route path="/admin/withdraw-requests" element={<AdminWithdrawRequestsPage />} />
            <Route path="/admin/withdraw-requests/:id" element={<AdminWithdrawRequestDetailPage />} />
            <Route path="/admin/reporting/wallets" element={<AdminWalletReportingPage />} />
            <Route path="/admin/reconciliation" element={<AdminReconciliationPage />} />
          </Route>

          {/* admin — fiches marchands/particuliers : lecture partagée (commercial+ops+support),
              actions sensibles gatées à l'intérieur des pages via canManage* */}
          <Route element={<ProtectedRoute allowedTypes={['admin']} allowedAdminRoles={['commercial', 'ops', 'support']} />}>
            <Route path="/admin/marchants" element={<AdminMarchantsPage />} />
            <Route path="/admin/marchants/:id" element={<MarchantDetailPage />} />
            <Route path="/admin/individuals" element={<AdminIndividualsPage />} />
            <Route path="/admin/waitlist" element={<AdminWaitlistPage />} />
            <Route path="/admin/individuals/:id" element={<AdminIndividualDetailPage />} />
          </Route>

          {/* admin — fiches courses/livreurs/incidents : lecture partagée idem */}
          <Route element={<ProtectedRoute allowedTypes={['admin']} allowedAdminRoles={['commercial', 'ops', 'support']} />}>
            <Route path="/admin/courses" element={<AdminCoursesPage />} />
            <Route path="/admin/drivers" element={<AdminDriversPage />} />
            <Route path="/admin/drivers/:id" element={<AdminDriverDetailPage />} />
            <Route path="/admin/incidents" element={<AdminIncidentsPage />} />
            <Route path="/admin/api-apps" element={<AdminApiApplicationsPage />} />
          </Route>

          {/* File sans livreur : visible uniquement par super, ops et support. */}
          <Route element={<ProtectedRoute allowedTypes={['admin']} allowedAdminRoles={['ops', 'support']} />}>
            <Route path="/admin/courses-unassigned" element={<AdminUnassignedCoursesPage />} />
            <Route path="/admin/courses-archived" element={<AdminArchivedCoursesPage />} />
          </Route>


          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>

        {/* FAB global pour marchand/particulier — se rend null si user=admin
            ou si la préférence est 'horizontal' (cf. ClientQuickNav). */}
        <ClientQuickNav />

        {/* PWA : toast "nouvelle version disponible → Recharger" */}
        <PwaReloadPrompt />
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
