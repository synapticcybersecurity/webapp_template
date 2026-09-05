/**
 * Auth context.
 *
 * Wraps Better Auth's useSession and derives the things the UI actually
 * branches on. Previously `useAuth` returned only the raw user, so every
 * component that needed "is this an admin" or "are we impersonating" either
 * re-derived it or simply did not handle the case.
 *
 * One subscription to useSession lives here; consumers read from context.
 */

import { createContext, useContext, type ReactNode } from 'react';
import { authClient } from '@/lib/auth-client';

type SessionData = ReturnType<typeof authClient.useSession>['data'];
type SessionUser = NonNullable<SessionData>['user'];

interface AuthContextValue {
  session: SessionData | null;
  user: SessionUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  /** Platform administrator — not the same as an organization 'admin' role. */
  isAdmin: boolean;
  /** True when an admin is acting as this user via the admin plugin. */
  isImpersonating: boolean;
  /** Tenant the session is scoped to; null means unscoped. */
  activeOrganizationId: string | null;
  error: unknown;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session, isPending, error } = authClient.useSession();

  // These live on the session row, written by Better Auth's organization and
  // admin plugins. They are not on the base Session type, so read via cast.
  const sessionRecord = session?.session as
    { impersonatedBy?: string | null; activeOrganizationId?: string | null } | undefined;

  const value: AuthContextValue = {
    session: session ?? null,
    user: session?.user ?? null,
    isLoading: isPending,
    isAuthenticated: !!session?.user && !error,
    isAdmin: (session?.user as { role?: string } | undefined)?.role === 'admin',
    isImpersonating: !!sessionRecord?.impersonatedBy,
    activeOrganizationId: sessionRecord?.activeOrganizationId ?? null,
    error,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
