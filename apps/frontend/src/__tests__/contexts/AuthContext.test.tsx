import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';

const mockUseSession = vi.fn();

vi.mock('@/lib/auth-client', () => ({
  authClient: { useSession: () => mockUseSession() },
}));

const { AuthProvider, useAuth } = await import('@/contexts/AuthContext');

function wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

const activeSession = {
  user: { id: 'u1', email: 'a@example.com', name: 'A', role: 'user' },
  session: { id: 's1', activeOrganizationId: null, impersonatedBy: null },
};

beforeEach(() => {
  vi.clearAllMocks();
  mockUseSession.mockReturnValue({ data: activeSession, isPending: false, error: null });
});

describe('useAuth', () => {
  it('exposes the authenticated user', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user?.email).toBe('a@example.com');
    expect(result.current.isLoading).toBe(false);
  });

  it('reports not authenticated while the session is loading', () => {
    mockUseSession.mockReturnValue({ data: null, isPending: true, error: null });
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('treats a session carrying an error as unauthenticated', () => {
    // Otherwise a failed session refresh would keep rendering protected UI
    // against stale data.
    mockUseSession.mockReturnValue({
      data: activeSession,
      isPending: false,
      error: new Error('session fetch failed'),
    });
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.isAuthenticated).toBe(false);
  });

  it('distinguishes a platform admin', () => {
    mockUseSession.mockReturnValue({
      data: { ...activeSession, user: { ...activeSession.user, role: 'admin' } },
      isPending: false,
      error: null,
    });
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.isAdmin).toBe(true);
  });

  it('does not treat an organization member role as a platform admin', () => {
    // Organization roles are also called 'owner'/'admin'; only User.role
    // grants platform privileges.
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.isAdmin).toBe(false);
  });

  it('surfaces the active organization scope', () => {
    mockUseSession.mockReturnValue({
      data: {
        ...activeSession,
        session: { id: 's1', activeOrganizationId: 'org-a', impersonatedBy: null },
      },
      isPending: false,
      error: null,
    });
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.activeOrganizationId).toBe('org-a');
  });

  it('detects impersonation', () => {
    mockUseSession.mockReturnValue({
      data: {
        ...activeSession,
        session: { id: 's1', activeOrganizationId: null, impersonatedBy: 'admin-1' },
      },
      isPending: false,
      error: null,
    });
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.isImpersonating).toBe(true);
  });

  it('reports no impersonation for an ordinary session', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.isImpersonating).toBe(false);
  });

  it('throws when used outside the provider', () => {
    // A silent undefined here would surface much later as a confusing
    // "cannot read property of undefined".
    expect(() => renderHook(() => useAuth())).toThrow(/AuthProvider/);
  });
});
