import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import ProtectedRoute from './components/ProtectedRoute'
import NewCoursePage from './pages/NewCoursePage'
import CourseDetailPage from './pages/CourseDetailPage'
import AddressesPage from './pages/AddressesPage'
import AdminDashboardPage from './pages/admin/AdminDashboardPage'
import AdminCoursesPage from './pages/admin/AdminCoursesPage'
import AdminMarchantsPage from './pages/admin/AdminMarchantsPage'
import AdminIndividualsPage from './pages/admin/AdminIndividualsPage'
import AdminIndividualDetailPage from './pages/admin/AdminIndividualDetailPage'
import TrackingPage from './pages/TrackingPage'
import NotificationsPage from './pages/NotificationsPage'
import ProfilePage from './pages/ProfilePage'
import MarchantDetailPage from './pages/admin/MarchantDetailPage'
import RegisterPage from './pages/RegisterPage'
import DriverRegisterPage from './pages/DriverRegisterPage'
import DriverRegisterSuccessPage from './pages/DriverRegisterSuccessPage'
import AdminDriversPage from './pages/admin/AdminDriversPage'
import AdminDriverDetailPage from './pages/admin/AdminDriverDetailPage'
import AdminIncidentsPage from './pages/admin/AdminIncidentsPage'
import AdminNotificationsPage from './pages/admin/AdminNotificationsPage'
import BillingPage from './pages/BillingPage'
import BillingReturnPage from './pages/BillingReturnPage'
import AdminSettingsPage from './pages/admin/AdminSettingsPage'
import AdminPayoutsPage from './pages/admin/AdminPayoutsPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/register/driver" element={<DriverRegisterPage />} />
          <Route path="/register/driver/success" element={<DriverRegisterSuccessPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/t/:token" element={<TrackingPage />} />  {/* PUBLIQUE POUR LE TRACKING */}
          <Route path="/billing/return" element={<BillingReturnPage />} />  {/* PUBLIQUE : retour Fedapay, le webhook fait foi */}

          {/* Routes protégées */}
          <Route element={<ProtectedRoute allowedTypes={['marchant', 'individual']} />}>
            {/* marchant */}
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/courses/new" element={<NewCoursePage />} />
            <Route path="/addresses" element={<AddressesPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/billing" element={<BillingPage />} />
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

          {/* admin — paramètres réservés au super-admin */}
          <Route element={<ProtectedRoute allowedTypes={['admin']} allowedAdminRoles={['super']} />}>
            <Route path="/admin/settings" element={<AdminSettingsPage />} />
          </Route>

          {/* admin — gestion des marchands réservée au rôle commercial (super inclus) */}
          <Route element={<ProtectedRoute allowedTypes={['admin']} allowedAdminRoles={['commercial']} />}>
            <Route path="/admin/marchants" element={<AdminMarchantsPage />} />
            <Route path="/admin/marchants/:id" element={<MarchantDetailPage />} />
            <Route path="/admin/individuals" element={<AdminIndividualsPage />} />
            <Route path="/admin/individuals/:id" element={<AdminIndividualDetailPage />} />
          </Route>

          {/* admin — gestion des courses réservée au rôle ops (super inclus) */}
          <Route element={<ProtectedRoute allowedTypes={['admin']} allowedAdminRoles={['ops']} />}>
            <Route path="/admin/courses" element={<AdminCoursesPage />} />
            <Route path="/admin/drivers" element={<AdminDriversPage />} />
            <Route path="/admin/drivers/:id" element={<AdminDriverDetailPage />} />
            <Route path="/admin/incidents" element={<AdminIncidentsPage />} />
            <Route path="/admin/payouts" element={<AdminPayoutsPage />} />
          </Route>


          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
