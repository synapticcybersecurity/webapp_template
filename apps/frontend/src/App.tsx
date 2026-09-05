import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { Layout } from './components/layout/Layout';

// Pages
import LoginPage from './pages/auth/LoginPage';
import SignupPage from './pages/auth/SignupPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import VerifyEmailPage from './pages/auth/VerifyEmailPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import ProfilePage from './pages/dashboard/ProfilePage';
import OrganizationListPage from './pages/organization/OrganizationListPage';
import OrganizationDetailsPage from './pages/organization/OrganizationDetailsPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import PricingPage from './pages/billing/PricingPage';
import BillingPage from './pages/billing/BillingPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

/**
 * Toasts have to follow the app theme explicitly — sonner reads a prop, not the
 * `dark` class — so this sits inside ThemeProvider rather than beside it.
 */
function ThemedToaster() {
  const { resolved } = useTheme();
  return <Toaster position="top-right" richColors closeButton theme={resolved} />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrowserRouter>
          <AuthProvider>
            <ThemedToaster />
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/verify-email" element={<VerifyEmailPage />} />

              {/* Pricing is public but still deserves the app chrome, so it
                  gets the shell without the auth guard. */}
              <Route element={<Layout />}>
                <Route path="/pricing" element={<PricingPage />} />
              </Route>

              {/* Protected routes — the shell mounts once and pages render
                into its <Outlet/>, so the header survives navigation. */}
              <Route element={<ProtectedRoute />}>
                <Route element={<Layout />}>
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="/organizations" element={<OrganizationListPage />} />
                  <Route path="/organizations/:id" element={<OrganizationDetailsPage />} />
                  <Route path="/organizations/:orgId/billing" element={<BillingPage />} />
                </Route>
              </Route>

              {/* Admin routes */}
              <Route element={<ProtectedRoute requireAdmin />}>
                <Route element={<Layout />}>
                  <Route path="/admin/users" element={<AdminUsersPage />} />
                </Route>
              </Route>

              {/* Default redirect */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
