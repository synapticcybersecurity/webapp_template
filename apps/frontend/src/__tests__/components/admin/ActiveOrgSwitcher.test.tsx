import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders, userEvent } from '../../helpers/test-utils';
import { ActiveOrgSwitcher } from '@/components/admin/ActiveOrgSwitcher';

const mockUseAuth = vi.fn();
const mockListOrganizations = vi.fn();
const mockSetActiveOrganization = vi.fn();
const mockClearActiveOrganization = vi.fn();
const mockGetSession = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => mockUseAuth() }));
vi.mock('@/lib/api', () => ({
  adminAPI: {
    listOrganizations: (s?: string) => mockListOrganizations(s),
    setActiveOrganization: (id: string) => mockSetActiveOrganization(id),
    clearActiveOrganization: () => mockClearActiveOrganization(),
  },
}));
vi.mock('@/lib/auth-client', () => ({
  authClient: { getSession: (args: unknown) => mockGetSession(args) },
}));

const ORGS = [
  { id: 'org-a', name: 'Acme Corporation', slug: 'acme' },
  { id: 'org-b', name: 'Globex', slug: 'globex' },
];

beforeEach(() => {
  vi.clearAllMocks();
  mockListOrganizations.mockResolvedValue({ data: { data: { organizations: ORGS } } });
  mockGetSession.mockResolvedValue({});
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { reload: vi.fn(), assign: vi.fn(), pathname: '/dashboard', search: '' },
  });
});

describe('ActiveOrgSwitcher', () => {
  it('renders nothing for a non-admin', () => {
    // Cross-tenant scoping is a platform-admin capability; the control must
    // not exist at all for ordinary users.
    mockUseAuth.mockReturnValue({ isAdmin: false, activeOrganizationId: null });
    const { container } = renderWithProviders(<ActiveOrgSwitcher />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows "All tenants" when unscoped', () => {
    mockUseAuth.mockReturnValue({ isAdmin: true, activeOrganizationId: null });
    renderWithProviders(<ActiveOrgSwitcher />);
    expect(screen.getByRole('button', { name: /All tenants/ })).toBeInTheDocument();
  });

  it('does not query organizations until the menu is opened', () => {
    mockUseAuth.mockReturnValue({ isAdmin: true, activeOrganizationId: null });
    renderWithProviders(<ActiveOrgSwitcher />);
    expect(mockListOrganizations).not.toHaveBeenCalled();
  });

  it('lists organizations once opened', async () => {
    mockUseAuth.mockReturnValue({ isAdmin: true, activeOrganizationId: null });
    renderWithProviders(<ActiveOrgSwitcher />);

    await userEvent.click(screen.getByRole('button', { name: /Scope:/ }));

    expect(await screen.findByText('Acme Corporation')).toBeInTheDocument();
    expect(screen.getByText('Globex')).toBeInTheDocument();
  });

  it('scopes to the chosen organization and reloads', async () => {
    mockUseAuth.mockReturnValue({ isAdmin: true, activeOrganizationId: null });
    mockSetActiveOrganization.mockResolvedValue({});
    renderWithProviders(<ActiveOrgSwitcher />);

    await userEvent.click(screen.getByRole('button', { name: /Scope:/ }));
    await userEvent.click(await screen.findByText('Acme Corporation'));

    await waitFor(() => expect(mockSetActiveOrganization).toHaveBeenCalledWith('org-a'));
    // The session must be re-read past the cookie cache, or the UI keeps
    // showing the previous scope.
    expect(mockGetSession).toHaveBeenCalledWith({ query: { disableCookieCache: true } });
    await waitFor(() => expect(window.location.reload).toHaveBeenCalled());
  });

  it('clears the scope via "All tenants"', async () => {
    mockUseAuth.mockReturnValue({ isAdmin: true, activeOrganizationId: 'org-a' });
    mockClearActiveOrganization.mockResolvedValue({});
    renderWithProviders(<ActiveOrgSwitcher />);

    await userEvent.click(screen.getByRole('button', { name: /Scope:/ }));
    await userEvent.click(await screen.findByText('All tenants'));

    await waitFor(() => expect(mockClearActiveOrganization).toHaveBeenCalled());
  });

  it('reports when a search matches nothing', async () => {
    mockUseAuth.mockReturnValue({ isAdmin: true, activeOrganizationId: null });
    mockListOrganizations.mockResolvedValue({ data: { data: { organizations: [] } } });
    renderWithProviders(<ActiveOrgSwitcher />);

    await userEvent.click(screen.getByRole('button', { name: /Scope:/ }));

    expect(await screen.findByText(/No matching organizations/)).toBeInTheDocument();
  });
});
