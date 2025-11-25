import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { api } from '@/lib/api';
import {
  Users,
  Search,
  Shield,
  Ban,
  CheckCircle,
  Loader2,
  AlertCircle,
  Mail,
  Calendar,
} from 'lucide-react';

interface User {
  id: string;
  email: string;
  emailVerified: boolean;
  name: string | null;
  role: string;
  banned: boolean;
  banReason: string | null;
  banExpires: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function AdminUsersPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [actionDialog, setActionDialog] = useState<'ban' | 'unban' | 'role' | null>(null);
  const queryClient = useQueryClient();

  const { data: users, isLoading, error } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: async () => {
      const response = await api.get('/api/users');
      return response.data.data as User[];
    },
  });

  const banUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      await api.post(`/api/users/${userId}/ban`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      setActionDialog(null);
      setSelectedUser(null);
    },
  });

  const unbanUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      await api.post(`/api/users/${userId}/unban`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      setActionDialog(null);
      setSelectedUser(null);
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      await api.patch(`/api/users/${userId}/role`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      setActionDialog(null);
      setSelectedUser(null);
    },
  });

  const filteredUsers = users?.filter((user) =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.name?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const handleBanUser = () => {
    if (selectedUser) {
      banUserMutation.mutate(selectedUser.id);
    }
  };

  const handleUnbanUser = () => {
    if (selectedUser) {
      unbanUserMutation.mutate(selectedUser.id);
    }
  };

  const handleToggleRole = () => {
    if (selectedUser) {
      const newRole = selectedUser.role === 'admin' ? 'user' : 'admin';
      updateRoleMutation.mutate({ userId: selectedUser.id, role: newRole });
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">
            Manage user accounts, roles, and permissions
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>All Users</CardTitle>
                <CardDescription>
                  {users?.length || 0} registered users
                </CardDescription>
              </div>
              <div className="relative w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {error instanceof Error ? error.message : 'Failed to load users'}
                </AlertDescription>
              </Alert>
            )}

            {!isLoading && !error && filteredUsers.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12">
                <Users className="mb-4 h-12 w-12 text-muted-foreground" />
                <p className="text-center text-sm text-muted-foreground">
                  {searchTerm ? 'No users found matching your search' : 'No users yet'}
                </p>
              </div>
            )}

            {!isLoading && !error && filteredUsers.length > 0 && (
              <div className="space-y-4">
                {filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                        {user.name?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{user.name || 'Unknown User'}</p>
                          {user.role === 'admin' && (
                            <Badge variant="default">
                              <Shield className="mr-1 h-3 w-3" />
                              Admin
                            </Badge>
                          )}
                          {user.banned && (
                            <Badge variant="destructive">
                              <Ban className="mr-1 h-3 w-3" />
                              Banned
                            </Badge>
                          )}
                          {user.emailVerified ? (
                            <Badge variant="success">
                              <CheckCircle className="mr-1 h-3 w-3" />
                              Verified
                            </Badge>
                          ) : (
                            <Badge variant="warning">Unverified</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {user.email}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Joined {new Date(user.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedUser(user);
                          setActionDialog('role');
                        }}
                      >
                        <Shield className="mr-2 h-4 w-4" />
                        {user.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
                      </Button>
                      {user.banned ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedUser(user);
                            setActionDialog('unban');
                          }}
                        >
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Unban
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedUser(user);
                            setActionDialog('ban');
                          }}
                        >
                          <Ban className="mr-2 h-4 w-4" />
                          Ban
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Ban User Dialog */}
      <Dialog open={actionDialog === 'ban'} onOpenChange={() => setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ban User</DialogTitle>
            <DialogDescription>
              Are you sure you want to ban {selectedUser?.email}? This will revoke all their
              sessions and prevent them from logging in.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleBanUser}
              disabled={banUserMutation.isPending}
            >
              {banUserMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Ban User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unban User Dialog */}
      <Dialog open={actionDialog === 'unban'} onOpenChange={() => setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unban User</DialogTitle>
            <DialogDescription>
              Are you sure you want to unban {selectedUser?.email}? They will be able to log in
              again.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>
              Cancel
            </Button>
            <Button onClick={handleUnbanUser} disabled={unbanUserMutation.isPending}>
              {unbanUserMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Unban User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Role Dialog */}
      <Dialog open={actionDialog === 'role'} onOpenChange={() => setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change User Role</DialogTitle>
            <DialogDescription>
              Are you sure you want to {selectedUser?.role === 'admin' ? 'remove admin privileges from' : 'make'} {selectedUser?.email} {selectedUser?.role === 'admin' ? 'a regular user' : 'an admin'}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>
              Cancel
            </Button>
            <Button onClick={handleToggleRole} disabled={updateRoleMutation.isPending}>
              {updateRoleMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Change Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
