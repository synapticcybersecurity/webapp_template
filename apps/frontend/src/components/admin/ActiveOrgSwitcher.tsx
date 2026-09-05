/**
 * Tenant scope switcher, admin-only.
 *
 * Scoping writes Session.activeOrganizationId, which the backend's
 * access-control layer then treats as the only organization this admin can
 * see. "All tenants" clears it and restores the platform-wide view.
 *
 * The control is styled to stand out while scoped, because an admin who
 * forgets they are looking at one tenant will misread every number on screen.
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check, ChevronDown } from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { adminAPI } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface OrgRow {
  id: string;
  name: string;
  slug: string;
}

export function ActiveOrgSwitcher() {
  const { isAdmin, activeOrganizationId } = useAuth();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);

  const { data: organizations = [] } = useQuery({
    queryKey: ['admin', 'organizations', search],
    queryFn: async () => {
      const response = await adminAPI.listOrganizations(search || undefined);
      return (response.data.data?.organizations ?? []) as OrgRow[];
    },
    // Only hit the endpoint while the menu is actually open.
    enabled: isAdmin && open,
  });

  if (!isAdmin) return null;

  const active = organizations.find((o) => o.id === activeOrganizationId);
  const label = activeOrganizationId ? (active?.name ?? 'Scoped to tenant…') : 'All tenants';

  const applyScope = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
      // Re-read the session past the cookie cache, then reload: the scope
      // change invalidates every tenant-scoped query already in flight or
      // cached, and reconciling them individually is not worth the complexity.
      await authClient.getSession({ query: { disableCookieCache: true } });
      window.location.reload();
    } finally {
      setBusy(false);
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'gap-1.5 text-xs',
            activeOrganizationId && 'border-destructive/40 bg-destructive/10 text-destructive',
          )}
          title={
            activeOrganizationId
              ? 'Scoped to a single tenant — click to change'
              : 'Viewing all tenants'
          }
        >
          Scope: {label}
          <ChevronDown className="h-3 w-3 opacity-70" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 p-0">
        <div className="border-b border-border p-2">
          <Input
            autoFocus
            type="text"
            placeholder="Search organizations…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <ul className="max-h-72 overflow-y-auto py-1 text-sm">
          <li>
            <button
              type="button"
              disabled={busy || !activeOrganizationId}
              onClick={() => applyScope(() => adminAPI.clearActiveOrganization())}
              className="flex w-full items-center justify-between px-3 py-1.5 text-left transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
            >
              <span className="font-medium">All tenants</span>
              {!activeOrganizationId && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
            </button>
          </li>
          {organizations.length === 0 ? (
            <li className="px-3 py-2 text-xs text-muted-foreground">No matching organizations.</li>
          ) : (
            organizations.map((org) => (
              <li key={org.id}>
                <button
                  type="button"
                  disabled={busy || org.id === activeOrganizationId}
                  onClick={() => applyScope(() => adminAPI.setActiveOrganization(org.id))}
                  className="flex w-full items-center justify-between px-3 py-1.5 text-left transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
                >
                  <span className="truncate">{org.name}</span>
                  {org.id === activeOrganizationId && (
                    <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  )}
                </button>
              </li>
            ))
          )}
        </ul>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
