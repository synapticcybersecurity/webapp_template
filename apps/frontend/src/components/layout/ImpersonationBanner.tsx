/**
 * Persistent warning shown while an admin is impersonating another user.
 *
 * Deliberately loud and always at the top of the viewport: an admin who forgets
 * they are impersonating will take destructive actions attributed to someone
 * else, and the audit trail will faithfully record the wrong story.
 */

import { useState } from 'react';
import { EyeOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { authClient } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';

export function ImpersonationBanner() {
  const { isImpersonating, user } = useAuth();
  const [stopping, setStopping] = useState(false);

  if (!isImpersonating) return null;

  const handleStop = async () => {
    setStopping(true);
    try {
      await authClient.admin.stopImpersonating();
      // Full reload rather than a router navigation: the session identity has
      // changed underneath every cached query, and React Query's cache would
      // otherwise still hold the impersonated user's data.
      window.location.assign('/admin/users');
    } catch {
      setStopping(false);
    }
  };

  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-center gap-3 bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground"
    >
      <EyeOff className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span>
        You are impersonating <strong>{user?.name || user?.email}</strong>
        {user?.name ? ` (${user.email})` : null}
      </span>
      <Button
        size="sm"
        variant="secondary"
        className="h-6 px-2 text-xs"
        onClick={handleStop}
        disabled={stopping}
      >
        {stopping ? 'Stopping…' : 'Stop impersonating'}
      </Button>
    </div>
  );
}
