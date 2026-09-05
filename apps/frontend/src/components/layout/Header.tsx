import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { authClient } from '@/lib/auth-client';
import { userAPI } from '@/lib/api';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { User, Settings, LogOut, Shield } from 'lucide-react';
import { ActiveOrgSwitcher } from '@/components/admin/ActiveOrgSwitcher';
import { ThemeToggle } from '@/components/ThemeToggle';

export function Header() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: pendingCountData } = useQuery({
    queryKey: ['admin', 'users', 'pending', 'count'],
    queryFn: async () => {
      const response = await userAPI.getPendingCount();
      return response.data.data as { count: number };
    },
    enabled: user?.role === 'admin',
    refetchInterval: 60000,
  });

  const pendingCount = pendingCountData?.count || 0;

  const handleLogout = async () => {
    await authClient.signOut();
    navigate('/login');
    window.location.reload();
  };

  const getInitials = (name: string | null | undefined): string => {
    if (!name) return 'U';
    const parts = name
      .trim()
      .split(' ')
      .filter((p) => p.length > 0);
    if (parts.length >= 2) {
      const first = parts[0]?.[0] || '';
      const last = parts[parts.length - 1]?.[0] || '';
      if (first && last) {
        return `${first}${last}`.toUpperCase();
      }
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="app-container flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <span className="text-lg font-bold">W</span>
            </div>
            <span className="text-xl font-bold">WebApp</span>
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            <Link
              to="/dashboard"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Dashboard
            </Link>
            <Link
              to="/organizations"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Organizations
            </Link>
            <Link
              to="/pricing"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Pricing
            </Link>
            {user?.role === 'admin' && (
              <Link
                to="/admin/users"
                className="relative text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Admin
                {pendingCount > 0 && (
                  <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-warning px-1.5 text-xs font-medium text-warning-foreground">
                    {pendingCount}
                  </span>
                )}
              </Link>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {/* Renders only for platform admins; a no-op for everyone else. */}
          <ActiveOrgSwitcher />
          <ThemeToggle />
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-10 w-10">
                    <div className="flex h-full w-full items-center justify-center rounded-full bg-primary text-primary-foreground">
                      {getInitials(user.name)}
                    </div>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.name || 'User'}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/profile')}>
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/settings')}>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                {user.role === 'admin' && (
                  <DropdownMenuItem onClick={() => navigate('/admin/users')}>
                    <Shield className="mr-2 h-4 w-4" />
                    <span>Admin Panel</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}
