import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../helpers/test-utils';
import { ProtectedRoute } from '../../components/auth/ProtectedRoute';
import { Routes, Route } from 'react-router-dom';

const mockUseAuth = vi.fn();

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

function renderProtectedRoute(
  options: {
    requireAdmin?: boolean;
    initialEntry?: string;
  } = {},
) {
  const { requireAdmin = false, initialEntry = '/protected' } = options;
  return renderWithProviders(
    <Routes>
      <Route path="/login" element={<div>Login Page</div>} />
      <Route path="/dashboard" element={<div>Dashboard</div>} />
      <Route element={<ProtectedRoute requireAdmin={requireAdmin} />}>
        <Route path="/protected" element={<div>Protected Content</div>} />
      </Route>
    </Routes>,
    { routerProps: { initialEntries: [initialEntry] } },
  );
}

describe('ProtectedRoute', () => {
  it('should show loading spinner while checking auth', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: true,
      isAuthenticated: false,
    });

    renderProtectedRoute();

    expect(document.querySelector('.animate-spin')).toBeTruthy();
  });

  it('should redirect to login when not authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      isAuthenticated: false,
    });

    renderProtectedRoute();

    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('should render children when authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: { id: '1', role: 'user' },
      isLoading: false,
      isAuthenticated: true,
    });

    renderProtectedRoute();

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('should redirect non-admin to dashboard on admin route', () => {
    mockUseAuth.mockReturnValue({
      user: { id: '1', role: 'user' },
      isLoading: false,
      isAuthenticated: true,
    });

    renderProtectedRoute({ requireAdmin: true });

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });
});
