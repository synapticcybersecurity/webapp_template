/**
 * Authentication Hook
 * Provides auth state and operations throughout the app using better-auth client
 */

import { authClient } from '@/lib/auth-client';

export function useAuth() {
  const { data: session, isPending, error } = authClient.useSession();

  return {
    user: session?.user ?? null,
    isLoading: isPending,
    isAuthenticated: !!session?.user,
    error,
  };
}
