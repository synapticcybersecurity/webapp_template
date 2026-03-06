/**
 * Better Auth Client
 * Centralized auth client with admin and organization plugins
 */

import { createAuthClient } from 'better-auth/react';
import { adminClient } from 'better-auth/client/plugins';
import { organizationClient } from 'better-auth/client/plugins';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const client = createAuthClient({
  baseURL: API_URL,
  plugins: [adminClient(), organizationClient()],
});

// Re-export as explicit type to avoid TS4118 serialization errors
export const authClient: typeof client = client;
