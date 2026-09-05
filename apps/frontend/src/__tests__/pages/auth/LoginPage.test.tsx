import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../helpers/test-utils';
import LoginPage from '../../../pages/auth/LoginPage';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockSignIn = vi.fn();

vi.mock('@/lib/auth-client', () => ({
  authClient: {
    signIn: {
      email: (...args: unknown[]) => mockSignIn(...args),
    },
  },
}));

const mockUseAuth = vi.fn();
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => mockUseAuth() }));

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ isAuthenticated: false });
  });

  it('should render email and password fields', () => {
    renderWithProviders(<LoginPage />);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('should render sign up and forgot password links', () => {
    renderWithProviders(<LoginPage />);

    expect(screen.getByText(/sign up/i)).toBeInTheDocument();
    expect(screen.getByText(/forgot password/i)).toBeInTheDocument();
  });

  it('should show error on failed login', async () => {
    const user = userEvent.setup();
    mockSignIn.mockResolvedValue({
      error: { message: 'Invalid credentials' },
    });

    renderWithProviders(<LoginPage />);

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'wrongpassword');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText('Invalid credentials')).toBeInTheDocument();
  });

  it('should show pending approval for banned users', async () => {
    const user = userEvent.setup();
    mockSignIn.mockResolvedValue({
      error: { code: 'USER_IS_BANNED', message: 'User is banned', status: 403 },
    });

    renderWithProviders(<LoginPage />);

    await user.type(screen.getByLabelText(/email/i), 'banned@example.com');
    await user.type(screen.getByLabelText(/password/i), 'Password1!');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText(/pending approval/i)).toBeInTheDocument();
  });
});

describe('LoginPage redirect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not navigate while unauthenticated', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false });
    renderWithProviders(<LoginPage />);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('navigates to the dashboard once the session store reports authenticated', () => {
    // The regression this guards: navigating immediately after signIn.email
    // resolved raced Better Auth's asynchronous session-store update, so
    // ProtectedRoute read a stale "not authenticated" and bounced the user
    // straight back to /login. A successful login looked like nothing
    // happened. The redirect must be driven by the store, not the call.
    mockUseAuth.mockReturnValue({ isAuthenticated: true });
    renderWithProviders(<LoginPage />);
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
  });

  it('honours a relative ?redirect= target', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true });
    renderWithProviders(<LoginPage />, {
      routerProps: { initialEntries: ['/login?redirect=%2Forganizations'] },
    });
    expect(mockNavigate).toHaveBeenCalledWith('/organizations', { replace: true });
  });

  it.each([
    ['https://evil.example.com', 'absolute URL'],
    ['//evil.example.com', 'protocol-relative URL'],
  ])('ignores %s (%s) and falls back to the dashboard', (target) => {
    // Following an attacker-supplied absolute target here would make the login
    // page an open redirect.
    mockUseAuth.mockReturnValue({ isAuthenticated: true });
    renderWithProviders(<LoginPage />, {
      routerProps: { initialEntries: [`/login?redirect=${encodeURIComponent(target)}`] },
    });
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
  });
});
