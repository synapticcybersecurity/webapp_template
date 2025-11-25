/**
 * Authentication Hook
 * Provides auth state and operations throughout the app
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userAPI } from '@/lib/api';
import type { User } from '@webapp/shared';

export function useAuth() {
  // Get current user
  const {
    data: user,
    isLoading,
    error,
  } = useQuery<User>({
    queryKey: ['user', 'me'],
    queryFn: async () => {
      const response = await userAPI.getCurrentUser();
      return response.data.data;
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const isAuthenticated = !!user && !error;

  return {
    user: user || null,
    isLoading,
    isAuthenticated,
    error,
  };
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { name?: string; image?: string }) =>
      userAPI.updateCurrentUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', 'me'] });
    },
  });
}
