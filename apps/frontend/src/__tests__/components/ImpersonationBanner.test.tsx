import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders, userEvent } from '../helpers/test-utils';
import { ImpersonationBanner } from '@/components/layout/ImpersonationBanner';

const mockUseAuth = vi.fn();
const mockStopImpersonating = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => mockUseAuth() }));
vi.mock('@/lib/auth-client', () => ({
  authClient: { admin: { stopImpersonating: () => mockStopImpersonating() } },
}));

beforeEach(() => {
  vi.clearAllMocks();
  // jsdom refuses real navigation; replace the whole location object.
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { assign: vi.fn(), pathname: '/dashboard', search: '' },
  });
});

describe('ImpersonationBanner', () => {
  it('renders nothing for an ordinary session', () => {
    mockUseAuth.mockReturnValue({ isImpersonating: false, user: null });
    const { container } = renderWithProviders(<ImpersonationBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it('names the impersonated user while impersonating', () => {
    // An admin who forgets they are impersonating will attribute destructive
    // actions to someone else, so the banner must be unmissable and specific.
    mockUseAuth.mockReturnValue({
      isImpersonating: true,
      user: { name: 'Jane Smith', email: 'jane@example.com' },
    });
    renderWithProviders(<ImpersonationBanner />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText(/jane@example.com/)).toBeInTheDocument();
  });

  it('falls back to the email when the user has no name', () => {
    mockUseAuth.mockReturnValue({
      isImpersonating: true,
      user: { name: null, email: 'jane@example.com' },
    });
    renderWithProviders(<ImpersonationBanner />);

    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
  });

  it('stops impersonating and reloads to the admin area', async () => {
    mockUseAuth.mockReturnValue({
      isImpersonating: true,
      user: { name: 'Jane', email: 'jane@example.com' },
    });
    mockStopImpersonating.mockResolvedValue({});
    renderWithProviders(<ImpersonationBanner />);

    await userEvent.click(screen.getByRole('button', { name: /stop impersonating/i }));

    expect(mockStopImpersonating).toHaveBeenCalled();
    // Full navigation, not a router push: the session identity changed and
    // every cached query still holds the impersonated user's data.
    expect(window.location.assign).toHaveBeenCalledWith('/admin/users');
  });

  it('re-enables the button if stopping fails', async () => {
    mockUseAuth.mockReturnValue({
      isImpersonating: true,
      user: { name: 'Jane', email: 'jane@example.com' },
    });
    mockStopImpersonating.mockRejectedValue(new Error('nope'));
    renderWithProviders(<ImpersonationBanner />);

    const button = screen.getByRole('button', { name: /stop impersonating/i });
    await userEvent.click(button);

    // Leaving it disabled would strand the admin inside the impersonated session.
    expect(await screen.findByRole('button', { name: /stop impersonating/i })).toBeEnabled();
  });
});
